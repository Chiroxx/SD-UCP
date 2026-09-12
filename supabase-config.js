// ============================================================
// SD-UCP Supabase Datenbank-Sync
// Laeuft im Hintergrund, blockiert die App NICHT.
// ============================================================

(function() {
    'use strict';

    var SUPABASE_URL = 'https://cboebolulstptnipjqdz.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2Vib2x1bHN0cHRuaXBqcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTU1ODYsImV4cCI6MjEwNDczMTU4Nn0.m_gmscp79269OrqkIF0hXYodpSrnvCuSvsmFi16yZps';

    var TABLE_MAP = {
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
    var _dbReady = false;

    // Warte bis Supabase CDN geladen ist (max 10 Sekunden)
    function waitForSupabase(callback, attempts) {
        attempts = attempts || 0;
        if (attempts > 40) {
            console.log('Supabase: Timeout - lokaler Modus');
            return;
        }
        if (window.supabase && window.supabase.createClient) {
            callback();
        } else {
            setTimeout(function() { waitForSupabase(callback, attempts + 1); }, 250);
        }
    }

    function init() {
        waitForSupabase(function() {
            try {
                _s = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                console.log('Supabase Client bereit!');
                testConnection();
            } catch(e) {
                console.warn('Supabase Init Fehler:', e.message);
            }
        });
    }

    function testConnection() {
        if (!_s) return;
        _s.from('settings').select('key').limit(1).then(function(result) {
            if (result.error) {
                console.warn('Supabase Verbindung fehlgeschlagen:', result.error.message);
                return;
            }
            _dbReady = true;
            console.log('Supabase Verbunden! Daten werden synchronisiert...');
            loadAllFromDB();
            startAutoSync();
        }).catch(function(e) {
            console.warn('Supabase nicht erreichbar:', e.message);
        });
    }

    function loadAllFromDB() {
        if (!_dbReady || !_s) return;

        var keys = Object.keys(TABLE_MAP);
        var loaded = 0;

        keys.forEach(function(localKey) {
            var tableName = TABLE_MAP[localKey];
            _s.from(tableName).select('*').then(function(result) {
                if (!result.error && result.data) {
                    if (tableName === 'settings') {
                        var obj = {};
                        result.data.forEach(function(row) { obj[row.key] = row.value; });
                        localStorage.setItem(localKey, JSON.stringify(obj));
                    } else {
                        localStorage.setItem(localKey, JSON.stringify(result.data));
                    }
                }
                loaded++;
                if (loaded === keys.length) {
                    console.log('Alle Daten aus Supabase geladen!');
                }
            }).catch(function() { loaded++; });
        });
    }

    function saveAllToDB() {
        if (!_dbReady || !_s) return;

        Object.keys(TABLE_MAP).forEach(function(localKey) {
            var tableName = TABLE_MAP[localKey];
            var raw = localStorage.getItem(localKey);
            if (!raw) return;

            try {
                var data = JSON.parse(raw);

                if (tableName === 'settings') {
                    if (typeof data === 'object' && !Array.isArray(data)) {
                        Object.keys(data).forEach(function(k) {
                            _s.from(tableName).upsert({
                                key: k,
                                value: String(data[k]),
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'key' }).catch(function() {});
                        });
                    }
                } else {
                    _s.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000').then(function() {
                        if (Array.isArray(data) && data.length > 0) {
                            var rows = data.map(function(r) {
                                var row = Object.assign({}, r);
                                delete row.id;
                                return row;
                            });
                            _s.from(tableName).insert(rows).catch(function() {});
                        }
                    }).catch(function() {});
                }
            } catch(e) {}
        });

        console.log('Daten an Supabase gespeichert!');
    }

    // Alle 30 Sekunden synchronisieren
    function startAutoSync() {
        setInterval(function() {
            saveAllToDB();
        }, 30000);
    }

    // Manueller Sync-Button fuer Admin-Panel
    window.ucpSyncToDB = function() {
        if (!_dbReady) {
            console.warn('Supabase nicht verbunden!');
            return;
        }
        saveAllToDB();
        console.log('Manueller Sync gestartet!');
    };

    // Daten aus DB neu laden
    window.ucpLoadFromDB = function() {
        if (!_dbReady) {
            console.warn('Supabase nicht verbunden!');
            return;
        }
        loadAllFromDB();
        console.log('Daten neu geladen!');
    };

    // Starten nach 2 Sekunden (App ist dann geladen)
    setTimeout(init, 2000);

})();
