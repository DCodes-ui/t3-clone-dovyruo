'use client';

import { useState } from 'react';
import Header from './Header';
import SearchInput from './SearchInput';
import ChatMessages from './ChatMessages';

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (value, selectedModel = 'gemini-2.5-flash', selectedPriority = 'High') => {
    if (!value.trim() || isLoading) return;

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: value,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); // Clear input immediately
    setIsLoading(true);

    try {
      // Send request to our API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: value,
          model: selectedModel,
          priority: selectedPriority
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: data.response,
        model: selectedModel,
        priority: selectedPriority,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message to chat
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
        model: selectedModel,
        priority: selectedPriority,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <Header />
      
      {/* Hauptinhalt */}
      <main className="flex-1 flex flex-col px-4 max-w-6xl mx-auto w-full">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <ChatMessages messages={messages} />
        </div>
        
        {/* Input-Bereich am unteren Ende */}
        <div className="w-full max-w-4xl mx-auto pb-8 pt-4">
          <SearchInput 
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
} 