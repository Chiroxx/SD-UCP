const EINSATZFELDER = [
    'Türdienst', 'SG-Dienst', 'Ausbildung', 'Besprechung',
    'Bürokratie', 'Pause', 'Streife 1', 'Streife 2', 'Streife 3',
    'Ermittlung', 'Abhandlung SD', 'Abhandlung SG', 'Mechaniker'
];

const EINSATZ_CODES = [
    { code: 1, label: 'Einsatzbereit', cssClass: 'code-1' },
    { code: 2, label: 'Einsatzfahrt ohne Sonderwegerecht', cssClass: 'code-2' },
    { code: 3, label: 'Einsatzfahrt mit Sonderwegerecht', cssClass: 'code-3' },
    { code: 4, label: 'Einsatz beendet', cssClass: 'code-4' },
    { code: 5, label: 'Im Einsatz', cssClass: 'code-5' },
    { code: 6, label: 'Nicht bereit / Pause / Nicht erreichbar', cssClass: 'code-6' }
];

const TEN_CODES = [
    { code: '10-2', meaning: 'Funksignal ist gut' },
    { code: '10-04', meaning: 'Informationen verstanden / erhalten' },
    { code: '10-05', meaning: 'Funkspruch wiederholen' },
    { code: '10-15', meaning: 'Verdächtiger in Gewahrsam' },
    { code: '10-18', meaning: 'Rückkehr zur Wache o. Streifengebiet' },
    { code: '10-20', meaning: 'Aktuelle Position' },
    { code: '10-22', meaning: 'Abholung benötigt' },
    { code: '10-30', meaning: 'Aktueller Status' },
    { code: '10-33', meaning: 'Officer am Boden' },
    { code: '10-34', meaning: 'Verstärkung benötigt' },
    { code: '10-55', meaning: 'Verkehrsunfall' },
    { code: '10-80', meaning: 'Aktive Verfolgungsjagd' },
    { code: '10-80F', meaning: 'Verfolgung zu Fuß' },
    { code: '10-86', meaning: 'Verkehrskontrolle' },
    { code: '10-90', meaning: 'Entführung eines Officers' },
    { code: '11-99', meaning: 'Notfall' }
];

const CODES = [
    { code: 'Code 1', meaning: 'Normale Streifenfahrt' },
    { code: 'Code 2', meaning: 'Einsatzfahrt ohne Sonder-/Wegerechte' },
    { code: 'Code 3', meaning: 'Einsatzfahrt mit Sonder-/Wegerechte' },
    { code: 'Code 4', meaning: 'Einsatz beendet' },
    { code: 'Code 6', meaning: 'Nicht bereit / Pause / Nicht erreichbar' },
    { code: 'Code 11', meaning: 'Angehender Supportfall' },
    { code: 'Code 99', meaning: 'Achtung! Möglicher Hinterhalt!' },
    { code: '10-07', meaning: 'Außer Dienst melden' },
    { code: '10-08', meaning: 'In den Dienst melden' }
];

const MIRANDA_FULL = `Sie haben das Recht zu schweigen.
Alles, was Sie sagen, kann und wird vor Gericht gegen Sie verwendet werden.
Sie haben das Recht auf einen Anwalt.
Sofern sich ein Pflichtverteidiger des Department of Justice im aktiven Dienst befindet, wird Ihnen dieser gestellt, sollten Sie sich keinen eigenen Anwalt leisten können oder keinen erreichen.
Haben Sie diese Rechte verstanden?`;

const MIRANDA_SHORT = 'Sie haben das Recht zu schweigen. Alles, was Sie sagen, kann und wird vor Gericht gegen Sie verwendet werden. Sie haben das Recht auf einen Anwalt. Haben Sie diese Rechte verstanden?';

