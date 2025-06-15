import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to get current authenticated user ID (null if not signed in)
export const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
};

// Chat-bezogene Funktionen
export const chatService = {
  // Alle Chats laden
  async getChats() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Einen bestimmten Chat mit Nachrichten laden
  async getChat(chatId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chatError) throw chatError;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return { ...chat, messages };
  },

  // Neuen Chat erstellen
  async createChat(title) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          title: title || 'Neuer Chat',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Chat aktualisieren
  async updateChat(chatId, updates) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Nachricht zu Chat hinzufügen
  async addMessage(chatId, message) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role: message.role,
          content: message.content,
          model: message.model,
          priority: message.priority,
          user_id: userId,
          created_at: message.timestamp || new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;

    // Chat updated_at aktualisieren
    await this.updateChat(chatId, {});
    
    return data;
  },

  // Chat löschen
  async deleteChat(chatId) {
    // Erst alle Nachrichten löschen
    await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);

    // Dann den Chat löschen
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    
    if (error) throw error;
  }
}

// Prompt-bezogene Funktionen
export const promptService = {
  // Alle Prompts laden
  async getPrompts() {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Neuen Prompt erstellen
  async createPrompt(title, text) {
    const { data, error } = await supabase
      .from('prompts')
      .insert([
        {
          title: title.trim(),
          text: text.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Prompt aktualisieren
  async updatePrompt(promptId, title, text) {
    const { data, error } = await supabase
      .from('prompts')
      .update({
        title: title.trim(),
        text: text.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', promptId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Prompt löschen
  async deletePrompt(promptId) {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId)
    
    if (error) throw error
  }
} 