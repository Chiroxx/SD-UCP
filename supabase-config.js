// ============================================================
// SD-UCP Datenbank-Verbindung fuer Supabase
// ============================================================

(function() {
    'use strict';

    var SUPABASE_URL = 'https://cboebolulstptnipjqdz.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2Vib2x1bHN0cHRuaXBqcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTU1ODYsImV4cCI6MjEwNDczMTU4Nn0.m_gmscp79269OrqkIF0hXYodpSrnvCuSvsmFi16yZps';

    try {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.warn('Supabase nicht verfuegbar - lokaler Modus');
            return;
        }
    } catch(e) {
        console.warn('Supabase Fehler:', e.message);
        return;
    }

    var _s;
    try {
        _s = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch(e) {
        console.warn('Supabase Client Fehler:', e.message);
        return;
    }

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

    var _dbReady = false;

    function _testConnection() {
        return _s.from('settings').select('key').limit(1).then(function(result) {
            if (result.error) {
                console.warn('Supabase Verbindung fehlgeschlagen:', result.error.message);
                return false;
            }
            _dbReady = true;
            console.log('Supabase Verbunden!');
            return true;
        }).catch(function(e) {
            console.warn('Supabase nicht erreichbar:', e.message);
            return false;
        });
    }

    function _loadAllFromDB() {
        if (!_dbReady) return Promise.resolve();
        var keys = Object.keys(TABLE_MAP);
        var promises = keys.map(function(localKey) {
            var tableName = TABLE_MAP[localKey];
            return _s.from(tableName).select('*').then(function(result) {
                if (!result.error && result.data) {
                    if (tableName === 'settings') {
                        var obj = {};
                        result.data.forEach(function(row) { obj[row.key] = row.value; });
                        localStorage.setItem(localKey, JSON.stringify(obj));
                    } else {
                        localStorage.setItem(localKey, JSON.stringify(result.data));
                    }
                }
            }).catch(function(e) {
                console.warn('Fehler ' + tableName + ':', e.message);
            });
        });
        return Promise.all(promises).then(function() {
            console.log('Alle Daten aus Supabase geladen!');
        });
    }

    function _saveToDB(localKey, value) {
        if (!_dbReady) return Promise.resolve();
        var tableName = TABLE_MAP[localKey];
        if (!tableName) return Promise.resolve();
        try {
            var obj = typeof value === 'string' ? JSON.parse(value) : value;
            if (!obj) return Promise.resolve();

            if (tableName === 'settings') {
                var proms = [];
                Object.keys(obj).forEach(function(k) {
                    proms.push(_s.from(tableName).upsert({ key: k, value: String(obj[k]), updated_at: new Date().toISOString() }, { onConflict: 'key' }));
                });
                return Promise.all(proms);
            } else if (tableName === 'users') {
                var userProms = [];
                if (Array.isArray(obj)) {
                    obj.forEach(function(user) {
                        var row = Object.assign({}, user);
                        if (!row.id) delete row.id;
                        userProms.push(_s.from(tableName).upsert(row, { onConflict: 'username' }));
                    });
                }
                return Promise.all(userProms);
            } else {
                return _s.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000').then(function() {
                    if (Array.isArray(obj) && obj.length > 0) {
                        var rows = obj.map(function(r) {
                            var row = Object.assign({}, r);
                            if (!row.id) delete row.id;
                            return row;
                        });
                        return _s.from(tableName).insert(rows);
                    }
                });
            }
        } catch(e) {
            console.warn('DB Sync Fehler:', e.message);
            return Promise.resolve();
        }
    }

    var _origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        _origSetItem(key, value);
        if (TABLE_MAP[key]) {
            _saveToDB(key, value).catch(function() {});
        }
    };

    function _init() {
        console.log('SD-UCP Datenbank-Verbindung wird initialisiert...');
        _testConnection().then(function(connected) {
            if (connected) {
                return _loadAllFromDB();
            } else {
                console.log('Lokaler Modus aktiv (localStorage)');
            }
        }).catch(function(e) {
            console.warn('Init Fehler:', e.message);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
