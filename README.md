# Phishing Awareness Trainer
 
**CSEC3100 Final Year Project — De Montfort University**
**Student:** Alexandre Santo (P2790848)
**Supervisor:** Olabayo Ishola
 
---
 
## About
 
A browser-based phishing awareness training application that teaches users to identify social engineering attacks through realistic, interactive scenarios. Users read simulated email, SMS, and vishing (voice call) messages and decide whether to Proceed or Report each one. Immediate feedback explains the correct decision and highlights the specific red flags present.
 
The application is designed for employees, students, and individuals who want to sharpen their ability to recognise phishing, smishing, and vishing attacks in everyday digital communication.
 
---
 
## Live Demo
 
**[https://santan365.github.io/phishing-trainer](https://santan365.github.io/phishing-trainer)**
 
The app is installable as a Progressive Web App (PWA). On mobile, tap Share and then Add to Home Screen to install it like a native app. It works offline after the first load.
 
---
 
## Features
 
- 31 scenarios across three attack categories: Email, SMS, and Vishing
- Difficulty progression — Easy scenarios appear before Medium and Hard within each session
- Category filtering — train on all types or focus on one category
- Immediate feedback with explanatory cues after every decision
- Streak counter tracking consecutive correct answers
- Session summary with accuracy percentage and best streak
- Weak area detection — surfaces scenarios you historically struggle with across sessions
- Review Missed Scenarios mode — replay only the scenarios you got wrong
- localStorage persistence — last session score shown on home screen on return
- Dynamic scenario bank — scenarios fetched from GitHub and can be updated without touching the app code
- Progressive Web App — installable on mobile, works offline after first load
- Fully responsive — works on desktop and mobile
- Keyboard accessible — all buttons operable with keyboard only
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Fonts | IBM Plex Sans, IBM Plex Mono (Google Fonts) |
| Scenario data | JSON hosted on GitHub (fetched dynamically) |
| Persistence | Browser localStorage (no server, no accounts) |
| Hosting | GitHub Pages |
| PWA | Web App Manifest + Service Worker |
 
---
 
## Project Structure
 
```
phishing-trainer/
├── index.html          # App shell — single HTML file
├── styles.css          # All visual styling
├── app.js              # All application logic
├── scenarios.json      # Scenario bank (31 scenarios)
├── manifest.json       # PWA manifest — name, icon, theme
├── service-worker.js   # Caches app shell for offline use
├── icon-192.png        # PWA icon (192x192)
├── icon-512.png        # PWA icon (512x512)
└── README.md           # This file
```
 
---
 
## How the Scenario Bank Works
 
All scenarios live in `scenarios.json` in this repository. The app fetches this file fresh on every load using the GitHub raw content URL. This means:
 
- Scenarios can be added, edited, or removed by updating `scenarios.json` on GitHub
- No changes to the application code are needed to update content
- Every user gets the latest scenario bank on their next visit
Each scenario object contains the following fields:
 
```json
{
  "id": "unique identifier",
  "type": "email | sms | vishing",
  "category": "email | sms | vishing",
  "difficulty": "1 (Easy) | 2 (Medium) | 3 (Hard)",
  "sender": "display name",
  "senderEmail": "email address (email type only)",
  "number": "phone number (sms / vishing type only)",
  "timestamp": "time string",
  "subject": "email subject (email type only)",
  "body": "message content",
  "transcript": "array of call lines (vishing type only)",
  "displayLink": "inert URL shown as plain text, or null",
  "cues": "array of red flag strings shown in feedback",
  "correctAction": "REPORT | PROCEED",
  "explanation": "full explanation shown in feedback"
}
```
 
---
 
## Architecture
 
The application uses a pure client-side single-page architecture. All screen transitions are handled by replacing the innerHTML of a single container element via JavaScript — there are no separate HTML pages and no page reloads.
 
All data is stored locally in the user's browser via localStorage. No data is transmitted to any server. No user accounts are required.
 
A service worker caches the application shell (HTML, CSS, JS, icons) on first load. Subsequent visits load instantly from cache. Scenario fetches always go to GitHub to ensure the latest content is served.
 
---
 
## Running Locally
 
No installation required. Open `index.html` with VS Code Live Server or any local server.
 
Note: The service worker only registers on HTTPS (GitHub Pages). It will not activate on plain file:// URLs, but the rest of the app works normally.
 
---
 
## Future Enhancements
 
- User accounts with server-side session tracking
- Admin dashboard for organisational use
- Timed scoring based on response speed
- Performance analytics dashboard with category breakdown charts
- Additional scenario categories (QR code phishing, deepfake audio)
- Formal pre/post assessment mechanism to measure effectiveness
---
 
## Academic Context
 
This project was developed as a final year undergraduate development project for the CSEC3100 Cyber-Security Project module at De Montfort University. The application addresses a gap identified in the literature between the scale of the phishing threat and the accessibility of tools designed to address it — specifically the lack of free, browser-based training tools covering email, SMS, and voice-based attacks in a single platform.
 
