'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function ChatMessage({ message, isUser = false, model, priority }) {
  const getProviderIcon = (modelId) => {
    if (modelId?.includes('gemini')) return '/gemini_icon.png';
    if (modelId?.includes('o4') || modelId?.includes('4o')) return '/openai-icon.png';
    if (modelId?.includes('claude')) return '/anthropic-icon.png';
    return '/gemini_icon.png'; // Default fallback
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 p-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Image
              src={getProviderIcon(model)}
              alt="AI"
              width={20}
              height={20}
              className="w-5 h-5 object-contain"
            />
          </div>
        </div>
      )}
      
      <div className={`max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted text-foreground'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message}
          </div>
        </div>
        
        {!isUser && (model || priority) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {model && (
              <span className="flex items-center gap-1">
                <Image
                  src={getProviderIcon(model)}
                  alt="Provider"
                  width={12}
                  height={12}
                  className="w-3 h-3 object-contain"
                />
                {model}
              </span>
            )}
            {priority && priority !== 'High' && (
              <span className="px-2 py-1 bg-accent rounded text-accent-foreground">
                {priority}
              </span>
            )}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            U
          </div>
        </div>
      )}
    </motion.div>
  );
} 