# StudyNest

StudyNest is a lightweight, cross-platform desktop workspace crafted with Electron, React, TypeScript, and TailwindCSS. It focuses on distraction-free studying with offline-first persistence via IndexedDB (Dexie.js), intuitive navigation, and a minimal aesthetic inspired by Discord and Notion.

## Features

- **Auth v0**: Minimal local sign in / sign up (username + password) persisted via IndexedDB.
- **Dashboard**: Discord-like sidebar with sections for Syllabus, Tasks + Calendar, Clock Canvas, and Settings.
- **Syllabus planning**: Add subjects, break them into chapters, track completion with progress bars.
- **Tasks & Calendar**: Month grid calendar paired with a focused daily to-do list (categories, priority, due time, completion tracking).
- **Clock Canvas**: Fullscreen-ready Pomodoro timer with canvas-based progress ring, focus mode dimming, and focus minutes logging.
- **Settings**: Light & Dark themes with smooth transitions and quick logout.
- **Offline-first**: All data lives locally using Dexie.js, no backend required.
- **Responsive UI**: Works beautifully on 13"–16" laptop displays with smooth animations and rounded, friendly surfaces.

## Project Structure

```
/electron
  main.ts        # Electron entry (creates BrowserWindow, dev/prod loading)
  preload.ts     # Safe context bridge surface
/src
  App.tsx        # Router guard + theme wrapper
  main.tsx       # React bootstrap
  components/    # Reusable UI + dashboard sections
  pages/         # Auth and dashboard pages
  hooks/         # Theme helpers
  store/         # Zustand stores + Dexie services
  types/         # Global TypeScript declarations
```

## Getting Started

```powershell
# install dependencies
npm install

# start Vite (renderer), TypeScript watch (electron), and Electron in parallel
npm run dev
```

The renderer listens on <http://localhost:5173> while Electron opens a desktop window that loads it. All changes hot reload.

## Production Build

```powershell
# bundle renderer + electron and package apps for Windows/macOS/Linux
npm run build
```

Artifacts are generated inside the `release/` folder via `electron-builder`.

## Additional Scripts

- `npm run build:renderer` — Vite production build for the React UI.
- `npm run build:electron` — TypeScript build for Electron (outputs to `dist-electron/`).
- `npm run lint` — TypeScript type-checking.
- `npm run preview` — Preview the production bundle served by Vite.

## Tech Stack

- **Electron 30** for cross-platform desktop shell.
- **React 18 + Vite 5** for fast, modular frontend development.
- **TailwindCSS 3** for utility-first styling with custom themes.
- **Zustand** for lightweight state management (auth, UI, settings).
- **Dexie.js** for IndexedDB persistence with live queries.
- **Heroicons** & **Framer Motion-ready** components for modern visuals.

## Notes

- Data is stored locally; removing the IndexedDB database or the app will clear it.
- Authentication is intentionally simple—sufficient for offline v0 flows.
- Focus Mode dims surrounding UI while the clock remains in view; disabling it restores the full dashboard.
- Ensure GPU acceleration is enabled on your machine for the smoothest canvas animations.

Enjoy building deep work habits with StudyNest! ✨
