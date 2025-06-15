-- Tabelle für gespeicherte Prompts erstellen
CREATE TABLE prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für bessere Performance bei Suchanfragen
CREATE INDEX idx_prompts_created_at ON prompts(created_at);
CREATE INDEX idx_prompts_title ON prompts(title);

-- RLS (Row Level Security) aktivieren für Sicherheit
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Policy erstellen - alle können lesen, erstellen, bearbeiten und löschen
-- (später kann hier eine benutzerspezifische Logik hinzugefügt werden)
CREATE POLICY "Jeder kann Prompts verwalten" ON prompts
    FOR ALL USING (true)
    WITH CHECK (true);

-- Trigger für automatische Aktualisierung des updated_at Feldes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE
    ON prompts FOR EACH ROW EXECUTE FUNCTION
    update_updated_at_column();

-- Beispiel-Prompts einfügen (optional)
INSERT INTO prompts (title, text) VALUES 
    ('E-Mail Antwort auf Stellenangebot', 'Schreibe eine professionelle Antwort auf ein Stellenangebot. Zeige Interesse und frage nach nächsten Schritten.'),
    ('To-Do Liste erstellen', 'Erstelle eine strukturierte To-Do Liste für ein persönliches Projekt mit Prioritäten und Zeitschätzungen.'),
    ('Artikel zusammenfassen', 'Fasse diesen Artikel in einem Absatz zusammen und hebe die wichtigsten Punkte hervor.'),
    ('Kreativer Schreibimpuls', 'Schreibe eine kurze Geschichte basierend auf dem folgenden Szenario:'),
    ('Meeting Protokoll', 'Erstelle ein professionelles Meeting-Protokoll mit Agenda, Teilnehmern, Entscheidungen und Aufgaben.'); 