-- ============================================================
-- ALLE TABELLEN ERSETZEN (DROP + CREATE)
-- ============================================================

-- Alle bestehenden Tabellen loeschen und neu erstellen
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS mitarbeiter CASCADE;
DROP TABLE IF EXISTS officers CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS akten CASCADE;
DROP TABLE IF EXISTS personalakten CASCADE;
DROP TABLE IF EXISTS nachrichten CASCADE;
DROP TABLE IF EXISTS termine CASCADE;
DROP TABLE IF EXISTS rechnungen CASCADE;
DROP TABLE IF EXISTS streifen CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS ausbildungen CASCADE;
DROP TABLE IF EXISTS berichte CASCADE;
DROP TABLE IF EXISTS mediathek CASCADE;
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS personen CASCADE;

-- 1. BENUTZER
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    rank VARCHAR(50) DEFAULT '18 - Rookie',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. MITARBEITER
CREATE TABLE mitarbeiter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vorname VARCHAR(100) NOT NULL DEFAULT '',
    nachname VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    rang VARCHAR(50) DEFAULT '18 - Rookie',
    abteilung VARCHAR(100) DEFAULT '',
    funktion TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'Aktiv',
    eintritt VARCHAR(20) DEFAULT '',
    telefon VARCHAR(50) DEFAULT '',
    email VARCHAR(100) DEFAULT '',
    adresse TEXT DEFAULT '',
    geburtstag VARCHAR(20) DEFAULT '',
    notfallkontakt VARCHAR(100) DEFAULT '',
    ausbildungen JSONB DEFAULT '{}',
    user_id TEXT DEFAULT ''
);
ALTER TABLE mitarbeiter DISABLE ROW LEVEL SECURITY;

-- 3. LEITSTELLE (OFFICERS)
CREATE TABLE officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT '',
    dienstnr VARCHAR(20) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offline',
    einsatzfeld VARCHAR(100) DEFAULT '',
    position VARCHAR(100) DEFAULT '',
    fahrzeug VARCHAR(100) DEFAULT '',
    code INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE officers DISABLE ROW LEVEL SECURITY;

-- 4. CASE MANAGEMENT
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    aktenzeichen VARCHAR(50) DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offen',
    prioritaet VARCHAR(50) DEFAULT 'Mittel',
    fallfuehrer VARCHAR(100) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    beteiligte TEXT[] DEFAULT '{}',
    beschreibung TEXT DEFAULT '',
    notizen TEXT DEFAULT '',
    erstellt_von VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;

-- 5. AKTEN
CREATE TABLE akten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aktenzeichen VARCHAR(50) DEFAULT '',
    titel VARCHAR(200) NOT NULL DEFAULT '',
    kategorie VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offen',
    autor VARCHAR(100) DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    inhalt TEXT DEFAULT '',
    link TEXT DEFAULT '',
    case_id VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE akten DISABLE ROW LEVEL SECURITY;

-- 6. PERSONALAKTEN
CREATE TABLE personalakten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mitarbeiter VARCHAR(200) DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    ersteller VARCHAR(100) DEFAULT '',
    betreff VARCHAR(200) DEFAULT '',
    inhalt TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE personalakten DISABLE ROW LEVEL SECURITY;

-- 7. NACHRICHTEN
CREATE TABLE nachrichten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    von VARCHAR(100) DEFAULT '',
    an VARCHAR(100) DEFAULT '',
    betreff VARCHAR(200) DEFAULT '',
    nachricht TEXT DEFAULT '',
    gelesen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE nachrichten DISABLE ROW LEVEL SECURITY;

-- 8. TERMINE
CREATE TABLE termine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    beschreibung TEXT DEFAULT '',
    datum VARCHAR(20) NOT NULL DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    typ VARCHAR(100) DEFAULT 'Termin',
    ort VARCHAR(200) DEFAULT '',
    erstellt_von VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE termine DISABLE ROW LEVEL SECURITY;

-- 9. RECHNUNGEN
CREATE TABLE rechnungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    betrag DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Offen',
    kategorie VARCHAR(100) DEFAULT '',
    bemerkung TEXT DEFAULT '',
    datum VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE rechnungen DISABLE ROW LEVEL SECURITY;

-- 10. STREIFEN
CREATE TABLE streifen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nummer INTEGER NOT NULL DEFAULT 1,
    fahrzeug VARCHAR(100) DEFAULT '',
    gebiet VARCHAR(100) DEFAULT '',
    max_plaetze INTEGER DEFAULT 4,
    besetzung TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE streifen DISABLE ROW LEVEL SECURITY;

-- 11. UNITS
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL DEFAULT '',
    kuerzel VARCHAR(20) DEFAULT '',
    beschreibung TEXT DEFAULT '',
    leiter VARCHAR(100) DEFAULT '',
    mitglieder TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE units DISABLE ROW LEVEL SECURITY;

-- 12. AUSBILDUNGEN
CREATE TABLE ausbildungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Geplant',
    datum VARCHAR(20) DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    beschreibung TEXT DEFAULT '',
    ausbilder VARCHAR(100) DEFAULT '',
    plaetze INTEGER DEFAULT 20,
    teilnehmer TEXT[] DEFAULT '{}',
    teilnehmer_notizen JSONB DEFAULT '{}',
    bewertungen JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE ausbildungen DISABLE ROW LEVEL SECURITY;

-- 13. EINSATZBERICHTE
CREATE TABLE berichte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    typ VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'Offen',
    datum VARCHAR(20) DEFAULT '',
    uhrzeit VARCHAR(20) DEFAULT '',
    ort VARCHAR(200) DEFAULT '',
    beteiligte TEXT[] DEFAULT '{}',
    vorfall TEXT DEFAULT '',
    massnahmen TEXT DEFAULT '',
    aktenzeichen VARCHAR(50) DEFAULT '',
    autor VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE berichte DISABLE ROW LEVEL SECURITY;

-- 14. MEDIATHEK
CREATE TABLE mediathek (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    kategorie VARCHAR(100) DEFAULT '',
    autor VARCHAR(100) DEFAULT '',
    inhalt TEXT DEFAULT '',
    link TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mediathek DISABLE ROW LEVEL SECURITY;

-- 15. NEWS
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel VARCHAR(200) NOT NULL DEFAULT '',
    inhalt TEXT DEFAULT '',
    kategorie VARCHAR(100) DEFAULT '',
    autor VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE news DISABLE ROW LEVEL SECURITY;

-- 16. SETTINGS
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 17. PERSONEN-AKTEN
CREATE TABLE personen (
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

-- ============================================================
-- DEFAULT ADMIN ACCOUNT
-- ============================================================
INSERT INTO users (username, password, full_name, dienstnr, rank, is_admin)
VALUES ('Miguel.Hauser', 'admin123', 'Miguel Hauser', '0001', '00 - Sheriff Techniker', TRUE)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
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
