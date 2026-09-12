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

    var _s = null;

    // Warte bis Supabase CDN geladen ist
    function waitForLib(cb, n) {
        n = n || 0;
        if (n > 20) { cb(null); return; }
        if (window.supabase && window.supabase.createClient) { cb(window.supabase); }
        else { setTimeout(function() { waitForLib(cb, n + 1); }, 500); }
    }

    // 1. ALLE DATEN AUS DER DATENBANK LADEN
    function loadAllFromDB(callback) {
        if (!_s) { callback(); return; }
        var keys = Object.keys(TABLES);
        var done = 0;

        keys.forEach(function(key) {
            var table = TABLES[key];
            _s.from(table).select('*').then(function(res) {
                if (!res.error && res.data && res.data.length > 0) {
                    var data = res.data.map(function(row) {
                        if (row.full_name !== undefined) { row.fullName = row.full_name; }
                        if (row.rank !== undefined && !row.rang) { row.rang = row.rank; }
                        return row;
                    });
                    localStorage.setItem(key, JSON.stringify(data));
                }
                done++;
                if (done === keys.length) callback();
            }).catch(function() {
                done++;
                if (done === keys.length) callback();
            });
        });
    }

    // 2. ALLE DATEN IN DIE DATENBANK SPEICHERN
    function saveAllToDB() {
        if (!_s) return;
        Object.keys(TABLES).forEach(function(key) {
            var table = TABLES[key];
            var raw = localStorage.getItem(key);
            if (!raw) return;
            try {
                var data = JSON.parse(raw);
                if (!Array.isArray(data)) return;

                _s.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').then(function() {
                    if (data.length > 0) {
                        var rows = data.map(function(r) {
                            var row = Object.assign({}, r);
                            delete row.id;
                            if (row.fullName !== undefined) { row.full_name = row.fullName; delete row.fullName; }
                            if (row.rang !== undefined) { row.rank = row.rang; }
                            if (!row.created_at) row.created_at = new Date().toISOString();
                            return row;
                        });
                        _s.from(table).insert(rows).then(function(res) {
                            if (!res.error) console.log('[DB] ' + table + ': ' + rows.length + ' Zeilen gespeichert');
                        });
                    }
                });
            } catch(e) {}
        });
    }

    // 3. AUTOMATISCH ALLE 30 SEKUNDEN SPEICHERN
    function startAutoSave() {
        setInterval(saveAllToDB, 30000);
    }

    // 4. LOGIN UEBER DATENBANK
    function setupDBLogin() {
        var form = document.getElementById('formLogin');
        if (!form) return;
        form.removeEventListener('submit', form._dbHandler);
        form._dbHandler = function(e) {
            var user = document.getElementById('loginUser').value.trim();
            var pass = document.getElementById('loginPass').value;
            if (!_s) return;

            _s.from('users').select('*').eq('username', user).single().then(function(res) {
                if (res.error || !res.data) {
                    document.getElementById('loginError').textContent = 'Benutzername oder Passwort falsch.';
                    document.getElementById('loginError').style.display = 'block';
                    return;
                }
                var dbUser = res.data;
                if (dbUser.full_name && !dbUser.fullName) dbUser.fullName = dbUser.full_name;
                if (dbUser.rank && !dbUser.rang) dbUser.rang = dbUser.rank;

                if (dbUser.password !== pass) {
                    document.getElementById('loginError').textContent = 'Benutzername oder Passwort falsch.';
                    document.getElementById('loginError').style.display = 'block';
                    return;
                }

                // User in localStorage speichern fuer die App
                localStorage.setItem('ucp_currentUser', JSON.stringify(dbUser));

                // Alle anderen Daten auch aus DB laden
                loadAllFromDB(function() {
                    location.reload();
                });
            });
        };
        form.addEventListener('submit', form._dbHandler);
    }

    // STARTEN
    waitForLib(function(supabase) {
        if (!supabase) {
            console.warn('[DB] Supabase nicht verfuegbar - lokaler Modus');
            return;
        }
        try {
            _s = supabase.createClient(URL, KEY);
            console.log('[DB] Supabase Client bereit!');

            // Daten aus DB laden
            loadAllFromDB(function() {
                console.log('[DB] Alle Daten aus der Datenbank geladen!');
                // Login-Handler fuer DB-Login einrichten
                setupDBLogin();
                // Auto-Sync starten
                startAutoSave();
            });
        } catch(e) {
            console.warn('[DB] Fehler:', e.message);
        }
    });

})();
