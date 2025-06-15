'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SearchInput({ value, onChange, onSubmit, onStop, isLoading: externalLoading }) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Use external loading state if provided, otherwise use internal state
  const actualLoading = externalLoading !== undefined ? externalLoading : isLoading;
  const [isFocused, setIsFocused] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('High');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  const priorityOptions = [
    { value: 'High', label: 'High', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { value: 'Medium', label: 'Medium', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { value: 'Low', label: 'Low', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
  ];

  const aiModels = [
    { 
      id: 'gemini-2.5-flash', 
      name: 'Gemini 2.5 Flash', 
      provider: 'Google',
      isThinking: false,
      iconPath: '/gemini_icon.png'
    },
    { 
      id: 'gemini-2.5-flash-thinking', 
      name: 'Gemini 2.5 Flash (Thinking)', 
      provider: 'Google',
      isThinking: true,
      iconPath: '/gemini_icon.png'
    },
    { 
      id: 'gemini-2.5-pro', 
      name: 'Gemini 2.5 Pro', 
      provider: 'Google',
      isThinking: false,
      iconPath: '/gemini_icon.png'
    },
    { 
      id: 'o4-mini', 
      name: 'o4-mini', 
      provider: 'OpenAI',
      isThinking: true,
      iconPath: '/openai-icon.png'
    },
    { 
      id: '4o', 
      name: '4o', 
      provider: 'OpenAI',
      isThinking: false,
      iconPath: '/openai-icon.png'
    },
    { 
      id: 'claude-4-sonnet', 
      name: 'Claude 4 Sonnet', 
      provider: 'Anthropic',
      isThinking: false,
      iconPath: '/anthropic-icon.png'
    },
    { 
      id: 'claude-4-sonnet-thinking', 
      name: 'Claude 4 Sonnet (Thinking)', 
      provider: 'Anthropic',
      isThinking: true,
      iconPath: '/anthropic-icon.png'
    }
  ];



  // Check if current model is a thinking model
  const isThinkingModel = useMemo(() => {
    const currentModel = aiModels.find(model => model.id === selectedModel);
    return currentModel?.isThinking || false;
  }, [selectedModel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    
    // Pass the current selections to the parent component
    await onSubmit(value, selectedModel, selectedPriority);
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePrioritySelect = (priority) => {
    setSelectedPriority(priority.value);
    setPriorityDropdownOpen(false);
    console.log('Priority selected:', priority.value);
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model.id);
    setModelDropdownOpen(false);
    console.log('Model selected:', model.name);
  };

  const selectedModelInfo = aiModels.find(model => model.id === selectedModel);

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animierter Glowing Border */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-75 blur-sm"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: '200% 200%',
          filter: 'blur(8px)',
          opacity: 0.8,
        }}
      />
      
      {/* Hauptcontainer */}
      <motion.div
        className="relative bg-input border border-border rounded-2xl shadow-2xl backdrop-blur-sm"
        transition={{ duration: 0.2 }}
      >
        <form onSubmit={handleSubmit} className="relative">
          {/* Haupteingabebereich */}
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message here..."
              className="w-full min-h-[80px] max-h-[300px] px-4 py-4 pr-14 bg-transparent border-none text-foreground placeholder-muted-foreground focus:outline-none resize-none text-base leading-relaxed"
              disabled={actualLoading}
              rows={2}
            />
            
            {/* Submit/Stop Button */}
            <motion.button
              type={actualLoading ? "button" : "submit"}
              onClick={actualLoading ? handleStop : undefined}
              disabled={!actualLoading && !value.trim()}
              className={`absolute top-3 right-3 p-2 rounded-lg transition-colors ${
                actualLoading 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed'
              }`}
            >
              {actualLoading ? (
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 6h12v12H6z" 
                  />
                </svg>
              ) : (
                <svg 
                  className="w-6 h-6 text-primary-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                  />
                </svg>
              )}
            </motion.button>
          </div>
          
          {/* Untere Toolbar */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            {/* Linke Icons */}
            <div className="flex items-center space-x-3">
              <motion.button
                type="button"
                className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Attach</span>
              </motion.button>
              
              {/* Priority Dropdown - nur bei Thinking Models anzeigen */}
              {isThinkingModel && (
                <div className="relative">
                  <motion.button
                    type="button"
                    onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{selectedPriority}</span>
                  </motion.button>

                  {/* Priority Dropdown Menu */}
                  {priorityDropdownOpen && (
                    <motion.div
                      className="absolute bottom-full left-0 mb-2 w-32 bg-card border border-border rounded-lg shadow-lg z-20"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {priorityOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handlePrioritySelect(option)}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                          </svg>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
              
              {/* AI Model Dropdown */}
              <div className="relative">
                <motion.button
                  type="button"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {selectedModelInfo && (
                    <Image
                      src={selectedModelInfo.iconPath}
                      alt={`${selectedModelInfo.provider} icon`}
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  <span>{selectedModelInfo?.name}</span>
                  <svg 
                    className={`w-3 h-3 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.button>

                {/* AI Model Dropdown Menu */}
                {modelDropdownOpen && (
                  <motion.div
                    className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {aiModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedModel === model.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <Image
                            src={model.iconPath}
                            alt={`${model.provider} icon`}
                            width={16}
                            height={16}
                            className="w-4 h-4 object-contain"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.provider}</div>
                        </div>
                        {model.isThinking && (
                          <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Thinking
                          </div>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
} 