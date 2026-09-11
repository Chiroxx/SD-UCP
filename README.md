# SD-UCP - Sheriff Department User Control Panel

Blaine County Sheriff Department User Control Panel (GTA RP).

## Features

- Login/Registration System with role-based permissions
- 16+ Modules: Dashboard, Mitarbeiter, Roster, Personalakten, Leitstelle, Ausbildung, Kalender, Zeiterfassung, Rechnungen, Streifen, Units, Einsatz-Berichte, Case Management, Akten, Mediathek, Nachrichten
- Rank hierarchy (00-18) with admin permissions (00-04)
- Admin Panel with 20+ settings (Banner, Design, Users, Ranks, etc.)
- Dark navy theme with glassmorphism design
- All data stored in localStorage (no backend required)

## Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload all files from this folder
3. Go to Settings > Pages
4. Set Source to "Deploy from a branch"
5. Select branch: main, folder: / (root)
6. Click Save

Your UCP will be live at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

## Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Drag & drop this folder onto the deploy area
3. Done!

## Files

- `index.html` - Main HTML
- `ucp.css` - Styles
- `ucp.js` - Application logic
- `ucp-data.js` - Data constants
- `Sheriff stern.png` - Sheriff star badge
- `Dashboard bild.png` - Dashboard banner

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- Font Awesome 6.5.1 (CDN)
- localStorage for data persistence
