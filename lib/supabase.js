import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Chat-bezogene Funktionen
export const chatService = {
  // Alle Chats laden
  async getChats() {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Einen bestimmten Chat mit Nachrichten laden
  async getChat(chatId) {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()
    
    if (chatError) throw chatError

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    
    if (messagesError) throw messagesError

    return { ...chat, messages }
  },

  // Neuen Chat erstellen
  async createChat(title) {
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          title: title || 'Neuer Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Chat aktualisieren
  async updateChat(chatId, updates) {
    const { data, error } = await supabase
      .from('chats')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Nachricht zu Chat hinzufügen
  async addMessage(chatId, message) {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role: message.role,
          content: message.content,
          model: message.model,
          priority: message.priority,
          created_at: message.timestamp || new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) throw error

    // Chat updated_at aktualisieren
    await this.updateChat(chatId, {})
    
    return data
  },

  // Chat löschen
  async deleteChat(chatId) {
    // Erst alle Nachrichten löschen
    await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId)

    // Dann den Chat löschen
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
    
    if (error) throw error
  }
} 