const WAFFENLIZENZEN = [
    {
        stufe: 1,
        name: 'Lizenzstufe 1 – Basisausrüstung',
        waffen: ['SNS-Pistole', 'Baseballschläger']
    },
    {
        stufe: 2,
        name: 'Lizenzstufe 2 – Standardwaffen',
        waffen: ['Messer', 'WM 29 Pistole']
    },
    {
        stufe: 3,
        name: 'Lizenzstufe 3 – Erweiterte Feuerwaffen',
        waffen: ['Beil', 'Marksman Pistole', 'Perico Pistole']
    }
];

const ILLEGALE_GEGENSTAENDE = [
    {
        kategorie: 'Waffen & Ausrüstung',
        items: [
            'Waffen, die nicht unter §8 WaffG hinterlegt sind',
            'Staatliche Gegenstände und Waffen ohne Staatsdienerstatus',
            'Dietriche', 'Taucheranzug', 'Störsender', 'Folterstuhl',
            'Hack-Computer', 'Plasma Schneider', 'Bewegungssensor',
            'Thermit', 'Hack USB', 'C4 Bombe'
        ]
    },
    {
        kategorie: 'Waffentaschen & Munition',
        items: [
            'Kleine Waffentasche (1 Platz)',
            'Mittlere Waffentasche (4 Platz)',
            'Patronenhülsen (keine Seriennummer)',
            'Schwarzpulver + Patronenhülsen'
        ]
    }
];

