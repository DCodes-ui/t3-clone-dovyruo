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

  // Selection toolbar
  const [selectionInfo, setSelectionInfo] = useState(null);
  const savedRangeRef = useRef(null);
  const toolbarClickRef = useRef(false);
  const chatAreaRef = useRef(null);

  // Restore the text selection once the toolbar appears after render
  useEffect(() => {
    if (selectionInfo && savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, [selectionInfo]);

  // Observe text selection changes
  useEffect(() => {
    const handleSelection = () => {
      // Ignore when the toolbar itself was clicked
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
        const containerRect = chatAreaRef.current?.getBoundingClientRect() || { top: 0, left: 0, right: 0 };
        const relTop = rect.top - containerRect.top + chatAreaRef.current.scrollTop;
        const absRight = rect.right + window.scrollX;
        const relLeft = rect.right - containerRect.left + chatAreaRef.current.scrollLeft;
        savedRangeRef.current = range.cloneRange();
        setSelectionInfo({
          text: selectedText,
          top: rect.top + window.scrollY,
          absRight,
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

  // Load any locally stored messages on startup
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (parsedMessages.length > 0) {
          setMessages(parsedMessages);
          // Auto-save if we found local messages
          autoSaveChat(parsedMessages);
        }
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    }
  }, []);

  // Supabase auth listener
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

  // Utility: generate chat title from the first user message
  const generateChatTitle = (messages) => {
    if (messages.length === 0) return 'New chat';
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
    return 'New chat';
  };

  // Persist chat messages to Supabase (auto-save)
  const autoSaveChat = async (messagesToSave = messages) => {
    if (messagesToSave.length === 0) return null;

    const userId = await getCurrentUserId();
    if (!userId) {
      // If the user is not logged in we keep messages only in localStorage
      return null;
    }

    try {
      let chatId = currentChatId;
      
      if (!chatId) {
        // Create a new chat entry in Supabase
        const title = generateChatTitle(messagesToSave);
        const chat = await chatService.createChat(title);
        chatId = chat.id;
        setCurrentChatId(chatId);
      }

      // Only push messages that are not yet saved (no id)
      for (const message of messagesToSave) {
        if (!message.id) {
          const savedMessage = await chatService.addMessage(chatId, message);
          // Update the local message with returned id to avoid duplicates
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

  // Load an existing chat from Supabase
  const loadChat = async (chatId) => {
    try {
      // Auto-save current unsaved chat before switching
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

  // Start a brand-new chat
  const startNewChat = async () => {
    // Auto-save current unsaved chat before resetting
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
      alert('Please sign in to send prompts.');
      return;
    }
    if (!value.trim() || isLoading) return;

    // Store currently selected model – used for loading indicator
    setSelectedModel(selectedModelParam);

    // Push user message to state
    const userMessage = {
      role: 'user',
      content: value,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Backup to localStorage in case of refresh / offline
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));

    try {
      // Create abort controller so user can cancel request
      const controller = new AbortController();
      setAbortController(controller);

      // Call our /api/chat endpoint with full message history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: value,
          messages: messages, // full context for the model
          model: selectedModelParam,
          priority: selectedPriority
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Append assistant response with streaming flag
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
      
      // Auto-save after assistant responded
      await autoSaveChat(finalMessages);

    } catch (error) {
      // Extra logging for easier debugging
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        toString: error.toString(),
        constructor: error.constructor.name
      });
      
      // Detect different types of abort errors
      const isAbortError = 
        error.name === 'AbortError' || 
        error.message?.includes('abort') || 
        error.message?.includes('stop') ||
        error.toString().includes('abort') ||
        error.toString().includes('stop') ||
        error.constructor.name === 'AbortError';
      
      if (isAbortError) {
        // User intentionally stopped the request – not an error
        console.log('Request stopped by user');
        setStoppedPrompt({
          content: value,
          model: selectedModelParam,
          priority: selectedPriority
        });
      } else {
        // Log genuine errors only (skip aborts)
        console.error('Chat error:', error);
        // Push error message into chat
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
        
        // Auto-save including the error entry
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
        // Ignore abort exceptions – expected behaviour
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

  // Hover actions (retry, edit, copy) for every user message
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
          {!user && (
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={handleSignIn}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg transition-colors text-lg flex items-center gap-2"
              >
                {/* Google "G" Logo */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 18 18"
                  className="w-6 h-6"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="#EA4335"
                    d="M9 3.48c1.69 0 2.84.73 3.49 1.35l2.57-2.49C13.41.89 11.43 0 9 0 5.48 0 2.4 2.24.96 5.5l2.98 2.32C4.89 5.27 6.78 3.48 9 3.48Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.63-.06-1.24-.17-1.82H9v3.44h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.25h2.9c1.69-1.56 2.7-3.86 2.7-6.58Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.78 10.26a5.38 5.38 0 0 1 0-3.51V4.5H.82a8.51 8.51 0 0 0 0 7.51l2.96-2.32Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.9-2.25c-.8.54-1.83.86-3.06.86-2.21 0-4.1-1.52-4.77-3.57L1.16 12.5C2.4 15.76 5.48 18 9 18Z"
                  />
                  <path fill="none" d="M0 0h18v18H0Z" />
                </svg>
                Sign in with Google
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

        {/* Selection toolbar */}
        {selectionInfo && (
          <div
            id="selection-toolbar"
            className="fixed z-50 flex gap-2"
            style={{ top: selectionInfo.top - 40, left: selectionInfo.absRight + 8 }}
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
          </div>
        )}
      </div>
    </div>
  );
} 