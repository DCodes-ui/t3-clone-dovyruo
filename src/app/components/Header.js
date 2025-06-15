'use client';

import { useState, useEffect } from 'react';
import { promptService } from '../../../lib/supabase';
import PromptDialog from './PromptDialog';
import ConfirmDialog from './ConfirmDialog';
import { supabase } from '../../../lib/supabase';

export default function Header({ onClearChat, hasMessages, onPromptSelect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promptDialog, setPromptDialog] = useState({ isOpen: false, prompt: null, title: 'Prompt hinzufügen' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, promptId: null, promptTitle: '' });
  const [user, setUser] = useState(null);

  // Prompts laden
  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await promptService.getPrompts();
      setSavedPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setSavedPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  // Beim Start Prompts laden
  useEffect(() => {
    loadPrompts();
  }, []);

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

  const handleCopyPrompt = async (promptText) => {
    try {
      await navigator.clipboard.writeText(promptText);
      console.log('Prompt copied:', promptText);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleUsePrompt = (promptText) => {
    if (onPromptSelect) {
      onPromptSelect(promptText);
    }
    setDropdownOpen(false);
  };

  const handleEditPrompt = (prompt) => {
    if (!user) {
      alert('Bitte einloggen, um Prompts zu bearbeiten.');
      return;
    }
    setPromptDialog({
      isOpen: true,
      prompt: prompt,
      title: 'Edit Prompt'
    });
  };

  const handleDeletePrompt = (promptId, promptTitle) => {
    if (!user) {
      alert('Bitte einloggen, um Prompts zu löschen.');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      promptId,
      promptTitle
    });
  };

  const handleAddNewPrompt = () => {
    if (!user) {
      alert('Bitte einloggen, um eigene Prompts zu speichern.');
      return;
    }
    setPromptDialog({
      isOpen: true,
      prompt: null,
      title: 'Add New Prompt'
    });
  };

  const handleSavePrompt = async (title, text) => {
    try {
      if (promptDialog.prompt) {
        // Prompt bearbeiten
        await promptService.updatePrompt(promptDialog.prompt.id, title, text);
      } else {
        // Neuen Prompt erstellen
        await promptService.createPrompt(title, text);
      }
      await loadPrompts(); // Prompts neu laden
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw error;
    }
  };

  const confirmDeletePrompt = async () => {
    try {
      await promptService.deletePrompt(deleteConfirm.promptId);
      await loadPrompts(); // Prompts neu laden
      setDeleteConfirm({ isOpen: false, promptId: null, promptTitle: '' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setDeleteConfirm({ isOpen: false, promptId: null, promptTitle: '' });
    }
  };

  const cancelDeletePrompt = () => {
    setDeleteConfirm({ isOpen: false, promptId: null, promptTitle: '' });
  };

  const handleNewChat = () => {
    if (onClearChat) {
      onClearChat();
    }
    setDropdownOpen(false);
  };

  return (
    <header className="w-full px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Area */}
        <div className="flex justify-center items-center gap-4">
          {/* Neuer Chat Button - nur anzeigen wenn Messages vorhanden */}
          {hasMessages && (
            <button
              onClick={handleNewChat}
              className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Chat</span>
            </button>
          )}

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
                  
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Loading prompts...
                    </div>
                  ) : savedPrompts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No prompts saved yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedPrompts.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="bg-secondary/50 rounded-lg p-3 hover:bg-secondary transition-colors cursor-pointer"
                          onClick={() => handleUsePrompt(prompt.text)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground truncate flex-1">
                              {prompt.title}
                            </h4>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {prompt.text.length > 100 ? prompt.text.substring(0, 100) + '...' : prompt.text}
                          </p>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPrompt(prompt.text);
                              }}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                              title="Copy prompt"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPrompt(prompt);
                              }}
                              className="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded transition-colors"
                              title="Edit prompt"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrompt(prompt.id, prompt.title);
                              }}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                              title="Delete prompt"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Button to add new prompts */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <button 
                      onClick={handleAddNewPrompt}
                      className="w-full px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                    >
                      + Add New Prompt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Dialog */}
      <PromptDialog
        isOpen={promptDialog.isOpen}
        onClose={() => setPromptDialog({ isOpen: false, prompt: null, title: 'Add Prompt' })}
        onSave={handleSavePrompt}
        prompt={promptDialog.prompt}
        title={promptDialog.title}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onConfirm={confirmDeletePrompt}
        onCancel={cancelDeletePrompt}
        title="Delete Prompt"
        message={`Are you sure you want to delete "${deleteConfirm.promptTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
      />
    </header>
  );
} 