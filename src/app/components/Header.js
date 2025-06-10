'use client';

import { useState } from 'react';

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Example prompts for the dropdown (later dynamic)
  const savedPrompts = [
    {
      id: 1,
      title: "Job offer email response",
      text: "Write a professional response to a job offer..."
    },
    {
      id: 2,
      title: "Create to-do list",
      text: "Create a structured to-do list for..."
    },
    {
      id: 3,
      title: "Summarize article",
      text: "Summarize this article in one paragraph..."
    }
  ];

  const handleCopyPrompt = (promptText) => {
    navigator.clipboard.writeText(promptText);
    console.log('Prompt copied:', promptText);
  };

  const handleEditPrompt = (promptId) => {
    console.log('Edit prompt:', promptId);
    // Later: Open modal or navigate to edit page
  };

  const handleDeletePrompt = (promptId) => {
    console.log('Delete prompt:', promptId);
    // Later: Confirmation and deletion from database
  };

  return (
    <header className="w-full px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Area */}
        <div className="flex justify-center">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-card hover:bg-accent rounded-lg border border-border transition-colors text-sm"
            >
              {/* Copy Icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Prompt</span>
              <svg 
                className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu for saved prompts */}
            {dropdownOpen && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground mb-3">Saved Prompts</h3>
                  
                  {savedPrompts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No prompts saved yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="bg-secondary/50 rounded-lg p-3 hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground truncate flex-1">
                              {prompt.title}
                            </h4>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {prompt.text}
                          </p>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCopyPrompt(prompt.text)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </button>
                            
                            <button
                              onClick={() => handleEditPrompt(prompt.id)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            
                            <button
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Button to add new prompts */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <button className="w-full px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors">
                      + Add New Prompt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 