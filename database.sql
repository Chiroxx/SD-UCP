-- ============================================================
-- SD-UCP Datenbank Schema fuer Supabase
-- Kopiere diesen gesamten Code in den Supabase SQL Editor
-- und klicke auf "Run"
-- ============================================================

-- 1. BENUTZER
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    rank VARCHAR(50) DEFAULT '18 - Rookie',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MITARBEITER
CREATE TABLE IF NOT EXISTS mitarbeiter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vorname VARCHAR(100) NOT NULL DEFAULT '',
    nachname VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    rang VARCHAR(50) DEFAULT '18 - Rookie',
    abteilung VARCHAR(100) DEFAULT '',
    funktion TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'aktiv',
    eintrittsdatum VARCHAR(20) DEFAULT '',
    telefon VARCHAR(50) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    adresse TEXT DEFAULT '',
    geburtstag VARCHAR(20) DEFAULT '',
    notfallkontakt VARCHAR(100) DEFAULT '',
    ausbildungen JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 3. LEITSTELLE (OFFICERS)
CREATE TABLE IF NOT EXISTS officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offline',
    einsatzfeld VARCHAR(100) DEFAULT '',
    position VARCHAR(50) DEFAULT '',
    fahrzeug VARCHAR(100) DEFAULT '',
    code INTEGER DEFAULT 6,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FAELLE (CASES)
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    aktenzeichen VARCHAR(50) DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offen',
    prioritaet VARCHAR(20) DEFAULT 'Mittel',
    fallfuehrer VARCHAR(100) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    beteiligte TEXT DEFAULT '',
    beschreibung TEXT DEFAULT '',
    notizen TEXT DEFAULT '',
    erstellt_von VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AKTEN
CREATE TABLE IF NOT EXISTS akten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aktenzeichen VARCHAR(50) NOT NULL DEFAULT '',
    titel VARCHAR(200) NOT NULL DEFAULT '',
    kategorie VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Aktuell',
    autor VARCHAR(100) DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    inhalt TEXT DEFAULT '',
    link TEXT DEFAULT '',
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PERSONALAKTEN
CREATE TABLE IF NOT EXISTS personalakten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mitarbeiter VARCHAR(100) NOT NULL DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    ersteller VARCHAR(100) DEFAULT '',
    betreff VARCHAR(200) DEFAULT '',
    inhalt TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NACHRICHTEN
CREATE TABLE IF NOT EXISTS nachrichten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    von VARCHAR(100) NOT NULL DEFAULT '',
    an VARCHAR(100) NOT NULL DEFAULT '',
    betreff VARCHAR(200) DEFAULT '',
    nachricht TEXT DEFAULT '',
    gelesen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TERMINE
CREATE TABLE IF NOT EXISTS termine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    beschreibung TEXT DEFAULT '',
    datum VARCHAR(20) NOT NULL DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    typ VARCHAR(100) DEFAULT 'Termin',
    erstellt_von VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. RECHNUNGEN
CREATE TABLE IF NOT EXISTS rechnungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    betrag DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Offen',
    kategorie VARCHAR(100) DEFAULT '',
    bemerkung TEXT DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. STREIFEN
CREATE TABLE IF NOT EXISTS streifen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nummer INTEGER NOT NULL DEFAULT 1,
    fahrzeug VARCHAR(100) DEFAULT '',
    gebiet VARCHAR(100) DEFAULT '',
    max_plaetze INTEGER DEFAULT 4,
    besetzung TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. UNITS
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT '',
    kuerzel VARCHAR(20) DEFAULT '',
    beschreibung TEXT DEFAULT '',
    leiter VARCHAR(100) DEFAULT '',
    mitglieder TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. AUSBILDUNGEN
CREATE TABLE IF NOT EXISTS ausbildungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Geplant',
    datum VARCHAR(20) DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    ausbilder VARCHAR(100) DEFAULT '',
    plaetze INTEGER DEFAULT 20,
    teilnehmer TEXT[] DEFAULT '{}',
    bewertungen JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. EINSATZBERICHTE
CREATE TABLE IF NOT EXISTS berichte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offen',
    datum VARCHAR(20) DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    beteiligte TEXT DEFAULT '',
    vorfall TEXT DEFAULT '',
    massnahmen TEXT DEFAULT '',
    aktenzeichen VARCHAR(50) DEFAULT '',
    autor VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. MEDIATHEK
CREATE TABLE IF NOT EXISTS mediathek (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    kategorie VARCHAR(100) DEFAULT '',
    autor VARCHAR(100) DEFAULT '',
    inhalt TEXT DEFAULT '',
    link TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. NEWS
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    inhalt TEXT DEFAULT '',
    kategorie VARCHAR(100) DEFAULT 'Info',
    autor VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. EINSTELLUNGEN
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STANDARD-DATEN
-- ============================================================

-- Admin Account
INSERT INTO users (username, password, full_name, dienstnr, rank, is_admin)
VALUES ('Miguel.Hauser', 'admin123', 'Miguel Hauser', '0001', '00 - Sheriff Techniker', TRUE)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- PERSONEN-AKTEN
-- ============================================================
CREATE TABLE IF NOT EXISTS personen (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    telefon TEXT,
    geburtstag DATE,
    adresse TEXT,
    notizen TEXT,
    gesucht BOOLEAN DEFAULT FALSE,
    gesucht_grund TEXT,
    akten JSONB DEFAULT '[]',
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE personen DISABLE ROW LEVEL SECURITY;

-- Standard-Einstellungen
INSERT INTO settings (key, value) VALUES
('registrierung', 'true'),
('app_version', '3.6'),
('banner_url', ''),
('dashboard_titel', 'Willkommen beim Sheriff Department'),
('dashboard_untertitel', 'Blaine County Sheriff Department - UCP'),
('welcome_message', 'Willkommen beim Blaine County Sheriff Department UCP!'),
('toast_dauer', '3000'),
('session_timeout', '30'),
('accent_color', '#3b82f6'),
('sidebar_stil', 'dunkel'),
('leitstelle_max_officer', '8'),
('leitstelle_standard_status', 'Offline'),
('schichtplan_frueh', '06:00'),
('schichtplan_spaet', '14:00'),
('schichtplan_nacht', '22:00'),
('streifen_max', '4'),
('streifen_fahrzeug', 'Standard Streifenwagen')
ON CONFLICT (key) DO NOTHING;
