'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, supabase } from '../../../lib/supabase';
import ConfirmDialog from './ConfirmDialog';

export default function Sidebar({ isOpen, onToggle, currentChatId, onChatSelect, onNewChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, chatId: null, chatTitle: '' });
  const [user, setUser] = useState(null);

  // Load chats from Supabase
  const loadChats = async () => {
    try {
      setLoading(true);
      const data = await chatService.getChats();
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [user]);

  // Supabase auth state listener
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Delete chat
  const handleDeleteChat = (chatId, chatTitle, e) => {
    e.stopPropagation();
    setDeleteConfirm({ 
      isOpen: true, 
      chatId, 
      chatTitle 
    });
  };

  const confirmDeleteChat = async () => {
    try {
      await chatService.deleteChat(deleteConfirm.chatId);
      await loadChats(); // Refresh chat list
      
      // If the currently open chat was deleted, start a new chat
      if (currentChatId === deleteConfirm.chatId) {
        onNewChat();
      }
      
      setDeleteConfirm({ isOpen: false, chatId: null, chatTitle: '' });
    } catch (error) {
      console.error('Error deleting chat:', error);
      setDeleteConfirm({ isOpen: false, chatId: null, chatTitle: '' });
    }
  };

  const cancelDeleteChat = () => {
    setDeleteConfirm({ isOpen: false, chatId: null, chatTitle: '' });
  };

  // Shorten chat title
  const truncateTitle = (title, maxLength = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isOpen ? 280 : 60,
          transition: { duration: 0.3, ease: 'easeInOut' }
        }}
        className="fixed left-0 top-0 h-full bg-card border-r border-border z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {isOpen && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-semibold text-foreground"
              >
                Chats
              </motion.h2>
            )}
            
            <button
              onClick={onToggle}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title={isOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isOpen ? (
                <svg 
                  className="w-5 h-5 transition-transform"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg 
                  className="w-5 h-5"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* New chat button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className={`flex items-center gap-3 w-full p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors ${
              !isOpen ? 'justify-center' : ''
            }`}
            title="New Chat"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-medium whitespace-nowrap"
              >
                New Chat
              </motion.span>
            )}
          </button>
        </div>

        {/* Chat Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <div className="flex items-center justify-center">
                {isOpen ? (
                  <span className="text-muted-foreground">Loading chats...</span>
                ) : (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
          ) : chats.length === 0 ? (
            isOpen && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No chats available yet
              </div>
            )
          ) : (
            <div className="p-2">
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`w-full p-3 mb-2 rounded-lg transition-colors text-left group relative cursor-pointer ${
                    currentChatId === chat.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent text-foreground'
                  } ${!isOpen ? 'flex justify-center' : ''}`}
                  title={!isOpen ? chat.title : ''}
                >
                  {!isOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {truncateTitle(chat.title)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(chat.updated_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, chat.title, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-500 rounded transition-all"
                        title="Delete Chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          {user && (
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 w-full p-3 bg-white dark:bg-card hover:bg-gray-100 dark:hover:bg-accent border border-border rounded-lg shadow transition-colors text-base font-medium ${!isOpen ? 'justify-center' : ''}`}
              title="Logout"
            >
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap text-foreground"
                >
                  Logout
                </motion.span>
              )}
            </button>
          )}

          <button
            onClick={() => console.log('Settings clicked')} // TODO: open settings modal
            className={`flex items-center gap-3 w-full p-3 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground ${
              !isOpen ? 'justify-center' : ''
            }`}
            title="Settings"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Confirmation dialog for chat deletion */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onConfirm={confirmDeleteChat}
        onCancel={cancelDeleteChat}
        title="Delete Chat"
        message={`Are you sure you want to delete "${deleteConfirm.chatTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
      />
    </>
  );
} 