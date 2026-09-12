// ============================================================
// SD-UCP Datenbank-Verbindung fuer Supabase
// ============================================================
// Diese Datei ersetzt automatisch localStorage durch Supabase.
// Einfuegen in index.html VOR ucp.js:
//   <script src="supabase-config.js"></script>
//   <script src="ucp.js"></script>
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // ERSETZE DIESEN CODE mit deinen Werten aus Supabase Dashboard
    // Settings -> API
    // ============================================================
    const SUPABASE_URL = 'https://cboebolulstptnipjqdz.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2Vib2x1bHN0cHRuaXBqcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTU1ODYsImV4cCI6MjEwNDczMTU4Nn0.m_gmscp79269OrqkIF0hXYodpSrnvCuSvsmFi16yZps';

    // ============================================================
    // SUPABASE CLIENT
    // ============================================================
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Mapping: localStorage Key -> Supabase Tabelle
    const TABLE_MAP = {
        'ucp_users': 'users',
        'ucp_officers': 'officers',
        'ucp_rechnungen': 'rechnungen',
        'ucp_streifen': 'streifen',
        'ucp_mitarbeiter': 'mitarbeiter',
        'ucp_units': 'units',
        'ucp_nachrichten': 'nachrichten',
        'ucp_termine': 'termine',
        'ucp_news': 'news',
        'ucp_ausbildungen': 'ausbildungen',
        'ucp_cases': 'cases',
        'ucp_akten': 'akten',
        'ucp_personalakten': 'personalakten',
        'ucp_berichte': 'berichte',
        'ucp_mediathek': 'mediathek',
        'ucp_settings': 'settings'
    };

    // Die ucp.js speichert Daten als JSON-String in localStorage
    // In der Datenbank sind sie als JSONB oder als einzelne Zeilen
    // Hier mappen wir das.

    // Einige Tabellen haben eine flache Struktur (users, settings)
    // Andere sind Listen (officers, mitarbeiter, etc.)
    const FLAT_TABLES = ['settings'];

    // ============================================================
    // HILFSFUNKTIONEN
    // ============================================================

    // Prueft ob Supabase erreichbar ist
    let _dbReady = false;

    async function _testConnection() {
        try {
            const { error } = await _supabase.from('settings').select('key').limit(1);
            if (error) {
                console.warn('Supabase Verbindung fehlgeschlagen:', error.message);
                console.warn('Lokaler Modus wird verwendet (localStorage)');
                return false;
            }
            _dbReady = true;
            console.log('Supabase Verbunden!');
            return true;
        } catch (e) {
            console.warn('Supabase nicht erreichbar:', e.message);
            return false;
        }
    }

    // ============================================================
    // DATEN AUS DATENBANK LADEN (beim Start)
    // ============================================================

    async function _loadAllFromDB() {
        if (!_dbReady) return;

        for (const [localKey, tableName] of Object.entries(TABLE_MAP)) {
            try {
                if (FLAT_TABLES.includes(tableName)) {
                    // Settings: Key-Value Paare -> Objekt
                    const { data, error } = await _supabase.from(tableName).select('*');
                    if (!error && data) {
                        const obj = {};
                        data.forEach(row => { obj[row.key] = row.value; });
                        localStorage.setItem(localKey, JSON.stringify(obj));
                    }
                } else {
                    // Listen: Alle Zeilen -> Array
                    const { data, error } = await _supabase.from(tableName).select('*');
                    if (!error && data) {
                        // Felder umbenennen fuer Kompatibilitaet mit ucp.js
                        const normalized = data.map(_normalizeFromDB);
                        localStorage.setItem(localKey, JSON.stringify(normalized));
                    }
                }
            } catch (e) {
                console.warn(`Fehler beim Laden von ${tableName}:`, e.message);
            }
        }

        // currentUser neu laden
        const cu = JSON.parse(localStorage.getItem('ucp_currentUser'));
        if (cu && cu.username) {
            const { data } = await _supabase.from('users').select('*').eq('username', cu.username).single();
            if (data) {
                const normalized = _normalizeFromDB(data);
                localStorage.setItem('ucp_currentUser', JSON.stringify(normalized));
            }
        }

        console.log('Alle Daten aus Supabase geladen!');
    }

    // ============================================================
    // DATEN IN DATENBANK SPEICHERN (async)
    // ============================================================

    async function _saveToDB(localKey, value) {
        if (!_dbReady) return;

        const tableName = TABLE_MAP[localKey];
        if (!tableName) return;

        try {
            if (FLAT_TABLES.includes(tableName)) {
                // Settings: Objekt -> Key-Value Paare
                const obj = typeof value === 'string' ? JSON.parse(value) : value;
                for (const [key, val] of Object.entries(obj)) {
                    await _supabase.from(tableName)
                        .upsert({ key, value: String(val), updated_at: new Date().toISOString() }, { onConflict: 'key' });
                }
            } else if (tableName === 'users') {
                // Users: Jeder User als eigene Zeile
                const arr = typeof value === 'string' ? JSON.parse(value) : value;
                for (const user of arr) {
                    const row = _normalizeToDB(user);
                    await _supabase.from(tableName)
                        .upsert(row, { onConflict: 'username' });
                }
            } else {
                // Listen: Array -> Einzelne Zeilen
                const arr = typeof value === 'string' ? JSON.parse(value) : value;
                // Alles loeschen und neu einfuegen (einfachste Methode)
                await _supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (arr && arr.length > 0) {
                    const rows = arr.map(_normalizeToDB);
                    // In Batches von 50 einfuegen
                    for (let i = 0; i < rows.length; i += 50) {
                        await _supabase.from(tableName).insert(rows.slice(i, i + 50));
                    }
                }
            }
        } catch (e) {
            console.warn(`Fehler beim Speichern in ${tableName}:`, e.message);
        }
    }

    // ============================================================
    // DATEN-NORMALISIERUNG (DB <-> ucp.js Kompatibilitaet)
    // ============================================================

    function _normalizeFromDB(row) {
        // Supabase Felder -> ucp.js Felder
        if (row.full_name !== undefined) row.fullName = row.full_name;
        if (row.user_id !== undefined) row.userId = row.user_id;
        if (row.created_at !== undefined) row.createdAt = row.created_at;
        // cases Felder
        if (row.fallfuehrer !== undefined) row.fallfuehrer = row.fallfuehrer;
        if (row.beteiligte !== undefined) row.beteiligte = row.beteiligte;
        if (row.bericht !== undefined) row.bericht = row.bericht;
        return row;
    }

    function _normalizeToDB(obj) {
        // ucp.js Felder -> Supabase Felder
        const row = { ...obj };
        if (row.fullName !== undefined) { row.full_name = row.fullName; delete row.fullName; }
        if (row.userId !== undefined) { row.user_id = row.userId; delete row.userId; }
        if (row.createdAt !== undefined) { row.created_at = row.createdAt; delete row.createdAt; }
        // UUID entfernen wenn leer (damit Supabase einen neuen erstellt)
        if (row.id === '' || row.id === undefined || row.id === null) delete row.id;
        // created_at immer setzen
        if (!row.created_at) row.created_at = new Date().toISOString();
        return row;
    }

    // ============================================================
    // localStorage INTERCEPTOR
    // ============================================================

    // Originale localStorage Methoden merken
    const _originalSetItem = localStorage.setItem.bind(localStorage);
    const _originalGetItem = localStorage.getItem.bind(localStorage);

    // localStorage.setItem ueberschreiben
    localStorage.setItem = function(key, value) {
        // Immer lokal speichern (schnell)
        _originalSetItem(key, value);

        // Wenn es eine Tabelle ist, auch in Supabase speichern
        if (TABLE_MAP[key]) {
            // Async ohne await (Hintergrund-Sync)
            _saveToDB(key, value).catch(e => console.warn('DB Sync Fehler:', e));
        }
    };

    // ============================================================
    // INITIALISIERUNG
    // ============================================================

    async function _init() {
        console.log('SD-UCP Datenbank-Verbindung wird initialisiert...');

        // Testen ob Supabase erreichbar ist
        const connected = await _testConnection();

        if (connected) {
            // Alle Daten aus der Datenbank laden
            await _loadAllFromDB();
            console.log('Datenbank bereit!');
        } else {
            console.log('Lokaler Modus aktiv (localStorage)');
        }
    }

    // Starten wenn DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
