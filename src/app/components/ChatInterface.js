'use client';

import { useState, useEffect } from 'react';
import Header from './Header';
import SearchInput from './SearchInput';
import ChatMessages from './ChatMessages';
import Sidebar from './Sidebar';
import { chatService } from '../../../lib/supabase';

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [selectedPriority, setSelectedPriority] = useState('High');
  const [abortController, setAbortController] = useState(null);
  const [stoppedPrompt, setStoppedPrompt] = useState(null);

  // Beim Start prüfen, ob es lokale Nachrichten gibt
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (parsedMessages.length > 0) {
          setMessages(parsedMessages);
          // Automatisch speichern, wenn lokale Nachrichten vorhanden sind
          autoSaveChat(parsedMessages);
        }
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    }
  }, []);

  // Chat-Titel aus der ersten Nachricht generieren
  const generateChatTitle = (messages) => {
    if (messages.length === 0) return 'Neuer Chat';
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
    return 'Neuer Chat';
  };

  // Automatisches Speichern
  const autoSaveChat = async (messagesToSave = messages) => {
    if (messagesToSave.length === 0) return null;

    try {
      let chatId = currentChatId;
      
      if (!chatId) {
        // Neuen Chat erstellen
        const title = generateChatTitle(messagesToSave);
        const chat = await chatService.createChat(title);
        chatId = chat.id;
        setCurrentChatId(chatId);
      }

      // Nur neue Nachrichten speichern (die noch keine id haben)
      for (const message of messagesToSave) {
        if (!message.id) {
          const savedMessage = await chatService.addMessage(chatId, message);
          // Message-ID aktualisieren um Duplikate zu vermeiden
          message.id = savedMessage.id;
        }
      }

      localStorage.removeItem('chatMessages');
      return chatId;
    } catch (error) {
      console.error('Error auto-saving chat:', error);
      return null;
    }
  };

  // Chat laden
  const loadChat = async (chatId) => {
    try {
      // Aktuellen Chat automatisch speichern, falls noch nicht gespeichert
      if (messages.length > 0 && !currentChatId) {
        await autoSaveChat();
      }

      const chat = await chatService.getChat(chatId);
      setMessages(chat.messages || []);
      setCurrentChatId(chatId);
      localStorage.removeItem('chatMessages');
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Fehler beim Laden des Chats');
    }
  };

  // Neuer Chat
  const startNewChat = async () => {
    // Aktuellen Chat automatisch speichern, falls noch nicht gespeichert
    if (messages.length > 0 && !currentChatId) {
      await autoSaveChat();
    }

    setMessages([]);
    setCurrentChatId(null);
    setInputValue('');
    localStorage.removeItem('chatMessages');
  };

  const handleSubmit = async (value, selectedModelParam = 'gemini-2.5-flash', selectedPriority = 'High') => {
    if (!value.trim() || isLoading) return;

    // Update selected model state for loading indicator
    setSelectedModel(selectedModelParam);

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: value,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Lokalen Speicher aktualisieren (als Backup)
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));

    try {
      // Create abort controller für Stop-Funktion
      const controller = new AbortController();
      setAbortController(controller);

      // Send request to our API with the complete message history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: value,
          messages: messages, // Send previous messages for context
          model: selectedModelParam,
          priority: selectedPriority
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response to chat with streaming flag
      const aiMessage = {
        role: 'assistant',
        content: data.response,
        model: selectedModelParam,
        priority: selectedPriority,
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      // Automatisch speichern nach jeder AI-Antwort
      await autoSaveChat(finalMessages);

    } catch (error) {
      // Debug logging um das Problem zu verstehen
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        toString: error.toString(),
        constructor: error.constructor.name
      });
      
      // Umfassende Prüfung auf Abort-Fehler
      const isAbortError = 
        error.name === 'AbortError' || 
        error.message?.includes('abort') || 
        error.message?.includes('stop') ||
        error.toString().includes('abort') ||
        error.toString().includes('stop') ||
        error.constructor.name === 'AbortError';
      
      if (isAbortError) {
        // Request wurde gestoppt - kein Error, sondern normale User-Aktion
        console.log('Request stopped by user');
        setStoppedPrompt({
          content: value,
          model: selectedModelParam,
          priority: selectedPriority
        });
      } else {
        // Nur echte Fehler loggen
        console.error('Chat error:', error);
        // Add error message to chat
        const errorMessage = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
          model: selectedModelParam,
          priority: selectedPriority,
          timestamp: new Date().toISOString(),
          isError: true
        };

        const errorMessages = [...newMessages, errorMessage];
        setMessages(errorMessages);
        
        // Auch Fehlernachrichten automatisch speichern
        await autoSaveChat(errorMessages);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      try {
        abortController.abort('User requested to stop the request');
      } catch (error) {
        // Ignore abort errors - this is expected behavior
        console.log('Request stopped by user');
      }
    }
  };

  const handleRetryStoppedPrompt = async () => {
    if (stoppedPrompt) {
      const { content, model, priority } = stoppedPrompt;
      setStoppedPrompt(null);
      await handleSubmit(content, model, priority);
    }
  };

  const handleEditStoppedPrompt = () => {
    if (stoppedPrompt) {
      setInputValue(stoppedPrompt.content);
      setStoppedPrompt(null);
    }
  };

  const handleCopyStoppedPrompt = async () => {
    if (stoppedPrompt) {
      try {
        await navigator.clipboard.writeText(stoppedPrompt.content);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  const handleDismissStoppedPrompt = () => {
    setStoppedPrompt(null);
  };

  // Hover-Actions für alle User-Nachrichten
  const handleRetry = async (messageContent) => {
    await handleSubmit(messageContent, selectedModel, selectedPriority);
  };

  const handleEdit = (messageContent) => {
    setInputValue(messageContent);
  };

  const handleCopy = async (messageContent) => {
    try {
      await navigator.clipboard.writeText(messageContent);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentChatId={currentChatId}
        onChatSelect={loadChat}
        onNewChat={startNewChat}
      />

      {/* Hauptinhalt */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ 
          marginLeft: sidebarOpen ? '280px' : '60px'
        }}
      >
        {/* Header - ohne Speichern-Funktionalität */}
        <Header 
          onClearChat={startNewChat} 
          hasMessages={messages.length > 0}
        />
        
        {/* Chat Messages - scrollbarer Bereich mit extra Padding unten */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="px-4 max-w-6xl mx-auto w-full">
            <div className="pb-32"> {/* Extra Padding für Input-Bereich */}
              <ChatMessages 
                messages={messages} 
                isLoading={isLoading} 
                selectedModel={selectedModel}
                onRetry={handleRetry}
                onEdit={handleEdit}
                onCopy={handleCopy}
              />
            </div>
          </div>
        </main>
        
        {/* Input-Bereich - fix am unteren Ende mit Blur */}
        <div className="sticky bottom-0 left-0 right-0 backdrop-blur-md bg-background/70 border-t border-border/50">
          <div className="px-4 py-4 max-w-6xl mx-auto w-full">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Stopped Prompt Message */}
              {stoppedPrompt && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-red-800 dark:text-red-200 font-medium">Prompt was stopped</span>
                      </div>
                      <p className="text-red-700 dark:text-red-300 text-sm mb-3 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                        "{stoppedPrompt.content}"
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleRetryStoppedPrompt}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Retry
                        </button>
                        <button
                          onClick={handleEditStoppedPrompt}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleCopyStoppedPrompt}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleDismissStoppedPrompt}
                      className="text-red-400 hover:text-red-600 ml-4"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              <SearchInput 
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                onStop={handleStop}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 