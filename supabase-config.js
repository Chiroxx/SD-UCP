// SD-UCP Supabase Datenbank - App laeuft komplett ueber die Datenbank
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
        'ucp_settings': 'settings'
    };

    var DB_FIELDS = {
        'users': ['id', 'username', 'password', 'full_name', 'dienstnr', 'rank', 'is_admin', 'created_at'],
        'officers': ['id', 'name', 'dienstnr', 'status', 'einsatzfeld', 'position', 'fahrzeug', 'code', 'updated_at'],
        'mitarbeiter': ['id', 'vorname', 'nachname', 'dienstnr', 'rang', 'abteilung', 'funktion', 'status', 'eintrittsdatum', 'telefon', 'email', 'adresse', 'geburtstag', 'notfallkontakt', 'ausbildungen', 'user_id'],
        'cases': ['id', 'titel', 'aktenzeichen', 'typ', 'status', 'prioritaet', 'fallfuehrer', 'ort', 'beteiligte', 'beschreibung', 'notizen', 'erstellt_von', 'created_at'],
        'akten': ['id', 'aktenzeichen', 'titel', 'kategorie', 'status', 'autor', 'datum', 'inhalt', 'link', 'case_id', 'created_at'],
        'personalakten': ['id', 'mitarbeiter', 'typ', 'datum', 'ersteller', 'betreff', 'inhalt', 'created_at'],
        'nachrichten': ['id', 'von', 'an', 'betreff', 'nachricht', 'gelesen', 'created_at'],
        'termine': ['id', 'titel', 'beschreibung', 'datum', 'uhrzeit', 'typ', 'erstellt_von', 'created_at'],
        'rechnungen': ['id', 'titel', 'betrag', 'status', 'kategorie', 'bemerkung', 'datum', 'created_at'],
        'streifen': ['id', 'nummer', 'fahrzeug', 'gebiet', 'max_plaetze', 'besetzung', 'created_at'],
        'units': ['id', 'name', 'kuerzel', 'beschreibung', 'leiter', 'mitglieder', 'created_at'],
        'ausbildungen': ['id', 'titel', 'typ', 'status', 'datum', 'uhrzeit', 'ort', 'ausbilder', 'plaetze', 'teilnehmer', 'bewertungen', 'created_at'],
        'berichte': ['id', 'titel', 'typ', 'status', 'datum', 'uhrzeit', 'ort', 'beteiligte', 'vorfall', 'massnahmen', 'aktenzeichen', 'autor', 'created_at'],
        'mediathek': ['id', 'titel', 'kategorie', 'autor', 'inhalt', 'link', 'created_at'],
        'news': ['id', 'titel', 'inhalt', 'kategorie', 'autor', 'created_at'],
        'settings': ['key', 'value', 'updated_at']
    };

    var _s = null;

    function waitForLib(cb, n) {
        n = n || 0;
        if (n > 20) { cb(null); return; }
        if (window.supabase && window.supabase.createClient) { cb(window.supabase); }
        else { setTimeout(function() { waitForLib(cb, n + 1); }, 500); }
    }

    function toDBRow(obj, table) {
        var fields = DB_FIELDS[table];
        if (!fields) return obj;
        var row = {};
        fields.forEach(function(f) {
            if (f === 'id') return;
            if (obj[f] !== undefined) { row[f] = obj[f]; return; }
            if (f === 'full_name' && obj.fullName) { row[f] = obj.fullName; return; }
            if (f === 'rank' && obj.rang) { row[f] = obj.rang; return; }
            if (f === 'is_admin' && obj.isAdmin !== undefined) { row[f] = obj.isAdmin; return; }
            if (f === 'created_at' && obj.createdAt) { row[f] = obj.createdAt; return; }
            if (f === 'updated_at') { row[f] = new Date().toISOString(); return; }
            if (obj[f] !== undefined) row[f] = obj[f];
        });
        return row;
    }

    function fromDBRow(row) {
        if (!row) return row;
        if (row.full_name !== undefined && !row.fullName) row.fullName = row.full_name;
        if (row.rank !== undefined && !row.rang) row.rang = row.rank;
        if (row.is_admin !== undefined && row.isAdmin === undefined) row.isAdmin = row.is_admin;
        if (row.created_at !== undefined && !row.createdAt) row.createdAt = row.created_at;
        return row;
    }

    function deduplicate(arr, key) {
        var seen = {};
        return arr.filter(function(item) {
            var k = key(item);
            if (seen[k]) return false;
            seen[k] = true;
            return true;
        });
    }

    function loadAllFromDB(callback) {
        if (!_s) { callback(); return; }
        var keys = Object.keys(TABLES);
        var done = 0;

        keys.forEach(function(key) {
            var table = TABLES[key];
            _s.from(table).select('*').then(function(res) {
                if (!res.error && res.data && res.data.length > 0) {
                    var data = res.data.map(fromDBRow);
                    if (table === 'users') {
                        data = deduplicate(data, function(u) { return u.username || u.id; });
                    } else if (table === 'mitarbeiter') {
                        data = deduplicate(data, function(m) { return (m.vorname || '') + '_' + (m.nachname || '') + '_' + (m.dienstnr || ''); });
                    } else {
                        data = deduplicate(data, function(r) { return r.id || JSON.stringify(r).substring(0, 50); });
                    }
                    localStorage.setItem(key, JSON.stringify(data));
                } else if (res.error) {
                    console.warn('[DB] Laden ' + table + ':', res.error.message);
                }
                done++;
                if (done === keys.length) callback();
            }).catch(function(e) {
                console.warn('[DB] Laden ' + table + ':', e.message);
                done++;
                if (done === keys.length) callback();
            });
        });
    }

    function saveTableToDB(key) {
        if (!_s) return Promise.resolve();
        var table = TABLES[key];
        if (!table) return Promise.resolve();
        var raw = localStorage.getItem(key);
        if (!raw) return Promise.resolve();

        try {
            var data = JSON.parse(raw);
            if (!Array.isArray(data)) return Promise.resolve();

            if (table === 'settings') {
                if (typeof data === 'object' && !Array.isArray(data)) {
                    var proms = [];
                    Object.keys(data).forEach(function(k) {
                        proms.push(_s.from(table).upsert({ key: k, value: String(data[k]), updated_at: new Date().toISOString() }, { onConflict: 'key' }));
                    });
                    return Promise.all(proms).then(function() {
                        console.log('[DB] ' + table + ': gespeichert');
                    });
                }
                return Promise.resolve();
            }

            return _s.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').then(function() {
                if (data.length > 0) {
                    var rows = data.map(function(r) { return toDBRow(r, table); });
                    return _s.from(table).insert(rows).then(function(res) {
                        if (res.error) {
                            console.warn('[DB] Speichern ' + table + ':', res.error.message);
                        } else {
                            console.log('[DB] ' + table + ': ' + rows.length + ' Zeilen gespeichert');
                        }
                    });
                }
            });
        } catch(e) {
            console.warn('[DB] Speichern ' + table + ':', e.message);
            return Promise.resolve();
        }
    }

    function saveAllToDB() {
        if (!_s) return;
        Object.keys(TABLES).forEach(function(key) {
            saveTableToDB(key);
        });
    }

    function setupDBLogin() {
        var origHandler = null;
        var form = document.getElementById('formLogin');
        if (!form) return;
        if (form._dbHandler) return;
        origHandler = form.onsubmit;
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
                loadAllFromDB(function() {
                    location.reload();
                });
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

    waitForLib(function(supabase) {
        if (!supabase) {
            console.warn('[DB] Supabase nicht verfuegbar - lokaler Modus');
            return;
        }
        try {
            _s = supabase.createClient(URL, KEY);
            console.log('[DB] Supabase Client bereit!');

            waitForApp(function() {
                loadAllFromDB(function() {
                    console.log('[DB] Alle Daten aus der Datenbank geladen!');
                    setupDBLogin();
                    // Alle 30 Sekunden: Erst AUS DB laden, dann IN DB speichern
                    setInterval(function() {
                        loadAllFromDB(function() {
                            saveAllToDB();
                        });
                    }, 30000);
                });
            });
        } catch(e) {
            console.warn('[DB] Fehler:', e.message);
        }
    });

})();
