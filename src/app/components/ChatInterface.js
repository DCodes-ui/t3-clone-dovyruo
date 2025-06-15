'use client';

import { useState, useEffect, useRef } from 'react';
import Header from './Header';
import SearchInput from './SearchInput';
import ChatMessages from './ChatMessages';
import Sidebar from './Sidebar';
import { chatService, supabase } from '../../../lib/supabase';
import { getCurrentUserId } from '../../../lib/supabase';
import { nanoid } from 'nanoid';

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
  const [user, setUser] = useState(null);

  // Auswahl-Toolbar & Notizen
  const [selectionInfo, setSelectionInfo] = useState(null);
  const [notes, setNotes] = useState([]);
  const savedRangeRef = useRef(null);
  const toolbarClickRef = useRef(false);
  const chatAreaRef = useRef(null);

  // Stelle Selektion nach dem Render wieder her, sobald Toolbar erscheint
  useEffect(() => {
    if (selectionInfo && savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, [selectionInfo]);

  // Beobachte Textauswahl
  useEffect(() => {
    const handleSelection = () => {
      // Wenn gerade Toolbar geklickt wurde, ignorieren
      if (toolbarClickRef.current) {
        toolbarClickRef.current = false;
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          setSelectionInfo(null);
          return;
        }
        const selectedText = sel.toString().trim();
        if (selectedText.length === 0) {
          setSelectionInfo(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = chatAreaRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
        const relTop = rect.top - containerRect.top + chatAreaRef.current.scrollTop;
        const relLeft = rect.right - containerRect.left + chatAreaRef.current.scrollLeft;
        savedRangeRef.current = range.cloneRange();
        setSelectionInfo({
          text: selectedText,
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX,
          relTop,
          relLeft
        });
      }, 10);
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    const escapeListener = (e) => {
      if (e.key === 'Escape') {
        setSelectionInfo(null);
        window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('keydown', escapeListener);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
      document.removeEventListener('keydown', escapeListener);
    };
  }, []);

  const handleQuoteSelection = () => {
    if (!selectionInfo) return;
    toolbarClickRef.current = true;
    const formatted = selectionInfo.text.split('\n').map(l => '> ' + l).join('\n');
    setInputValue(prev => (prev ? prev + '\n' : '') + formatted + '\n');
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleNoteSelection = () => {
    if (!selectionInfo) return;
    toolbarClickRef.current = true;
    const newNote = {
      id: nanoid(),
      text: selectionInfo.text,
      top: selectionInfo.top,
      left: selectionInfo.left + 16,
      note: ''
    };
    setNotes(prev => [...prev, newNote]);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  // Check if there are local messages on start
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (parsedMessages.length > 0) {
          setMessages(parsedMessages);
          // Automatically save if local messages are present
          autoSaveChat(parsedMessages);
        }
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Generate chat title from the first message
  const generateChatTitle = (messages) => {
    if (messages.length === 0) return 'Neuer Chat';
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
    return 'Neuer Chat';
  };

  // Automatic saving
  const autoSaveChat = async (messagesToSave = messages) => {
    if (messagesToSave.length === 0) return null;

    const userId = await getCurrentUserId();
    if (!userId) {
      // User not logged in; keep messages locally only
      return null;
    }

    try {
      let chatId = currentChatId;
      
      if (!chatId) {
        // Create new chat
        const title = generateChatTitle(messagesToSave);
        const chat = await chatService.createChat(title);
        chatId = chat.id;
        setCurrentChatId(chatId);
      }

      // Save only new messages (those without an id)
      for (const message of messagesToSave) {
        if (!message.id) {
          const savedMessage = await chatService.addMessage(chatId, message);
          // Update message-ID to avoid duplicates
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
      // Automatically save current chat if not already saved
      if (messages.length > 0 && !currentChatId) {
        await autoSaveChat();
      }

      const chat = await chatService.getChat(chatId);
      setMessages(chat.messages || []);
      setCurrentChatId(chatId);
      localStorage.removeItem('chatMessages');
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Error loading chat');
    }
  };

  // Neuer Chat
  const startNewChat = async () => {
    // Automatically save current chat if not already saved
    if (messages.length > 0 && !currentChatId) {
      await autoSaveChat();
    }

    setMessages([]);
    setCurrentChatId(null);
    setInputValue('');
    localStorage.removeItem('chatMessages');
  };

  const handleSubmit = async (value, selectedModelParam = 'gemini-2.5-flash', selectedPriority = 'High') => {
    if (!user) {
      alert('Bitte einloggen, um Prompts zu senden.');
      return;
    }
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

    // Local storage update (as backup)
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));

    try {
      // Create abort controller for stop function
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
          messages: messages, // Send previous messages for context (true)
          model: selectedModelParam,
          priority: selectedPriority
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response to chat with streaming flag (true)
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
      
      // Automatically save after each AI response
      await autoSaveChat(finalMessages);

    } catch (error) {
      // Debug logging to understand the problem
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        toString: error.toString(),
        constructor: error.constructor.name
      });
      
      // Comprehensive check for abort errors
      const isAbortError = 
        error.name === 'AbortError' || 
        error.message?.includes('abort') || 
        error.message?.includes('stop') ||
        error.toString().includes('abort') ||
        error.toString().includes('stop') ||
        error.constructor.name === 'AbortError';
      
      if (isAbortError) {
        // Request was stopped - no error, just normal user action
        console.log('Request stopped by user');
        setStoppedPrompt({
          content: value,
          model: selectedModelParam,
          priority: selectedPriority
        });
      } else {
        // Only log real errors
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
        
        // Also save error messages automatically
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

  // Hover-Actions for all user messages
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

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
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

      {/* Main content */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ 
          marginLeft: sidebarOpen ? '280px' : '60px'
        }}
      >
        {/* Header - without save functionality */}
        <Header 
          onClearChat={startNewChat} 
          hasMessages={messages.length > 0}
          onPromptSelect={(promptText) => setInputValue(promptText)}
        />
        
        {/* Chat Messages - scrollable area with extra padding at bottom */}
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          {/* Sticky Note Cards */}
          {notes.map(note => (
            <div
              key={note.id}
              className="fixed w-72 bg-card border border-border rounded-lg shadow-lg p-4 space-y-3"
              style={{ top: note.top, left: note.left, zIndex: 100 }}
            >
              <blockquote className="border-l-2 border-primary pl-2 italic text-sm text-foreground/80 whitespace-pre-wrap">
                {note.text}
              </blockquote>
              <textarea
                placeholder="Your notes..."
                className="w-full bg-background border border-border rounded p-2 text-sm resize-none"
                rows={4}
                defaultValue={note.note}
                onChange={(e)=>setNotes(prev=>prev.map(n=>n.id===note.id?{...n,note:e.target.value}:n))}
              />
              <button
                onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {!user && (
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={handleSignIn}
                className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-card hover:bg-gray-100 dark:hover:bg-accent border border-border rounded-lg shadow transition-colors text-base font-medium"
              >
                {/* Google G Logo */}
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.9 0 7.4 1.5 10 4.1l7.5-7.5C36.3 2 30.6 0 24 0 14.6 0 6.6 5.3 2.4 13.1l8.6 6.9C13 14 18.2 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.9 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.9c-.6 3.1-2.5 5.8-5.3 7.6l8.4 6.5c4.9-4.5 7.9-11.1 7.9-18.6z"/>
                  <path fill="#FBBC05" d="M10.9 28.5c-1-2.9-1-6 0-8.9L2.4 13.1c-3.3 6.6-3.3 14.4 0 21l8.5-6.9z"/>
                  <path fill="#34A853" d="M24 48c6.6 0 12.3-2.2 16.4-6l-8.4-6.5c-2.3 1.5-5.2 2.4-8 2.4-5.8 0-10.9-4-12.7-9.4L2.4 34.1C6.6 42 14.6 48 24 48z"/>
                </svg>
                <span className="text-foreground dark:text-foreground">Continue with Google</span>
              </button>
            </div>
          )}
          <div className="px-4 max-w-6xl mx-auto w-full relative" ref={chatAreaRef}>
            <div className="pb-32">
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
        
        {/* Input area - fixed at bottom without border */}
        {user && (
        <div className="sticky bottom-0 left-0 right-0">
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
        )}

        {/* Auswahl-Toolbar */}
        {selectionInfo && (
          <div
            id="selection-toolbar"
            className="fixed z-50 flex gap-2"
            style={{ top: selectionInfo.top - 40, left: selectionInfo.left }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                toolbarClickRef.current = true;
              }}
              onClick={handleQuoteSelection}
              className="p-2 bg-card border border-border rounded-full shadow hover:bg-accent"
              title="Quote selected text"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.17 6A4 4 0 003 10v4a3 3 0 003 3h2a3 3 0 003-3v-4a4 4 0 00-3.83-4zM6 10a2 2 0 012-2h.17A2 2 0 0110 10v4a1 1 0 01-1 1H7a1 1 0 01-1-1zM17.17 6A4 4 0 0013 10v4a3 3 0 003 3h2a3 3 0 003-3v-4a4 4 0 00-3.83-4zM16 10a2 2 0 012-2h.17A2 2 0 0120 10v4a1 1 0 01-1 1h-2a1 1 0 01-1-1z" />
              </svg>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                toolbarClickRef.current = true;
              }}
              onClick={handleNoteSelection}
              className="p-2 bg-card border border-border rounded-full shadow hover:bg-accent"
              title="Add note"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3a2 2 0 00-2 2v14l4-4h10a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 