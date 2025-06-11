# Supabase Setup für Chat-Anwendung

## 1. Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle einen Account
2. Klicke auf "New Project"
3. Wähle deine Organisation und gib dem Projekt einen Namen
4. Erstelle das Projekt

## 2. Umgebungsvariablen einrichten

Erstelle eine `.env.local` Datei in deinem Projektverzeichnis:

```bash
# Gemini API (bereits vorhanden)
GEMINI_API_KEY=your_gemini_api_key

# Supabase Konfiguration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Nur für Server-seitige Operationen (z.B. Admin-Features)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Erklärung der Keys:**
- `ANON_KEY`: Für Client-seitige Operationen (öffentlich sichtbar, respektiert RLS)
- `SERVICE_ROLE_KEY`: Für Server-seitige Operationen (geheim, umgeht RLS)

Die Keys findest du in deinem Supabase Dashboard unter "Settings" > "API".

## 3. Datenbank-Tabellen erstellen

Führe folgende SQL-Befehle in deinem Supabase SQL Editor aus:

### Chats Tabelle

```sql
-- Chats Tabelle erstellen
CREATE TABLE chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für bessere Performance
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
```

### Messages Tabelle

```sql
-- Messages Tabelle erstellen
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    priority TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für bessere Performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
```

### Update Trigger für Chats

```sql
-- Funktion um updated_at automatisch zu aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für chats Tabelle
CREATE TRIGGER update_chats_updated_at 
    BEFORE UPDATE ON chats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 4. Row Level Security (RLS) Policies

### Option A: Öffentlicher Zugriff (für Entwicklung/Demo)

```sql
-- RLS für Chats aktivieren
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy für öffentlichen Zugriff auf Chats
CREATE POLICY "Public access to chats" ON chats
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- RLS für Messages aktivieren  
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy für öffentlichen Zugriff auf Messages
CREATE POLICY "Public access to messages" ON messages
    FOR ALL 
    USING (true)
    WITH CHECK (true);
```

### Option B: Session-basierter Zugriff (empfohlen)

```sql
-- RLS für Chats aktivieren
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Chats Policies - basierend auf Session ID
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT 
    USING (true); -- Vorerst alle lesen erlauben

CREATE POLICY "Users can insert their own chats" ON chats
    FOR INSERT 
    WITH CHECK (true); -- Vorerst alle erstellen erlauben

CREATE POLICY "Users can update their own chats" ON chats
    FOR UPDATE 
    USING (true) -- Vorerst alle updaten erlauben
    WITH CHECK (true);

CREATE POLICY "Users can delete their own chats" ON chats
    FOR DELETE 
    USING (true); -- Vorerst alle löschen erlauben

-- RLS für Messages aktivieren
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Users can view messages of accessible chats" ON messages
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id
        )
    );

CREATE POLICY "Users can insert messages to accessible chats" ON messages
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id
        )
    );

CREATE POLICY "Users can update messages in accessible chats" ON messages
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id
        )
    );

CREATE POLICY "Users can delete messages in accessible chats" ON messages
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE chats.id = messages.chat_id
        )
    );
```

### Option C: Zukünftig mit Auth (für Produktion)

```sql
-- Später: Spalten für Benutzer-ID hinzufügen
-- ALTER TABLE chats ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Beispiel für Auth-basierte Policies:
-- CREATE POLICY "Users can only access their own chats" ON chats
--     FOR ALL USING (auth.uid() = user_id);
```

## 5. Policies testen

```sql
-- Test: Chat erstellen
INSERT INTO chats (title) VALUES ('Test Chat');

-- Test: Nachricht hinzufügen
INSERT INTO messages (chat_id, role, content) 
VALUES (
    (SELECT id FROM chats ORDER BY created_at DESC LIMIT 1),
    'user',
    'Test Nachricht'
);

-- Test: Daten abrufen
SELECT 
    c.id,
    c.title,
    c.created_at,
    COUNT(m.id) as message_count
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id, c.title, c.created_at
ORDER BY c.updated_at DESC;
```

## 6. Testen

Nach dem Setup solltest du:

1. `npm run dev` ausführen
2. Einen Chat starten
3. Eine Nachricht senden
4. Auf "Speichern" klicken
5. In der Sidebar sollte der gespeicherte Chat erscheinen

## 7. Später: Benutzer-Authentifizierung

Für eine produktive Anwendung solltest du Benutzer-Authentifizierung hinzufügen:

1. Supabase Auth aktivieren
2. `user_id` Spalten zu den Tabellen hinzufügen
3. RLS Policies anpassen für echte Benutzer-Isolation

## Troubleshooting

- **"TypeError: Cannot read properties of undefined"**: Überprüfe deine Umgebungsvariablen
- **"403 Forbidden"**: Überprüfe deine RLS Policies
- **"relation does not exist"**: Stelle sicher, dass die Tabellen erstellt wurden
- **"row-level security policy"**: Führe die Policy-SQL-Befehle aus

## Security Hinweise

⚠️ **Wichtig**: Die aktuellen Policies erlauben öffentlichen Zugriff. Für Produktion solltest du:

1. **Benutzer-Authentifizierung** implementieren
2. **Policies verschärfen** (nur eigene Chats zugreifen)
3. **Rate Limiting** einrichten
4. **Validierung** auf Datenbank-Ebene

## Features

✅ **Persistente Chat-Speicherung**  
✅ **Chat-Verlauf in Sidebar**  
✅ **Ein-/ausklappbare Sidebar**  
✅ **Automatisches Speichern**  
✅ **Chat-Titel aus erster Nachricht**  
✅ **Chat löschen**  
✅ **Lokaler Fallback (localStorage)**  
✅ **RLS Security Policies**  
✅ **Performance-optimierte Indizes** 