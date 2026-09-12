// ============================================================
// SD-UCP v2.0 – Blaine County Sheriff Department
// ============================================================

(function() {
    'use strict';

    // --- STATE ---
    let currentUser = JSON.parse(localStorage.getItem('ucp_currentUser')) || null;
    let users = JSON.parse(localStorage.getItem('ucp_users')) || [];
    let officers = JSON.parse(localStorage.getItem('ucp_officers')) || [];
    let rechnungen = JSON.parse(localStorage.getItem('ucp_rechnungen')) || [];
    let streifen = JSON.parse(localStorage.getItem('ucp_streifen')) || [];
    let mitarbeiter = JSON.parse(localStorage.getItem('ucp_mitarbeiter')) || [];
    let units = JSON.parse(localStorage.getItem('ucp_units')) || [];
    let nachrichten = JSON.parse(localStorage.getItem('ucp_nachrichten')) || [];
    let msgTab = 'empfangen';
    let aktuelleMsgIdx = null;
    let termine = JSON.parse(localStorage.getItem('ucp_termine')) || [];
    let news = JSON.parse(localStorage.getItem('ucp_news')) || [];
    let ausbildungen = JSON.parse(localStorage.getItem('ucp_ausbildungen')) || [];
    let shiftStart = null;
    let shiftTimer = null;
    let isClockedIn = localStorage.getItem('ucp_clockedIn') === 'true';
    let clockInTime = localStorage.getItem('ucp_clockInTime') || null;

    // --- CALENDAR STATE ---
    let calYear, calMonth, calSelectedDate;

    function initCalendarState() {
        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
        calSelectedDate = null;
    }

    // --- INIT ---
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupLogin();
        if (currentUser) showApp();
    }

    // ============================================================
    // LOGIN
    // ============================================================
    function setupLogin() {
        if (!users.find(u => u.username === 'Miguel.Hauser')) {
            users.push({
                username: 'Miguel.Hauser',
                password: 'admin123',
                fullName: 'Miguel Hauser',
                dienstnr: '0001',
                rang: '00 - Sheriff Techniker',
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('ucp_users', JSON.stringify(users));
        }

        const registerTab = document.querySelector('.login-tab[data-tab="register"]');
        if (registerTab) registerTab.style.display = '';

        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
                document.getElementById(tab.dataset.tab === 'login' ? 'formLogin' : 'formRegister').classList.add('active');
                hideLoginError();
            });
        });

        document.getElementById('formLogin').addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;
            const found = users.find(u => u.username === user && u.password === pass);
            if (!found) { showLoginError('Benutzername oder Passwort falsch.'); return; }
            currentUser = found;
            localStorage.setItem('ucp_currentUser', JSON.stringify(currentUser));
            showApp();
        });

        document.getElementById('formRegister').addEventListener('submit', (e) => {
            e.preventDefault();
            const rangKeys = Object.keys(RANG_HIERARCHIE);
            const defaultRang = rangKeys[rangKeys.length - 1];
            const data = {
                username: document.getElementById('regUser').value.trim(),
                password: document.getElementById('regPass').value,
                fullName: document.getElementById('regFullName').value.trim(),
                dienstnr: document.getElementById('regDienstnr').value.trim(),
                rang: defaultRang
            };
            if (users.find(u => u.username === data.username)) { showLoginError('Benutzername bereits vergeben.'); return; }
            users.push({ ...data, createdAt: new Date().toISOString() });
            localStorage.setItem('ucp_users', JSON.stringify(users));
            currentUser = users[users.length - 1];
            localStorage.setItem('ucp_currentUser', JSON.stringify(currentUser));
            showApp();
        });
    }

    function showLoginError(msg) {
        const el = document.getElementById('loginError');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideLoginError() {
        document.getElementById('loginError').style.display = 'none';
    }

    // ============================================================
    // PERMISSIONS
    // ============================================================
    function getRankLevel(rang) {
        if (!rang) return 99;
        if (RANG_HIERARCHIE[rang] !== undefined) return RANG_HIERARCHIE[rang];
        const stripped = rang.replace(/^\d+\s*-\s*/, '');
        for (const [key, val] of Object.entries(RANG_HIERARCHIE)) {
            if (key.endsWith(stripped)) return val;
        }
        return 99;
    }

    function getCurrentMitarbeiter() {
        if (!currentUser) return null;
        return mitarbeiter.find(m => m.vorname + ' ' + m.nachname === (currentUser.fullName || currentUser.username) || m.dienstnr === currentUser.dienstnr) || null;
    }

    function hasFunktion(funktion) {
        const m = getCurrentMitarbeiter();
        if (!m) return false;
        return Array.isArray(m.funktion) && m.funktion.includes(funktion);
    }

    function isAdmin() { return currentUser && getRankLevel(currentUser.rang) <= 4; }
    function canManageMitarbeiter() { return currentUser && getRankLevel(currentUser.rang) <= 9; }
    function canManageUnits() { return currentUser && getRankLevel(currentUser.rang) <= 4; }
    function isUnitLeader(idx) { return currentUser && units[idx] && units[idx].leiter === (currentUser.fullName || currentUser.username); }
    function canEditUnit(idx) { return canManageUnits() || isUnitLeader(idx); }

    function canEditUser(targetRang) {
        if (!currentUser) return false;
        const myLevel = getRankLevel(currentUser.rang);
        if (myLevel <= 4) return true;
        if (hasFunktion('Personalabteilung')) {
            return myLevel < getRankLevel(targetRang);
        }
        return false;
    }

    function canAddMitarbeiter() {
        if (!currentUser) return false;
        const myLevel = getRankLevel(currentUser.rang);
        if (myLevel <= 4) return true;
        return hasFunktion('Personalabteilung');
    }

    function canAccessAusbildung() {
        if (!currentUser) return false;
        const myLevel = getRankLevel(currentUser.rang);
        if (myLevel <= 4) return true;
        return hasFunktion('Ausbilder');
    }

    function canAccessPersonalakten() {
        if (!currentUser) return false;
        const myLevel = getRankLevel(currentUser.rang);
        if (myLevel <= 4) return true;
        return hasFunktion('Personalabteilung');
    }

    // ============================================================
    // APP INIT
    // ============================================================
    function showApp() {
        if (!currentUser) return;
        if (currentUser.rank && !currentUser.rang) currentUser.rang = currentUser.rank;
        if (currentUser.full_name && !currentUser.fullName) currentUser.fullName = currentUser.full_name;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContent').style.display = 'flex';
        document.getElementById('userName').textContent = currentUser.fullName || currentUser.username;
        document.getElementById('userRank').textContent = currentUser.rang || 'Beamter';
        document.getElementById('userRank').className = 'user-rank';
        if (isAdmin()) document.getElementById('userRank').classList.add('admin-rank');
        else if (canManageMitarbeiter()) document.getElementById('userRank').classList.add('manager-rank');
        initApp();
    }

    function initApp() {
        const safeCall = (fn, name) => { try { fn(); } catch(e) { console.error('Error in ' + name + ':', e); } };
        safeCall(buildNav, 'buildNav');
        safeCall(showAdminPanelBtn, 'showAdminPanelBtn');
        safeCall(setupNachrichten, 'setupNachrichten');
        safeCall(populateSelects, 'populateSelects');
        safeCall(setupSortableTable, 'setupSortableTable');
        safeCall(buildEinsatzCodes, 'buildEinsatzCodes');
        safeCall(buildEinsatzfelder, 'buildEinsatzfelder');
        safeCall(buildTenCodes, 'buildTenCodes');
        safeCall(buildCodes, 'buildCodes');
        safeCall(buildWaffenlizenzen, 'buildWaffenlizenzen');
        safeCall(buildIllegale, 'buildIllegale');
        safeCall(buildFische, 'buildFische');
        safeCall(buildStrafkatalog, 'buildStrafkatalog');
        safeCall(buildStrafrechner, 'buildStrafrechner');
        safeCall(loadMitarbeiter2, 'loadMitarbeiter2');
        safeCall(loadUnits, 'loadUnits');
        safeCall(loadOfficers, 'loadOfficers');
        safeCall(loadRechnungen, 'loadRechnungen');
        safeCall(loadStreifen, 'loadStreifen');
        safeCall(updateDashboard, 'updateDashboard');
        safeCall(setupModals, 'setupModals');
        safeCall(setupShift, 'setupShift');
        safeCall(setupMiranda, 'setupMiranda');
        safeCall(setupStrafActions, 'setupStrafActions');
        safeCall(setupSearch, 'setupSearch');
        safeCall(setupClock, 'setupClock');
        safeCall(setupLogout, 'setupLogout');
        safeCall(setupKalender, 'setupKalender');
        safeCall(loadNews, 'loadNews');
        safeCall(loadDashTermine, 'loadDashTermine');
        safeCall(updateButtons, 'updateButtons');
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function buildNav() {
        const sidebarNav = document.getElementById('sidebarNav');
        sidebarNav.innerHTML = '';

        const navData = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-house' },
            { id: 'leitstelle', label: 'Leitstelle', icon: 'fa-solid fa-tower-broadcast' },
            { id: 'mitarbeiter', label: 'Roster', icon: 'fa-solid fa-users' },
            { id: 'personalakten', label: 'Personalakten', icon: 'fa-solid fa-folder-user' },
            { id: 'personen', label: 'Personen-Akten', icon: 'fa-solid fa-id-card' },
            { id: 'ausbildung', label: 'Ausbildung', icon: 'fa-solid fa-graduation-cap' },
            { id: 'kalender', label: 'Kalender', icon: 'fa-solid fa-calendar-days' },
            { id: 'units', label: 'Units', icon: 'fa-solid fa-crosshairs' },
            { id: 'einsatzberichte', label: 'Einsatz-Berichte', icon: 'fa-solid fa-clipboard-list' },
            { id: 'cases', label: 'Case Management', icon: 'fa-solid fa-folder-open' },
            { id: 'akten', label: 'Akten', icon: 'fa-solid fa-file-alt' },
            { id: 'mediathek', label: 'Mediathek', icon: 'fa-solid fa-book' },
            { id: 'nachrichten', label: 'Nachrichten', icon: 'fa-solid fa-envelope' },
            { id: 'streifen', label: 'Streifen', icon: 'fa-solid fa-car' },
            { id: 'zeiterfassung', label: 'Zeiterfassung', icon: 'fa-solid fa-stopwatch' },
            { id: 'rechnungen', label: 'Rechnungen', icon: 'fa-solid fa-dollar-sign' },
            { id: 'strafkatalog', label: 'Strafkatalog', icon: 'fa-solid fa-scale-balanced' },
            { id: 'funkcodes', label: 'Funkcodes', icon: 'fa-solid fa-comment' },
            { id: 'miranda', label: 'Miranda', icon: 'fa-solid fa-triangle-exclamation' },
            { id: 'waffenlizenzen', label: 'Waffenlizenzen', icon: 'fa-solid fa-gun' },
            { id: 'illegale', label: 'Illegale', icon: 'fa-solid fa-ban' },
            { id: 'fische', label: 'Fische', icon: 'fa-solid fa-fish' }
        ];

        navData.forEach((item, i) => {
            if (item.id === 'ausbildung' && !canAccessAusbildung()) return;
            if (item.id === 'personalakten' && !canAccessPersonalakten()) return;
            const sideItem = document.createElement('div');
            sideItem.className = 'nav-item' + (i === 0 ? ' active' : '');
            sideItem.dataset.view = item.id;
            let badge = '';
            if (item.id === 'nachrichten') {
                const myName = currentUser?.fullName || currentUser?.username || '';
                const unread = nachrichten.filter(m => m.empfaenger === myName && !m.gelesen).length;
                badge = unread > 0 ? `<span class="msg-badge">${unread}</span>` : '';
            }
            sideItem.innerHTML = `<span class="nav-icon"><i class="${item.icon}"></i></span><span>${item.label}</span>${badge}`;
            sideItem.addEventListener('click', () => switchView(item.id));
            sidebarNav.appendChild(sideItem);
        });
    }

    window.UCP = { switchView };

    function switchView(viewId) {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        const mod = document.getElementById('module-' + viewId);
        if (mod) mod.classList.add('active');
        if (viewId === 'kalender') { renderCalendar(); loadTermineListe(); }
        if (viewId === 'ausbildung') {
            if (!canAccessAusbildung()) { showToast('Keine Berechtigung fuer Ausbildung!', 'error'); switchView('dashboard'); return; }
            loadAusbildungen();
        }
        if (viewId === 'einsatzberichte') { loadBerichte(); }
        if (viewId === 'cases') { loadCases(); }
        if (viewId === 'akten') { populateAkteCaseSelect(); loadAkten(); }
        if (viewId === 'personalakten') {
            if (!canAccessPersonalakten()) { showToast('Keine Berechtigung fuer Personalakten!', 'error'); switchView('dashboard'); return; }
            populatePAMitarbeiterSelect(); loadPersonalakten();
        }
        if (viewId === 'profil') { loadProfil(); document.querySelector('.main-content').scrollTop = 0; }
        if (viewId === 'mediathek') { loadMediathek(); }
        if (viewId === 'nachrichten') { loadNachrichten(); }
        if (viewId === 'dashboard') { updateDashboard(); loadNews(); }
    }

    // ============================================================
    // POPULATE SELECTS
    // ============================================================
    function populateSelects() {
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const rangOptions = settings.raenge || RANG_OPTIONS;
        const rangSelects = ['regRang', 'officerRang', 'mitRang'];
        rangSelects.forEach(id => {
            const sel = document.getElementById(id);
            if (sel && sel.options.length <= 1) {
                rangOptions.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.textContent = r;
                    sel.appendChild(opt);
                });
            }
        });

        const filterRangs = ['filterRang', 'filterRang2'];
        filterRangs.forEach(id => {
            const sel = document.getElementById(id);
            if (sel && sel.options.length <= 1) {
                rangOptions.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.textContent = r;
                    sel.appendChild(opt);
                });
            }
        });

        const filterFunks = ['filterFunktion', 'filterFunktion2'];
        filterFunks.forEach(id => {
            const sel = document.getElementById(id);
            if (sel && sel.options.length <= 1) {
                const funktionen = settings.funktionen || ['Ausbilder', 'Supervisor', 'Personalabteilung'];
                funktionen.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.textContent = f;
                    sel.appendChild(opt);
                });
            }
        });

        const einsatzfelderContainer = document.getElementById('officerEinsatzfelder');
        if (einsatzfelderContainer && einsatzfelderContainer.children.length === 0) {
            EINSATZFELDER.forEach(feld => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${feld}"> ${feld}`;
                einsatzfelderContainer.appendChild(label);
            });
        }
    }

    // ============================================================
    // DASHBOARD
    // ============================================================
    function updateDashboard() {
        const activeOfficers = officers.filter(o => o.code === 1 || o.code === 2 || o.code === 3 || o.code === 5).length;
        const activeMembers = mitarbeiter.filter(m => m.status === 'Aktiv').length;
        const el1 = document.getElementById('dashLeitstelle');
        const el2 = document.getElementById('dashRoster');
        if (el1) el1.textContent = activeOfficers;
        if (el2) el2.textContent = activeMembers;

        // Termine dieser Woche
        const today = new Date();
        const dayOfWeek = today.getDay() || 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
        const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth()+1).padStart(2,'0')}-${String(sunday.getDate()).padStart(2,'0')}`;
        const termineThisWeek = termine.filter(t => t.datum >= mondayStr && t.datum <= sundayStr).length;
        const el3 = document.getElementById('dashTermine');
        if (el3) el3.textContent = termineThisWeek;

        // Ausbildung heute
        updateDashboardAusbildung();

        // Kommende Termine auf Dashboard
        loadDashTermine();

        // Neuigkeiten
        loadNews();

        // Gesuchte Personen
        renderGesuchtePersonen();

        // Gespeicherte Settings anwenden
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        if (settings.bannerUrl) {
            const banner = document.querySelector('.dashboard-banner');
            if (banner) banner.style.backgroundImage = `url('${esc(settings.bannerUrl)}')`;
        }
        if (settings.dashTitle) {
            const titleEl = document.querySelector('.dashboard-title');
            if (titleEl) titleEl.textContent = settings.dashTitle;
        }
        if (settings.dashSubtitle) {
            const subEl = document.querySelector('.dashboard-subtitle');
            if (subEl) subEl.textContent = settings.dashSubtitle;
        }
        if (settings.ucpName) document.title = settings.ucpName;
        const footerEl = document.querySelector('.footer-text');
        if (footerEl && settings.footerText) footerEl.textContent = settings.footerText;
        if (settings.accentColor || settings.sidebarStyle) applyDesign(settings);
        if (settings.willkommen) {
            setTimeout(() => showToast('👋 ' + settings.willkommen), 500);
        }
    }

    function loadNews() {
        const container = document.getElementById('newsListe');
        if (!container) return;

        // UCP Updates + eigene News zusammenfuehren
        const allNews = [...UCP_UPDATES.map(u => ({...u, source: 'ucp'})), ...news.map(n => ({...n, source: 'user'}))];
        allNews.sort((a, b) => {
            const da = a.datum.split('.').reverse().join('-');
            const db = b.datum.split('.').reverse().join('-');
            if (db !== da) return db.localeCompare(da);
            const va = parseFloat(a.version || '0');
            const vb = parseFloat(b.version || '0');
            if (vb !== va) return vb - va;
            const ia = allNews.indexOf(a);
            const ib = allNews.indexOf(b);
            return ib - ia;
        });

        if (allNews.length === 0) {
            container.innerHTML = '<div class="news-empty"><i class="fas fa-newspaper"></i>Noch keine Neuigkeiten vorhanden.</div>';
            return;
        }

        const katClass = { 'Update': 'kat-update', 'Neu': 'kat-neu', 'Fix': 'kat-fix', 'Info': 'kat-info', 'Wartung': 'kat-wartung' };

        container.innerHTML = allNews.map((n, i) => {
            const isUser = n.source === 'user';
            const origIdx = isUser ? news.indexOf(n) : -1;
            return `
                <div class="news-card">
                    <div class="news-card-header">
                        <span class="news-kategorie-badge ${katClass[n.kategorie] || 'kat-info'}">${esc(n.kategorie)}</span>
                        <span class="news-title">${esc(n.titel)}</span>
                        <div class="news-meta">
                            ${n.version ? `<span><i class="fas fa-code-branch"></i> v${esc(n.version)}</span>` : ''}
                            <span><i class="fas fa-calendar-days"></i> ${esc(n.datum)}</span>
                        </div>
                    </div>
                    <div class="news-beschreibung">${esc(n.beschreibung)}</div>
                    ${isUser ? `<div class="news-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.editNews(${origIdx})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.removeNews(${origIdx})"><i class="fas fa-trash"></i></button>
                    </div>` : ''}
                </div>`;
        }).join('');
    }

    window.UCP.editNews = function(idx) {
        const n = news[idx];
        document.getElementById('newsTitel').value = n.titel;
        document.getElementById('newsKategorie').value = n.kategorie;
        document.getElementById('newsBeschreibung').value = n.beschreibung;
        document.getElementById('newsModalTitle').textContent = 'Neuigkeit bearbeiten';
        document.getElementById('formNews').dataset.editIndex = String(idx);
        openModal('modalNews');
    };

    window.UCP.removeNews = function(idx) {
        if (!confirm('Neuigkeit loeschen?')) return;
        news.splice(idx, 1);
        localStorage.setItem('ucp_news', JSON.stringify(news));
        loadNews();
        showToast('Neuigkeit geloescht!');
    };

    // === AUSBILDUNG ===
    function loadAusbildungen() {
        const container = document.getElementById('ausbildungListe');
        if (!container) return;

        const filter = document.getElementById('filterAusbStatus')?.value || '';
        let filtered = ausbildungen;
        if (filter) filtered = filtered.filter(a => a.status === filter);

        // Stats
        document.getElementById('ausbGesamt').textContent = ausbildungen.length;
        document.getElementById('ausbGeplant').textContent = ausbildungen.filter(a => a.status === 'Geplant').length;
        document.getElementById('ausbLaufend').textContent = ausbildungen.filter(a => a.status === 'Laufend').length;
        document.getElementById('ausbAbgeschlossen').textContent = ausbildungen.filter(a => a.status === 'Abgeschlossen').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="ausb-empty"><i class="fas fa-graduation-cap"></i>Keine Ausbildungen vorhanden.</div>';
            return;
        }

        const statusClass = { 'Geplant': 'status-geplant', 'Laufend': 'status-laufend', 'Abgeschlossen': 'status-abgeschlossen', 'Abgesagt': 'status-abgesagt' };

        container.innerHTML = filtered.map((a, i) => {
            const origIdx = ausbildungen.indexOf(a);
            const tn = (a.teilnehmer || []).filter(t => t.trim());
            const tnNotizen = a.teilnehmerNotizen || {};
            const zeitStr = a.zeit ? a.zeit + ' Uhr' : '';
            const canEdit = canAccessAusbildung();
            const tnHtml = tn.length > 0 ? tn.map(t => {
                const n = tnNotizen[t] || {};
                const statusBadge = n.status === 'bestanden' ? '<span style="color:var(--accent-green);font-size:0.7rem;font-weight:600;"><i class="fas fa-check-circle"></i> Bestanden</span>'
                    : n.status === 'nicht bestanden' ? '<span style="color:var(--accent-red);font-size:0.7rem;font-weight:600;"><i class="fas fa-times-circle"></i> Nicht bestanden</span>'
                    : '';
                return `<span class="unit-member">${esc(t)} ${statusBadge}</span>`;
            }).join(' ') : '-';
            return `
                <div class="ausb-card">
                    <div class="ausb-card-header">
                        <span class="ausb-status-badge ${statusClass[a.status] || 'status-geplant'}">${esc(a.status)}</span>
                        <span class="ausb-title">${esc(a.titel)}</span>
                        <div class="ausb-meta">
                            <span><i class="fas fa-tag"></i> ${esc(a.typ)}</span>
                            <span><i class="fas fa-calendar-days"></i> ${esc(a.datum)} ${zeitStr}</span>
                            <span><i class="fas fa-user-group"></i> ${tn.length}/${a.plaetze}</span>
                        </div>
                    </div>
                    ${a.beschreibung ? `<div class="ausb-details"><p>${esc(a.beschreibung)}</p></div>` : ''}
                    ${tn.length > 0 ? `<div class="ausb-details"><strong>Teilnehmer:</strong> ${tnHtml}</div>` : ''}
                    ${canEdit && tn.length > 0 ? `<div class="ausb-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.showTeilnehmerNotizen(${origIdx})"><i class="fas fa-clipboard-check"></i> Teilnehmer bewerten</button>
                    </div>` : ''}
                    <div class="ausb-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.editAusbildung(${origIdx})"><i class="fas fa-pen"></i> Bearbeiten</button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.removeAusbildung(${origIdx})"><i class="fas fa-trash"></i> Loeschen</button>
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.editAusbildung = function(idx) {
        const a = ausbildungen[idx];
        document.getElementById('ausbTitel').value = a.titel;
        document.getElementById('ausbDatum').value = a.datum;
        document.getElementById('ausbZeit').value = a.zeit || '10:00';
        document.getElementById('ausbStatus').value = a.status;
        document.getElementById('ausbTyp').value = a.typ;
        document.getElementById('ausbPlaetze').value = a.plaetze;
        document.getElementById('ausbBeschreibung').value = a.beschreibung || '';
        document.getElementById('ausbTeilnehmer').value = (a.teilnehmer || []).join('\n');
        document.getElementById('ausbildungModalTitle').textContent = 'Ausbildung bearbeiten';
        document.getElementById('formAusbildung').dataset.editIndex = String(idx);
        openModal('modalAusbildung');
    };

    window.UCP.removeAusbildung = function(idx) {
        if (!confirm('Ausbildung loeschen?')) return;
        ausbildungen.splice(idx, 1);
        localStorage.setItem('ucp_ausbildungen', JSON.stringify(ausbildungen));
        loadAusbildungen();
        showToast('Ausbildung geloescht!');
    };

    let aktuelleAusbTnIdx = null;

    window.UCP.showTeilnehmerNotizen = function(idx) {
        aktuelleAusbTnIdx = idx;
        const a = ausbildungen[idx];
        const tn = (a.teilnehmer || []).filter(t => t.trim());
        const tnNotizen = a.teilnehmerNotizen || {};

        document.getElementById('tnNotizenTitle').textContent = `Bewerten: ${a.titel}`;

        const container = document.getElementById('tnNotizenListe');
        container.innerHTML = tn.map((name, i) => {
            const n = tnNotizen[name] || {};
            const status = n.status || '';
            const notiz = n.notiz || '';
            return `
                <div class="tn-item">
                    <span class="tn-name">${esc(name)}</span>
                    <div class="tn-status">
                        <input type="radio" name="tnStatus_${i}" id="tnBestanden_${i}" value="bestanden" ${status === 'bestanden' ? 'checked' : ''}>
                        <label for="tnBestanden_${i}"><i class="fas fa-check"></i> Bestanden</label>
                        <input type="radio" name="tnStatus_${i}" id="tnNichtBestanden_${i}" value="nicht bestanden" ${status === 'nicht bestanden' ? 'checked' : ''}>
                        <label for="tnNichtBestanden_${i}"><i class="fas fa-times"></i> Nicht bestanden</label>
                        <input type="radio" name="tnStatus_${i}" id="tnOffen_${i}" value="" ${status === '' ? 'checked' : ''}>
                        <label for="tnOffen_${i}"><i class="fas fa-minus"></i> Offen</label>
                    </div>
                    <input type="text" class="tn-notiz-input" id="tnNotiz_${i}" value="${esc(notiz)}" placeholder="Notiz...">
                </div>`;
        }).join('');

        openModal('modalTeilnehmerNotizen');
    };

    document.getElementById('saveTnNotizen')?.addEventListener('click', () => {
        if (aktuelleAusbTnIdx === null) return;
        const a = ausbildungen[aktuelleAusbTnIdx];
        const tn = (a.teilnehmer || []).filter(t => t.trim());
        if (!a.teilnehmerNotizen) a.teilnehmerNotizen = {};

        tn.forEach((name, i) => {
            const statusEl = document.querySelector(`input[name="tnStatus_${i}"]:checked`);
            const notizEl = document.getElementById(`tnNotiz_${i}`);
            a.teilnehmerNotizen[name] = {
                status: statusEl ? statusEl.value : '',
                notiz: notizEl ? notizEl.value.trim() : ''
            };
        });

        localStorage.setItem('ucp_ausbildungen', JSON.stringify(ausbildungen));
        loadAusbildungen();
        closeModal('modalTeilnehmerNotizen');
        showToast('Teilnehmer-Bewertungen gespeichert!');
        aktuelleAusbTnIdx = null;
    });

    document.getElementById('closeModalTeilnehmerNotizen')?.addEventListener('click', () => closeModal('modalTeilnehmerNotizen'));

    // === AUSBILDUNGSSTATUS BEARBEITEN ===
    let aktuelleAusbStatusIdx = null;

    window.UCP.editAusbildungStatus = function(i) {
        aktuelleAusbStatusIdx = i;
        const m = mitarbeiter[i];
        const ausb = m.ausbildungen || {};
        document.getElementById('ausbStatusTitle').textContent = `Ausbildungen: ${m.vorname} ${m.nachname}`;

        const container = document.getElementById('ausbStatusListe');
        container.innerHTML = getAusbTypen().map((typ, idx) => {
            const status = ausb[typ] || {};
            return `
                <div class="ausb-edit-row">
                    <span class="ausb-edit-typ">${esc(typ)}</span>
                    <div class="ausb-edit-controls">
                        <select id="ausbStat_${idx}">
                            <option value="" ${!status.status ? 'selected' : ''}>Offen</option>
                            <option value="bestanden" ${status.status === 'bestanden' ? 'selected' : ''}>Bestanden</option>
                            <option value="nicht bestanden" ${status.status === 'nicht bestanden' ? 'selected' : ''}>Nicht bestanden</option>
                        </select>
                        <input type="text" id="ausbNotiz_${idx}" value="${esc(status.notiz || '')}" placeholder="Notiz...">
                    </div>
                </div>`;
        }).join('');
        openModal('modalAusbStatus');
    };

    document.getElementById('saveAusbStatus')?.addEventListener('click', () => {
        if (aktuelleAusbStatusIdx === null) return;
        const m = mitarbeiter[aktuelleAusbStatusIdx];
        if (!m.ausbildungen) m.ausbildungen = {};
        getAusbTypen().forEach((typ, idx) => {
            const statusEl = document.getElementById(`ausbStat_${idx}`);
            const notizEl = document.getElementById(`ausbNotiz_${idx}`);
            m.ausbildungen[typ] = {
                status: statusEl ? statusEl.value : '',
                notiz: notizEl ? notizEl.value.trim() : ''
            };
        });
        localStorage.setItem('ucp_mitarbeiter', JSON.stringify(mitarbeiter));
        loadMitarbeiter();
        loadMitarbeiter2();
        UCP.showMitarbeiterDetail(aktuelleAusbStatusIdx);
        closeModal('modalAusbStatus');
        showToast('Ausbildungsstatus gespeichert!');
        aktuelleAusbStatusIdx = null;
    });

    document.getElementById('cancelAusbStatus')?.addEventListener('click', () => closeModal('modalAusbStatus'));
    document.getElementById('closeModalAusbStatus')?.addEventListener('click', () => closeModal('modalAusbStatus'));

    // === CASE MANAGEMENT ===
    let cases = JSON.parse(localStorage.getItem('ucp_cases')) || [];

    function loadCases() {
        const container = document.getElementById('casesListe');
        if (!container) return;

        const searchVal = (document.getElementById('searchCase')?.value || '').toLowerCase();
        const filterStatus = document.getElementById('filterCaseStatus')?.value || '';
        const filterPrio = document.getElementById('filterCasePrioritaet')?.value || '';

        let filtered = cases.filter(c => {
            const matchSearch = !searchVal || c.titel.toLowerCase().includes(searchVal) || c.aktenzeichen.toLowerCase().includes(searchVal) || c.ort.toLowerCase().includes(searchVal);
            const matchStatus = !filterStatus || c.status === filterStatus;
            const matchPrio = !filterPrio || c.prioritaet === filterPrio;
            return matchSearch && matchStatus && matchPrio;
        });

        document.getElementById('caseGesamt').textContent = cases.length;
        document.getElementById('caseOffen').textContent = cases.filter(c => c.status === 'Offen').length;
        document.getElementById('caseLaufend').textContent = cases.filter(c => c.status === 'In Bearbeitung').length;
        document.getElementById('caseAbgeschlossen').textContent = cases.filter(c => c.status === 'Abgeschlossen').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="ausb-empty"><i class="fas fa-folder-open"></i>Keine Cases vorhanden.</div>';
            return;
        }

        const statusClass = { 'Offen': 'status-geplant', 'In Bearbeitung': 'status-laufend', 'Abgeschlossen': 'status-abgeschlossen', 'Archiviert': 'status-abgesagt' };
        const typClass = { 'Kriminalfall': 'typ-kriminalfall', 'Verbrechen': 'typ-verbrechen', 'Verkehrsunfall': 'typ-verkehrsunfall', 'Vermisst': 'typ-vermisst', 'Undercover': 'typ-undercover', 'Interner Fall': 'typ-interner', 'Sonstiges': 'typ-sonstiges' };

        container.innerHTML = filtered.map((c, i) => {
            const origIdx = cases.indexOf(c);
            const beteiligte = (c.beteiligte || []).filter(t => t.trim());
            const prioClass = c.prioritaet === 'Hoch' ? 'prioritaet-hoch' : c.prioritaet === 'Niedrig' ? 'prioritaet-niedrig' : 'prioritaet-mittel';
            return `
                <div class="case-card ${prioClass}" onclick="UCP.showCaseDetail(${origIdx})">
                    <div class="case-card-header">
                        <span class="case-typ-badge ${typClass[c.typ] || 'typ-sonstiges'}">${esc(c.typ)}</span>
                        <span class="case-title">${esc(c.titel)}</span>
                        <div class="case-meta">
                            ${c.aktenzeichen ? `<span><i class="fas fa-hashtag"></i> ${esc(c.aktenzeichen)}</span>` : ''}
                            <span><i class="fas fa-user"></i> ${esc(c.fallfuehrer)}</span>
                            <span><i class="fas fa-calendar-days"></i> ${esc(c.datum)}</span>
                        </div>
                    </div>
                    ${c.beschreibung ? `<div class="case-details"><p>${esc(c.beschreibung.substring(0, 150))}${c.beschreibung.length > 150 ? '...' : ''}</p></div>` : ''}
                    <div class="case-actions">
                        <span class="ausb-status-badge ${statusClass[c.status] || 'status-geplant'}">${esc(c.status)}</span>
                        <span class="ausb-status-badge" style="background:rgba(156,163,175,0.15);color:var(--text-muted);">${esc(c.prioritaet)}</span>
                        ${beteiligte.length > 0 ? `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:auto;"><i class="fas fa-user-group"></i> ${beteiligte.length}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.showCaseDetail = function(i) {
        const c = cases[i];
        const beteiligte = (c.beteiligte || []).filter(t => t.trim());
        const statusClass = { 'Offen': 'status-geplant', 'In Bearbeitung': 'status-laufend', 'Abgeschlossen': 'status-abgeschlossen', 'Archiviert': 'status-abgesagt' };
        const content = document.getElementById('caseDetailContent');
        document.getElementById('caseDetailTitle').textContent = `${c.titel} ${c.aktenzeichen ? '(' + esc(c.aktenzeichen) + ')' : ''}`;

        content.innerHTML = `
            <div class="case-detail-header">
                <span class="ausb-status-badge ${statusClass[c.status] || 'status-geplant'}">${esc(c.status)}</span>
                <span class="ausb-status-badge" style="background:rgba(156,163,175,0.15);color:var(--text-muted);">${esc(c.prioritaet)}</span>
                <span class="ausb-status-badge ${c.typ === 'Kriminalfall' || c.typ === 'Verbrechen' ? 'kat-fix' : 'kat-info'}">${esc(c.typ)}</span>
            </div>
            <div class="case-detail-grid">
                <div class="case-detail-item"><span class="label">Fallfuehrer</span><span class="value">${esc(c.fallfuehrer)}</span></div>
                <div class="case-detail-item"><span class="label">Erstellt am</span><span class="value">${esc(c.datum)}</span></div>
                <div class="case-detail-item"><span class="label">Ort</span><span class="value">${esc(c.ort || '-')}</span></div>
                <div class="case-detail-item"><span class="label">Aktenzeichen</span><span class="value">${esc(c.aktenzeichen || '-')}</span></div>
            </div>
            <div class="case-detail-section">
                <h4><i class="fas fa-file-lines"></i> Fallbeschreibung</h4>
                <p>${esc(c.beschreibung)}</p>
            </div>
            ${beteiligte.length > 0 ? `<div class="case-detail-section">
                <h4><i class="fas fa-user-group"></i> Beteiligte</h4>
                <div class="beteiligte-list">${beteiligte.map(t => `<span class="beteiligte-tag">${esc(t)}</span>`).join('')}</div>
            </div>` : ''}
            ${c.notizen ? `<div class="case-detail-section">
                <h4><i class="fas fa-sticky-note"></i> Notizen / Ermittlungen</h4>
                <p>${esc(c.notizen)}</p>
            </div>` : ''}
            <div class="case-actions">
                <button class="btn btn-sm btn-primary" onclick="UCP.editCase(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-danger" onclick="UCP.removeCase(${i})"><i class="fas fa-trash"></i> Loeschen</button>
            </div>`;
        openModal('modalCaseDetail');
    };

    window.UCP.editCase = function(i) {
        const c = cases[i];
        document.getElementById('caseTitel').value = c.titel;
        document.getElementById('caseAktenzeichen').value = c.aktenzeichen || '';
        document.getElementById('caseTyp').value = c.typ;
        document.getElementById('caseStatus').value = c.status;
        document.getElementById('casePrioritaet').value = c.prioritaet;
        document.getElementById('caseFallfuehrer').value = c.fallfuehrer;
        document.getElementById('caseDatum').value = c.datum || '';
        document.getElementById('caseOrt').value = c.ort || '';
        document.getElementById('caseBeteiligte').value = (c.beteiligte || []).join('\n');
        document.getElementById('caseBeschreibung').value = c.beschreibung;
        document.getElementById('caseNotizen').value = c.notizen || '';
        document.getElementById('caseModalTitle').textContent = 'Case bearbeiten';
        document.getElementById('formCase').dataset.editIndex = String(i);
        closeModal('modalCaseDetail');
        openModal('modalCase');
    };

    window.UCP.removeCase = function(i) {
        if (!confirm('Case loeschen?')) return;
        cases.splice(i, 1);
        localStorage.setItem('ucp_cases', JSON.stringify(cases));
        loadCases();
        closeModal('modalCaseDetail');
        showToast('Case geloescht!');
    };

    // === AKTEN ===
    let akten = JSON.parse(localStorage.getItem('ucp_akten')) || [];

    function populateAkteCaseSelect() {
        const sel = document.getElementById('akteCase');
        if (!sel) return;
        sel.innerHTML = '<option value="">Kein Case</option>';
        cases.forEach((c, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${c.titel} ${c.aktenzeichen ? '(' + c.aktenzeichen + ')' : ''}`;
            sel.appendChild(opt);
        });
    }

    function loadAkten() {
        const container = document.getElementById('aktenListe');
        if (!container) return;

        const searchVal = (document.getElementById('searchAkte')?.value || '').toLowerCase();
        const filterKat = document.getElementById('filterAkteKategorie')?.value || '';
        const filterStatus = document.getElementById('filterAkteStatus')?.value || '';

        let filtered = akten.filter(a => {
            const matchSearch = !searchVal || a.titel.toLowerCase().includes(searchVal) || a.inhalt.toLowerCase().includes(searchVal) || a.aktenzeichen.toLowerCase().includes(searchVal);
            const matchKat = !filterKat || a.kategorie === filterKat;
            const matchStatus = !filterStatus || a.status === filterStatus;
            return matchSearch && matchKat && matchStatus;
        });

        document.getElementById('aktenGesamt').textContent = akten.length;
        document.getElementById('aktenFallakten').textContent = akten.filter(a => a.kategorie === 'Fallakte').length;
        document.getElementById('aktenProtokolle').textContent = akten.filter(a => a.kategorie === 'Protokoll').length;
        document.getElementById('aktenVermerke').textContent = akten.filter(a => a.kategorie === 'Vermerk').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="akte-empty"><i class="fas fa-file-alt"></i>Keine Akten vorhanden.</div>';
            return;
        }

        const katClass = { 'Fallakte': 'kat-fallakte', 'Vermerk': 'kat-vermerk', 'Protokoll': 'kat-protokoll', 'Formular': 'kat-formular', 'Dokumentation': 'kat-dokumentation', 'Sonstiges': 'kat-sonstiges' };
        const statusClass = { 'Aktuell': 'status-geplant', 'Archiviert': 'status-abgeschlossen' };

        container.innerHTML = filtered.map((a, i) => {
            const origIdx = akten.indexOf(a);
            const caseName = a.caseIdx !== '' && cases[a.caseIdx] ? cases[a.caseIdx].titel : '';
            return `
                <div class="akte-card" onclick="UCP.showAkteDetail(${origIdx})">
                    <div class="akte-card-header">
                        <span class="akte-kat-badge ${katClass[a.kategorie] || 'kat-sonstiges'}">${esc(a.kategorie)}</span>
                        <span class="akte-title">${esc(a.titel)}</span>
                        <div class="akte-meta">
                            ${a.aktenzeichen ? `<span><i class="fas fa-hashtag"></i> ${esc(a.aktenzeichen)}</span>` : ''}
                            ${caseName ? `<span><i class="fas fa-folder-open"></i> ${esc(caseName)}</span>` : ''}
                            <span><i class="fas fa-user"></i> ${esc(a.autor)}</span>
                            <span><i class="fas fa-calendar-days"></i> ${esc(a.datum)}</span>
                        </div>
                    </div>
                    ${a.inhalt ? `<div class="akte-details"><p>${esc(a.inhalt.substring(0, 150))}${a.inhalt.length > 150 ? '...' : ''}</p></div>` : ''}
                    <div class="akte-actions">
                        <span class="ausb-status-badge ${statusClass[a.status] || 'status-geplant'}">${esc(a.status)}</span>
                        ${a.link ? `<span style="font-size:0.75rem;color:var(--accent-blue);margin-left:auto;"><i class="fas fa-link"></i> ${esc(a.link)}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.showAkteDetail = function(i) {
        const a = akten[i];
        const caseName = a.caseIdx !== '' && cases[a.caseIdx] ? cases[a.caseIdx].titel : 'Kein Case';
        const statusClass = { 'Aktuell': 'status-geplant', 'Archiviert': 'status-abgeschlossen' };
        const content = document.getElementById('akteDetailContent');
        document.getElementById('akteDetailTitle').textContent = `${a.titel} ${a.aktenzeichen ? '(' + esc(a.aktenzeichen) + ')' : ''}`;

        content.innerHTML = `
            <div class="akte-detail-header">
                <span class="ausb-status-badge ${statusClass[a.status] || 'status-geplant'}">${esc(a.status)}</span>
                <span class="akte-kat-badge ${a.kategorie === 'Fallakte' ? 'kat-fallakte' : a.kategorie === 'Protokoll' ? 'kat-protokoll' : 'kat-vermerk'}">${esc(a.kategorie)}</span>
            </div>
            <div class="akte-detail-grid">
                <div class="akte-detail-item"><span class="label">Aktenzeichen</span><span class="value">${esc(a.aktenzeichen || '-')}</span></div>
                <div class="akte-detail-item"><span class="label">Erstellt von</span><span class="value">${esc(a.autor)}</span></div>
                <div class="akte-detail-item"><span class="label">Datum</span><span class="value">${esc(a.datum)}</span></div>
                <div class="akte-detail-item"><span class="label">Verknuepfter Case</span><span class="value">${esc(caseName)}</span></div>
            </div>
            <div class="akte-detail-section">
                <h4><i class="fas fa-file-lines"></i> Inhalt</h4>
                <p>${esc(a.inhalt)}</p>
            </div>
            ${a.link ? `<div class="akte-detail-section">
                <h4><i class="fas fa-link"></i> Datei / Link</h4>
                <p style="color:var(--accent-blue);">${esc(a.link)}</p>
            </div>` : ''}
            <div class="case-actions">
                <button class="btn btn-sm btn-primary" onclick="UCP.editAkte(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-danger" onclick="UCP.removeAkte(${i})"><i class="fas fa-trash"></i> Loeschen</button>
            </div>`;
        openModal('modalAkteDetail');
    };

    window.UCP.editAkte = function(i) {
        const a = akten[i];
        document.getElementById('akteTitel').value = a.titel;
        document.getElementById('akteKategorie').value = a.kategorie;
        document.getElementById('akteStatus').value = a.status;
        document.getElementById('akteAktenzeichen').value = a.aktenzeichen || '';
        populateAkteCaseSelect();
        document.getElementById('akteCase').value = a.caseIdx !== undefined ? a.caseIdx : '';
        document.getElementById('akteAutor').value = a.autor || '';
        document.getElementById('akteDatum').value = a.datum || '';
        document.getElementById('akteInhalt').value = a.inhalt;
        document.getElementById('akteLink').value = a.link || '';
        document.getElementById('akteModalTitle').textContent = 'Akte bearbeiten';
        document.getElementById('formAkte').dataset.editIndex = String(i);
        closeModal('modalAkteDetail');
        openModal('modalAkte');
    };

    window.UCP.removeAkte = function(i) {
        if (!confirm('Akte loeschen?')) return;
        akten.splice(i, 1);
        localStorage.setItem('ucp_akten', JSON.stringify(akten));
        loadAkten();
        closeModal('modalAkteDetail');
        showToast('Akte geloescht!');
    };

    // === PERSONALAKTEN ===
    let personalakten = JSON.parse(localStorage.getItem('ucp_personalakten')) || [];

    function populatePAMitarbeiterSelect() {
        const sel = document.getElementById('paMitarbeiter');
        if (!sel) return;
        sel.innerHTML = '<option value="">Mitarbeiter waehlen...</option>';
        mitarbeiter.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = `${m.name} (${m.rang})`;
            sel.appendChild(opt);
        });
        users.forEach(u => {
            if (!mitarbeiter.find(m => m.name === u.username)) {
                const opt = document.createElement('option');
                opt.value = u.username;
                opt.textContent = `${u.username} (Rang ${u.rang || '-'})`;
                sel.appendChild(opt);
            }
        });
    }

    function loadPersonalakten() {
        const container = document.getElementById('paListe');
        if (!container) return;

        const canEdit = canAccessPersonalakten();
        const btnNeue = document.getElementById('btnNeuePA');
        if (btnNeue) btnNeue.style.display = canEdit ? '' : 'none';

        const searchVal = (document.getElementById('searchPA')?.value || '').toLowerCase();
        const filterTyp = document.getElementById('filterPATyp')?.value || '';

        let filtered = personalakten.filter(p => {
            const matchSearch = !searchVal || p.mitarbeiter.toLowerCase().includes(searchVal) || p.betreff.toLowerCase().includes(searchVal) || p.inhalt.toLowerCase().includes(searchVal);
            const matchTyp = !filterTyp || p.typ === filterTyp;
            return matchSearch && matchTyp;
        });

        document.getElementById('paGesamt').textContent = personalakten.length;
        document.getElementById('paAbmahnungen').textContent = personalakten.filter(p => p.typ === 'Abmahnung').length;
        document.getElementById('paBefoerderungen').textContent = personalakten.filter(p => p.typ === 'Befoerderung').length;
        document.getElementById('paNotizen').textContent = personalakten.filter(p => p.typ === 'Notiz' || p.typ === 'Verweis' || p.typ === 'Belobigung').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="pa-empty"><i class="fas fa-folder-user"></i>Keine Personalakte-Eintraege vorhanden.</div>';
            return;
        }

        const typClass = { 'Abmahnung': 'typ-abmahnung', 'Befoerderung': 'typ-befoerderung', 'Notiz': 'typ-notiz', 'Verweis': 'typ-verweis', 'Belobigung': 'typ-belobigung', 'Urlaub': 'typ-urlaub', 'Sonstiges': 'typ-sonstiges' };
        const typIcon = { 'Abmahnung': 'fa-exclamation-triangle', 'Befoerderung': 'fa-arrow-up', 'Notiz': 'fa-sticky-note', 'Verweis': 'fa-hand', 'Belobigung': 'fa-medal', 'Urlaub': 'fa-umbrella-beach', 'Sonstiges': 'fa-ellipsis' };

        container.innerHTML = filtered.map((p, i) => {
            const origIdx = personalakten.indexOf(p);
            return `
                <div class="pa-card" onclick="UCP.showPADetail(${origIdx})">
                    <div class="pa-card-header">
                        <span class="pa-typ-badge ${typClass[p.typ] || 'typ-sonstiges'}">${esc(p.typ)}</span>
                        <span class="pa-mitarbeiter">${esc(p.mitarbeiter)}</span>
                        <span class="pa-title">${esc(p.betreff)}</span>
                        <div class="pa-meta">
                            <span><i class="fas fa-user"></i> ${esc(p.ersteller)}</span>
                            <span><i class="fas fa-calendar-days"></i> ${esc(p.datum)}</span>
                        </div>
                    </div>
                    <div class="pa-details"><p>${esc(p.inhalt.substring(0, 150))}${p.inhalt.length > 150 ? '...' : ''}</p></div>
                    <div class="pa-actions">
                        <span class="ausb-status-badge status-geplant"><i class="fas ${typIcon[p.typ] || 'fa-ellipsis'}"></i> ${esc(p.typ)}</span>
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.showPADetail = function(i) {
        const p = personalakten[i];
        const typClass = { 'Abmahnung': 'typ-abmahnung', 'Befoerderung': 'typ-befoerderung', 'Notiz': 'typ-notiz', 'Verweis': 'typ-verweis', 'Belobigung': 'typ-belobigung', 'Urlaub': 'typ-urlaub', 'Sonstiges': 'typ-sonstiges' };
        const content = document.getElementById('paDetailContent');
        document.getElementById('paDetailTitle').textContent = `Personalakte: ${p.mitarbeiter}`;

        content.innerHTML = `
            <div class="pa-detail-header">
                <span class="pa-typ-badge ${typClass[p.typ] || 'typ-sonstiges'}">${esc(p.typ)}</span>
                <span class="pa-title">${esc(p.betreff)}</span>
            </div>
            <div class="pa-detail-grid">
                <div class="pa-detail-item"><span class="label">Mitarbeiter</span><span class="value">${esc(p.mitarbeiter)}</span></div>
                <div class="pa-detail-item"><span class="label">Typ</span><span class="value">${esc(p.typ)}</span></div>
                <div class="pa-detail-item"><span class="label">Erstellt von</span><span class="value">${esc(p.ersteller)}</span></div>
                <div class="pa-detail-item"><span class="label">Datum</span><span class="value">${esc(p.datum)}</span></div>
            </div>
            <div class="pa-detail-section">
                <h4><i class="fas fa-file-lines"></i> Inhalt</h4>
                <p>${esc(p.inhalt)}</p>
            </div>
            <div class="case-actions">
                <button class="btn btn-sm btn-primary" onclick="UCP.editPA(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-danger" onclick="UCP.removePA(${i})"><i class="fas fa-trash"></i> Loeschen</button>
            </div>`;
        openModal('modalPADetail');
    };

    window.UCP.editPA = function(i) {
        const p = personalakten[i];
        populatePAMitarbeiterSelect();
        document.getElementById('paMitarbeiter').value = p.mitarbeiter;
        document.getElementById('paTyp').value = p.typ;
        document.getElementById('paDatum').value = p.datum;
        document.getElementById('paErsteller').value = p.ersteller;
        document.getElementById('paBetreff').value = p.betreff;
        document.getElementById('paInhalt').value = p.inhalt;
        document.getElementById('paModalTitle').textContent = 'Personalakte bearbeiten';
        document.getElementById('formPA').dataset.editIndex = String(i);
        closeModal('modalPADetail');
        openModal('modalPA');
    };

    window.UCP.removePA = function(i) {
        if (!confirm('Personalakte-Eintrag loeschen?')) return;
        personalakten.splice(i, 1);
        localStorage.setItem('ucp_personalakten', JSON.stringify(personalakten));
        loadPersonalakten();
        closeModal('modalPADetail');
        showToast('Eintrag geloescht!');
    };

    // === PROFILSEITE ===
    window.UCP.goToProfile = function() {
        switchView('profil');
    };

    function loadProfil() {
        if (!currentUser) return;
        const m = mitarbeiter.find(m => m.vorname + ' ' + m.nachname === (currentUser.fullName || currentUser.username) || m.dienstnr === currentUser.dienstnr) || {};

        document.getElementById('profRang').textContent = currentUser.rang || '-';
        document.getElementById('profAbteilung').textContent = m.abteilung || '-';
        document.getElementById('profFunktion').textContent = m.funktion || '-';
        document.getElementById('profDienstnr').textContent = m.dienstnr || '-';

        document.getElementById('profName').value = currentUser.username;
        document.getElementById('profTelefon').value = currentUser.telefon || '';
        document.getElementById('profEmail').value = currentUser.email || '';
        document.getElementById('profAdresse').value = currentUser.adresse || '';
        document.getElementById('profGeburtstag').value = currentUser.geburtstag || '';
        document.getElementById('profNotfall').value = currentUser.notfallkontakt || '';

        const ausbContainer = document.getElementById('profAusbildungen');
        const ausbTypen = getAusbTypen() || [];
        const mAusb = m.ausbildungen || {};
        if (ausbTypen.length === 0) {
            ausbContainer.innerHTML = '<div class="prof-empty">Keine Ausbildungen hinterlegt.</div>';
        } else {
            const statusClass = { 'bestanden': 'status-abgeschlossen', 'nicht bestanden': 'status-abgesagt', 'offen': 'status-geplant' };
            ausbContainer.innerHTML = ausbTypen.map(t => {
                const s = mAusb[t] || {};
                const status = s.status || 'offen';
                return `<div class="prof-ausb-entry">
                    <span class="ausb-name">${esc(t)}</span>
                    <span class="ausb-status ausb-status-badge ${statusClass[status] || 'status-geplant'}">${status === 'bestanden' ? 'Bestanden' : status === 'nicht bestanden' ? 'Nicht bestanden' : 'Offen'}</span>
                    ${s.notizen ? `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.5rem;">${esc(s.notizen)}</span>` : ''}
                </div>`;
            }).join('');
        }

        const paContainer = document.getElementById('profPersonalakte');
        const myName = currentUser.fullName || currentUser.username;
        const paEintraege = personalakten.filter(p => p.mitarbeiter === currentUser.username || p.mitarbeiter === myName);
        if (paEintraege.length === 0) {
            paContainer.innerHTML = '<div class="prof-empty">Keine Eintraege in der Personalakte.</div>';
        } else {
            const typClass = { 'Abmahnung': 'typ-abmahnung', 'Befoerderung': 'typ-befoerderung', 'Notiz': 'typ-notiz', 'Verweis': 'typ-verweis', 'Belobigung': 'typ-belobigung', 'Urlaub': 'typ-urlaub', 'Sonstiges': 'typ-sonstiges' };
            paContainer.innerHTML = paEintraege.map(p => `
                <div class="prof-pa-entry">
                    <div class="pa-header">
                        <span class="pa-typ-badge ${typClass[p.typ] || 'typ-sonstiges'}">${esc(p.typ)}</span>
                        <span style="font-weight:600;">${esc(p.betreff)}</span>
                        <span class="pa-date">${esc(p.datum)}</span>
                        <span class="pa-from">von ${esc(p.ersteller)}</span>
                    </div>
                    <div class="pa-body">${esc(p.inhalt)}</div>
                </div>`).join('');
        }
    }

    function canSendMessages() {
        if (!currentUser) return false;
        return true;
    }

    function populateMsgEmpfaenger() {
        const sel = document.getElementById('msgEmpfaenger');
        if (!sel) return;
        sel.innerHTML = '<option value="">Empfaeger waehlen...</option>';
        const myName = currentUser?.fullName || currentUser?.username || '';
        const empfaenger = [];

        mitarbeiter.filter(m => {
            const name = m.vorname + ' ' + m.nachname;
            return name !== myName;
        }).forEach(m => empfaenger.push({ name: m.vorname + ' ' + m.nachname, rang: m.rang }));

        users.filter(u => (u.fullName || u.username) !== myName && !empfaenger.find(e => e.name === (u.fullName || u.username))).forEach(u => {
            empfaenger.push({ name: u.fullName || u.username, rang: u.rang || 'Unbekannt' });
        });

        empfaenger.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.name;
            opt.textContent = `${e.name} (${e.rang})`;
            sel.appendChild(opt);
        });

        if (empfaenger.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Keine Empfaeger verfuegbar';
            opt.disabled = true;
            sel.appendChild(opt);
        }
    }

    function loadNachrichten() {
        const container = document.getElementById('nachrichtenListe');
        if (!container) return;

        const myName = currentUser?.fullName || currentUser?.username || '';
        const isEmpfangen = msgTab === 'empfangen';

        const msgs = nachrichten.filter(m => isEmpfangen ? m.empfaenger === myName : m.sender === myName);
        msgs.sort((a, b) => (b.datum + ' ' + b.uhrzeit).localeCompare(a.datum + ' ' + a.uhrzeit));

        const empfangenAlle = nachrichten.filter(m => m.empfaenger === myName);
        const ungelesen = empfangenAlle.filter(m => !m.gelesen).length;
        const gesendet = nachrichten.filter(m => m.sender === myName).length;

        document.getElementById('msgEmpfangen').textContent = empfangenAlle.length;
        document.getElementById('msgUngelesen').textContent = ungelesen;
        document.getElementById('msgGesendet').textContent = gesendet;

        if (msgs.length === 0) {
            container.innerHTML = `<div class="msg-empty"><i class="fas fa-envelope"></i>${isEmpfangen ? 'Keine Nachrichten empfangen.' : 'Keine Nachrichten gesendet.'}</div>`;
            return;
        }

        container.innerHTML = msgs.map((m, i) => {
            const origIdx = nachrichten.indexOf(m);
            const isUnread = !m.gelesen && isEmpfangen;
            const myIdx = isEmpfangen ? nachrichten.filter(msg => msg.empfaenger === myName).indexOf(m) : nachrichten.filter(msg => msg.sender === myName).indexOf(m);
            return `
                <div class="msg-card ${isUnread ? 'unread' : ''}" onclick="UCP.leseNachricht(${origIdx})">
                    <div class="msg-icon"><i class="fas ${isEmpfangen ? 'fa-envelope' : 'fa-paper-plane'}"></i></div>
                    <div class="msg-body">
                        <div class="msg-betreff">${esc(m.betreff)}</div>
                        <div class="msg-preview">${esc(m.text.substring(0, 80))}${m.text.length > 80 ? '...' : ''}</div>
                    </div>
                    <div class="msg-meta">
                        <span class="msg-date">${esc(m.datum)} ${esc(m.uhrzeit)}</span>
                        <span class="msg-sender">${isEmpfangen ? esc(m.sender) : esc(m.empfaenger)}</span>
                    </div>
                    <button class="msg-delete" onclick="event.stopPropagation(); UCP.loescheNachricht(${origIdx})"><i class="fas fa-trash"></i></button>
                </div>`;
        }).join('');

        // Badge in Sidebar aktualisieren
        const navBadge = document.querySelector('.nav-item[data-view="nachrichten"] .msg-badge');
        if (navBadge) {
            navBadge.textContent = ungelesen || '';
            navBadge.style.display = ungelesen > 0 ? '' : 'none';
        } else if (ungelesen > 0) {
            const navItem = document.querySelector('.nav-item[data-view="nachrichten"]');
            if (navItem) navItem.insertAdjacentHTML('beforeend', `<span class="msg-badge">${ungelesen}</span>`);
        }
    }

    window.UCP.leseNachricht = function(idx) {
        aktuelleMsgIdx = idx;
        const m = nachrichten[idx];
        m.gelesen = true;
        localStorage.setItem('ucp_nachrichten', JSON.stringify(nachrichten));

        document.getElementById('lesenBetreff').textContent = m.betreff;
        document.getElementById('lesenContent').innerHTML = `
            <div class="msg-detail-header">
                <div class="msg-detail-from">Von: ${esc(m.sender)}</div>
                <div class="msg-detail-to">An: ${esc(m.empfaenger)}</div>
                <div class="msg-detail-date">${esc(m.datum)} ${esc(m.uhrzeit)} Uhr</div>
            </div>
            <div class="msg-detail-text">${esc(m.text)}</div>`;
        openModal('modalNachrichtLesen');
        loadNachrichten();
    };

    window.UCP.loescheNachricht = function(idx) {
        if (!confirm('Nachricht loeschen?')) return;
        nachrichten.splice(idx, 1);
        localStorage.setItem('ucp_nachrichten', JSON.stringify(nachrichten));
        loadNachrichten();
        showToast('Nachricht geloescht!');
    };

    function setupNachrichten() {
        const btn = document.getElementById('btnNeueNachricht');
        if (btn) {
            btn.addEventListener('click', () => {
                if (!canSendMessages()) { showToast('Keine Berechtigung!', 'error'); return; }
                document.getElementById('formNachricht').reset();
                populateMsgEmpfaenger();
                openModal('modalNachricht');
            });
        }

        const form = document.getElementById('formNachricht');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const empfaenger = document.getElementById('msgEmpfaenger').value;
                const betreff = document.getElementById('msgBetreff').value.trim();
                const text = document.getElementById('msgText').value.trim();
                if (!empfaenger) { showToast('Bitte Empfaeger auswaehlen!', 'error'); return; }
                if (!betreff) { showToast('Bitte Betreff eingeben!', 'error'); return; }
                if (!text) { showToast('Bitte Nachricht eingeben!', 'error'); return; }
                const now = new Date();
                nachrichten.push({
                    sender: currentUser.fullName || currentUser.username,
                    empfaenger: empfaenger,
                    betreff: betreff,
                    text: text,
                    datum: now.toLocaleDateString('de-DE'),
                    uhrzeit: now.toTimeString().substring(0, 5),
                    gelesen: false
                });
                localStorage.setItem('ucp_nachrichten', JSON.stringify(nachrichten));
                loadNachrichten();
                closeModal('modalNachricht');
                showToast('Nachricht gesendet!');
            });
        }

        const cancelBtn = document.getElementById('cancelNachricht');
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('modalNachricht'));
        const closeBtn = document.getElementById('closeModalNachricht');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal('modalNachricht'));

        const lesenClose = document.getElementById('lesenClose');
        if (lesenClose) lesenClose.addEventListener('click', () => closeModal('modalNachrichtLesen'));
        const lesenCloseBtn = document.getElementById('closeModalNachrichtLesen');
        if (lesenCloseBtn) lesenCloseBtn.addEventListener('click', () => closeModal('modalNachrichtLesen'));

        const antwortenBtn = document.getElementById('lesenAntworten');
        if (antwortenBtn) {
            antwortenBtn.addEventListener('click', () => {
                if (aktuelleMsgIdx === null) return;
                const m = nachrichten[aktuelleMsgIdx];
                closeModal('modalNachrichtLesen');
                document.getElementById('formNachricht').reset();
                populateMsgEmpfaenger();
                document.getElementById('msgEmpfaenger').value = m.sender;
                document.getElementById('msgBetreff').value = 'Re: ' + m.betreff;
                openModal('modalNachricht');
            });
        }

        const tabEmpf = document.getElementById('msgTabEmpfangen');
        if (tabEmpf) {
            tabEmpf.addEventListener('click', () => {
                msgTab = 'empfangen';
                tabEmpf.classList.add('active');
                document.getElementById('msgTabGesendet')?.classList.remove('active');
                loadNachrichten();
            });
        }

        const tabGes = document.getElementById('msgTabGesendet');
        if (tabGes) {
            tabGes.addEventListener('click', () => {
                msgTab = 'gesendet';
                tabGes.classList.add('active');
                document.getElementById('msgTabEmpfangen')?.classList.remove('active');
                loadNachrichten();
            });
        }
    }

    function updateDashboardAusbildung() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const el = document.getElementById('dashAusbildung');
        if (el) el.textContent = ausbildungen.filter(a => a.datum === todayStr && a.status !== 'Abgesagt').length;
    }

    // === EINSATZ-BERICHTER ===
    let berichte = JSON.parse(localStorage.getItem('ucp_berichte')) || [];

    function loadBerichte() {
        const container = document.getElementById('berichteListe');
        if (!container) return;

        const searchVal = (document.getElementById('searchBericht')?.value || '').toLowerCase();
        const filterStatus = document.getElementById('filterBerichtStatus')?.value || '';
        const filterTyp = document.getElementById('filterBerichtTyp')?.value || '';

        let filtered = berichte.filter(b => {
            const matchSearch = !searchVal || b.vorfall.toLowerCase().includes(searchVal) || b.ort.toLowerCase().includes(searchVal) || b.aktenzeichen.toLowerCase().includes(searchVal);
            const matchStatus = !filterStatus || b.status === filterStatus;
            const matchTyp = !filterTyp || b.typ === filterTyp;
            return matchSearch && matchStatus && matchTyp;
        });

        document.getElementById('ebGesamt').textContent = berichte.length;
        document.getElementById('ebOffen').textContent = berichte.filter(b => b.status === 'Offen').length;
        document.getElementById('ebLaufend').textContent = berichte.filter(b => b.status === 'In Bearbeitung').length;
        document.getElementById('ebAbgeschlossen').textContent = berichte.filter(b => b.status === 'Abgeschlossen').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="ausb-empty"><i class="fas fa-clipboard-list"></i>Keine Einsatz-Berichte vorhanden.</div>';
            return;
        }

        const statusClass = { 'Offen': 'status-geplant', 'In Bearbeitung': 'status-laufend', 'Abgeschlossen': 'status-abgeschlossen' };

        container.innerHTML = filtered.map((b, i) => {
            const origIdx = berichte.indexOf(b);
            const beteiligte = (b.beteiligte || []).filter(t => t.trim());
            return `
                <div class="ausb-card">
                    <div class="ausb-card-header">
                        <span class="ausb-status-badge ${statusClass[b.status] || 'status-geplant'}">${esc(b.status)}</span>
                        <span class="ausb-title">${esc(b.typ)} ${b.aktenzeichen ? '(' + esc(b.aktenzeichen) + ')' : ''}</span>
                        <div class="ausb-meta">
                            <span><i class="fas fa-location-dot"></i> ${esc(b.ort)}</span>
                            <span><i class="fas fa-calendar-days"></i> ${esc(b.datum)} ${esc(b.uhrzeit)} Uhr</span>
                        </div>
                    </div>
                    <div class="ausb-details"><p><strong>Vorfall:</strong> ${esc(b.vorfall)}</p></div>
                    ${b.massnahmen ? `<div class="ausb-details"><p><strong>Massnahmen:</strong> ${esc(b.massnahmen)}</p></div>` : ''}
                    ${beteiligte.length > 0 ? `<div class="ausb-details"><strong>Beteiligte:</strong> ${beteiligte.map(t => esc(t)).join(', ')}</div>` : ''}
                    <div class="ausb-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.editBericht(${origIdx})"><i class="fas fa-pen"></i> Bearbeiten</button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.removeBericht(${origIdx})"><i class="fas fa-trash"></i> Loeschen</button>
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.editBericht = function(idx) {
        const b = berichte[idx];
        document.getElementById('berDatum').value = b.datum;
        document.getElementById('berZeit').value = b.uhrzeit;
        document.getElementById('berTyp').value = b.typ;
        document.getElementById('berStatus').value = b.status;
        document.getElementById('berOrt').value = b.ort;
        document.getElementById('berBeteiligte').value = (b.beteiligte || []).join('\n');
        document.getElementById('berVorfall').value = b.vorfall;
        document.getElementById('berMassnahmen').value = b.massnahmen || '';
        document.getElementById('berAktenzeichen').value = b.aktenzeichen || '';
        document.getElementById('berichtModalTitle').textContent = 'Einsatz-Bericht bearbeiten';
        document.getElementById('formBericht').dataset.editIndex = String(idx);
        openModal('modalBericht');
    };

    window.UCP.removeBericht = function(idx) {
        if (!confirm('Einsatz-Bericht loeschen?')) return;
        berichte.splice(idx, 1);
        localStorage.setItem('ucp_berichte', JSON.stringify(berichte));
        loadBerichte();
        showToast('Einsatz-Bericht geloescht!');
    };

    // === MEDIATHEK ===
    let mediathek = JSON.parse(localStorage.getItem('ucp_mediathek')) || [];

    function loadMediathek() {
        const container = document.getElementById('mediathekListe');
        if (!container) return;

        const searchVal = (document.getElementById('searchMediathek')?.value || '').toLowerCase();
        const filterKat = document.getElementById('filterMedKategorie')?.value || '';

        let filtered = mediathek.filter(m => {
            const matchSearch = !searchVal || m.titel.toLowerCase().includes(searchVal) || m.inhalt.toLowerCase().includes(searchVal);
            const matchKat = !filterKat || m.kategorie === filterKat;
            return matchSearch && matchKat;
        });

        document.getElementById('medGesamt').textContent = mediathek.length;
        document.getElementById('medAusbildung').textContent = mediathek.filter(m => m.kategorie === 'Ausbildungsunterlagen').length;
        document.getElementById('medSops').textContent = mediathek.filter(m => m.kategorie === 'SOPs').length;
        document.getElementById('medGesetze').textContent = mediathek.filter(m => m.kategorie === 'Gesetze').length;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="ausb-empty"><i class="fas fa-book"></i>Keine Eintraege in der Mediathek.</div>';
            return;
        }

        const katIcons = { 'Ausbildungsunterlagen': 'fa-graduation-cap', 'SOPs': 'fa-book-open', 'Gesetze': 'fa-gavel', 'Formulare': 'fa-file-lines', 'Sonstiges': 'fa-folder' };

        container.innerHTML = filtered.map((m, i) => {
            const origIdx = mediathek.indexOf(m);
            return `
                <div class="ausb-card">
                    <div class="ausb-card-header">
                        <span class="ausb-status-badge kat-info"><i class="fas ${katIcons[m.kategorie] || 'fa-file'}"></i> ${esc(m.kategorie)}</span>
                        <span class="ausb-title">${esc(m.titel)}</span>
                        <div class="ausb-meta">
                            ${m.autor ? `<span><i class="fas fa-user"></i> ${esc(m.autor)}</span>` : ''}
                            <span><i class="fas fa-calendar-days"></i> ${esc(m.datum)}</span>
                        </div>
                    </div>
                    <div class="ausb-details"><p style="white-space:pre-wrap;">${esc(m.inhalt)}</p></div>
                    ${m.link ? `<div class="ausb-details"><a href="${esc(m.link)}" target="_blank" style="color:var(--accent-blue);"><i class="fas fa-link"></i> Link oeffnen</a></div>` : ''}
                    <div class="ausb-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.editMediathek(${origIdx})"><i class="fas fa-pen"></i> Bearbeiten</button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.removeMediathek(${origIdx})"><i class="fas fa-trash"></i> Loeschen</button>
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.editMediathek = function(idx) {
        const m = mediathek[idx];
        document.getElementById('medTitel').value = m.titel;
        document.getElementById('medKategorie').value = m.kategorie;
        document.getElementById('medAutor').value = m.autor || '';
        document.getElementById('medInhalt').value = m.inhalt;
        document.getElementById('medLink').value = m.link || '';
        document.getElementById('medModalTitle').textContent = 'Mediathek-Eintrag bearbeiten';
        document.getElementById('formMediathek').dataset.editIndex = String(idx);
        openModal('modalMediathek');
    };

    window.UCP.removeMediathek = function(idx) {
        if (!confirm('Mediathek-Eintrag loeschen?')) return;
        mediathek.splice(idx, 1);
        localStorage.setItem('ucp_mediathek', JSON.stringify(mediathek));
        loadMediathek();
        showToast('Mediathek-Eintrag geloescht!');
    };

    function loadDashTermine() {
        const container = document.getElementById('dashTermineListe');
        if (!container) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const upcoming = termine.filter(t => t.datum >= todayStr).sort((a, b) => (a.datum + (a.uhrzeit || '99:99')) < (b.datum + (b.uhrzeit || '99:99')) ? -1 : 1).slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="dash-termin-empty">Keine anstehenden Termine.</div>';
            return;
        }

        const monthShort = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

        container.innerHTML = upcoming.map((t, i) => {
            const parts = t.datum.split('-');
            const day = parseInt(parts[2]);
            const month = monthShort[parseInt(parts[1]) - 1];
            const origIdx = termine.indexOf(t);
            return `
                <div class="dash-termin-card" onclick="UCP.switchView('kalender')">
                    <div class="dash-termin-date">
                        <span class="date-day">${day}</span>
                        <span class="date-month">${month}</span>
                    </div>
                    <div class="termin-typ-badge typ-${t.typ.toLowerCase()}">${esc(t.typ)}</div>
                    <div class="dash-termin-info">
                        <div class="termin-title">${esc(t.titel)}</div>
                        <div class="termin-meta">
                            ${t.uhrzeit ? `<span><i class="fas fa-clock"></i> ${t.uhrzeit}</span>` : ''}
                            ${t.ort ? `<span><i class="fas fa-map-marker-alt"></i> ${esc(t.ort)}</span>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // ============================================================
    // LEITSTELLE
    // ============================================================
    function buildEinsatzCodes() {
        const container = document.getElementById('einsatzCodes');
        if (!container) return;
        container.innerHTML = '';
        EINSATZ_CODES.forEach(c => {
            const div = document.createElement('div');
            div.className = 'code-item';
            div.innerHTML = `<span class="code-badge ${c.cssClass}">${c.code}</span><span>${c.label}</span>`;
            container.appendChild(div);
        });
    }

    function buildEinsatzfelder() {
        const grid = document.getElementById('einsatzfelderGrid');
        if (!grid) return;
        grid.innerHTML = '';
        EINSATZFELDER.forEach(feld => {
            const btn = document.createElement('button');
            btn.className = 'einsatzfeld-btn';
            btn.textContent = feld;
            btn.addEventListener('click', () => btn.classList.toggle('active'));
            grid.appendChild(btn);
        });
    }

    function loadOfficers() {
        const body = document.getElementById('verfugbarBody');
        if (!body) return;
        body.innerHTML = '';
        if (officers.length === 0) { body.innerHTML = '<tr class="empty-row"><td colspan="6">Keine Beamte.</td></tr>'; return; }
        officers.forEach((o, i) => {
            const codeClass = 'code-' + o.code;
            const codeLabel = EINSATZ_CODES.find(c => c.code === o.code)?.label || '';
            const actions = isAdmin()
                ? `<button class="btn btn-sm btn-primary" onclick="UCP.editOfficer(${i})">Bearbeiten</button> <button class="btn btn-sm btn-danger" onclick="UCP.removeOfficer(${i})">Entfernen</button>`
                : '<span class="text-muted">-</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${esc(o.name)}</td><td>${esc(o.dienstnr)}</td><td>${esc(o.rang)}</td><td><span class="code-badge ${codeClass}">${o.code}</span> ${esc(codeLabel)}</td><td>${esc(o.einsatzfelder?.join(', ') || '-')}</td><td>${actions}</td>`;
            body.appendChild(tr);
        });
    }

    function addOfficer(data) {
        officers.push(data);
        localStorage.setItem('ucp_officers', JSON.stringify(officers));
        loadOfficers();
        updateDashboard();
    }

    window.UCP.editOfficer = function(i) {
        const o = officers[i];
        document.getElementById('officerName').value = o.name;
        document.getElementById('officerDienstnr').value = o.dienstnr;
        document.getElementById('officerRang').value = o.rang;
        document.getElementById('officerCode').value = o.code;
        document.querySelectorAll('#officerEinsatzfelder input[type="checkbox"]').forEach(cb => cb.checked = o.einsatzfelder?.includes(cb.value));
        openModal('modalOfficer');
        document.getElementById('formOfficer').dataset.editIndex = i;
    };

    window.UCP.removeOfficer = function(i) {
        if (!isAdmin()) { showToast('Keine Berechtigung!', 'error'); return; }
        if (!confirm('Beamten entfernen?')) return;
        officers.splice(i, 1);
        localStorage.setItem('ucp_officers', JSON.stringify(officers));
        loadOfficers();
        updateDashboard();
    };

    // ============================================================
    // MITARBEITER
    // ============================================================
    function loadMitarbeiter() { renderMitarbeiter('mitarbeiterBody', 'searchMitarbeiterDash', 'filterRang', 'filterFunktion', 'filterStatus'); }
    function loadMitarbeiter2() { renderMitarbeiter('mitarbeiterBody2', 'searchMitarbeiter', 'filterRang2', 'filterFunktion2', 'filterStatus2'); }

    let sortState = { col: 'rang', dir: 'asc' };

    function sortMitarbeiter(col, dir) {
        const getVal = (m, c) => {
            switch(c) {
                case 'name': return (m.vorname + ' ' + m.nachname).toLowerCase();
                case 'dienstnr': return m.dienstnr || '';
                case 'rang': return parseInt((m.rang || '').split(' ')[0]) || 99;
                case 'abteilung': return (m.abteilung || '').toLowerCase();
                case 'funktion': return (Array.isArray(m.funktion) ? m.funktion.join(' ') : (m.funktion || '')).toLowerCase();
                case 'status': return m.status || '';
                case 'eintritt': return m.eintritt || '';
                default: return '';
            }
        };
        mitarbeiter.sort((a, b) => {
            let va = getVal(a, col), vb = getVal(b, col);
            if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va;
            return dir === 'asc' ? String(va).localeCompare(String(vb), 'de') : String(vb).localeCompare(String(va), 'de');
        });
    }

    function setupSortableTable() {
        document.querySelectorAll('.sortable-table thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (sortState.col === col) {
                    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortState.col = col;
                    sortState.dir = 'asc';
                }
                document.querySelectorAll('.sortable-table thead th[data-sort]').forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                    h.querySelector('i').className = 'fas fa-sort';
                });
                th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
                th.querySelector('i').className = sortState.dir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
                loadMitarbeiter2();
            });
        });
    }

    function renderMitarbeiter(bodyId, searchId, rangId, funktId, statusId) {
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        tbody.innerHTML = '';
        if (mitarbeiter.length === 0) { tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Noch keine Mitarbeiter.</td></tr>'; return; }
        sortMitarbeiter(sortState.col, sortState.dir);
        const sorted = [...mitarbeiter];
        sorted.forEach((m, i) => {
            const origIdx = mitarbeiter.indexOf(m);
            const canEdit = canEditUser(m.rang);
            const funktionText = Array.isArray(m.funktion) ? m.funktion.join(', ') : (m.funktion || '-');
            const isActive = m.status === 'Aktiv';
            const tr = document.createElement('tr');
            tr.dataset.rang = m.rang || '';
            tr.dataset.funktion = Array.isArray(m.funktion) ? m.funktion.join(' ') : (m.funktion || '');
            tr.dataset.status = m.status || '';
            tr.innerHTML = `
                <td>
                    <div class="mitarbeiter-name-cell">
                        <div class="mitarbeiter-avatar"><i class="fas fa-user"></i>${isActive ? '<span class="online-dot"></span>' : ''}</div>
                        <div><strong>${esc(m.vorname)} ${esc(m.nachname)}</strong><br><span class="text-muted">${esc(m.dienstnr)}</span></div>
                    </div>
                </td>
                <td>${esc(m.dienstnr)}</td>
                <td>${esc(m.rang)}${getRankLevel(m.rang) === 0 ? ' <span style="color:var(--accent-red);font-size:0.65rem;font-weight:700;"><i class="fas fa-shield-halved"></i></span>' : m.isAdmin ? ' <span style="color:var(--accent-yellow);font-size:0.65rem;"><i class="fas fa-shield-halved"></i></span>' : ''}</td>
                <td>${esc(m.abteilung || '-')}</td>
                <td>${esc(funktionText)}</td>
                <td><span class="status-badge status-${m.status.toLowerCase()}">${m.status}</span></td>
                <td>${esc(m.eintritt || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="UCP.showMitarbeiterDetail(${origIdx})"><i class="fas fa-user"></i> Profil</button>
                    ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="UCP.editMitarbeiter(${origIdx})"><i class="fas fa-pen"></i> Bearbeiten</button>` : ''}
                    ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="UCP.removeMitarbeiter(${origIdx})"><i class="fas fa-trash"></i> Entfernen</button>` : ''}
                </td>`;
            tbody.appendChild(tr);
        });
        setupTableFilter(bodyId, searchId, rangId, funktId, statusId);
    }

    function setupTableFilter(bodyId, searchId, rangId, funktId, statusId) {
        const search = document.getElementById(searchId);
        const rangFilter = document.getElementById(rangId);
        const funktFilter = document.getElementById(funktId);
        const statusFilter = document.getElementById(statusId);
        if (search) search.oninput = filterTable;
        if (rangFilter) rangFilter.onchange = filterTable;
        if (funktFilter) funktFilter.onchange = filterTable;
        if (statusFilter) statusFilter.onchange = filterTable;

        function filterTable() {
            const query = (search?.value || '').toLowerCase();
            const rang = rangFilter?.value || '';
            const funkt = funktFilter?.value || '';
            const status = statusFilter?.value || '';
            document.querySelectorAll(`#${bodyId} tr[data-rang]`).forEach(row => {
                const match = row.textContent.toLowerCase().includes(query) &&
                    (!rang || row.dataset.rang === rang) &&
                    (!funkt || row.dataset.funktion.includes(funkt)) &&
                    (!status || row.dataset.status === status);
                row.style.display = match ? '' : 'none';
            });
        }
    }

    window.UCP.showMitarbeiterDetail = function(i) {
        const m = mitarbeiter[i];
        const content = document.getElementById('mitarbeiterDetailContent');
        document.getElementById('detailMitarbeiterName').textContent = `${m.vorname} ${m.nachname}`;
        const funktionHtml = Array.isArray(m.funktion) && m.funktion.length > 0
            ? m.funktion.map(f => `<span class="unit-member">${esc(f)}</span>`).join(' ')
            : '-';
        const ausb = m.ausbildungen || {};
        const canEdit = canEditUser(m.rang);
        const ausbHtml = getAusbTypen().map(typ => {
            const status = ausb[typ] || {};
            const badge = status.status === 'bestanden' ? '<span style="color:var(--accent-green);font-weight:600;"><i class="fas fa-check-circle"></i> Bestanden</span>'
                : status.status === 'nicht bestanden' ? '<span style="color:var(--accent-red);font-weight:600;"><i class="fas fa-times-circle"></i> Nicht bestanden</span>'
                : '<span style="color:var(--text-muted);">Offen</span>';
            const notiz = status.notiz ? `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.5rem;">${esc(status.notiz)}</span>` : '';
            return `<div class="ausb-status-row"><span class="ausb-status-typ">${esc(typ)}</span><span class="ausb-status-wert">${badge}${notiz}</span></div>`;
        }).join('');

        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Vorname</span><span class="detail-value">${esc(m.vorname)}</span></div>
                <div class="detail-item"><span class="detail-label">Nachname</span><span class="detail-value">${esc(m.nachname)}</span></div>
                <div class="detail-item"><span class="detail-label">Dienstnummer</span><span class="detail-value">${esc(m.dienstnr)}</span></div>
                <div class="detail-item"><span class="detail-label">Rang</span><span class="detail-value">${esc(m.rang)}${getRankLevel(m.rang) === 0 ? ' <span style="color:var(--accent-red);font-size:0.75rem;font-weight:700;"><i class="fas fa-shield-halved"></i> Ober Admin</span>' : m.isAdmin ? ' <span style="color:var(--accent-yellow);font-size:0.75rem;"><i class="fas fa-shield-halved"></i> Admin</span>' : ''}</span></div>
                <div class="detail-item"><span class="detail-label">Telefon</span><span class="detail-value">${esc(m.telefon || '-')}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge status-${m.status.toLowerCase()}">${m.status}</span></span></div>
                <div class="detail-item"><span class="detail-label">Abteilung</span><span class="detail-value">${esc(m.abteilung || '-')}</span></div>
                <div class="detail-item"><span class="detail-label">Funktion</span><span class="detail-value">${funktionHtml}</span></div>
                <div class="detail-item"><span class="detail-label">Eintritt</span><span class="detail-value">${esc(m.eintritt || '-')}</span></div>
                ${m.notizen ? `<div class="detail-item detail-notizen"><span class="detail-label">Notizen</span><span class="detail-value">${esc(m.notizen)}</span></div>` : ''}
            </div>
            <div class="ausb-status-section">
                <div class="ausb-status-header">
                    <strong><i class="fas fa-graduation-cap"></i> Ausbildungsstatus</strong>
                    ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="UCP.editAusbildungStatus(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>` : ''}
                </div>
                <div class="ausb-status-list">${ausbHtml}</div>
            </div>
                ${canEdit ? `<div class="detail-actions">
                    <button class="btn btn-outline" onclick="UCP.editMitarbeiter(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>
                    <button class="btn btn-danger" onclick="UCP.removeMitarbeiter(${i}); closeModal('modalMitarbeiterDetail');"><i class="fas fa-trash"></i> Entfernen</button>
                </div>` : ''}
                ${getRankLevel(currentUser.rang) === 0 ? `<div class="detail-actions" style="border-top:1px solid var(--border-color);padding-top:0.75rem;margin-top:0.75rem;">
                    <button class="btn btn-sm ${m.isAdmin ? 'btn-danger' : 'btn-primary'}" onclick="UCP.toggleAdmin(${i})">
                        <i class="fas fa-shield-halved"></i> ${m.isAdmin ? 'Admin-Status entziehen' : 'Admin-Status vergeben'}
                    </button>
                </div>` : ''}`;
        openModal('modalMitarbeiterDetail');
    };

    window.UCP.editMitarbeiter = function(i) {
        if (!canEditUser(mitarbeiter[i].rang)) { showToast('Keine Berechtigung!', 'error'); return; }
        const m = mitarbeiter[i];
        document.getElementById('mitVorname').value = m.vorname;
        document.getElementById('mitNachname').value = m.nachname;
        document.getElementById('mitDienstnr').value = m.dienstnr;
        document.getElementById('mitRang').value = m.rang;
        document.getElementById('mitTelefon').value = m.telefon || '';
        document.getElementById('mitStatus').value = m.status;
        document.getElementById('mitAbteilung').value = m.abteilung || '';
        document.querySelectorAll('#mitFunktionGroup input[type="checkbox"]').forEach(cb => {
            cb.checked = Array.isArray(m.funktion) && m.funktion.includes(cb.value);
        });
        document.getElementById('mitNotizen').value = m.notizen || '';
        closeModal('modalMitarbeiterDetail');
        openModal('modalMitarbeiter');
        document.getElementById('formMitarbeiter').dataset.editIndex = i;
        document.getElementById('mitarbeiterModalTitle').textContent = 'Mitarbeiter bearbeiten';
    };

    window.UCP.removeMitarbeiter = function(i) {
        if (!canEditUser(mitarbeiter[i].rang)) { showToast('Keine Berechtigung!', 'error'); return; }
        if (!confirm('Mitarbeiter entfernen?')) return;
        mitarbeiter.splice(i, 1);
        localStorage.setItem('ucp_mitarbeiter', JSON.stringify(mitarbeiter));
        loadMitarbeiter();
        loadMitarbeiter2();
        updateDashboard();
    };

    window.UCP.toggleAdmin = function(i) {
        if (getRankLevel(currentUser.rang) > 0) { showToast('Nur Sheriff Techniker kann Admin-Rechte vergeben!', 'error'); return; }
        const m = mitarbeiter[i];
        m.isAdmin = !m.isAdmin;
        localStorage.setItem('ucp_mitarbeiter', JSON.stringify(mitarbeiter));
        const用户名 = m.vorname + ' ' + m.nachname;
        showToast(m.isAdmin ? `${用户名} ist jetzt Admin!` : `${用户名} ist kein Admin mehr.`);
        UCP.showMitarbeiterDetail(i);
    };

    function addMitarbeiter(data) {
        mitarbeiter.push({
            ...data,
            eintritt: new Date().toLocaleDateString('de-DE'),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('ucp_mitarbeiter', JSON.stringify(mitarbeiter));
        loadMitarbeiter();
        loadMitarbeiter2();
        updateDashboard();
    }

    // === ADMIN PANEL ===
    function canOpenAdminPanel() {
        if (!currentUser) return false;
        const lvl = getRankLevel(currentUser.rang);
        return lvl <= 4;
    }

    function showAdminPanelBtn() {
        const btn = document.getElementById('btnAdminPanel');
        if (btn) btn.style.display = canOpenAdminPanel() ? '' : 'none';
    }

    function loadAdminPanel() {
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        document.getElementById('adminUcpName').value = settings.ucpName || '';
        document.getElementById('adminUcpVersion').value = settings.ucpVersion || '';
        document.getElementById('adminFooter').value = settings.footerText || '';
        document.getElementById('adminBannerUrl').value = settings.bannerUrl || 'Dashboard bild.png';
        document.getElementById('adminDashTitle').value = settings.dashTitle || '';
        document.getElementById('adminDashSubtitle').value = settings.dashSubtitle || '';
        document.getElementById('adminDefAbteilung').value = settings.defAbteilung || '';
        document.getElementById('adminMaxOfficers').value = settings.maxOfficers || '';
        document.getElementById('adminDefaultCode').value = settings.defaultCode || '1';

        const rangSel = document.getElementById('adminDefRang');
        rangSel.innerHTML = '<option value="">Keine</option>';
        Object.keys(RANG_HIERARCHIE).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            rangSel.appendChild(opt);
        });
        rangSel.value = settings.defRang || '';

        const typenContainer = document.getElementById('adminAusbTypenListe');
        const typen = settings.ausbTypen || AUSBILDUNG_TYPEN;
        typenContainer.innerHTML = typen.map((t, i) => `
            <div class="admin-typ-item">
                <span>${esc(t)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveAusbTyp(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const abtContainer = document.getElementById('adminAbteilungenListe');
        const abteilungen = settings.abteilungen || ['VHD', 'SEB', 'DTU', 'K-9', 'Patrol', 'Command', 'SWAT', 'Air'];
        abtContainer.innerHTML = abteilungen.map((a, i) => `
            <div class="admin-typ-item">
                <span>${esc(a)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveAbteilung(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const funkContainer = document.getElementById('adminFunktionenListe');
        const funktionen = settings.funktionen || ['Personalabteilung', 'Ausbilder', 'Waffenausbilder', 'Einheitsleiter', 'Streifenleiter', 'Leitstelle', 'Ermittler'];
        funkContainer.innerHTML = funktionen.map((f, i) => `
            <div class="admin-typ-item">
                <span>${esc(f)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveFunktion(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const usersContainer = document.getElementById('adminUsersListe');
        usersContainer.innerHTML = users.map((u, i) => {
            const m = mitarbeiter.find(m => m.vorname + ' ' + m.nachname === (u.fullName || u.username)) || {};
            return `
            <div class="admin-typ-item">
                <span><strong>${esc(u.username)}</strong> <span style="color:var(--text-muted);font-size:0.75rem;">(${esc(u.rang || 'kein Rang')})</span></span>
                <button class="btn btn-sm btn-outline" onclick="UCP.adminResetPasswort(${i})" title="Passwort zuruecksetzen"><i class="fas fa-key"></i></button>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveUser(${i})" title="Benutzer loeschen"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');

        const rangContainer = document.getElementById('adminRangListe');
        const raenge = settings.raenge || Object.keys(RANG_HIERARCHIE);
        rangContainer.innerHTML = raenge.map((r, i) => `
            <div class="admin-typ-item">
                <span>${esc(r)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveRang(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const rechnKatContainer = document.getElementById('adminRechnungsKats');
        const rechnKats = settings.rechnungsKategorien || ['Personal', 'Fahrzeuge', 'Ausbildung', 'Equipment', 'Gebaeude', 'Sonstiges'];
        rechnKatContainer.innerHTML = rechnKats.map((k, i) => `
            <div class="admin-typ-item">
                <span>${esc(k)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveRechnKat(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const terminKatContainer = document.getElementById('adminTerminKats');
        const terminKats = settings.terminKategorien || ['Dienst', 'Ausbildung', 'Meeting', 'Einsatz', 'Persoenlich', 'Sonstiges'];
        terminKatContainer.innerHTML = terminKats.map((k, i) => `
            <div class="admin-typ-item">
                <span>${esc(k)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveTerminKat(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        document.getElementById('adminStreifeMax').value = settings.streifeMax || 4;
        document.getElementById('adminStreifeFzg').value = settings.streifeFahrzeug || '';
        document.getElementById('adminAccentColor').value = settings.accentColor || '#3b82f6';
        document.getElementById('adminSidebarStyle').value = settings.sidebarStyle || 'dark';
        document.getElementById('adminWillkommen').value = settings.willkommen || '';
        document.getElementById('adminMiranda').value = settings.mirandaText || '';
        document.getElementById('adminShiftFrueh').value = settings.shiftFrueh || '';
        document.getElementById('adminShiftSpaet').value = settings.shiftSpaet || '';
        document.getElementById('adminShiftNacht').value = settings.shiftNacht || '';
        document.getElementById('adminToastDauer').value = settings.toastDauer || 2500;
        document.getElementById('adminSessionTimeout').value = settings.sessionTimeout || 0;
        document.getElementById('adminRegistrierung').checked = settings.registrierung !== false;

        const adminNewRang = document.getElementById('adminNewRang');
        adminNewRang.innerHTML = '';
        const rangOpts = settings.raenge || Object.keys(RANG_HIERARCHIE);
        rangOpts.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = r;
            adminNewRang.appendChild(opt);
        });

        const waffenContainer = document.getElementById('adminWaffenListe');
        const waffen = settings.waffenlizenzen || ['Keine', 'Scharfe Waffen', 'Langwaffen', 'Schusswaffen', 'Beide'];
        waffenContainer.innerHTML = waffen.map((w, i) => `
            <div class="admin-typ-item">
                <span>${esc(w)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveWaffe(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const illegalContainer = document.getElementById('adminIllegalListe');
        const illegal = settings.illegale || ['Drogen', 'Waffen', 'Gestohlene Waren', 'Gefaelschte Dokumente', 'Schwarzgeld'];
        illegalContainer.innerHTML = illegal.map((il, i) => `
            <div class="admin-typ-item">
                <span>${esc(il)}</span>
                <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveIllegal(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        const newsContainer = document.getElementById('adminNewsListe');
        if (news.length === 0) {
            newsContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.875rem;">Keine eigenen Neuigkeiten.</div>';
        } else {
            newsContainer.innerHTML = news.map((n, i) => `
                <div class="admin-news-item">
                    <div class="news-info">
                        <strong>${esc(n.titel)}</strong>
                        <span>${esc(n.kategorie)} - ${esc(n.datum)}</span>
                    </div>
                    <div class="news-actions">
                        <button class="btn btn-sm btn-primary" onclick="UCP.adminEditNews(${i})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.adminRemoveNews(${i})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`).join('');
        }
    }

    window.UCP.adminEditNews = function(idx) {
        const n = news[idx];
        document.getElementById('newsTitel').value = n.titel;
        document.getElementById('newsKategorie').value = n.kategorie;
        document.getElementById('newsBeschreibung').value = n.beschreibung;
        document.getElementById('newsModalTitle').textContent = 'Neuigkeit bearbeiten';
        document.getElementById('formNews').dataset.editIndex = String(idx);
        closeModal('modalAdminPanel');
        openModal('modalNews');
    };

    window.UCP.adminRemoveNews = function(idx) {
        if (!confirm('Neuigkeit loeschen?')) return;
        news.splice(idx, 1);
        localStorage.setItem('ucp_news', JSON.stringify(news));
        loadAdminPanel();
        loadNews();
        showToast('Neuigkeit geloescht!');
    };

    window.UCP.adminRemoveAusbTyp = function(idx) {
        if (!confirm('Ausbildungs-Typ loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const typen = settings.ausbTypen || [...AUSBILDUNG_TYPEN];
        typen.splice(idx, 1);
        settings.ausbTypen = typen;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Typ geloescht!');
    };

    window.UCP.adminRemoveAbteilung = function(idx) {
        if (!confirm('Abteilung loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.abteilungen || ['VHD', 'SEB', 'DTU', 'K-9', 'Patrol', 'Command', 'SWAT', 'Air'];
        list.splice(idx, 1);
        settings.abteilungen = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Abteilung geloescht!');
    };

    window.UCP.adminRemoveFunktion = function(idx) {
        if (!confirm('Funktion loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.funktionen || ['Personalabteilung', 'Ausbilder', 'Waffenausbilder', 'Einheitsleiter', 'Streifenleiter', 'Leitstelle', 'Ermittler'];
        list.splice(idx, 1);
        settings.funktionen = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Funktion geloescht!');
    };

    window.UCP.adminResetPasswort = function(idx) {
        if (!confirm('Passwort fuer ' + users[idx].username + ' auf "admin123" zuruecksetzen?')) return;
        users[idx].password = 'admin123';
        localStorage.setItem('ucp_users', JSON.stringify(users));
        showToast('Passwort zurueckgesetzt! (admin123)');
    };

    window.UCP.adminRemoveUser = function(idx) {
        if (users[idx].username === currentUser.username) { showToast('Du kannst dich nicht selbst loeschen!', 'error'); return; }
        if (!confirm('Benutzer ' + users[idx].username + ' wirklich loeschen?')) return;
        users.splice(idx, 1);
        localStorage.setItem('ucp_users', JSON.stringify(users));
        loadAdminPanel();
        showToast('Benutzer geloescht!');
    };

    window.UCP.adminRemoveRang = function(idx) {
        if (!confirm('Rang loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.raenge || Object.keys(RANG_HIERARCHIE);
        list.splice(idx, 1);
        settings.raenge = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Rang geloescht!');
    };

    window.UCP.adminRemoveRechnKat = function(idx) {
        if (!confirm('Kategorie loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.rechnungsKategorien || ['Personal', 'Fahrzeuge', 'Ausbildung', 'Equipment', 'Gebaeude', 'Sonstiges'];
        list.splice(idx, 1);
        settings.rechnungsKategorien = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Kategorie geloescht!');
    };

    window.UCP.adminRemoveTerminKat = function(idx) {
        if (!confirm('Kategorie loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.terminKategorien || ['Dienst', 'Ausbildung', 'Meeting', 'Einsatz', 'Persoenlich', 'Sonstiges'];
        list.splice(idx, 1);
        settings.terminKategorien = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Kategorie geloescht!');
    };

    window.UCP.adminRemoveWaffe = function(idx) {
        if (!confirm('Waffenlizenz loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.waffenlizenzen || ['Keine', 'Scharfe Waffen', 'Langwaffen', 'Schusswaffen', 'Beide'];
        list.splice(idx, 1);
        settings.waffenlizenzen = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Lizenz geloescht!');
    };

    window.UCP.adminRemoveIllegal = function(idx) {
        if (!confirm('Illegales Gut loeschen?')) return;
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const list = settings.illegale || ['Drogen', 'Waffen', 'Gestohlene Waren', 'Gefaelschte Dokumente', 'Schwarzgeld'];
        list.splice(idx, 1);
        settings.illegale = list;
        localStorage.setItem('ucp_settings', JSON.stringify(settings));
        loadAdminPanel();
        showToast('Gut geloescht!');
    };

    function applyDesign(s) {
        const color = s.accentColor || '#3b82f6';
        const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
        document.documentElement.style.setProperty('--accent-blue', color);
        document.documentElement.style.setProperty('--accent-blue-hover', color);
        document.documentElement.style.setProperty('--accent-blue-light', `rgba(${r},${g},${b},0.15)`);
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (s.sidebarStyle === 'darker') sidebar.style.background = '#0a0e1a';
            else if (s.sidebarStyle === 'blue') sidebar.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)';
            else sidebar.style.background = '';
        }
    }

    // ============================================================
    // INIT
    // ============================================================
    function getAusbTypen() {
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        return settings.ausbTypen || AUSBILDUNG_TYPEN;
    }

    function loadUnits() {
        const container = document.getElementById('unitsContainer');
        if (!container) return;
        container.innerHTML = '';
        const visible = units.filter(u => {
            if (canManageUnits()) return true;
            const name = currentUser.fullName || currentUser.username;
            return u.mitglieder.includes(name) || u.leiter === name;
        });
        if (visible.length === 0) { container.innerHTML = '<div class="text-muted" style="padding:2rem">Keine Units vorhanden.</div>'; return; }
        visible.forEach((u, idx) => {
            const origIdx = units.indexOf(u);
            const mitgliederHtml = u.mitglieder.length > 0
                ? u.mitglieder.map(m => `<span class="unit-member">${esc(m)}</span>`).join('')
                : '<span class="text-muted">Keine Mitglieder</span>';
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.innerHTML = `
                <div class="unit-card-header">
                    <div class="unit-card-title">
                        <span class="unit-icon">${esc(u.kuerzel.substring(0, 3))}</span>
                        <h3>${esc(u.name)}</h3>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="UCP.showUnitDetail(${origIdx})"><i class="fas fa-info-circle"></i> Details</button>
                </div>
                <div class="unit-card-body">
                    ${u.leiter ? `<div class="unit-leiter"><i class="fas fa-star"></i> Leiter: <strong>${esc(u.leiter)}</strong></div>` : ''}
                    ${u.beschreibung ? `<p class="unit-desc">${esc(u.beschreibung)}</p>` : ''}
                    <div class="unit-mitglieder"><strong>Mitglieder (${u.mitglieder.length})</strong><div class="unit-members-list">${mitgliederHtml}</div></div>
                </div>`;
            container.appendChild(card);
        });
    }

    function addUnit(data) {
        units.push({ ...data, createdAt: new Date().toISOString(), createdBy: currentUser.fullName || currentUser.username });
        localStorage.setItem('ucp_units', JSON.stringify(units));
        loadUnits();
    }

    window.UCP.removeUnit = function(i) {
        if (!canManageUnits()) { showToast('Keine Berechtigung!', 'error'); return; }
        if (!confirm('Unit loeschen?')) return;
        units.splice(i, 1);
        localStorage.setItem('ucp_units', JSON.stringify(units));
        loadUnits();
    };

    window.UCP.showUnitDetail = function(i) {
        const u = units[i];
        const content = document.getElementById('unitDetailContent');
        document.getElementById('detailUnitName').textContent = u.name;
        const mitgliederHtml = u.mitglieder.length > 0
            ? u.mitglieder.map(m => `<span class="unit-member">${esc(m)}</span>`).join('')
            : '<span class="text-muted">Keine Mitglieder</span>';
        const canEditUnitNow = canEditUnit(i);
        content.innerHTML = `
            <div class="unit-detail-grid">
                <div class="unit-detail-item"><span class="unit-detail-label">Name</span><span class="unit-detail-value">${esc(u.name)}</span></div>
                <div class="unit-detail-item"><span class="unit-detail-label">Kuerzel</span><span class="unit-detail-value">${esc(u.kuerzel)}</span></div>
                <div class="unit-detail-item"><span class="unit-detail-label">Leiter</span><span class="unit-detail-value">${esc(u.leiter || '-')}</span></div>
                <div class="unit-detail-item"><span class="unit-detail-label">Erstellt von</span><span class="unit-detail-value">${esc(u.createdBy || '-')}</span></div>
                ${u.beschreibung ? `<div class="unit-detail-item unit-detail-full"><span class="unit-detail-label">Beschreibung</span><span class="unit-detail-value">${esc(u.beschreibung)}</span></div>` : ''}
                <div class="unit-detail-members"><span class="unit-detail-label">Mitglieder (${u.mitglieder.length})</span><div class="unit-members-list" style="margin-top:0.5rem">${mitgliederHtml}</div></div>
            </div>
            ${canEditUnitNow ? `<div class="detail-actions">
                <button class="btn btn-outline" onclick="UCP.editUnit(${i})"><i class="fas fa-pen"></i> Bearbeiten</button>
                ${canManageUnits() ? `<button class="btn btn-danger" onclick="UCP.removeUnit(${i}); closeModal('modalUnitDetail');"><i class="fas fa-trash"></i> Loeschen</button>` : ''}
            </div>` : ''}`;
        openModal('modalUnitDetail');
    };

    window.UCP.editUnit = function(i) {
        if (!canEditUnit(i)) { showToast('Keine Berechtigung!', 'error'); return; }
        const u = units[i];
        document.getElementById('unitName').value = u.name;
        document.getElementById('unitKuerzel').value = u.kuerzel;
        document.getElementById('unitBeschreibung').value = u.beschreibung || '';
        document.getElementById('unitLeiter').value = u.leiter || '';
        buildUnitMembersList(u.mitglieder);
        closeModal('modalUnitDetail');
        openModal('modalUnit');
        document.getElementById('formUnit').dataset.editIndex = i;
        document.getElementById('unitModalTitle').textContent = 'Unit bearbeiten';
    };

    function buildUnitMembersList(selected = []) {
        const container = document.getElementById('unitMitgliederListe');
        if (!container) return;
        container.innerHTML = '';
        mitarbeiter.forEach(m => {
            const name = `${m.vorname} ${m.nachname}`;
            const label = document.createElement('label');
            label.className = 'unit-member-check';
            label.innerHTML = `<input type="checkbox" value="${esc(name)}" ${selected.includes(name) ? 'checked' : ''}> ${esc(name)} <span class="unit-member-rang">(${esc(m.rang)})</span>`;
            container.appendChild(label);
        });
    }

    // ============================================================
    // STREIFEN
    // ============================================================
    function loadStreifen() {
        const grid = document.getElementById('streifenGrid');
        if (!grid) return;
        grid.innerHTML = '';
        if (streifen.length === 0) { grid.innerHTML = '<div class="text-muted" style="padding:2rem">Keine Streifen vorhanden.</div>'; return; }
        streifen.forEach((s, i) => {
            const frei = s.maxPlaetze - s.beamte.length;
            const spotHtml = frei > 0 ? `<span class="streife-frei">${frei} frei</span>` : '<span class="streife-voll">Voll</span>';
            const beamteHtml = s.beamte.length > 0
                ? s.beamte.map((b, bi) => `<span class="streife-beamter">${esc(b)} <button class="btn-streife-remove" onclick="UCP.removeStreifeBeamter(${i}, ${bi})">&times;</button></span>`).join('')
                : '<span class="streife-keine">Noch niemand</span>';
            const card = document.createElement('div');
            card.className = 'streife-card';
            card.innerHTML = `
                <div class="streife-card-header">
                    <div class="streife-title"><span class="streife-icon"><i class="fas fa-car"></i></span><h3>${esc(s.name)}</h3>${spotHtml}</div>
                    ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="UCP.removeStreife(${i})"><i class="fas fa-trash"></i> Loeschen</button>` : ''}
                </div>
                <div class="streife-card-body">
                    <div class="streife-meta"><span><i class="fas fa-car-side"></i> ${esc(s.fahrzeug)}</span><span><i class="fas fa-map-marker-alt"></i> ${esc(s.gebiet || '-')}</span><span><i class="fas fa-users"></i> ${s.beamte.length}/${s.maxPlaetze}</span></div>
                    ${s.beschreibung ? `<p class="streife-desc">${esc(s.beschreibung)}</p>` : ''}
                    <div class="streife-beamte"><strong>Beamte:</strong><div class="streife-beamte-list">${beamteHtml}</div></div>
                    <button class="btn btn-primary btn-sm" style="width:100%" onclick="UCP.joinStreife(${i})"><i class="fas fa-plus"></i> Eintragen</button>
                </div>`;
            grid.appendChild(card);
        });
    }

    window.UCP.joinStreife = function(i) {
        const s = streifen[i];
        const name = currentUser.fullName || currentUser.username;
        if (s.beamte.includes(name)) { showToast('Bereits eingetragen!', 'error'); return; }
        if (s.beamte.length >= s.maxPlaetze) { showToast('Streife voll!', 'error'); return; }
        s.beamte.push(name);
        localStorage.setItem('ucp_streifen', JSON.stringify(streifen));
        loadStreifen();
    };

    window.UCP.removeStreifeBeamter = function(si, bi) {
        const s = streifen[si];
        const name = currentUser.fullName || currentUser.username;
        if (s.beamte[bi] !== name && !isAdmin()) { showToast('Keine Berechtigung!', 'error'); return; }
        if (s.beamte[bi] !== name && !confirm(`${s.beamte[bi]} entfernen?`)) return;
        s.beamte.splice(bi, 1);
        localStorage.setItem('ucp_streifen', JSON.stringify(streifen));
        loadStreifen();
    };

    window.UCP.removeStreife = function(i) {
        if (!isAdmin()) { showToast('Keine Berechtigung!', 'error'); return; }
        if (!confirm('Streife loeschen?')) return;
        streifen.splice(i, 1);
        localStorage.setItem('ucp_streifen', JSON.stringify(streifen));
        loadStreifen();
    };

    // ============================================================
    // ZEITERFASSUNG
    // ============================================================
    function setupShift() {
        document.getElementById('btnStempeln')?.addEventListener('click', () => {
            isClockedIn = true;
            clockInTime = new Date().toISOString();
            shiftStart = Date.now();
            localStorage.setItem('ucp_clockedIn', 'true');
            localStorage.setItem('ucp_clockInTime', clockInTime);
            updateShiftUI();
            startShiftTimer();
        });
        document.getElementById('btnAustempeln')?.addEventListener('click', () => {
            if (!confirm('Ausstempeln?')) return;
            addHistorieEntry(clockInTime, new Date().toISOString(), Date.now() - shiftStart);
            isClockedIn = false; shiftStart = null; clockInTime = null;
            localStorage.removeItem('ucp_clockedIn'); localStorage.removeItem('ucp_clockInTime');
            updateShiftUI(); stopShiftTimer();
        });
        updateShiftUI();
        if (isClockedIn && clockInTime) { shiftStart = Date.now() - (Date.now() - new Date(clockInTime).getTime()); startShiftTimer(); }
    }

    function updateShiftUI() {
        const status = document.getElementById('shiftStatus');
        const btnIn = document.getElementById('btnStempeln');
        const btnOut = document.getElementById('btnAustempeln');
        if (!status) return;
        if (isClockedIn) {
            status.innerHTML = '<span class="status-badge status-aktiv">Im Dienst</span>';
            btnIn.disabled = true; btnOut.disabled = false;
        } else {
            status.innerHTML = '<span class="status-badge status-inaktiv">Ausgestempelt</span>';
            btnIn.disabled = false; btnOut.disabled = true;
            document.getElementById('shiftTime').textContent = '00:00:00';
        }
    }

    function startShiftTimer() {
        stopShiftTimer();
        shiftTimer = setInterval(() => {
            document.getElementById('shiftTime').textContent = formatDuration(Date.now() - shiftStart);
        }, 1000);
    }

    function stopShiftTimer() { if (shiftTimer) clearInterval(shiftTimer); }

    function formatDuration(ms) {
        const s = Math.floor(ms / 1000);
        return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    function addHistorieEntry(start, end, duration) {
        const tbody = document.getElementById('historieBody');
        if (!tbody) return;
        if (tbody.querySelector('.empty-row')) tbody.innerHTML = '';
        const d = new Date(start);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${d.toLocaleDateString('de-DE')}</td><td>${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</td><td>${new Date(end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</td><td>${formatDuration(duration)}</td><td><span class="status-badge status-aktiv">Abgeschlossen</span></td>`;
        tbody.insertBefore(row, tbody.firstChild);
    }

    // ============================================================
    // KALENDER
    // ============================================================
    function setupKalender() {
        initCalendarState();
        renderCalendar();
        loadTermineListe();

        document.getElementById('calPrev')?.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
        document.getElementById('calNext')?.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
        document.getElementById('calToday')?.addEventListener('click', () => { initCalendarState(); renderCalendar(); });
    }

    function renderCalendar() {
        const daysContainer = document.getElementById('calDays');
        const monthYearEl = document.getElementById('calMonthYear');
        if (!daysContainer || !monthYearEl) return;

        const monthNames = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        monthYearEl.textContent = `${monthNames[calMonth]} ${calYear}`;

        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        daysContainer.innerHTML = '';

        for (let i = 0; i < startDay; i++) {
            const prevLast = new Date(calYear, calMonth, 0);
            const day = prevLast.getDate() - startDay + i + 1;
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.innerHTML = `<div class="cal-day-num">${day}</div>`;
            daysContainer.appendChild(div);
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === calSelectedDate;
            const events = termine.filter(t => t.datum === dateStr);

            const div = document.createElement('div');
            div.className = 'cal-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '');
            div.innerHTML = `<div class="cal-day-num">${d}</div><div class="cal-day-events">${events.map(e => `<div class="cal-event event-${e.typ.toLowerCase()}" onclick="event.stopPropagation(); UCP.showTerminDetail('${e.datum}', ${termine.indexOf(e)})">${esc(e.titel)}</div>`).join('')}</div>`;
            div.addEventListener('click', () => { calSelectedDate = dateStr; renderCalendar(); loadTermineListe(); });
            daysContainer.appendChild(div);
        }

        const remaining = 42 - (startDay + lastDay.getDate());
        for (let i = 1; i <= remaining; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.innerHTML = `<div class="cal-day-num">${i}</div>`;
            daysContainer.appendChild(div);
        }
    }

    function loadTermineListe() {
        const container = document.getElementById('termineListe');
        const dateLabel = document.getElementById('calSelectedDate');
        if (!container) return;

        let filtered = termine;
        if (calSelectedDate) {
            filtered = termine.filter(t => t.datum === calSelectedDate);
            if (dateLabel) {
                const parts = calSelectedDate.split('-');
                dateLabel.textContent = `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
        } else {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            filtered = termine.filter(t => t.datum >= todayStr);
            if (dateLabel) dateLabel.textContent = 'Kommende Termine';
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="termin-empty">Keine Termine vorhanden.</div>';
            return;
        }

        filtered.sort((a, b) => (a.datum + (a.uhrzeit || '99:99')) < (b.datum + (b.uhrzeit || '99:99')) ? -1 : 1);

        container.innerHTML = filtered.map((t, i) => {
            const origIdx = termine.indexOf(t);
            const parts = t.datum.split('-');
            const datumStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
            const canEdit = isAdmin() || t.erstelltVon === (currentUser.fullName || currentUser.username);
            return `
                <div class="termin-card">
                    <div class="termin-typ-badge typ-${t.typ.toLowerCase()}">${esc(t.typ)}</div>
                    <div class="termin-info">
                        <div class="termin-title">${esc(t.titel)}</div>
                        <div class="termin-meta">
                            <span><i class="fas fa-calendar-days"></i> ${datumStr}</span>
                            ${t.uhrzeit ? `<span><i class="fas fa-clock"></i> ${t.uhrzeit} Uhr</span>` : ''}
                            ${t.ort ? `<span><i class="fas fa-map-marker-alt"></i> ${esc(t.ort)}</span>` : ''}
                        </div>
                        ${t.beschreibung ? `<div class="termin-desc">${esc(t.beschreibung)}</div>` : ''}
                    </div>
                    <div class="termin-actions">
                        <button class="btn btn-sm btn-outline" onclick="UCP.showTerminDetail('${t.datum}', ${origIdx})"><i class="fas fa-info-circle"></i></button>
                        ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="UCP.editTermin(${origIdx})"><i class="fas fa-pen"></i></button>` : ''}
                        ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="UCP.removeTermin(${origIdx})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    window.UCP.showTerminDetail = function(dateStr, idx) {
        const t = termine[idx];
        if (!t) return;
        document.getElementById('terminDetailTitle').textContent = t.titel;
        const parts = t.datum.split('-');
        const datumStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
        const canEdit = isAdmin() || t.erstelltVon === (currentUser.fullName || currentUser.username);
        const content = document.getElementById('terminDetailContent');
        content.innerHTML = `
            <div class="termin-detail-grid">
                <div class="termin-detail-item"><span class="termin-detail-label">Titel</span><span class="termin-detail-value">${esc(t.titel)}</span></div>
                <div class="termin-detail-item"><span class="termin-detail-label">Typ</span><span class="termin-detail-value"><span class="termin-typ-badge typ-${t.typ.toLowerCase()}">${esc(t.typ)}</span></span></div>
                <div class="termin-detail-item"><span class="termin-detail-label">Datum</span><span class="termin-detail-value">${datumStr}</span></div>
                <div class="termin-detail-item"><span class="termin-detail-label">Uhrzeit</span><span class="termin-detail-value">${t.uhrzeit ? t.uhrzeit + ' Uhr' : '-'}</span></div>
                <div class="termin-detail-item"><span class="termin-detail-label">Ort</span><span class="termin-detail-value">${esc(t.ort || '-')}</span></div>
                <div class="termin-detail-item"><span class="termin-detail-label">Erstellt von</span><span class="termin-detail-value">${esc(t.erstelltVon || '-')}</span></div>
                ${t.beschreibung ? `<div class="termin-detail-item termin-detail-full"><span class="termin-detail-label">Beschreibung</span><span class="termin-detail-value">${esc(t.beschreibung)}</span></div>` : ''}
            </div>
            ${canEdit ? `<div class="termin-detail-actions">
                <button class="btn btn-outline" onclick="UCP.editTermin(${idx}); closeModal('modalTerminDetail');"><i class="fas fa-pen"></i> Bearbeiten</button>
                <button class="btn btn-danger" onclick="UCP.removeTermin(${idx}); closeModal('modalTerminDetail');"><i class="fas fa-trash"></i> Loeschen</button>
            </div>` : ''}`;
        openModal('modalTerminDetail');
    };

    window.UCP.editTermin = function(idx) {
        const t = termine[idx];
        document.getElementById('terminTitel').value = t.titel;
        document.getElementById('terminDatum').value = t.datum;
        document.getElementById('terminUhrzeit').value = t.uhrzeit || '';
        document.getElementById('terminTyp').value = t.typ;
        document.getElementById('terminOrt').value = t.ort || '';
        document.getElementById('terminBeschreibung').value = t.beschreibung || '';
        document.getElementById('terminModalTitle').textContent = 'Termin bearbeiten';
        document.getElementById('formTermin').dataset.editIndex = String(idx);
        openModal('modalTermin');
    };

    window.UCP.removeTermin = function(idx) {
        if (!confirm('Termin loeschen?')) return;
        termine.splice(idx, 1);
        localStorage.setItem('ucp_termine', JSON.stringify(termine));
        renderCalendar();
        loadTermineListe();
        updateDashboard();
        showToast('Termin geloescht!');
    };

    // ============================================================
    // RECHNUNGEN
    // ============================================================
    function loadRechnungen() {
        const tbody = document.getElementById('rechnungenBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (rechnungen.length === 0) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Keine Rechnungen.</td></tr>'; updateRechnungSummary(); return; }
        rechnungen.forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i+1}</td><td>${r.datum}</td><td>${esc(r.betreff)}</td><td>${formatCurrency(r.betrag)}</td><td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td><td>${r.status === 'Offen' ? `<button class="btn btn-sm btn-outline" onclick="UCP.stornRechnung(${i})"><i class="fas fa-times"></i> Stornieren</button>` : '-'}</td>`;
            tbody.appendChild(tr);
        });
        updateRechnungSummary();
    }

    function updateRechnungSummary() {
        let offen = 0, aus = 0;
        rechnungen.forEach(r => r.status === 'Offen' ? offen += r.betrag : aus += r.betrag);
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('sumOffen', formatCurrency(offen));
        s('sumAusgezahlt', formatCurrency(aus));
        s('sumGesamt', formatCurrency(offen + aus));
        s('sumCount', rechnungen.length);
    }

    function addRechnung(data) {
        rechnungen.push({ ...data, betrag: parseFloat(data.betrag), status: 'Offen', datum: new Date().toLocaleDateString('de-DE') });
        localStorage.setItem('ucp_rechnungen', JSON.stringify(rechnungen));
        loadRechnungen();
    }

    window.UCP.stornRechnung = function(i) {
        if (!confirm('Stornieren?')) return;
        rechnungen.splice(i, 1);
        localStorage.setItem('ucp_rechnungen', JSON.stringify(rechnungen));
        loadRechnungen();
    };

    // ============================================================
    // FUNKCODES
    // ============================================================
    function buildTenCodes() {
        const body = document.getElementById('tenCodesBody');
        if (!body) return;
        body.innerHTML = '';
        TEN_CODES.forEach(c => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${esc(c.code)}</strong></td><td>${esc(c.meaning)}</td>`; body.appendChild(tr); });
    }

    function buildCodes() {
        const body = document.getElementById('codesBody');
        if (!body) return;
        body.innerHTML = '';
        CODES.forEach(c => { const tr = document.createElement('tr'); tr.innerHTML = `<td><strong>${esc(c.code)}</strong></td><td>${esc(c.meaning)}</td>`; body.appendChild(tr); });
    }

    // ============================================================
    // MIRANDA
    // ============================================================
    function setupMiranda() {
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const mirandaText = settings.mirandaText || MIRANDA_FULL;
        const mirandaShort = settings.mirandaText ? settings.mirandaText.substring(0, 100) + '...' : MIRANDA_SHORT;
        document.getElementById('btnCopyMiranda')?.addEventListener('click', () => { copyToClipboard(mirandaShort); showToast('Kurztext kopiert!'); });
        document.getElementById('btnCopyMirandaFull')?.addEventListener('click', () => { copyToClipboard(mirandaText); showToast('Text kopiert!'); });
        document.getElementById('btnCopyMirandaShort')?.addEventListener('click', () => { copyToClipboard(mirandaShort); showToast('Kurzversion kopiert!'); });
        document.getElementById('btnCopyMirandaProtocol')?.addEventListener('click', () => {
            const t = document.getElementById('mirandaTatvorwurf')?.value;
            const o = document.getElementById('mirandaOrt')?.value;
            const z = document.getElementById('mirandaUhrzeit')?.value;
            if (!t || !o || !z) { showToast('Alle Felder ausfuellen!', 'error'); return; }
            copyToClipboard(`MIRANDA-PROTOKOLL\n\nTatvorwurf: ${t}\nOrt: ${o}\nUhrzeit: ${z}\n\n${mirandaText}`);
            showToast('Protokoll kopiert!');
        });
    }

    // ============================================================
    // WAFFENLIZENZEN
    // ============================================================
    function buildWaffenlizenzen() {
        const container = document.getElementById('lizenzStufen');
        if (!container) return;
        container.innerHTML = '';
        WAFFENLIZENZEN.forEach(w => {
            const div = document.createElement('div');
            div.className = 'lizenz-stufe';
            div.innerHTML = `<div class="lizenz-stufe-header"><span class="lizenz-stufe-nummer">${w.stufe}</span><h3>${esc(w.name)}</h3></div><div class="lizenz-stufe-content">${w.waffen.map(p => `<span class="lizenz-waffe">${esc(p)}</span>`).join('')}</div>`;
            container.appendChild(div);
        });
    }

    // ============================================================
    // SEARCH
    // ============================================================
    function setupSearch() {}

    // ============================================================
    // ILLEGALE
    // ============================================================
    function buildIllegale() {
        const container = document.getElementById('illegaleKategorien');
        if (!container) return;
        container.innerHTML = '';
        ILLEGALE_GEGENSTAENDE.forEach(kat => {
            const div = document.createElement('div');
            div.className = 'illegale-kategorie';
            div.innerHTML = `<div class="illegale-kategorie-header">${esc(kat.kategorie)}</div><div class="illegale-kategorie-content">${kat.items.map(i => `<span class="illegale-item">${esc(i)}</span>`).join('')}</div>`;
            container.appendChild(div);
        });
    }

    // ============================================================
    // FISCHE
    // ============================================================
    function buildFische() {
        const grid = document.getElementById('fischeGrid');
        if (!grid) return;
        grid.innerHTML = '';
        FISCHE.forEach((f, i) => { const div = document.createElement('div'); div.className = 'fisch-item'; div.textContent = `${i+1}. ${f}`; grid.appendChild(div); });
        document.getElementById('searchFische')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            grid.querySelectorAll('.fisch-item').forEach(item => item.classList.toggle('hidden', !item.textContent.toLowerCase().includes(q)));
        });
    }

    // ============================================================
    // STRAFKATALOG
    // ============================================================
    function buildStrafkatalog() {
        const body = document.getElementById('strafkatalogBody');
        if (!body) return;
        body.innerHTML = '';
        STRAFKATALOG.forEach(s => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${esc(s.paragraph)}</td><td>${esc(s.tatbestand)}</td><td>${esc(s.geldstrafe)}</td><td>${esc(s.haft)}</td><td>${esc(s.kategorie)}</td>`; body.appendChild(tr); });
    }

    function buildStrafrechner() {
        const container = document.getElementById('strafKategorien');
        if (!container) return;
        container.innerHTML = '';
        const gruppiert = {};
        STRAFKATALOG.forEach(s => { if (!gruppiert[s.kategorie]) gruppiert[s.kategorie] = []; gruppiert[s.kategorie].push(s); });
        Object.keys(gruppiert).forEach(kat => {
            const icon = STRAF_KATEGORIEN[kat]?.icon || '';
            const div = document.createElement('div');
            div.className = 'straf-kategorie';
            div.innerHTML = `<div class="straf-kategorie-header"><h4>${icon} ${esc(kat)}</h4><span class="straf-kategorie-toggle">&#x25BC;</span></div><div class="straf-kategorie-content"><div class="straf-items">${gruppiert[kat].map(s => `<label class="straf-item" data-haft="${s.haft}" data-geld="${s.geldstrafe}"><input type="checkbox" class="straf-checkbox" value="${s.paragraph}"><div><div class="straf-item-name">${s.paragraph}</div><div class="straf-item-details">${s.tatbestand}</div><div class="straf-item-details">${s.geldstrafe} $ / ${s.haft} Min</div></div></label>`).join('')}</div></div>`;
            div.querySelector('.straf-kategorie-header').addEventListener('click', () => div.classList.toggle('open'));
            container.appendChild(div);
        });
        document.querySelectorAll('.straf-checkbox').forEach(cb => cb.addEventListener('change', updateStrafSummary));
    }

    function updateStrafSummary() {
        let tg = 0, th = 0;
        const bh = document.getElementById('checkBeihilfe')?.checked;
        document.querySelectorAll('.straf-checkbox:checked').forEach(cb => {
            const item = cb.closest('.straf-item');
            const gm = item.dataset.geld?.match(/[\d.]+/g);
            const hm = item.dataset.haft?.match(/[\d.]+/g);
            if (gm) tg += Math.max(...gm.map(Number));
            if (hm) th += Math.max(...hm.map(Number));
        });
        if (bh) { tg = Math.round(tg * 0.8); th = Math.round(th * 0.8); }
        if (document.getElementById('strafInstanz')?.value === 'exekutive' && th > 40) th = 40;
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('sumGeldstrafe', formatCurrency(tg));
        s('sumHaft', th + ' Min');
    }

    function setupStrafActions() {
        document.getElementById('checkBeihilfe')?.addEventListener('change', updateStrafSummary);
        document.getElementById('strafInstanz')?.addEventListener('change', updateStrafSummary);
        document.getElementById('btnClearStraf')?.addEventListener('click', () => { document.querySelectorAll('.straf-checkbox').forEach(cb => cb.checked = false); updateStrafSummary(); });
        document.getElementById('btnCopyStraf')?.addEventListener('click', () => {
            const items = [];
            document.querySelectorAll('.straf-checkbox:checked').forEach(cb => items.push(cb.closest('.straf-item').querySelector('.straf-item-name').textContent));
            copyToClipboard(`STRAFPROTOKOLL\n\nStraftaten: ${items.join(', ') || 'Keine'}\nBeihilfe: ${document.getElementById('checkBeihilfe')?.checked ? 'Ja' : 'Nein'}\nGeldstrafe: ${document.getElementById('sumGeldstrafe')?.textContent}\nHaft: ${document.getElementById('sumHaft')?.textContent}`);
            showToast('Protokoll kopiert!');
        });
    }

    // ============================================================
    // MODALS
    // ============================================================
    function setupModals() {
        document.getElementById('btnAddOfficer')?.addEventListener('click', () => { document.getElementById('formOfficer').reset(); delete document.getElementById('formOfficer').dataset.editIndex; openModal('modalOfficer'); });
        document.getElementById('formOfficer')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = { name: document.getElementById('officerName').value, dienstnr: document.getElementById('officerDienstnr').value, rang: document.getElementById('officerRang').value, code: parseInt(document.getElementById('officerCode').value), einsatzfelder: Array.from(document.querySelectorAll('#officerEinsatzfelder input:checked')).map(cb => cb.value) };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined) { officers[parseInt(idx)] = data; localStorage.setItem('ucp_officers', JSON.stringify(officers)); loadOfficers(); }
            else addOfficer(data);
            closeModal('modalOfficer');
        });
        document.getElementById('cancelOfficer')?.addEventListener('click', () => closeModal('modalOfficer'));
        document.getElementById('closeModalOfficer')?.addEventListener('click', () => closeModal('modalOfficer'));

        ['btnNeuerMitarbeiter', 'btnNeuerMitarbeiterDash'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                if (!canAddMitarbeiter()) { showToast('Keine Berechtigung!', 'error'); return; }
                document.getElementById('formMitarbeiter').reset();
                document.querySelectorAll('#mitFunktionGroup input[type="checkbox"]').forEach(cb => cb.checked = false);
                delete document.getElementById('formMitarbeiter').dataset.editIndex;
                document.getElementById('mitarbeiterModalTitle').textContent = 'Mitarbeiter hinzufuegen';

                const myLevel = getRankLevel(currentUser.rang);
                const mitRangSel = document.getElementById('mitRang');
                if (mitRangSel) {
                    Array.from(mitRangSel.options).forEach(opt => {
                        if (!opt.value) { opt.disabled = false; return; }
                        opt.disabled = myLevel <= 4 ? false : getRankLevel(opt.value) <= myLevel;
                    });
                }
                openModal('modalMitarbeiter');
            });
        });

        document.getElementById('formMitarbeiter')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const funktion = Array.from(document.querySelectorAll('#mitFunktionGroup input:checked')).map(cb => cb.value);
            const data = {
                vorname: document.getElementById('mitVorname').value.trim(),
                nachname: document.getElementById('mitNachname').value.trim(),
                dienstnr: document.getElementById('mitDienstnr').value.trim(),
                rang: document.getElementById('mitRang').value,
                telefon: document.getElementById('mitTelefon').value.trim(),
                status: document.getElementById('mitStatus').value,
                abteilung: document.getElementById('mitAbteilung').value,
                funktion,
                notizen: document.getElementById('mitNotizen').value.trim()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                if (!canEditUser(data.rang)) { showToast('Keine Berechtigung fuer diesen Rang!', 'error'); return; }
                mitarbeiter[parseInt(idx)] = { ...mitarbeiter[parseInt(idx)], ...data };
                showToast('Mitarbeiter aktualisiert!');
            } else {
                if (!canAddMitarbeiter()) { showToast('Keine Berechtigung!', 'error'); return; }
                mitarbeiter.push(data);
                showToast('Mitarbeiter hinzugefuegt!');
            }
            localStorage.setItem('ucp_mitarbeiter', JSON.stringify(mitarbeiter));
        loadMitarbeiter2();
            updateDashboard();
            closeModal('modalMitarbeiter');
        });
        document.getElementById('cancelMitarbeiter')?.addEventListener('click', () => closeModal('modalMitarbeiter'));
        document.getElementById('closeModalMitarbeiter')?.addEventListener('click', () => closeModal('modalMitarbeiter'));
        document.getElementById('closeModalMitarbeiterDetail')?.addEventListener('click', () => closeModal('modalMitarbeiterDetail'));

        document.getElementById('btnNeueUnit')?.addEventListener('click', () => {
            if (!canManageUnits()) { showToast('Keine Berechtigung!', 'error'); return; }
            document.getElementById('formUnit').reset();
            delete document.getElementById('formUnit').dataset.editIndex;
            document.getElementById('unitModalTitle').textContent = 'Unit erstellen';
            buildUnitMembersList();
            openModal('modalUnit');
        });

        document.getElementById('formUnit')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const mitglieder = Array.from(document.querySelectorAll('#unitMitgliederListe input:checked')).map(cb => cb.value);
            const data = { name: document.getElementById('unitName').value.trim(), kuerzel: document.getElementById('unitKuerzel').value.trim().toUpperCase(), beschreibung: document.getElementById('unitBeschreibung').value.trim(), leiter: document.getElementById('unitLeiter').value.trim(), mitglieder };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined) { units[parseInt(idx)] = { ...units[parseInt(idx)], ...data }; localStorage.setItem('ucp_units', JSON.stringify(units)); loadUnits(); showToast('Aktualisiert!'); }
            else { addUnit(data); showToast('Unit erstellt!'); }
            closeModal('modalUnit');
        });
        document.getElementById('cancelUnit')?.addEventListener('click', () => closeModal('modalUnit'));
        document.getElementById('closeModalUnit')?.addEventListener('click', () => closeModal('modalUnit'));
        document.getElementById('closeModalUnitDetail')?.addEventListener('click', () => closeModal('modalUnitDetail'));

        document.getElementById('btnNeueStreife')?.addEventListener('click', () => { document.getElementById('formStreife').reset(); openModal('modalStreife'); });
        document.getElementById('formStreife')?.addEventListener('submit', (e) => {
            e.preventDefault();
            streifen.push({ name: document.getElementById('streifeName').value.trim(), fahrzeug: document.getElementById('streifeFahrzeug').value, maxPlaetze: parseInt(document.getElementById('streifeMax').value) || 4, gebiet: document.getElementById('streifeGebiet').value.trim(), beschreibung: document.getElementById('streifeBeschreibung').value.trim(), beamte: [], createdAt: new Date().toISOString(), createdBy: currentUser.fullName || currentUser.username });
            localStorage.setItem('ucp_streifen', JSON.stringify(streifen));
            loadStreifen();
            closeModal('modalStreife');
            showToast('Streife erstellt!');
        });
        document.getElementById('cancelStreife')?.addEventListener('click', () => closeModal('modalStreife'));
        document.getElementById('closeModalStreife')?.addEventListener('click', () => closeModal('modalStreife'));

        document.getElementById('btnNeueRechnung')?.addEventListener('click', () => { document.getElementById('formRechnung').reset(); openModal('modalRechnung'); });
        document.getElementById('formRechnung')?.addEventListener('submit', (e) => {
            e.preventDefault();
            addRechnung({ betreff: document.getElementById('rechnungBetreff').value, betrag: document.getElementById('rechnungBetrag').value, beschreibung: document.getElementById('rechnungBeschreibung').value });
            closeModal('modalRechnung');
            showToast('Rechnung eingereicht!');
        });
        document.getElementById('cancelRechnung')?.addEventListener('click', () => closeModal('modalRechnung'));
        document.getElementById('closeModalRechnung')?.addEventListener('click', () => closeModal('modalRechnung'));

        document.getElementById('btnRefreshLeitstelle')?.addEventListener('click', loadOfficers);

        // === ADMIN PANEL EVENT HANDLERS ===

        document.getElementById('btnAdminPanel')?.addEventListener('click', () => {
            if (!canOpenAdminPanel()) { showToast('Keine Berechtigung!', 'error'); return; }
            try { loadAdminPanel(); } catch(e) { console.error('loadAdminPanel:', e); }
            openModal('modalAdminPanel');
        });

        document.getElementById('closeModalAdminPanel')?.addEventListener('click', () => closeModal('modalAdminPanel'));

        document.getElementById('adminSaveBanner')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.bannerUrl = document.getElementById('adminBannerUrl').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            const banner = document.querySelector('.dashboard-banner');
            if (banner) banner.style.backgroundImage = `url('${esc(settings.bannerUrl)}')`;
            showToast('Banner gespeichert!');
        });

        document.getElementById('adminSaveTitle')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.dashTitle = document.getElementById('adminDashTitle').value.trim();
            settings.dashSubtitle = document.getElementById('adminDashSubtitle').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            const titleEl = document.querySelector('.dashboard-title');
            const subEl = document.querySelector('.dashboard-subtitle');
            if (titleEl && settings.dashTitle) titleEl.textContent = settings.dashTitle;
            if (subEl && settings.dashSubtitle) subEl.textContent = settings.dashSubtitle;
            showToast('Titel gespeichert!');
        });

        document.getElementById('adminSaveSystem')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.ucpName = document.getElementById('adminUcpName').value.trim();
            settings.ucpVersion = document.getElementById('adminUcpVersion').value.trim();
            settings.footerText = document.getElementById('adminFooter').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            if (settings.ucpName) document.title = settings.ucpName;
            showToast('System gespeichert!');
        });

        document.getElementById('adminSaveDefaults')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.defAbteilung = document.getElementById('adminDefAbteilung').value;
            settings.defRang = document.getElementById('adminDefRang').value;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Defaults gespeichert!');
        });

        document.getElementById('adminAddAusbTyp')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeuerAusbTyp').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const typen = settings.ausbTypen || [...AUSBILDUNG_TYPEN];
            if (typen.includes(val)) { showToast('Typ existiert bereits!', 'error'); return; }
            typen.push(val);
            settings.ausbTypen = typen;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeuerAusbTyp').value = '';
            loadAdminPanel();
            showToast('Typ hinzugefuegt!');
        });

        document.getElementById('adminSaveLeitstelle')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.maxOfficers = parseInt(document.getElementById('adminMaxOfficers').value) || 10;
            settings.defaultCode = document.getElementById('adminDefaultCode').value;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Leitstelle gespeichert!');
        });

        document.getElementById('adminAddAbteilung')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeueAbteilung').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.abteilungen || ['VHD', 'SEB', 'DTU', 'K-9', 'Patrol', 'Command', 'SWAT', 'Air'];
            if (list.includes(val)) { showToast('Abteilung existiert bereits!', 'error'); return; }
            list.push(val);
            settings.abteilungen = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeueAbteilung').value = '';
            loadAdminPanel();
            showToast('Abteilung hinzugefuegt!');
        });

        document.getElementById('adminAddFunktion')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeueFunktion').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.funktionen || ['Personalabteilung', 'Ausbilder', 'Waffenausbilder', 'Einheitsleiter', 'Streifenleiter', 'Leitstelle', 'Ermittler'];
            if (list.includes(val)) { showToast('Funktion existiert bereits!', 'error'); return; }
            list.push(val);
            settings.funktionen = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeueFunktion').value = '';
            loadAdminPanel();
            showToast('Funktion hinzugefuegt!');
        });

        document.getElementById('adminAddRang')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeuerRang').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.raenge || Object.keys(RANG_HIERARCHIE);
            if (list.includes(val)) { showToast('Rang existiert bereits!', 'error'); return; }
            list.push(val);
            settings.raenge = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeuerRang').value = '';
            loadAdminPanel();
            showToast('Rang hinzugefuegt!');
        });

        document.getElementById('adminAddRechnKat')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeueRechnKat').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.rechnungsKategorien || ['Personal', 'Fahrzeuge', 'Ausbildung', 'Equipment', 'Gebaeude', 'Sonstiges'];
            if (list.includes(val)) { showToast('Kategorie existiert bereits!', 'error'); return; }
            list.push(val);
            settings.rechnungsKategorien = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeueRechnKat').value = '';
            loadAdminPanel();
            showToast('Kategorie hinzugefuegt!');
        });

        document.getElementById('adminAddTerminKat')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeueTerminKat').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.terminKategorien || ['Dienst', 'Ausbildung', 'Meeting', 'Einsatz', 'Persoenlich', 'Sonstiges'];
            if (list.includes(val)) { showToast('Kategorie existiert bereits!', 'error'); return; }
            list.push(val);
            settings.terminKategorien = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeueTerminKat').value = '';
            loadAdminPanel();
            showToast('Kategorie hinzugefuegt!');
        });

        document.getElementById('adminSaveStreife')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.streifeMax = parseInt(document.getElementById('adminStreifeMax').value) || 4;
            settings.streifeFahrzeug = document.getElementById('adminStreifeFzg').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Streifen gespeichert!');
        });

        document.getElementById('adminSaveDesign')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.accentColor = document.getElementById('adminAccentColor').value;
            settings.sidebarStyle = document.getElementById('adminSidebarStyle').value;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            applyDesign(settings);
            showToast('Design gespeichert!');
        });

        document.getElementById('adminSaveWillkommen')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.willkommen = document.getElementById('adminWillkommen').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Willkommensnachricht gespeichert!');
        });

        document.getElementById('adminSaveMiranda')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.mirandaText = document.getElementById('adminMiranda').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Miranda-Rechte gespeichert!');
        });

        document.getElementById('adminAddWaffe')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeueWaffe').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.waffenlizenzen || ['Keine', 'Scharfe Waffen', 'Langwaffen', 'Schusswaffen', 'Beide'];
            if (list.includes(val)) { showToast('Lizenz existiert bereits!', 'error'); return; }
            list.push(val);
            settings.waffenlizenzen = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeueWaffe').value = '';
            loadAdminPanel();
            showToast('Lizenz hinzugefuegt!');
        });

        document.getElementById('adminAddIllegal')?.addEventListener('click', () => {
            const val = document.getElementById('adminNeuesIllegal').value.trim();
            if (!val) return;
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            const list = settings.illegale || ['Drogen', 'Waffen', 'Gestohlene Waren', 'Gefaelschte Dokumente', 'Schwarzgeld'];
            if (list.includes(val)) { showToast('Gut existiert bereits!', 'error'); return; }
            list.push(val);
            settings.illegale = list;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            document.getElementById('adminNeuesIllegal').value = '';
            loadAdminPanel();
            showToast('Gut hinzugefuegt!');
        });

        document.getElementById('adminSaveShift')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.shiftFrueh = document.getElementById('adminShiftFrueh').value.trim();
            settings.shiftSpaet = document.getElementById('adminShiftSpaet').value.trim();
            settings.shiftNacht = document.getElementById('adminShiftNacht').value.trim();
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('Schichtplan gespeichert!');
        });

        document.getElementById('adminSaveSystemOpts')?.addEventListener('click', () => {
            const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
            settings.toastDauer = parseInt(document.getElementById('adminToastDauer').value) || 2500;
            settings.sessionTimeout = parseInt(document.getElementById('adminSessionTimeout').value) || 0;
            settings.registrierung = document.getElementById('adminRegistrierung').checked;
            localStorage.setItem('ucp_settings', JSON.stringify(settings));
            showToast('System-Optionen gespeichert!');
        });

        document.getElementById('adminCreateUser')?.addEventListener('click', () => {
            const username = document.getElementById('adminNewUsername').value.trim();
            const password = document.getElementById('adminNewPassword').value.trim();
            const fullName = document.getElementById('adminNewFullName').value.trim();
            const dienstnr = document.getElementById('adminNewDienstnr').value.trim();
            const rang = document.getElementById('adminNewRang').value;
            if (!username) { showToast('Benutzername erforderlich!', 'error'); return; }
            if (!password) { showToast('Passwort erforderlich!', 'error'); return; }
            if (users.find(u => u.username === username)) { showToast('Benutzername existiert bereits!', 'error'); return; }
            users.push({ username, password, fullName: fullName || username, dienstnr, rang, createdAt: new Date().toISOString() });
            localStorage.setItem('ucp_users', JSON.stringify(users));
            document.getElementById('adminNewUsername').value = '';
            document.getElementById('adminNewPassword').value = '';
            document.getElementById('adminNewFullName').value = '';
            document.getElementById('adminNewDienstnr').value = '';
            loadAdminPanel();
            showToast('Benutzer ' + username + ' erstellt!');
        });

        document.getElementById('adminAddNews')?.addEventListener('click', () => {
            document.getElementById('formNews').reset();
            delete document.getElementById('formNews').dataset.editIndex;
            document.getElementById('newsModalTitle').textContent = 'Neue Neuigkeit';
            closeModal('modalAdminPanel');
            openModal('modalNews');
        });

        document.getElementById('adminExportUsers')?.addEventListener('click', () => {
            const data = { ucp_users: users };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ucp-users-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('Benutzer exportiert! Datei an Kollegen senden.');
        });

        document.getElementById('adminExportData')?.addEventListener('click', () => {
            const data = {};
            const keys = ['ucp_users', 'ucp_mitarbeiter', 'ucp_termine', 'ucp_rechnungen', 'ucp_streifen', 'ucp_units', 'ucp_nachrichten', 'ucp_cases', 'ucp_akten', 'ucp_personalakten', 'ucp_news', 'ucp_settings', 'ucp_officers'];
            keys.forEach(k => { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v); });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ucp-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('Daten exportiert!');
        });

        document.getElementById('adminImportData')?.addEventListener('click', () => {
            document.getElementById('adminImportFile').click();
        });

        document.getElementById('adminImportFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    Object.keys(data).forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
                    showToast('Daten importiert! Seite neu laden.');
                    setTimeout(() => location.reload(), 1500);
                } catch(err) { showToast('Fehler beim Import!', 'error'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        document.getElementById('adminResetData')?.addEventListener('click', () => {
            if (!confirm('WIRKLICH alle Daten zuruecksetzen? Das kann nicht rueckaengig gemacht werden!')) return;
            if (!confirm('Bist du sicher? ALLE Daten werden geloescht!')) return;
            localStorage.clear();
            showToast('Alle Daten geloescht! Seite neu laden.');
            setTimeout(() => location.reload(), 1500);
        });

        // === NEWS ===
        document.getElementById('btnNeueNews')?.addEventListener('click', () => {
            document.getElementById('formNews').reset();
            delete document.getElementById('formNews').dataset.editIndex;
            document.getElementById('newsModalTitle').textContent = 'Neue Neuigkeit';
            openModal('modalNews');
        });

        document.getElementById('formNews')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                titel: document.getElementById('newsTitel').value.trim(),
                kategorie: document.getElementById('newsKategorie').value,
                beschreibung: document.getElementById('newsBeschreibung').value.trim(),
                datum: new Date().toLocaleDateString('de-DE')
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                news[parseInt(idx)] = { ...news[parseInt(idx)], ...data };
                showToast('Neuigkeit aktualisiert!');
            } else {
                news.push(data);
                showToast('Neuigkeit veroeffentlicht!');
            }
            localStorage.setItem('ucp_news', JSON.stringify(news));
            loadNews();
            closeModal('modalNews');
        });

        document.getElementById('cancelNews')?.addEventListener('click', () => closeModal('modalNews'));
        document.getElementById('closeModalNews')?.addEventListener('click', () => closeModal('modalNews'));

        // === AUSBILDUNG ===
        document.getElementById('btnNeueAusbildung')?.addEventListener('click', () => {
            document.getElementById('formAusbildung').reset();
            delete document.getElementById('formAusbildung').dataset.editIndex;
            document.getElementById('ausbildungModalTitle').textContent = 'Neue Ausbildung';
            document.getElementById('ausbDatum').value = new Date().toISOString().split('T')[0];
            openModal('modalAusbildung');
        });

        document.getElementById('formAusbildung')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const tn = document.getElementById('ausbTeilnehmer').value.split('\n').map(s => s.trim()).filter(Boolean);
            const data = {
                titel: document.getElementById('ausbTitel').value.trim(),
                datum: document.getElementById('ausbDatum').value,
                zeit: document.getElementById('ausbZeit').value,
                status: document.getElementById('ausbStatus').value,
                typ: document.getElementById('ausbTyp').value,
                plaetze: parseInt(document.getElementById('ausbPlaetze').value) || 10,
                beschreibung: document.getElementById('ausbBeschreibung').value.trim(),
                teilnehmer: tn
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                ausbildungen[parseInt(idx)] = { ...ausbildungen[parseInt(idx)], ...data };
                showToast('Ausbildung aktualisiert!');
            } else {
                ausbildungen.push(data);
                showToast('Ausbildung erstellt!');
            }
            localStorage.setItem('ucp_ausbildungen', JSON.stringify(ausbildungen));
            loadAusbildungen();
            closeModal('modalAusbildung');
        });

        document.getElementById('cancelAusbildung')?.addEventListener('click', () => closeModal('modalAusbildung'));
        document.getElementById('closeModalAusbildung')?.addEventListener('click', () => closeModal('modalAusbildung'));
        document.getElementById('filterAusbStatus')?.addEventListener('change', loadAusbildungen);

        // === EINSATZ-BERICHTER ===
        document.getElementById('btnNeuerBericht')?.addEventListener('click', () => {
            document.getElementById('formBericht').reset();
            delete document.getElementById('formBericht').dataset.editIndex;
            document.getElementById('berichtModalTitle').textContent = 'Neuer Einsatz-Bericht';
            document.getElementById('berDatum').value = new Date().toISOString().split('T')[0];
            openModal('modalBericht');
        });

        document.getElementById('formBericht')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const beteiligte = document.getElementById('berBeteiligte').value.split('\n').map(s => s.trim()).filter(Boolean);
            const data = {
                datum: document.getElementById('berDatum').value,
                uhrzeit: document.getElementById('berZeit').value,
                typ: document.getElementById('berTyp').value,
                status: document.getElementById('berStatus').value,
                ort: document.getElementById('berOrt').value.trim(),
                beteiligte: beteiligte,
                vorfall: document.getElementById('berVorfall').value.trim(),
                massnahmen: document.getElementById('berMassnahmen').value.trim(),
                aktenzeichen: document.getElementById('berAktenzeichen').value.trim()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                berichte[parseInt(idx)] = { ...berichte[parseInt(idx)], ...data };
                showToast('Bericht aktualisiert!');
            } else {
                berichte.push(data);
                showToast('Bericht erstellt!');
            }
            localStorage.setItem('ucp_berichte', JSON.stringify(berichte));
            loadBerichte();
            closeModal('modalBericht');
        });

        document.getElementById('cancelBericht')?.addEventListener('click', () => closeModal('modalBericht'));
        document.getElementById('closeModalBericht')?.addEventListener('click', () => closeModal('modalBericht'));
        document.getElementById('filterBerichtStatus')?.addEventListener('change', loadBerichte);
        document.getElementById('filterBerichtTyp')?.addEventListener('change', loadBerichte);
        document.getElementById('searchBericht')?.addEventListener('input', loadBerichte);

        // === CASE MANAGEMENT ===
        document.getElementById('btnNeuerCase')?.addEventListener('click', () => {
            document.getElementById('formCase').reset();
            delete document.getElementById('formCase').dataset.editIndex;
            document.getElementById('caseModalTitle').textContent = 'Neuer Case';
            document.getElementById('caseDatum').value = new Date().toISOString().split('T')[0];
            openModal('modalCase');
        });

        document.getElementById('formCase')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const beteiligte = document.getElementById('caseBeteiligte').value.split('\n').map(s => s.trim()).filter(Boolean);
            const data = {
                titel: document.getElementById('caseTitel').value.trim(),
                aktenzeichen: document.getElementById('caseAktenzeichen').value.trim(),
                typ: document.getElementById('caseTyp').value,
                status: document.getElementById('caseStatus').value,
                prioritaet: document.getElementById('casePrioritaet').value,
                fallfuehrer: document.getElementById('caseFallfuehrer').value.trim(),
                datum: document.getElementById('caseDatum').value,
                ort: document.getElementById('caseOrt').value.trim(),
                beteiligte: beteiligte,
                beschreibung: document.getElementById('caseBeschreibung').value.trim(),
                notizen: document.getElementById('caseNotizen').value.trim()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                cases[parseInt(idx)] = { ...cases[parseInt(idx)], ...data };
                showToast('Case aktualisiert!');
            } else {
                cases.push(data);
                showToast('Case erstellt!');
            }
            localStorage.setItem('ucp_cases', JSON.stringify(cases));
            loadCases();
            closeModal('modalCase');
        });

        document.getElementById('cancelCase')?.addEventListener('click', () => closeModal('modalCase'));
        document.getElementById('closeModalCase')?.addEventListener('click', () => closeModal('modalCase'));
        document.getElementById('closeModalCaseDetail')?.addEventListener('click', () => closeModal('modalCaseDetail'));
        document.getElementById('filterCaseStatus')?.addEventListener('change', loadCases);
        document.getElementById('filterCasePrioritaet')?.addEventListener('change', loadCases);
        document.getElementById('searchCase')?.addEventListener('input', loadCases);

        // === AKTEN ===
        document.getElementById('btnNeueAkte')?.addEventListener('click', () => {
            document.getElementById('formAkte').reset();
            delete document.getElementById('formAkte').dataset.editIndex;
            document.getElementById('akteModalTitle').textContent = 'Neue Akte';
            document.getElementById('akteDatum').value = new Date().toISOString().split('T')[0];
            document.getElementById('akteAutor').value = currentUser;
            populateAkteCaseSelect();
            openModal('modalAkte');
        });

        document.getElementById('formAkte')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                titel: document.getElementById('akteTitel').value.trim(),
                kategorie: document.getElementById('akteKategorie').value,
                status: document.getElementById('akteStatus').value,
                aktenzeichen: document.getElementById('akteAktenzeichen').value.trim(),
                caseIdx: document.getElementById('akteCase').value,
                autor: document.getElementById('akteAutor').value.trim(),
                datum: document.getElementById('akteDatum').value,
                inhalt: document.getElementById('akteInhalt').value.trim(),
                link: document.getElementById('akteLink').value.trim()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                akten[parseInt(idx)] = { ...akten[parseInt(idx)], ...data };
                showToast('Akte aktualisiert!');
            } else {
                akten.push(data);
                showToast('Akte erstellt!');
            }
            localStorage.setItem('ucp_akten', JSON.stringify(akten));
            loadAkten();
            closeModal('modalAkte');
        });

        document.getElementById('cancelAkte')?.addEventListener('click', () => closeModal('modalAkte'));
        document.getElementById('closeModalAkte')?.addEventListener('click', () => closeModal('modalAkte'));
        document.getElementById('closeModalAkteDetail')?.addEventListener('click', () => closeModal('modalAkteDetail'));
        document.getElementById('filterAkteKategorie')?.addEventListener('change', loadAkten);
        document.getElementById('filterAkteStatus')?.addEventListener('change', loadAkten);
        document.getElementById('searchAkte')?.addEventListener('input', loadAkten);

        // === PERSONALAKTEN ===
        document.getElementById('btnNeuePA')?.addEventListener('click', () => {
            document.getElementById('formPA').reset();
            delete document.getElementById('formPA').dataset.editIndex;
            document.getElementById('paModalTitle').textContent = 'Neuer Personalakte-Eintrag';
            document.getElementById('paDatum').value = new Date().toISOString().split('T')[0];
            document.getElementById('paErsteller').value = currentUser;
            populatePAMitarbeiterSelect();
            openModal('modalPA');
        });

        document.getElementById('formPA')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                mitarbeiter: document.getElementById('paMitarbeiter').value,
                typ: document.getElementById('paTyp').value,
                datum: document.getElementById('paDatum').value,
                ersteller: document.getElementById('paErsteller').value.trim(),
                betreff: document.getElementById('paBetreff').value.trim(),
                inhalt: document.getElementById('paInhalt').value.trim()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                personalakten[parseInt(idx)] = { ...personalakten[parseInt(idx)], ...data };
                showToast('Eintrag aktualisiert!');
            } else {
                personalakten.push(data);
                showToast('Eintrag erstellt!');
            }
            localStorage.setItem('ucp_personalakten', JSON.stringify(personalakten));
            loadPersonalakten();
            closeModal('modalPA');
        });

        document.getElementById('cancelPA')?.addEventListener('click', () => closeModal('modalPA'));
        document.getElementById('closeModalPA')?.addEventListener('click', () => closeModal('modalPA'));
        document.getElementById('closeModalPADetail')?.addEventListener('click', () => closeModal('modalPADetail'));
        document.getElementById('filterPATyp')?.addEventListener('change', loadPersonalakten);
        document.getElementById('searchPA')?.addEventListener('input', loadPersonalakten);

        // === PERSONEN-AKTEN ===
        document.getElementById('btnNeuePerson')?.addEventListener('click', openNewPersonModal);
        document.getElementById('btnSavePerson')?.addEventListener('click', savePerson);
        document.getElementById('btnEditPerson')?.addEventListener('click', openEditPersonModal);
        document.getElementById('btnDeletePerson')?.addEventListener('click', deletePerson);
        document.getElementById('btnNeuePersonenAkte')?.addEventListener('click', openNewPersonenAkteModal);
        document.getElementById('btnSavePersonenAkte')?.addEventListener('click', savePersonenAkte);
        document.getElementById('closePersonDetail')?.addEventListener('click', () => {
            document.getElementById('personenDetailOverlay').style.display = 'none';
            selectedPersonId = null;
        });
        document.getElementById('searchPersonen')?.addEventListener('input', renderPersonen);

        // === PROFILSEITE ===
        document.getElementById('formProfil')?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) return;
            currentUser.telefon = document.getElementById('profTelefon').value.trim();
            currentUser.email = document.getElementById('profEmail').value.trim();
            currentUser.adresse = document.getElementById('profAdresse').value.trim();
            currentUser.geburtstag = document.getElementById('profGeburtstag').value;
            currentUser.notfallkontakt = document.getElementById('profNotfall').value.trim();
            const uIdx = users.findIndex(u => u.username === currentUser.username);
            if (uIdx >= 0) {
                users[uIdx] = { ...users[uIdx], ...currentUser };
                localStorage.setItem('ucp_users', JSON.stringify(users));
            }
            showToast('Profil aktualisiert!');
        });

        document.getElementById('formPasswort')?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) return;
            const alt = document.getElementById('profPassAlt').value;
            const neu = document.getElementById('profPassNeu').value;
            const neu2 = document.getElementById('profPassNeu2').value;
            if (alt !== currentUser.password) { showToast('Aktuelles Passwort falsch!', 'error'); return; }
            if (neu.length < 4) { showToast('Passwort mind. 4 Zeichen!', 'error'); return; }
            if (neu !== neu2) { showToast('Passwoerter stimmen nicht ueberein!', 'error'); return; }
            currentUser.password = neu;
            const uIdx = users.findIndex(u => u.username === currentUser.username);
            if (uIdx >= 0) {
                users[uIdx].password = neu;
                localStorage.setItem('ucp_users', JSON.stringify(users));
            }
            document.getElementById('formPasswort').reset();
            showToast('Passwort geaendert!');
        });

        // === MEDIATHEK ===
        document.getElementById('btnNeuerEintrag')?.addEventListener('click', () => {
            document.getElementById('formMediathek').reset();
            delete document.getElementById('formMediathek').dataset.editIndex;
            document.getElementById('medModalTitle').textContent = 'Neuer Mediathek-Eintrag';
            openModal('modalMediathek');
        });

        document.getElementById('formMediathek')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                titel: document.getElementById('medTitel').value.trim(),
                kategorie: document.getElementById('medKategorie').value,
                autor: document.getElementById('medAutor').value.trim(),
                inhalt: document.getElementById('medInhalt').value.trim(),
                link: document.getElementById('medLink').value.trim(),
                datum: new Date().toLocaleDateString('de-DE')
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                mediathek[parseInt(idx)] = { ...mediathek[parseInt(idx)], ...data };
                showToast('Eintrag aktualisiert!');
            } else {
                mediathek.push(data);
                showToast('Eintrag hinzugefuegt!');
            }
            localStorage.setItem('ucp_mediathek', JSON.stringify(mediathek));
            loadMediathek();
            closeModal('modalMediathek');
        });

        document.getElementById('cancelMediathek')?.addEventListener('click', () => closeModal('modalMediathek'));
        document.getElementById('closeModalMediathek')?.addEventListener('click', () => closeModal('modalMediathek'));
        document.getElementById('filterMedKategorie')?.addEventListener('change', loadMediathek);
        document.getElementById('searchMediathek')?.addEventListener('input', loadMediathek);

        // === KALENDER / TERMINE ===
        document.getElementById('btnNeuerTermin')?.addEventListener('click', () => {
            document.getElementById('formTermin').reset();
            delete document.getElementById('formTermin').dataset.editIndex;
            document.getElementById('terminModalTitle').textContent = 'Neuer Termin';
            const now = new Date();
            document.getElementById('terminDatum').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
            openModal('modalTermin');
        });

        document.getElementById('formTermin')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                titel: document.getElementById('terminTitel').value.trim(),
                datum: document.getElementById('terminDatum').value,
                uhrzeit: document.getElementById('terminUhrzeit').value,
                typ: document.getElementById('terminTyp').value,
                ort: document.getElementById('terminOrt').value.trim(),
                beschreibung: document.getElementById('terminBeschreibung').value.trim(),
                erstelltVon: currentUser.fullName || currentUser.username,
                erstelltAm: new Date().toISOString()
            };
            const idx = e.target.dataset.editIndex;
            if (idx !== undefined && idx !== '') {
                termine[parseInt(idx)] = { ...termine[parseInt(idx)], ...data };
                showToast('Termin aktualisiert!');
            } else {
                termine.push(data);
                showToast('Termin erstellt!');
            }
            localStorage.setItem('ucp_termine', JSON.stringify(termine));
            renderCalendar();
            loadTermineListe();
            updateDashboard();
            closeModal('modalTermin');
        });

        document.getElementById('cancelTermin')?.addEventListener('click', () => closeModal('modalTermin'));
        document.getElementById('closeModalTermin')?.addEventListener('click', () => closeModal('modalTermin'));
        document.getElementById('closeModalTerminDetail')?.addEventListener('click', () => closeModal('modalTerminDetail'));

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
        });
    }

    function updateButtons() {
        const btn1 = document.getElementById('btnNeueMitarbeiter');
        const btn2 = document.getElementById('btnNeuerMitarbeiterDash');
        const btn3 = document.getElementById('btnNeueUnit');
        if (btn1) btn1.style.display = canManageMitarbeiter() ? '' : 'none';
        if (btn2) btn2.style.display = canManageMitarbeiter() ? '' : 'none';
        if (btn3) btn3.style.display = canManageUnits() ? '' : 'none';
    }

    function openModal(id) { document.getElementById(id)?.classList.add('active'); }
    function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

    // ============================================================
    // CLOCK & LOGOUT
    // ============================================================
    function setupClock() {
        function update() {
            const now = new Date();
            const clock = document.getElementById('bannerClock');
            const date = document.getElementById('bannerDate');
            if (clock) {
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                clock.textContent = `${h}:${m} Uhr`;
            }
            if (date) {
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yyyy = now.getFullYear();
                date.textContent = `${dd}.${mm}.${yyyy}`;
            }
        }
        update();
        setInterval(update, 1000);
    }

    function setupLogout() {
        document.getElementById('btnLogout')?.addEventListener('click', () => {
            if (isClockedIn) {
                isClockedIn = false;
                clockInTime = null;
                if (shiftTimer) { clearInterval(shiftTimer); shiftTimer = null; }
                shiftStart = null;
                localStorage.removeItem('ucp_clockedIn');
                localStorage.removeItem('ucp_clockInTime');
            }
            currentUser = null;
            localStorage.removeItem('ucp_currentUser');
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('appContent').style.display = 'none';
            document.getElementById('formLogin').reset();
            hideLoginError();
            const rt = document.querySelector('.login-tab[data-tab="register"]');
            if (rt && users.length > 0) rt.style.display = 'none';
            document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.login-tab[data-tab="login"]')?.classList.add('active');
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            document.getElementById('formLogin').classList.add('active');
        });
    }

    // ============================================================
    // PERSONEN-AKTEN
    // ============================================================
    let personen = JSON.parse(localStorage.getItem('ucp_personen')) || [];
    let selectedPersonId = null;

    function savePersonen() {
        localStorage.setItem('ucp_personen', JSON.stringify(personen));
    }

    function renderPersonen() {
        const liste = document.getElementById('personenListe');
        if (!liste) return;
        const search = (document.getElementById('searchPersonen')?.value || '').toLowerCase();
        let filtered = personen.filter(p => {
            if (!search) return true;
            return (p.name || '').toLowerCase().includes(search) ||
                   (p.telefon || '').toLowerCase().includes(search) ||
                   (p.adresse || '').toLowerCase().includes(search);
        });

        const gesamtEl = document.getElementById('personenGesamt');
        const aktenEl = document.getElementById('personenAkten');
        if (gesamtEl) gesamtEl.textContent = personen.length;
        if (aktenEl) aktenEl.textContent = personen.reduce((s, p) => s + (p.akten?.length || 0), 0);

        if (filtered.length === 0) {
            liste.innerHTML = '<div class="empty-state"><i class="fas fa-id-card" style="font-size:2rem;opacity:0.3;margin-bottom:0.5rem;"></i><p style="color:var(--text-muted);">Keine Personen vorhanden</p></div>';
            return;
        }

        liste.innerHTML = filtered.map(p => {
            const aktenCount = p.akten?.length || 0;
            const geb = p.geburtstag ? new Date(p.geburtstag).toLocaleDateString('de-DE') : '-';
            const gesuchtBadge = p.gesucht ? `<span style="background:#ef4444;color:#fff;padding:0.15rem 0.5rem;border-radius:var(--radius-sm);font-size:0.7rem;font-weight:bold;margin-left:0.5rem;"><i class="fas fa-exclamation-triangle"></i> GESUCHT</span>` : '';
            return `<div class="person-card" style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;border:1px solid ${p.gesucht ? '#ef4444' : 'var(--border-color)'};border-radius:var(--radius-sm);margin-bottom:0.5rem;cursor:pointer;background:${p.gesucht ? 'rgba(239,68,68,0.1)' : 'var(--bg-card)'};" onclick="UCP.openPersonDetail('${p.id}')">
                <div style="width:40px;height:40px;border-radius:50%;background:${p.gesucht ? '#ef4444' : 'var(--primary)'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">${(p.name||'?')[0].toUpperCase()}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;color:var(--text-primary);">${esc(p.name)}${gesuchtBadge}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${esc(p.telefon || '-')} | ${geb}</div>
                    ${p.gesuchtGrund ? `<div style="font-size:0.75rem;color:#ef4444;"><i class="fas fa-gavel"></i> ${esc(p.gesuchtGrund)}</div>` : ''}
                </div>
                <span style="background:var(--bg-secondary);padding:0.2rem 0.5rem;border-radius:var(--radius-sm);font-size:0.75rem;color:var(--text-muted);">${aktenCount} Akte${aktenCount !== 1 ? 'n' : ''}</span>
            </div>`;
        }).join('');
    }

    function openPersonDetail(id) {
        const person = personen.find(p => p.id === id);
        if (!person) return;
        selectedPersonId = id;

        document.getElementById('personDetailName').textContent = person.name;
        const geb = person.geburtstag ? new Date(person.geburtstag).toLocaleDateString('de-DE') : '-';
        const gesuchtInfo = person.gesucht ? `<div style="padding:0.5rem;background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:var(--radius-sm);margin-top:0.5rem;"><span style="color:#ef4444;font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> GESUCHT</span>${person.gesuchtGrund ? ` - ${esc(person.gesuchtGrund)}` : ''}</div>` : '';
        document.getElementById('personDetailInfo').innerHTML = `
            ${gesuchtInfo}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem;">
                <div style="padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-sm);"><span style="color:var(--text-muted);font-size:0.8rem;">Telefon</span><br><span style="color:var(--text-primary);">${esc(person.telefon || '-')}</span></div>
                <div style="padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-sm);"><span style="color:var(--text-muted);font-size:0.8rem;">Geburtstag</span><br><span style="color:var(--text-primary);">${geb}</span></div>
                <div style="padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-sm);"><span style="color:var(--text-muted);font-size:0.8rem;">Adresse</span><br><span style="color:var(--text-primary);">${esc(person.adresse || '-')}</span></div>
            </div>
            ${person.notizen ? `<div style="margin-top:0.5rem;padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-sm);"><span style="color:var(--text-muted);font-size:0.8rem;">Notizen</span><br><span style="color:var(--text-primary);">${esc(person.notizen)}</span></div>` : ''}
        `;
        renderPersonenAkten(person);
        document.getElementById('personenDetailOverlay').style.display = 'block';
    }

    function renderPersonenAkten(person) {
        const liste = document.getElementById('personenAktenListe');
        if (!liste) return;
        const akten = person.akten || [];
        if (akten.length === 0) {
            liste.innerHTML = '<div class="empty-state"><p style="color:var(--text-muted);">Noch keine Akten vorhanden</p></div>';
            return;
        }
        liste.innerHTML = akten.map((a, idx) => {
            const datum = a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '-';
            const statusColor = a.status === 'Abgeschlossen' ? '#10b981' : a.status === 'In Bearbeitung' ? '#3b82f6' : a.status === 'Eingestellt' ? '#6b7280' : '#f59e0b';
            return `<div style="padding:0.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:0.5rem;background:var(--bg-secondary);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <span style="background:var(--primary);color:#fff;padding:0.1rem 0.4rem;border-radius:var(--radius-sm);font-size:0.7rem;">${esc(a.typ || 'Notiz')}</span>
                        <strong style="color:var(--text-primary);margin-left:0.5rem;">${esc(a.betreff)}</strong>
                    </div>
                    <div style="display:flex;gap:0.3rem;">
                        <button class="btn btn-sm btn-outline" onclick="UCP.editPersonenAkte(${idx})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="UCP.deletePersonenAkte(${idx})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.3rem;display:flex;gap:1rem;flex-wrap:wrap;">
                    <span>${datum}</span>
                    ${a.straftat ? `<span style="color:#ef4444;"><i class="fas fa-gavel"></i> ${esc(a.straftat)}</span>` : ''}
                    ${a.fallakte ? `<span style="color:#f59e0b;"><i class="fas fa-folder"></i> ${esc(a.fallakte)}</span>` : ''}
                    ${a.status ? `<span style="color:${statusColor};">${esc(a.status)}</span>` : ''}
                    ${a.haftbefehl === 'Ja' ? `<span style="color:#ef4444;font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Haftbefehl</span>` : ''}
                    ${a.haftbefehl === 'Ausstehend' ? `<span style="color:#f59e0b;font-weight:bold;"><i class="fas fa-clock"></i> Haftbefehl ausstehend</span>` : ''}
                </div>
                ${a.inhalt ? `<div style="margin-top:0.4rem;color:var(--text-secondary);font-size:0.9rem;white-space:pre-wrap;">${esc(a.inhalt)}</div>` : ''}
            </div>`;
        }).join('');
    }

    function openNewPersonModal() {
        document.getElementById('modalPersonTitle').textContent = 'Neue Person';
        document.getElementById('personEditId').value = '';
        document.getElementById('personName').value = '';
        document.getElementById('personTelefon').value = '';
        document.getElementById('personGeburtstag').value = '';
        document.getElementById('personAdresse').value = '';
        document.getElementById('personGesucht').checked = false;
        document.getElementById('personGesuchtGrund').value = '';
        document.getElementById('personNotizen').value = '';
        openModal('modalPerson');
    }

    function openEditPersonModal() {
        const person = personen.find(p => p.id === selectedPersonId);
        if (!person) return;
        document.getElementById('modalPersonTitle').textContent = 'Person bearbeiten';
        document.getElementById('personEditId').value = person.id;
        document.getElementById('personName').value = person.name || '';
        document.getElementById('personTelefon').value = person.telefon || '';
        document.getElementById('personGeburtstag').value = person.geburtstag || '';
        document.getElementById('personAdresse').value = person.adresse || '';
        document.getElementById('personGesucht').checked = person.gesucht === true;
        document.getElementById('personGesuchtGrund').value = person.gesuchtGrund || '';
        document.getElementById('personNotizen').value = person.notizen || '';
        openModal('modalPerson');
    }

    function savePerson() {
        const name = document.getElementById('personName').value.trim();
        if (!name) { showToast('Name ist erforderlich!', 'error'); return; }
        const editId = document.getElementById('personEditId').value;
        const data = {
            name: name,
            telefon: document.getElementById('personTelefon').value.trim(),
            geburtstag: document.getElementById('personGeburtstag').value,
            adresse: document.getElementById('personAdresse').value.trim(),
            gesucht: document.getElementById('personGesucht').checked,
            gesuchtGrund: document.getElementById('personGesuchtGrund').value.trim(),
            notizen: document.getElementById('personNotizen').value.trim()
        };
        if (editId) {
            const idx = personen.findIndex(p => p.id === editId);
            if (idx !== -1) { personen[idx] = { ...personen[idx], ...data }; }
        } else {
            data.id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            data.akten = [];
            personen.push(data);
        }
        savePersonen();
        renderPersonen();
        renderGesuchtePersonen();
        closeModal('modalPerson');
        if (selectedPersonId) openPersonDetail(selectedPersonId);
        showToast(editId ? 'Person aktualisiert!' : 'Person erstellt!');
    }

    function deletePerson() {
        if (!selectedPersonId) return;
        if (!confirm('Person wirklich loeschen?')) return;
        personen = personen.filter(p => p.id !== selectedPersonId);
        savePersonen();
        renderPersonen();
        document.getElementById('personenDetailOverlay').style.display = 'none';
        selectedPersonId = null;
        showToast('Person geloescht!');
    }

    function openNewPersonenAkteModal() {
        if (!selectedPersonId) return;
        document.getElementById('modalPATitle').textContent = 'Neue Akte';
        document.getElementById('paPersonId').value = selectedPersonId;
        document.getElementById('paEditIdx').value = '';
        document.getElementById('paBetreff').value = '';
        document.getElementById('paTyp').value = 'Notiz';
        document.getElementById('paDatum').value = new Date().toISOString().split('T')[0];
        document.getElementById('paStraftat').value = '';
        document.getElementById('paFallakte').value = '';
        document.getElementById('paStatus').value = 'Offen';
        document.getElementById('paHaftbefehl').value = 'Nein';
        document.getElementById('paInhalt').value = '';
        openModal('modalPersonenAkte');
    }

    function editPersonenAkte(idx) {
        const person = personen.find(p => p.id === selectedPersonId);
        if (!person || !person.akten[idx]) return;
        const a = person.akten[idx];
        document.getElementById('modalPATitle').textContent = 'Akte bearbeiten';
        document.getElementById('paPersonId').value = selectedPersonId;
        document.getElementById('paEditIdx').value = idx;
        document.getElementById('paBetreff').value = a.betreff || '';
        document.getElementById('paTyp').value = a.typ || 'Notiz';
        document.getElementById('paDatum').value = a.datum || '';
        document.getElementById('paStraftat').value = a.straftat || '';
        document.getElementById('paFallakte').value = a.fallakte || '';
        document.getElementById('paStatus').value = a.status || 'Offen';
        document.getElementById('paHaftbefehl').value = a.haftbefehl || 'Nein';
        document.getElementById('paInhalt').value = a.inhalt || '';
        openModal('modalPersonenAkte');
    }

    function savePersonenAkte() {
        const personId = document.getElementById('paPersonId').value;
        const idx = document.getElementById('paEditIdx').value;
        const betreff = document.getElementById('paBetreff').value.trim();
        if (!betreff) { showToast('Betreff ist erforderlich!', 'error'); return; }
        const person = personen.find(p => p.id === personId);
        if (!person) return;
        if (!person.akten) person.akten = [];
        const akteData = {
            betreff: betreff,
            typ: document.getElementById('paTyp').value,
            datum: document.getElementById('paDatum').value,
            straftat: document.getElementById('paStraftat').value,
            fallakte: document.getElementById('paFallakte').value.trim(),
            status: document.getElementById('paStatus').value,
            haftbefehl: document.getElementById('paHaftbefehl').value,
            inhalt: document.getElementById('paInhalt').value.trim(),
            datumErstellt: new Date().toISOString()
        };
        if (idx !== '' && idx !== undefined) {
            person.akten[idx] = { ...person.akten[idx], ...akteData };
        } else {
            person.akten.push(akteData);
        }
        savePersonen();
        renderPersonen();
        openPersonDetail(personId);
        closeModal('modalPersonenAkte');
        showToast(idx ? 'Akte aktualisiert!' : 'Akte erstellt!');
    }

    function deletePersonenAkte(idx) {
        const person = personen.find(p => p.id === selectedPersonId);
        if (!person || !person.akten[idx]) return;
        if (!confirm('Akte wirklich loeschen?')) return;
        person.akten.splice(idx, 1);
        savePersonen();
        renderPersonen();
        openPersonDetail(selectedPersonId);
        showToast('Akte geloescht!');
    }

    UCP.openPersonDetail = openPersonDetail;
    UCP.editPersonenAkte = editPersonenAkte;
    UCP.deletePersonenAkte = deletePersonenAkte;

    // Dashboard: Gesuchte Personen rendern
    function renderGesuchtePersonen() {
        const liste = document.getElementById('dashGesuchteListe');
        if (!liste) return;
        const gesuchte = personen.filter(p => p.gesucht === true);
        const counter = document.getElementById('dashGesuchtCount');
        if (counter) counter.textContent = gesuchte.length;

        if (gesuchte.length === 0) {
            liste.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted);"><i class="fas fa-check-circle" style="font-size:1.5rem;color:#10b981;margin-bottom:0.5rem;display:block;"></i>Keine gesuchten Personen</div>';
            return;
        }
        liste.innerHTML = gesuchte.map(p => {
            const geb = p.geburtstag ? new Date(p.geburtstag).toLocaleDateString('de-DE') : '-';
            const akten = (p.akten || []).filter(a => a.straftat);
            const letzteAkte = akten.length > 0 ? akten[akten.length - 1] : null;
            return `<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;border:2px solid #ef4444;border-radius:var(--radius-sm);margin-bottom:0.5rem;background:rgba(239,68,68,0.08);cursor:pointer;" onclick="UCP.switchView('personen'); setTimeout(function(){UCP.openPersonDetail('${p.id}');},200);">
                <div style="width:48px;height:48px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:1.1rem;flex-shrink:0;">${(p.name||'?')[0].toUpperCase()}</div>
                <div style="flex:1;">
                    <div style="font-weight:700;color:#ef4444;">${esc(p.name)} <i class="fas fa-exclamation-triangle" style="font-size:0.8rem;"></i></div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${esc(p.telefon || '-')} | ${geb} | ${esc(p.adresse || '-')}</div>
                    ${p.gesuchtGrund ? `<div style="font-size:0.8rem;color:#ef4444;font-weight:600;margin-top:0.2rem;"><i class="fas fa-gavel"></i> ${esc(p.gesuchtGrund)}</div>` : ''}
                    ${letzteAkte ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.15rem;"><i class="fas fa-folder"></i> ${esc(letzteAkte.straftat || '')} ${letzteAkte.fallakte ? '- ' + esc(letzteAkte.fallakte) : ''}</div>` : ''}
                </div>
                <span style="color:#ef4444;font-size:0.8rem;font-weight:bold;white-space:nowrap;"><i class="fas fa-search"></i></span>
            </div>`;
        }).join('');
    }

    UCP.renderGesuchtePersonen = renderGesuchtePersonen;

    // ============================================================
    // UTILS
    // ============================================================
    function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
    function formatCurrency(a) { return a.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'; }

    function copyToClipboard(text) {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
        else { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    }

    function showToast(msg, type = 'success') {
        let t = document.getElementById('ucpToast');
        if (!t) { t = document.createElement('div'); t.id = 'ucpToast'; document.body.appendChild(t); }
        const settings = JSON.parse(localStorage.getItem('ucp_settings')) || {};
        const dauer = settings.toastDauer || 2500;
        t.textContent = msg;
        t.style.background = type === 'error' ? '#ef4444' : '#10b981';
        t.style.opacity = '1';
        setTimeout(() => { t.style.opacity = '0'; }, dauer);
    }

})();
