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
        'personen': ['name', 'telefon', 'geburtstag', 'adresse', 'notizen', 'gesucht', 'gesucht_grund', 'akten', 'user_id', 'created_at']
    };

    var _s = null;
    var _loading = false;
    var _loadPending = false;
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
        if (_loading) { _loadPending = true; return; }
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
            if (done === keys.length) {
                _loading = false;
                callback();
                if (_loadPending) { _loadPending = false; loadAllFromDB(function() { syncRanks(); }); }
            }
        }
    }

    // ============================================================
    // SPEICHERN IN DB - UPDATE + INSERT + DELETE
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

            // Alle existierenden Rows aus DB holen (mit allen Feldern fuer Vergleich)
            return _s.from(table).select('*').then(function(res) {
                if (res.error) {
                    console.warn('[DB] ' + table + ' select:', res.error.message);
                    return Promise.resolve();
                }

                var dbRows = res.data || [];
                var dbIds = dbRows.map(function(r) { return r.id; }).filter(Boolean);
                var uuidRe = UUID_RE;

                // Items aus localStorage mit gueltiger UUID
                var localWithUuid = data.filter(function(r) { return r.id && uuidRe.test(r.id); });
                var localIdsWithUuid = localWithUuid.map(function(r) { return r.id; });

                // 1. LOESCHEN: DB-Ids die NICHT in localStorage sind
                var toDelete = dbIds.filter(function(id) { return localIdsWithUuid.indexOf(id) === -1; });
                var deleteProms = toDelete.map(function(id) { return _s.from(table).delete().eq('id', id); });

                // 2. UPDATE: Items die in DB UND localStorage existieren (Vergleich)
                var toUpdate = [];
                localWithUuid.forEach(function(localItem) {
                    var dbRow = dbRows.find(function(r) { return r.id === localItem.id; });
                    if (!dbRow) return;
                    var dbRowRow = toDBRow(localItem, table);
                    // Vergleiche ob sich was geaendert hat
                    var changed = false;
                    Object.keys(dbRowRow).forEach(function(f) {
                        if (f === 'id' || f === 'created_at' || f === 'updated_at') return;
                        var localVal = JSON.stringify(dbRowRow[f]);
                        var dbVal = JSON.stringify(dbRow[f]);
                        if (localVal !== dbVal) changed = true;
                    });
                    if (changed) {
                        toUpdate.push(dbRowRow);
                    }
                });

                // 3. EINFUEGEN: Items OHNE gueltige UUID (neu erstellt)
                var toInsert = data.filter(function(r) { return !r.id || !uuidRe.test(r.id); }).map(function(r) { return toDBRow(r, table); });

                return Promise.all(deleteProms).then(function() {
                    var proms = [];
                    // Updates ausfuehren
                    toUpdate.forEach(function(row) {
                        proms.push(_s.from(table).update(row).eq('id', row.id));
                    });
                    // Inserts ausfuehren und UUIDs zurueckschreiben
                    if (toInsert.length > 0) {
                        proms.push(_s.from(table).insert(toInsert).select('id'));
                    }
                    return Promise.all(proms);
                }).then(function(results) {
                    // UUIDs von Inserts zurueckschreiben
                    if (toInsert.length > 0) {
                        try {
                            var insertResult = results[results.length - 1];
                            if (insertResult && insertResult.data) {
                                var raw = localStorage.getItem(key);
                                var localData = JSON.parse(raw);
                                if (Array.isArray(localData)) {
                                    var insertIdx = 0;
                                    for (var i = 0; i < localData.length; i++) {
                                        if (!localData[i].id || !uuidRe.test(localData[i].id)) {
                                            if (insertResult.data[insertIdx]) {
                                                localData[i].id = insertResult.data[insertIdx].id;
                                            }
                                            insertIdx++;
                                        }
                                    }
                                    localStorage.setItem(key, JSON.stringify(localData));
                                }
                            }
                        } catch(e) { console.warn('[DB] UUID-Rueckschreibung:', e.message); }
                    }
                }).then(function(results) {
                    var log = [];
                    if (toDelete.length > 0) log.push(toDelete.length + ' geloescht');
                    if (toUpdate.length > 0) log.push(toUpdate.length + ' aktualisiert');
                    if (toInsert.length > 0) log.push(toInsert.length + ' eingefuegt');
                    if (log.length > 0) console.log('[DB] ' + table + ': ' + log.join(', '));
                }).catch(function(e) {
                    console.warn('[DB] ' + table + ' Fehler:', e.message);
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
                document.getElementById('loginError').textContent = 'Verbindungsfehler. Bitte erneut versuchen.';
                document.getElementById('loginError').style.display = 'block';
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
    // RANG-SYNC: mitarbeiter -> users -> currentUser
    // ============================================================
    function syncRanks() {
        try {
            var mit = JSON.parse(localStorage.getItem('ucp_mitarbeiter')) || [];
            var usr = JSON.parse(localStorage.getItem('ucp_users')) || [];
            var cur = JSON.parse(localStorage.getItem('ucp_currentUser'));
            var changed = false;

            mit.forEach(function(m) {
                var matchName = (m.vorname + ' ' + m.nachname).trim();
                var u = usr.find(function(u) {
                    return u.username === m.user_id ||
                        (u.fullName || u.username) === matchName ||
                        u.dienstnr === m.dienstnr;
                });
                if (u) {
                    if (u.rang !== m.rang) { u.rang = m.rang; changed = true; }
                    if (u.fullName !== matchName) { u.fullName = matchName; changed = true; }
                    if (u.dienstnr !== m.dienstnr) { u.dienstnr = m.dienstnr; changed = true; }
                    if (m.isAdmin !== undefined && u.isAdmin !== m.isAdmin) { u.isAdmin = m.isAdmin; changed = true; }
                }
            });

            if (changed) {
                localStorage.setItem('ucp_users', JSON.stringify(usr));
                console.log('[DB] Users-Sync: Rang/Status aktualisiert');
            }

            // Update currentUser too
            if (cur) {
                var curUser = usr.find(function(u) { return u.username === cur.username; });
                if (curUser) {
                    var curChanged = false;
                    if (cur.rang !== curUser.rang) { cur.rang = curUser.rang; curChanged = true; }
                    if (cur.fullName !== curUser.fullName) { cur.fullName = curUser.fullName; curChanged = true; }
                    if (cur.dienstnr !== curUser.dienstnr) { cur.dienstnr = curUser.dienstnr; curChanged = true; }
                    if (curUser.isAdmin !== undefined && cur.isAdmin !== curUser.isAdmin) { cur.isAdmin = curUser.isAdmin; curChanged = true; }
                    if (curChanged) {
                        localStorage.setItem('ucp_currentUser', JSON.stringify(cur));
                        console.log('[DB] currentUser-Sync: ' + cur.username + ' -> Rang ' + cur.rang);
                    }
                }
            }

            // Reload in-memory variables in ucp.js
            if (window.UCP && window.UCP.reloadFromStorage) {
                window.UCP.reloadFromStorage();
            }
        } catch(e) {
            console.warn('[DB] syncRanks Fehler:', e.message);
        }
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

                    // syncRanks AFTER interceptor is set up
                    syncRanks();

                    setInterval(function() {
                        loadAllFromDB(function() {
                            syncRanks();
                            console.log('[DB] Aktualisiert!');
                        });
                    }, 5000);

                    setInterval(saveAllToDB, 30000);
                });
            });
        } catch(e) { console.warn('[DB] Fehler:', e.message); }
    });

})();