const STRAFKATALOG = [
    { paragraph: '§111 StGB', tatbestand: 'Widerstand gegen Vollstreckungsbeamte', geldstrafe: '500–2.000', haft: '5–20', kategorie: 'Widerstand' },
    { paragraph: '§113 StGB', tatbestand: 'Widerstand mit Gewalt/ Drohung', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Widerstand' },
    { paragraph: '§120 StGB', tatbestand: 'Beamtenbestechung', geldstrafe: '2.000–10.000', haft: '15–40', kategorie: 'Korruption' },
    { paragraph: '§125 StGB', tatbestand: 'Nötigung', geldstrafe: '500–3.000', haft: '5–25', kategorie: 'Nötigung' },
    { paragraph: '§126 StGB', tatbestand: 'Erpressung', geldstrafe: '1.000–8.000', haft: '10–35', kategorie: 'Erpressung' },
    { paragraph: '§127 StGB', tatbestand: 'Räuberische Erpressung', geldstrafe: '2.000–15.000', haft: '15–40', kategorie: 'Erpressung' },
    { paragraph: '§131 StGB', tatbestand: 'Freiheitsberaubung', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Freiheit' },
    { paragraph: '§138 StGB', tatbestand: 'Betrug', geldstrafe: '500–5.000', haft: '5–25', kategorie: 'Betrug' },
    { paragraph: '§142 StGB', tatbestand: 'Diebstahl', geldstrafe: '500–3.000', haft: '5–20', kategorie: 'Diebstahl' },
    { paragraph: '§143 StGB', tatbestand: 'Schwerer Diebstahl', geldstrafe: '1.000–10.000', haft: '10–35', kategorie: 'Diebstahl' },
    { paragraph: '§144 StGB', tatbestand: 'Raub', geldstrafe: '2.000–15.000', haft: '15–40', kategorie: 'Raub' },
    { paragraph: '§146 StGB', tatbestand: 'Unterschlagung', geldstrafe: '500–3.000', haft: '5–20', kategorie: 'Unterschlagung' },
    { paragraph: '§148 StGB', tatbestand: 'Sachbeschädigung', geldstrafe: '200–1.000', haft: '0–10', kategorie: 'Sachbeschädigung' },
    { paragraph: '§163 StGB', tatbestand: 'Vergehen gegen das Leben', geldstrafe: '5.000–20.000', haft: '20–40', kategorie: 'Körperverletzung' },
    { paragraph: '§164 StGB', tatbestand: 'Fahrlässige Körperverletzung', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Körperverletzung' },
    { paragraph: '§166 StGB', tatbestand: 'Körperverletzung', geldstrafe: '1.500–8.000', haft: '10–35', kategorie: 'Körperverletzung' },
    { paragraph: '§167 StGB', tatbestand: 'Schwere Körperverletzung', geldstrafe: '2.500–15.000', haft: '15–40', kategorie: 'Körperverletzung' },
    { paragraph: '§168 StGB', tatbestand: 'Versuchte Körperverletzung', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Körperverletzung' },
    { paragraph: '§180 StGB', tatbestand: 'Totschlag', geldstrafe: '10.000–20.000', haft: '30–40', kategorie: 'Tötungsdelikte' },
    { paragraph: '§181 StGB', tatbestand: 'Mord', geldstrafe: '20.000', haft: '40', kategorie: 'Tötungsdelikte' },
    { paragraph: '§183 StGB', tatbestand: 'Fahrerflucht', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Verkehrsdelikte' },
    { paragraph: '§184 StGB', tatbestand: 'Fahren ohne Lizenz', geldstrafe: '500–2.000', haft: '5–20', kategorie: 'Verkehrsdelikte' },
    { paragraph: '§185 StGB', tatbestand: 'Fahren unter Alkoholeinfluss', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Verkehrsdelikte' },
    { paragraph: '§210 StGB', tatbestand: 'Anstiftung', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Sonstiges' },
    { paragraph: '§211 StGB', tatbestand: 'Hehlerei', geldstrafe: '500–3.000', haft: '5–20', kategorie: 'Sonstiges' },
    { paragraph: '§217 StGB', tatbestand: 'Meuterei', geldstrafe: '5.000–20.000', haft: '20–40', kategorie: 'Sonstiges' },
    { paragraph: '§224 StGB', tatbestand: 'Geiselnahme', geldstrafe: '5.000–20.000', haft: '20–40', kategorie: 'Entführung' },
    { paragraph: '§225 StGB', tatbestand: 'Entführung', geldstrafe: '2.000–10.000', haft: '15–40', kategorie: 'Entführung' },
    { paragraph: '§228 StGB', tatbestand: 'Brandstiftung', geldstrafe: '2.000–15.000', haft: '15–40', kategorie: 'Brandstiftung' },
    { paragraph: '§230 StGB', tatbestand: 'Terrorismus', geldstrafe: '20.000', haft: '40', kategorie: 'Terrorismus' },
    { paragraph: '§231 StGB', tatbestand: 'Handel mit verbotenen Gütern', geldstrafe: '2.000–10.000', haft: '15–40', kategorie: 'Handel' },
    { paragraph: '§232 StGB', tatbestand: 'Handel mit Drogen', geldstrafe: '2.000–15.000', haft: '15–40', kategorie: 'Drogen' },
    { paragraph: '§233 StGB', tatbestand: 'Herstellung von Drogen', geldstrafe: '3.000–15.000', haft: '20–40', kategorie: 'Drogen' },
    { paragraph: '§234 StGB', tatbestand: 'Drogenbesitz', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Drogen' },
    { paragraph: '§235 StGB', tatbestand: 'Drogenschmuggel', geldstrafe: '5.000–20.000', haft: '20–40', kategorie: 'Drogen' },
    { paragraph: '§240 StGB', tatbestand: 'Störung der Öffentlichen Ordnung', geldstrafe: '200–1.000', haft: '0–10', kategorie: 'Öffentliche Ordnung' },
    { paragraph: '§241 StGB', tatbestand: 'Sachbeschädigung an Staatsbesitz', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Sachbeschädigung' },
    { paragraph: '§250 StGB', tatbestand: 'Widerstand gegen Polizeibeamte', geldstrafe: '1.000–5.000', haft: '10–30', kategorie: 'Widerstand' },
    { paragraph: '§255 StGB', tatbestand: 'Hausfriedensbruch', geldstrafe: '200–1.000', haft: '0–10', kategorie: 'Hausfriedensbruch' },
    { paragraph: '§260 StGB', tatbestand: 'Bedrohung', geldstrafe: '500–2.000', haft: '5–20', kategorie: 'Bedrohung' },
    { paragraph: '§263 StGB', tatbestand: 'Stalking', geldstrafe: '500–3.000', haft: '5–20', kategorie: 'Stalking' },
    { paragraph: '§270 StGB', tatbestand: 'Vernachlässigung von Aufsichtspflichten', geldstrafe: '500–2.000', haft: '5–20', kategorie: 'Sonstiges' },
    { paragraph: '§271 StGB', tatbestand: 'Schutzrechtsverletzung', geldstrafe: '500–2.000', haft: '5–20', kategorie: 'Sonstiges' }
];

const STRAF_KATEGORIEN = {
    'Widerstand': { icon: '🛡️' },
    'Korruption': { icon: '💰' },
    'Nötigung': { icon: '⚠️' },
    'Erpressung': { icon: '💸' },
    'Freiheit': { icon: '🔒' },
    'Betrug': { icon: '🎭' },
    'Diebstahl': { icon: '🎒' },
    'Raub': { icon: '🔫' },
    'Unterschlagung': { icon: '📦' },
    'Sachbeschädigung': { icon: '💥' },
    'Körperverletzung': { icon: '🩸' },
    'Tötungsdelikte': { icon: '☠️' },
    'Verkehrsdelikte': { icon: '🚗' },
    'Sonstiges': { icon: '📋' },
    'Entführung': { icon: '🚷' },
    'Brandstiftung': { icon: '🔥' },
    'Terrorismus': { icon: '💣' },
    'Handel': { icon: '📦' },
    'Drogen': { icon: '💊' },
    'Öffentliche Ordnung': { icon: '🏛️' },
    'Hausfriedensbruch': { icon: '🏠' },
    'Bedrohung': { icon: '😱' },
    'Stalking': { icon: '👁️' }
};

const FISCHE = [
    'Asiatische Arowana', 'Axolotl', 'Banggai-Kardinalbarsch', 'Blauer Hummer',
    'Blaugeringelter Krake', 'Borstenmaul', 'Edelkrebs', 'Engelhai', 'Feuerkalmar',
    'Flussperlmuschel', 'Fuchshai', 'Geigenrochen', 'Geistermuräne', 'Glasaal',
    'Glasgarnele', 'Glaskopffisch', 'Goliath-Tigerfisch', 'Granatbarsch',
    'Humboldt-Kalmar', 'Japanische Riesenkrabbe', 'Kammzahn-Sägefisch',
    'Karettschildkröte', 'Kragenhai', 'Kurzflossen-Mako', 'Laternenauge',
    'Lederschildkröte', 'Leuchtqualle', 'Löffelstör', 'Meerenunauge',
    'Mekong-Riesenwels', 'Motoro-Rochen', 'Perlboot', 'Pfeilschwanzkrebs',
    'Riesenbarbe', 'Riesenhai', 'Riesenmuschel', 'Riesensalamander',
    'Riesenzackenbarsch', 'Roter Piranha', 'Roter Thun', 'Sandtigerhai',
    'Schlangenkopffisch', 'Schlangenmakrele', 'Schwarze Koralle',
    'Schwarze Seegurke', 'Schwarzer Schlinger', 'Schwarzer Seehecht', 'Seeohr',
    'Seewespe', 'Steinkoralle', 'Suppenschildkröte', 'Süßwasserstechrochen',
    'Teufelsangler', 'Teufelsrochen', 'Totoaba', 'Weichschildkröte',
    'Weißspitzen-Hochseehai', 'Zebra-Harnischwels', 'Zitteraal', 'Zwerg-Laternenhai'
];

const RANG_OPTIONS = [
    '00 - Sheriff Techniker',
    '01 - Sheriff',
    '02 - Assistant Sheriff',
    '03 - Deputy Sheriff',
    '04 - Commander',
    '05 - First Captain',
    '06 - Captain',
    '07 - First Lieutenant',
    '08 - Lieutenant',
    '09 - First Sergeant',
    '10 - Sergeant 2',
    '11 - Sergeant 1',
    '12 - Senior Corporal',
    '13 - Corporal 2',
    '14 - Corporal 1',
    '15 - Senior Deputy',
    '16 - Deputy 2',
    '17 - Deputy 1',
    '18 - Rookie'
];

const RANG_HIERARCHIE = {
    '00 - Sheriff Techniker': 0,
    '01 - Sheriff': 1,
    '02 - Assistant Sheriff': 2,
    '03 - Deputy Sheriff': 3,
    '04 - Commander': 4,
    '05 - First Captain': 5,
    '06 - Captain': 6,
    '07 - First Lieutenant': 7,
    '08 - Lieutenant': 8,
    '09 - First Sergeant': 9,
    '10 - Sergeant 2': 10,
    '11 - Sergeant 1': 11,
    '12 - Senior Corporal': 12,
    '13 - Corporal 2': 13,
    '14 - Corporal 1': 14,
    '15 - Senior Deputy': 15,
    '16 - Deputy 2': 16,
    '17 - Deputy 1': 17,
    '18 - Rookie': 18
};

const ADMIN_RANGS = ['00 - Sheriff Techniker', '01 - Sheriff', '02 - Assistant Sheriff', '03 - Deputy Sheriff', '04 - Commander'];

const STAT_DEFAULTS = {
    heute: 0,
    woche: 0,
    monat: 0,
    gesamt: 0,
    auto: 0,
    strafen: 0
};

const FAHRZEUGE = [
    'Standard Streifenwagen', 'Motorrad', 'SUV', 'Unmarked', 'K-9 Einheit', 'Highspeed'
];

const AUSBILDUNG_TYPEN = [
    'Grundausbildung', 'Waffenkunde', 'Fahrsicherheitstraining', 'Leitstelle',
    'Overwatch', 'EL & VF', 'Grenzkontrolle', 'Tauchergrundausbildung',
    'Ortskunde', 'Abhandlungsschulung', 'Motorradausbildung', 'Langwaffenausbildung'
];

const UCP_UPDATES = [
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'UCP v2.0 – Komplett-Redesign',
        beschreibung: 'Das gesamte UCP wurde komplett neu designt. Neue Sidebar-Navigation mit Sheriff-Stern, dunkles Navy-Design, moderne Karten und Tabellen. Dashboard mit Banner, Stats und Neuigkeiten. Alle Module wurden ueberarbeitet.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Kalender-Modul hinzugefuegt',
        beschreibung: 'Neuer Kalender mit Monatsansicht, Terminerstellung, -bearbeitung und -loeschung. Farbliche Unterscheidung nach Typ (Termin, Ausbildung, Einsatz, Besprechung, Veranstaltung). Kommende Termine werden direkt auf dem Dashboard angezeigt.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Neuigkeiten-System',
        beschreibung: 'Automatisches Update-Log auf dem Dashboard. Alle Aenderungen und neue Features werden hier automatisch dokumentiert.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Dashboard mit Stats-Banner',
        beschreibung: 'Neues Dashboard mit Hero-Banner (Sheriff-Fahrzeug Hintergrund), 4 Statistik-Karten (Leitstelle, Roster, Ausbildung, Termine), live-Uhr und Datum. Klick auf Stats-Karten fuehrt direkt zum jeweiligen Modul.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Sidebar-Navigation',
        beschreibung: 'Volle Sidebar mit Sheriff-Stern Badge, Berg-Emblem und allen Modulen. Aktiver Eintrag hat blauen Glow-Hintergrund. Service, Integrity, Community Fusszeile.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Mitarbeiter mit Avatar & Online-Status',
        beschreibung: 'Mitarbeiter-Tabelle zeigt jetzt Avatar mit gruenem Online-Indikator fuer aktive Mitarbeiter. Name und Dienstnummer werden direkt in der Zelle angezeigt. Suchfilter fuer Rang, Funktion und Status.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Fix',
        titel: 'Daten-Filter korrigiert',
        beschreibung: 'Die Such- und Filterfelder auf Dashboard und Roster verwenden jetzt die richtigen Input-Felder. Mitarbeiter-Listen sind jetzt auf beiden Seiten synchron.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Info',
        titel: 'Rank-Hierarchie & Berechtigungen',
        beschreibung: 'Ranks 00-04 (Sheriff Techniker bis Commander) haben vollen Admin-Zugang. Ranks 05-9 koennen nur Mitarbeiter mit niedrigerem Rang bearbeiten. Ranks 10+ haben eingeschraenkten Zugang. Unit-Leiter koennen eigene Units verwalten.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Streifen-System',
        beschreibung: 'Streifen mit max. 4 Plaetzen, Fahrzeugauswahl (Standard, Motorrad, SUV, Unmarked, K-9, Highspeed), Gebietsangabe. Jeder kann sich selbst eintragen, Admins koennen beliebige Beamte entfernen.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Units mit Leiter-Verwaltung',
        beschreibung: 'Neue Units mit Name, Kuerzel, Beschreibung, Leiter und Mitgliedern. Leiter koennen eigene Units bearbeiten. Admins koennen alle Units verwalten und loeschen.'
    },
    {
        version: '2.0',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Font Awesome Icons',
        beschreibung: 'Alle Icons wurden von HTML-Entities auf Font Awesome 6 umgestellt. Einheitliches Icon-Design in Sidebar, Buttons, Tabellen und Modals.'
    },
    {
        version: '2.1',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Ausbildungs-Modul',
        beschreibung: 'Neues Modul fuer Ausbildungen mit Erstellung, Bearbeitung und Loeschung. Typen: Grundausbildung, Fortbildung, Sonderausbildung, Waffenausbildung, Verkehrsdienst, K-9 Training, SEB Training. Statusverwaltung mit Geplant, Laufend, Abgeschlossen, Abgesagt. Teilnehmerverwaltung und Plaetze pro Ausbildung.'
    },
    {
        version: '2.1',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Roster Sortierung nach Spalten',
        beschreibung: 'Alle Spalten im Roster (Name, Dienstnr., Rang, Abteilung, Funktion, Status, Eintritt) sind jetzt klickbar zum Sortieren. Standardmaessig nach Rang aufsteigend sortiert. Sortier-Indikator zeigt aktive Spalte und Richtung.'
    },
    {
        version: '2.1',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Dashboard Neuigkeiten-System',
        beschreibung: 'Neue Neuigkeiten-Sektion auf dem Dashboard. Automatisches Update-Log mit UCP-Aenderungen. Eigene Neuigkeiten koennen erstellt, bearbeitet und geloescht werden. Kategorien: Update, Neu, Bugfix, Information, Wartung.'
    },
    {
        version: '2.2',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Einsatz-Berichte Modul',
        beschreibung: 'Neues Modul fuer Einsatzprotokolle. Berichte mit Datum, Uhrzeit, Typ (Verkehrsunfall, Straftat, Notfall, Verkehrskontrolle, Funktionseinsatz), Ort, Beteiligten, Vorfallbeschreibung, Massnahmen und Aktensignatur. Statusverwaltung mit Offen, In Bearbeitung, Abgeschlossen. Suchen und Filtern nach Status und Typ.'
    },
    {
        version: '2.2',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Mediathek Modul',
        beschreibung: 'Neue Mediathek fuer Ausbildungsunterlagen, SOPs, Gesetze, Formulare und mehr. Eintraege mit Titel, Kategorie, Autor, Inhalt und optionalem Link. Filtern und Suchen nach Kategorie und Inhalt.'
    },
    {
        version: '2.3',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Personalabteilung Berechtigungssystem',
        beschreibung: 'Mitarbeiter mit der Funktion "Personalabteilung" koennen jetzt neue Mitarbeiter einstellen und bestehende bearbeiten. Je hoeher der eigene Rang (desto niedriger die Nummer), desto mehr Mitarbeiter duerfen eingestellt werden. Beispiel: Rang 15 darf nur Rang 16+ einstellen. Ranks 00-04 haben weiterhin vollen Zugriff.'
    },
    {
        version: '2.3',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Rang-Nummerierung aktualisiert',
        beschreibung: 'Ranks sind jetzt mit Nummern versehen (00 - Sheriff Techniker bis 18 - Rookie). Sheriff Techniker (00) hat ein rotes Ober-Admin Badge. Admins (00-04) haben volle Rechte. Kompatibilitaet mit alten Rang-Bezeichnungen bleibt erhalten.'
    },
    {
        version: '2.4',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Ausbilder Berechtigung',
        beschreibung: 'Mitarbeiter mit der Funktion "Ausbilder" erhalten Zugriff auf das Ausbildungs-Modul. Sie koennen Teilnehmer bewerten mit Status: Bestanden, Nicht bestanden, Offen. Notizen pro Teilnehmer sind moeglich. Der Reiter ist nur fuer Berechtigte in der Sidebar sichtbar.'
    },
    {
        version: '2.5',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Nachrichten-System',
        beschreibung: 'Privates Nachrichtensystem fuer Personalabteilung und Ausbilder. Koennen Nachrichten an Mitarbeiter senden (z.B. wegen Ausbildungsergebnissen). Empfangen/Gesendet-Tab, ungelesen-Badge in der Sidebar, Antworten-Funktion. Nur fuer Ranks 00-04 und Personalabteilung/Ausbilder senden.'
    },
    {
        version: '2.6',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Ausbildungsstatus pro Mitarbeiter',
        beschreibung: 'Im Mitarbeiterprofil kann jetzt der Ausbildungsstatus fuer alle 12 Ausbildungen eingetragen werden: Bestanden, Nicht bestanden oder Offen. Mit Notiz-Feld pro Ausbildung. Uebersichtliche Darstellung mit Farbmarkierung. Nur Berechtigte koennen den Status bearbeiten.'
    },
    {
        version: '2.6',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Ausbildungs-Typen aktualisiert',
        beschreibung: 'Die Ausbildungs-Typen wurden aktualisiert: Grundausbildung, Waffenkunde, Fahrsicherheitstraining, Leitstelle, Overwatch, EL & VF, Grenzkontrolle, Tauchergrundausbildung, Ortskunde, Abhandlungsschulung, Motorradausbildung, Langwaffenausbildung.'
    },
    {
        version: '2.7',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Case Management Modul',
        beschreibung: 'Neues Modul fuer komplexe Faelle/Komplexe Einsaetze. Cases mit Falltitel, Aktenzeichen, Typ (Kriminalfall, Verbrechen, Verkehrsunfall, Vermisst, Undercover, Interner Fall), Status, Prioritaet (Hoch/Mittel/Niedrig), Fallfuehrer, Ort, Beteiligten, Fallbeschreibung und Notizen. Detailansicht mit vollstaendigen Informationen. Filtern und Suchen.'
    },
    {
        version: '2.8',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Akten-System',
        beschreibung: 'Neues Akten-Modul fuer Fallakten, Vermerke, Protokolle, Formulare, Dokumentation. Jede Akte hat Aktenzeichen, Kategorie, Status (Aktuell/Archiviert), Autor, Datum, Inhalt und optionalen Link/Dateiname. Verknuepfung mit Cases moeglich. Detailansicht, Filtern und Suchen.'
    },
    {
        version: '2.9',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Personalakten',
        beschreibung: 'Erweiterte Personalakte fuer jeden Mitarbeiter. Eintraege: Abmahnung, Befoerderung, Notiz, Verweis, Belobigung, Urlaub, Sonstiges. Jeder Eintrag hat Mitarbeiter, Typ, Datum, Ersteller, Betreff und Inhalt. Filtern und Suchen nach Mitarbeiter/Inhalt.'
    },
    {
        version: '3.0',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Profilseite',
        beschreibung: 'Mitarbeiter koennen ihr eigenes Profil einsehen und bearbeiten. Persoenliche Daten (Telefon, E-Mail, Adresse, Geburtstag, Notfallkontakt), Passwort aendern, eigene Ausbildungen und Personalakte-Eintraege einsehen. Zugriff ueber Klick auf den Username in der Topbar.'
    },
    {
        version: '3.1',
        datum: '11.09.2026',
        kategorie: 'Neu',
        titel: 'Admin-Panel fuer Rang 01-04',
        beschreibung: 'Rang 01-04 haben jetzt ein Admin-Panel (Zahnrad-Icon in der Topbar). Dashboard Banner-Bild aendern, Dashboard-Titel/Untertitel anpassen, Neuigkeiten verwalten (hinzufuegen, bearbeiten, loeschen). Einstellungen werden gespeichert und beim Laden angewendet.'
    },
    {
        version: '3.2',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Admin-Panel erweitert',
        beschreibung: 'Admin-Panel hat jetzt: System-Einstellungen (UCP Name, Version, Footer), Mitarbeiter-Standardwerte (Abteilung, Rang), Ausbildungs-Typen verwalten (hinzufuegen/loeschen), Leitstelle-Einstellungen (Max Officer, Standard-Status), Daten-Export/Import/Reset als JSON-Backup.'
    },
    {
        version: '3.3',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Admin-Panel - Abteilungen, Funktionen, Benutzer',
        beschreibung: 'Admin-Panel erweitert: Abteilungen verwalten (hinzufuegen/loeschen), Funktionen verwalten (hinzufuegen/loeschen), Benutzer verwalten (Passwort zuruecksetzen, Benutzer loeschen). Bugfix: RANG_HIERARCHIE forEach Fehler gefixt der das Admin-Panel blockiert hat.'
    },
    {
        version: '3.4',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Admin-Panel - Komplettes Einstellungs-Panel',
        beschreibung: 'Admin-Panel erweitert: Raenge verwalten (hinzufuegen/loeschen), Rechnungs-Kategorien, Termin-Kategorien, Streifen-Einstellungen (Max Plaetze, Standard-Fahrzeug), Design (Akzentfarbe, Sidebar-Stil), Willkommensnachricht nach Login. Alle Rang/Abteilungs/Funktions-Selects sind jetzt dynamisch und werden aus den Admin-Einstellungen geladen.'
    },
    {
        version: '3.5',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Admin-Panel - Vollstaendiges System',
        beschreibung: 'Admin-Panel erweitert: Miranda-Rechte (Standard-Text), Waffenlizenzen verwalten, Illegale Gueter verwalten, Schichtplan (Frueh/Spaet/Nacht), System-Optionen (Toast-Dauer, Session-Timeout, Registrierung erlauben/verbieten). Miranda-Text und Toast-Dauer sind jetzt dynamisch aus den Einstellungen.'
    },
    {
        version: '3.6',
        datum: '11.09.2026',
        kategorie: 'Update',
        titel: 'Registrierung entfernt - Nur Admins koennen Accounts erstellen',
        beschreibung: 'Oeffentliche Registrierung wurde komplett entfernt. Nur Admins (Rang 00-04) koennen ueber das Admin-Panel neue Benutzer erstellen. Login-Screen zeigt nur noch Anmeldeformular.'
    }
];
