// SD-UCP Supabase Datenbank
(function() {
    'use strict';

    var URL = 'https://cboebolulstptnipjqdz.supabase.co';
    var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2Vib2x1bHN0cHRuaXBqcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTU1ODYsImV4cCI6MjEwNDczMTU4Nn0.m_gmscp79269OrqkIF0hXYodpSrnvCuSvsmFi16yZps';

    var TABLES = {
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
        'ucp_settings': 'settings',
        'ucp_personen': 'personen'
    };

    var DB_FIELDS = {
        'users': ['username', 'password', 'full_name', 'dienstnr', 'rank', 'is_admin', 'created_at'],
        'officers': ['name', 'dienstnr', 'status', 'einsatzfeld', 'position', 'fahrzeug', 'code', 'updated_at'],
        'mitarbeiter': ['vorname', 'nachname', 'dienstnr', 'rang', 'abteilung', 'funktion', 'status', 'eintritt', 'telefon', 'email', 'adresse', 'geburtstag', 'notfallkontakt', 'ausbildungen', 'user_id'],
        'cases': ['titel', 'aktenzeichen', 'typ', 'status', 'prioritaet', 'fallfuehrer', 'ort', 'beteiligte', 'beschreibung', 'notizen', 'erstellt_von', 'created_at'],
        'akten': ['aktenzeichen', 'titel', 'kategorie', 'status', 'autor', 'datum', 'inhalt', 'link', 'case_id', 'created_at'],
        'personalakten': ['mitarbeiter', 'typ', 'datum', 'ersteller', 'betreff', 'inhalt', 'created_at'],
        'nachrichten': ['von', 'an', 'betreff', 'nachricht', 'gelesen', 'created_at'],
        'termine': ['titel', 'beschreibung', 'datum', 'uhrzeit', 'typ', 'ort', 'erstellt_von', 'created_at'],
        'rechnungen': ['titel', 'betrag', 'status', 'kategorie', 'bemerkung', 'datum', 'created_at'],
        'streifen': ['nummer', 'fahrzeug', 'gebiet', 'max_plaetze', 'besetzung', 'created_at'],
        'units': ['name', 'kuerzel', 'beschreibung', 'leiter', 'mitglieder', 'created_at'],
        'ausbildungen': ['titel', 'typ', 'status', 'datum', 'uhrzeit', 'ort', 'beschreibung', 'ausbilder', 'plaetze', 'teilnehmer', 'teilnehmer_notizen', 'bewertungen', 'created_at'],
        'berichte': ['titel', 'typ', 'status', 'datum', 'uhrzeit', 'ort', 'beteiligte', 'vorfall', 'massnahmen', 'aktenzeichen', 'autor', 'created_at'],
        'mediathek': ['titel', 'kategorie', 'autor', 'inhalt', 'link', 'created_at'],
        'news': ['titel', 'inhalt', 'kategorie', 'autor', 'created_at'],
        'settings': ['key', 'value', 'updated_at'],
        'personen': ['name', 'telefon', 'geburtstag', 'adresse', 'notizen', 'gesucht', 'gesucht_grund', 'akten', 'user_id']
    };

    var _s = null;
    var _loading = false;
    var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    function waitForLib(cb, n) {
        n = n || 0;
        if (n > 20) { cb(null); return; }
        if (window.supabase && window.supabase.createClient) { cb(window.supabase); }
        else { setTimeout(function() { waitForLib(cb, n + 1); }, 500); }
    }

    // ============================================================
    // TO/FROM DB ROW
    // ============================================================
    function toDBRow(obj, table) {
        var fields = DB_FIELDS[table];
        if (!fields) return obj;
        var row = {};
        if (obj.id && typeof obj.id === 'string' && UUID_RE.test(obj.id)) { row.id = obj.id; }
        fields.forEach(function(f) {
            if (obj[f] !== undefined) {
                if (obj[f] === '' && (f.includes('datum') || f.includes('date') || f === 'geburtstag')) { row[f] = null; return; }
                row[f] = obj[f]; return;
            }
            if (f === 'full_name' && obj.fullName) { row[f] = obj.fullName; return; }
            if (f === 'rank' && obj.rang) { row[f] = obj.rang; return; }
            if (f === 'is_admin' && obj.isAdmin !== undefined) { row[f] = obj.isAdmin; return; }
            if (f === 'gesucht_grund' && obj.gesuchtGrund) { row[f] = obj.gesuchtGrund; return; }
            if (f === 'erstellt_von' && obj.erstelltVon) { row[f] = obj.erstelltVon; return; }
            if (f === 'teilnehmer_notizen' && obj.teilnehmerNotizen) { row[f] = obj.teilnehmerNotizen; return; }
            if (f === 'created_at') { row[f] = obj.createdAt || new Date().toISOString(); return; }
            if (f === 'updated_at') { row[f] = new Date().toISOString(); return; }
        });
        return row;
    }

    function fromDBRow(row) {
        if (!row) return row;
        if (row.full_name !== undefined && !row.fullName) row.fullName = row.full_name;
        if (row.rank !== undefined && !row.rang) row.rang = row.rank;
        if (row.is_admin !== undefined && row.isAdmin === undefined) row.isAdmin = row.is_admin;
        if (row.gesucht_grund !== undefined && !row.gesuchtGrund) row.gesuchtGrund = row.gesucht_grund;
        if (row.erstellt_von !== undefined && !row.erstelltVon) row.erstelltVon = row.erstellt_von;
        if (row.teilnehmer_notizen !== undefined && !row.teilnehmerNotizen) row.teilnehmerNotizen = row.teilnehmer_notizen;
        if (row.created_at !== undefined && !row.createdAt) row.createdAt = row.created_at;
        return row;
    }

    // ============================================================
    // LADEN AUS DB - Ueberschreibt localStorage komplett
    // ============================================================
    function loadAllFromDB(callback) {
        if (!_s) { callback(); return; }
        _loading = true;
        var keys = Object.keys(TABLES);
        var done = 0;

        keys.forEach(function(key) {
            var table = TABLES[key];

            if (table === 'settings') {
                _s.from(table).select('*').then(function(res) {
                    if (!res.error && res.data) {
                        var obj = {};
                        res.data.forEach(function(r) { obj[r.key] = r.value; });
                        localStorage.setItem(key, JSON.stringify(obj));
                    }
                    checkDone();
                }).catch(function() { checkDone(); });
                return;
            }

            _s.from(table).select('*').then(function(res) {
                if (!res.error) {
                    var data = (res.data || []).map(fromDBRow);
                    localStorage.setItem(key, JSON.stringify(data));
                }
                checkDone();
            }).catch(function() { checkDone(); });
        });

        function checkDone() {
            done++;
            if (done === keys.length) { _loading = false; callback(); }
        }
    }

    // ============================================================
    // SPEICHERN IN DB - Intelligent: Nur Aenderungen
    // ============================================================
    function saveTableToDB(key) {
        if (!_s || _loading) return Promise.resolve();
        var table = TABLES[key];
        if (!table) return Promise.resolve();
        var raw = localStorage.getItem(key);
        if (!raw) return Promise.resolve();

        try {
            var data = JSON.parse(raw);
            if (!data) return Promise.resolve();

            // Settings: Key-Value Upsert
            if (table === 'settings') {
                if (typeof data === 'object' && !Array.isArray(data)) {
                    var proms = Object.keys(data).map(function(k) {
                        return _s.from(table).upsert({ key: k, value: String(data[k]), updated_at: new Date().toISOString() }, { onConflict: 'key' });
                    });
                    return Promise.all(proms).then(function() {
                        console.log('[DB] ' + table + ': gespeichert');
                    }).catch(function(e) {
                        console.warn('[DB] ' + table + ' Fehler:', e.message);
                    });
                }
                return Promise.resolve();
            }

            if (!Array.isArray(data)) return Promise.resolve();

            // Alle existierenden Rows aus DB holen
            return _s.from(table).select('id').then(function(res) {
                if (res.error) {
                    console.warn('[DB] ' + table + ' select:', res.error.message);
                    return Promise.resolve();
                }

                var dbIds = (res.data || []).map(function(r) { return r.id; }).filter(Boolean);
                var uuidRe = UUID_RE;

                // IDs aus localStorage die gueltige UUIDs haben
                var localIdsWithUuid = data.filter(function(r) { return r.id && uuidRe.test(r.id); }).map(function(r) { return r.id; });

                // 1. Loeschen: DB-Ids die NICHT in localStorage sind
                var toDelete = dbIds.filter(function(id) { return localIdsWithUuid.indexOf(id) === -1; });
                var deleteProms = toDelete.map(function(id) { return _s.from(table).delete().eq('id', id); });

                // 2. Einfuegen: Items OHNE gueltige UUID (neu erstellt)
                var toInsert = data.filter(function(r) { return !r.id || !uuidRe.test(r.id); }).map(function(r) { return toDBRow(r, table); });

                return Promise.all(deleteProms).then(function() {
                    if (toInsert.length === 0) return Promise.resolve();
                    return _s.from(table).insert(toInsert);
                }).then(function(res) {
                    if (res && res.error) {
                        console.warn('[DB] ' + table + ' insert:', res.error.message);
                    } else if (toInsert.length > 0) {
                        console.log('[DB] ' + table + ': ' + toInsert.length + ' neue Zeilen');
                    }
                });
            });
        } catch(e) {
            console.warn('[DB] ' + table + ' Fehler:', e.message);
            return Promise.resolve();
        }
    }

    function saveAllToDB() {
        if (!_s || _loading) return;
        Object.keys(TABLES).forEach(function(key) { saveTableToDB(key); });
    }

    // ============================================================
    // LOGIN UEBER DB
    // ============================================================
    function setupDBLogin() {
        var form = document.getElementById('formLogin');
        if (!form || form._dbHandler) return;
        form._dbHandler = function(e) {
            var user = document.getElementById('loginUser').value.trim();
            var pass = document.getElementById('loginPass').value;
            if (!_s) return;
            e.preventDefault();
            e.stopPropagation();

            _s.from('users').select('*').eq('username', user).single().then(function(res) {
                if (res.error || !res.data) {
                    document.getElementById('loginError').textContent = 'Benutzername oder Passwort falsch.';
                    document.getElementById('loginError').style.display = 'block';
                    return;
                }
                var dbUser = fromDBRow(res.data);
                if (dbUser.password !== pass) {
                    document.getElementById('loginError').textContent = 'Benutzername oder Passwort falsch.';
                    document.getElementById('loginError').style.display = 'block';
                    return;
                }
                localStorage.setItem('ucp_currentUser', JSON.stringify(dbUser));
                loadAllFromDB(function() { location.reload(); });
            }).catch(function(err) {
                console.warn('[DB] Login Fehler:', err.message);
            });
        };
        form.addEventListener('submit', form._dbHandler);
    }

    function waitForApp(cb, n) {
        n = n || 0;
        if (n > 40) { cb(); return; }
        if (document.getElementById('sidebarNav') && document.getElementById('formLogin')) { cb(); }
        else { setTimeout(function() { waitForApp(cb, n + 1); }, 250); }
    }

    // ============================================================
    // START
    // ============================================================
    waitForLib(function(supabase) {
        if (!supabase) { console.warn('[DB] Supabase nicht verfuegbar'); return; }
        try {
            _s = supabase.createClient(URL, KEY);
            console.log('[DB] Supabase Client bereit!');

            waitForApp(function() {
                loadAllFromDB(function() {
                    console.log('[DB] Alle Daten aus der Datenbank geladen!');
                    setupDBLogin();

                    var origSetItem = localStorage.setItem.bind(localStorage);
                    localStorage.setItem = function(key, value) {
                        origSetItem(key, value);
                        if (!_loading && TABLES[key]) { saveTableToDB(key); }
                    };

                    setInterval(function() {
                        loadAllFromDB(function() { console.log('[DB] Aktualisiert!'); });
                    }, 10000);

                    setInterval(saveAllToDB, 60000);
                });
            });
        } catch(e) { console.warn('[DB] Fehler:', e.message); }
    });

})();
