'use client';

import { useEffect, useRef } from 'react';
import ChatMessage, { TypingIndicator } from './ChatMessage';

export default function ChatMessages({ messages, isLoading, selectedModel, onRetry, onEdit, onCopy }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Start a conversation
          </h3>
          <p className="text-sm text-muted-foreground">
            Type a message below to get started with your AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message.content}
            isUser={message.role === 'user'}
            model={message.model}
            priority={message.priority}
            isStreaming={message.isStreaming && index === messages.length - 1}
            onRetry={onRetry}
            onEdit={onEdit}
            onCopy={onCopy}
          />
        ))}
        
        {/* Loading Animation zwischen letztem User-Prompt und AI-Antwort */}
        {isLoading && (
          <TypingIndicator model={selectedModel} />
        )}
        
        <div className="h-24" />
        <div ref={messagesEndRef} />
      </div>
  );
} 