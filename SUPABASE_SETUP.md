# Supabase schema & environment setup (copy-paste ready)

Below you find two things:

1. Minimal `.env.local` snippet – add your own keys.
2. One **single SQL script** that creates all tables, indexes, trigger and Row-Level-Security (RLS) policies required by this project.  
   You can copy the whole block into the Supabase SQL editor and run it once – no manual tweaking needed.
3. Login configured also with Supabase and Google OAuth.

---

## 1. Environment variables (`.env.local`)
```bash
# OpenRouter API key (backend)
OPENROUTER_API_KEY=your_openrouter_key

# Supabase project
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional server-side privilege key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 2. Supabase SQL – copy everything below
```sql
-- *******************************************************************
--  Chat application schema – tables, indexes, trigger, RLS policies
--  Copy & execute in the Supabase SQL editor.
-- *******************************************************************

-- =====================
-- 1. Tables
-- =====================
-- Stores every chat conversation (one row per chat)
CREATE TABLE IF NOT EXISTS chats (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  user_id    uuid,                       -- FK → auth.users.id (null in public demo)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stores each single message inside a chat
CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id    uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id    uuid,                       -- FK → auth.users.id
  role       text NOT NULL CHECK (role IN ('user','assistant')),
  content    text NOT NULL,
  model      text,
  priority   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reusable prompt snippets
CREATE TABLE IF NOT EXISTS prompts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      varchar NOT NULL,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User notes anchored to a message (quote + annotation)
CREATE TABLE IF NOT EXISTS notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,                       -- FK → auth.users.id
  chat_id      uuid,
  message_id   uuid,
  quote        text,
  note_text    text,
  top_position int4,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- 2. Indexes
-- =====================
CREATE INDEX IF NOT EXISTS idx_chats_created_at   ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at   ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id   ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created   ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_ts   ON messages(chat_id, created_at);

-- =====================
-- 3. Trigger to keep updated_at in sync
-- =====================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chats_updated
BEFORE UPDATE ON chats
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =====================
-- 4. Row-Level Security (RLS)
-- =====================
-- Enable RLS on all data tables
ALTER TABLE chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes    ENABLE ROW LEVEL SECURITY;

-- ----   DEMO POLICIES (public read/write)   ----
-- Comment out these three policies in production and enable
-- the user-based policies further below.
CREATE POLICY "Public read/write chats"
  ON chats FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read/write messages"
  ON messages FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read/write notes"
  ON notes FOR ALL USING (true) WITH CHECK (true);

-- ----   USER-BASED POLICIES (recommended for production)   ----
-- Remove the leading "-- " to activate once you added user_id columns
-- and enabled Supabase Auth.
/*
-- Chats: only owner can access
CREATE POLICY "Users manage their own chats"
  ON chats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages: only owner or chat owner can access
CREATE POLICY "Users manage messages of their chats"
  ON messages FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = (SELECT user_id FROM chats WHERE chats.id = messages.chat_id))
  WITH CHECK (auth.uid() = user_id);

-- Notes: only owner can access
CREATE POLICY "Users manage their own notes"
  ON notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
*/