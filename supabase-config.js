// ============================================================
// SD-UCP Datenbank-Verbindung fuer Supabase
// Laeuft komplett im Hintergrund und greift NICHT in die App ein.
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
        var _s = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase Client erstellt!');
        window._ucpSupabase = _s;
    } catch(e) {
        console.warn('Supabase Fehler:', e.message);
    }

})();
