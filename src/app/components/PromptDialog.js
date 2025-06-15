'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PromptDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  prompt = null, // null for new prompt, object for editing
  title = 'Add Prompt'
}) {
  const [promptTitle, setPromptTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form with existing data when editing
  useEffect(() => {
    if (prompt) {
      setPromptTitle(prompt.title || '');
      setPromptText(prompt.text || '');
    } else {
      setPromptTitle('');
      setPromptText('');
    }
  }, [prompt, isOpen]);

  const handleSave = async () => {
    if (!promptTitle.trim() || !promptText.trim()) {
      alert('Please enter both title and text');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(promptTitle.trim(), promptText.trim());
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error saving prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPromptTitle('');
    setPromptText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-lg shadow-lg p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Title input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                value={promptTitle}
                onChange={(e) => setPromptTitle(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                placeholder="e.g. Email response template"
                maxLength={100}
              />
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Prompt Text
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground resize-none"
                placeholder="Enter your prompt here..."
                rows={4}
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {promptText.length}/1000 characters
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-border bg-background hover:bg-accent text-foreground rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !promptTitle.trim() || !promptText.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {prompt ? 'Update' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 