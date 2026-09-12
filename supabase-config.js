// SD-UCP Supabase Sync - laeuft nach der App, blockiert nichts
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

    function tryInit() {
        if (!window.supabase || !window.supabase.createClient) {
            setTimeout(tryInit, 1000);
            return;
        }
        try {
            _s = window.supabase.createClient(URL, KEY);
            console.log('[DB] Supabase Client bereit!');
            syncToDB();
            setInterval(syncToDB, 30000);
        } catch(e) {
            console.warn('[DB] Fehler:', e.message);
        }
    }

    function syncToDB() {
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

    setTimeout(tryInit, 3000);

})();
