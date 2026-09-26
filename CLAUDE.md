# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Table Games — twelve classic games (Tic Tac Toe, Four in a Row, Checkers, Chinese Checkers, Mancala, Pop & Race, Dots & Boxes, Hangman, Word Search, Crossword, Word Grid, Word Guess), each playable solo or pass-and-play on one device, plus two tools (Coin Flip, Dice), with three switchable visual themes. It is an Expo / React Native app (expo-router, react-native-web) whose **primary target is an installable, offline-first PWA**. The native iOS/Android targets (`eas.json`, `app.json` native sections) still build but are secondary.

Product docs (vision, PRD, roadmap, GTM) live one level up in `../docs/`; they describe the original native-app plan (AdMob, RevenueCat, SQLite) that the code has since diverged from.

## Commands

```bash
npm start              # Expo dev server for web (no service worker in dev)
npm run build          # expo export -p web + scripts/build-pwa.mjs → dist/
npm run preview        # serve dist/ at http://localhost:4173 with SPA fallback (SW works on localhost)
npm run typecheck      # tsc --noEmit — the only automated check; there are no tests or linter
npm run start:native   # Expo dev server for iOS/Android
```

Sub-path hosting: set `EXPO_BASE_URL=/Table-Games npm run build`. Both `app.config.js` (→ `experiments.baseUrl`) and `build-pwa.mjs` read it. In Git Bash on Windows, prefix `MSYS_NO_PATHCONV=1` or MSYS rewrites the path into `C:/Program Files/Git/...`.

Deploy: `.github/workflows/deploy-pages.yml` builds with `EXPO_BASE_URL=/<repo>` and publishes `dist/` to GitHub Pages on push to `main`/`master`. GitHub Pages must have its source set to "GitHub Actions" in the repo's settings.

**Naming:** user-visible game names are deliberately generic to avoid trademarks — Four in a Row (not Connect 4), Word Grid (not Boggle), Word Guess (not Wordle), Pop & Race (not Trouble). Route ids, file names and stored stats keep the original ids (`connect-four`, `boggle`, `wordle`, `trouble`); never show those words in UI text.

## PWA pipeline

`expo export` (web `output: "single"`) produces a plain SPA. `scripts/build-pwa.mjs` then post-processes `dist/`:
- injects manifest/icon/iOS meta tags, touch CSS, and an inline bootstrap script into `index.html`. That script registers `sw.js` and captures `beforeinstallprompt` before React mounts, stashing both on `window.__pwaRegistration` / `window.__pwaInstallEvent` and firing a `pwa:change` event;
- generates `dist/sw.js` from `scripts/sw.template.js` with a precache list of **every** exported file, versioned by a content hash;
- copies `index.html` → `404.html` for static-host deep links.

The service worker is network-first for navigations (falling back to the cached shell) and cache-first for everything else, since Metro content-hashes those files. It does **not** `skipWaiting` on install. `src/pwa/usePwa.ts` detects a waiting worker, and `PwaBanner` (home screen) offers "Restart", which posts `SKIP_WAITING` and reloads. This keeps an in-progress game from losing assets mid-session. `usePwa` also drives the Install banner (Chromium) and the iOS "Add to Home Screen" hint.

Static files (manifest, icons) live in `public/` and are copied into `dist/` as-is. Manifest URLs are relative, so they work under any base path.

Everything is precached, so asset weight matters: game art is 512px WebP (textures 1024px), ~6 MB total. Add new images as WebP and `require()` them. Metro only bundles required files, so unreferenced PNGs in `assets/` don't ship.

## Architecture

- **Routing** (`app/`, expo-router): `index.tsx` (game grid → `ModeSelector` → `/games/<id>?mode=single|multiplayer`), `settings.tsx` (stats + ad-free purchase), `games/<id>.tsx` (one screen per game). Ids come from `GAMES` and `TOOLS` in `src/utils/constants.ts` (thumbnails in `GAME_THUMBNAILS`) and must match the route filenames. Games go through `ModeSelector`; tools (coin flip, dice) open directly, are listed in the home grid's footer, and record no stats. `src/utils/random.ts` provides unbiased CSPRNG rolls.
- **Game = engine + AI + screen.** `src/engines/<game>.ts` holds pure, immutable game-state logic (`createGame`, `makeMove`, win checks). `src/ai/<game>-ai.ts` exposes `getAIMove(state, difficulty)` (Pop & Race's also takes the die roll); word games use `src/data/*` (dictionary, puzzles). Word Guess picks answers from the curated `WORDLE_ANSWERS` and accepts any guess in `wordle-guesses.ts` (the 5-letter words of the public-domain ENABLE list, stored as one string and turned into a Set on first use). The screen in `app/games/` owns all React state, AI turn timing, and calls `recordGameResult` exactly once per game: solo games record the player's result, pass-and-play records only the winner (or one draw) so stats don't double-count.
- **Theming**: `ThemeProvider` (persisted in AsyncStorage) supplies a full `Theme` (colors, fonts, radii, shadows, animation durations, background texture) for `retro` / `arcade` / `modern`. Per-theme piece artwork (X/O, checkers) is in `THEME_TOKENS` (`src/utils/tokens.ts`). Style components inline from `useTheme()` rather than hard-coding colors. The root layout also mirrors the theme background into the browser `theme-color`.
- **Responsive layout** (`src/utils/layout.ts`): all sizing must react to window changes (rotation, split-screen, desktop resize), so never read `Dimensions` at module scope.
  - `useResponsive()` gives breakpoints (`tablet` ≥600, `desktop` ≥1024) and the content-column width. Screens cap at `contentMaxWidth` (480/640/720) and center.
  - Non-scrolling board games (Tic Tac Toe, Four in a Row, Checkers, Dots & Boxes, Word Guess) wrap the board in a `flex: 1, alignSelf: 'stretch'` view and use `useBoardFit()`. It measures that area via `onLayout` and returns the largest board that fits, with `aspectRatio`/`extraHeight` options for non-square boards and `minSize` for boards that must shrink further. Word Guess switches to a grid-beside-keyboard layout on short landscape screens (height < 560). Status rows that toggle (jump hint, "AI is thinking", "Extra turn!") keep a reserved `minHeight` so the board doesn't resize when they appear.
  - Scrolling word games size their grids from `contentWidth`, capped by a fraction of window height.
- **Persistence**: everything is AsyncStorage (localStorage on web). `src/storage/scores.ts` stores a JSON array of results and computes stats on read; `initDatabase()` is a no-op kept for the root layout's startup gate.
- **Monetization is mocked.** `src/ads/` (`AdManager`, `AdBanner`, 30-minute ad-free timer) and `src/iap/IAPManager` only log to the console and persist flags. `AdBanner` isn't rendered by any screen yet.
