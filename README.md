# Table Games

Table Games is an offline-first collection of table games and game-night tools built with Expo, React Native, and TypeScript. Play solo against local AI where supported, share a device in Pass & Play, and choose Modern, Retro, or Arcade themes. The web build is an installable progressive web app (PWA).

Games: Tic Tac Toe, Four in a Row, Checkers, Chinese Checkers, Mancala, Pop & Race, Dots & Boxes, Hangman, Word Search, Crossword, Word Grid, and Word Guess.

Tools: Coin Flip and Dice.

Game labels use generic or descriptive names and should avoid implying affiliation with or endorsement by another product or rights holder. If a rights holder raises a concern about a label, change it to an appropriate alternative; this naming policy makes no legal guarantees.

The source is publicly visible for inspection. It is proprietary and is not open source; see the [no-reuse terms](LICENSE).

## Install in WSL 2 / Linux

Use Bash, Git, **Linux Node.js 22.x**, and npm 10 or newer. Run these commands from the repository root in a WSL 2 or compatible Linux shell. Paths containing spaces are supported. Use the Linux Node/npm installation rather than executables inherited from the Windows PATH. A global Expo CLI is not required.

With [nvm](https://github.com/nvm-sh/nvm) already installed:

```bash
nvm install
nvm use
./scripts/wsl/install.sh
```

The `.nvmrc` selects Node 22. The installer validates the toolchain and runs `npm ci`, installing the committed lockfile without updating dependencies. With the correct toolchain already selected, `npm ci` is the equivalent clean-install command. No account credentials or environment secrets are required for local web use.

## Develop, verify, build, and preview

Start the Expo web development server:

```bash
./scripts/wsl/run.sh dev
# Equivalent: npm run dev
```

The development server prints its local URL. An optional port is supported, for example `./scripts/wsl/run.sh dev 8081`. For native development, `npm run start:native`, `npm run android`, and `npm run ios` are available; native platforms require their own development environment, and an iOS simulator requires macOS.

Run the WSL wrapper checks, application unit tests, TypeScript checking, and production PWA build:

```bash
./scripts/wsl/verify.sh
# Equivalent: npm run verify:all
npm run test:public
npm run check:public
```

Individual checks are `npm run test:wsl`, `npm run test:unit`, and `npm run typecheck`. `npm run verify` runs the application tests, typecheck, and production build. The public-readiness gate validates policy documents and scans tracked files for generated artifacts, internal documentation, account placeholders, and likely credentials; it is a heuristic check, not a complete security audit.

Build and serve the production PWA:

```bash
./scripts/wsl/build.sh
# Equivalent: npm run build
./scripts/wsl/run.sh preview
# Equivalent: npm run preview
```

The build writes `dist/`; the preview runs at `http://localhost:4173`. Use `./scripts/wsl/run.sh preview 4174` or `npm run preview -- 4174` for another port. `npm run clean` removes only generated `dist/` and `.expo/` directories.

For GitHub Pages at the repository base path:

```bash
npm run build:pages
# Equivalent: EXPO_BASE_URL=/Table-Games ./scripts/wsl/build.sh
```

That build targets `/Table-Games/`; a custom deployment can set `EXPO_BASE_URL` to its own base path. Use a root-path build for the root-path local preview above. Pages deployment uses the workflow in `.github/workflows/deploy-pages.yml` and requires GitHub Pages configured for GitHub Actions in repository settings.

## Architecture

Each game is generally split among its screen under `app/games/`, a pure rules/state engine under `src/engines/`, and AI or strategy code under `src/ai/` where applicable. The screen coordinates player input and rendering; the engine handles game state independently of the interface.

`ModeSelector` in `src/components/ui/` is the reusable pre-game choice pattern for games that need Solo or Pass & Play selection. Some tools and utilities intentionally open directly: Coin Flip and Dice bypass the full pre-game selector and game-flow entry pattern while still reusing the shared `GameShell` layout.

| Location | Responsibility |
| --- | --- |
| `app/` | Expo Router screens, home, settings, and game routes |
| `src/engines/` | Game rules and state transitions |
| `src/ai/` | Local computer-player strategies |
| `src/components/` | Shared interface and game components |
| `src/theme/` | Modern, Retro, and Arcade theme definitions and providers |
| `src/storage/` | AsyncStorage settings, game results, and session data |
| `src/data/` | Bundled word lists and puzzles |
| `src/ads/`, `src/iap/` | Simulated advertising and purchase behavior |
| `src/pwa/`, `public/`, `scripts/build-pwa.mjs`, `scripts/sw.template.js` | Install/update UI, web manifest, icons, and generated service worker |
| `scripts/wsl/` | Linux toolchain checks and install/build/run/verify wrappers |

## Offline use and privacy

Open the production PWA online once so the service worker can cache the application and bundled assets. Subsequent visits can work offline in the same browser profile while that cache remains available. The development server does not represent the production offline behavior. Browsers may evict site storage; offline use is not guaranteed before the first successful cache or after clearing site data.

The application stores settings, theme choices, game results, session timing, and mock ad-free purchase status locally through AsyncStorage (browser local storage on web). Game logic and AI run on the device. There is no application account, cloud save, analytics integration, real ad network, or payment processing in this release. Initial downloads and update checks still contact the hosting server, which may keep its own access logs.

Clearing the browser's site data removes local progress, preferences, cached offline assets, and mock purchase status. Data is not synchronized between browsers or devices. Service-worker updates wait until the user chooses **Restart**; an update does not force a running game to reload.

## Known limitations

- Advertising and in-app purchases are mocked. The displayed ad-free price and purchase/restore flows are demonstrations; they do not charge money or establish a real store entitlement.
- Word Grid has a known timed Pass & Play handover bug: when player one's countdown reaches zero, the round-end effect can mark the match over during the pass-device phase before player two starts. This release documents the defect; the game behavior has not been changed.
- Native build profiles remain in `eas.json`, but store submission requires the owner's real account configuration and is not set up by this repository.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not include credentials or private data in public issues.

## Proprietary terms

Copyright 2026 ghost-ng. All Rights Reserved. Public visibility allows inspection only. Copying, modification, distribution, sublicensing, commercial use, and other reuse of project-owned material require prior written permission from ghost-ng. Publication does not grant contribution or reuse rights. Read the complete [LICENSE](LICENSE); the npm package remains private and `UNLICENSED`.

Bundled third-party fonts retain their own terms: [font copyright notices](public/licenses/FONT-NOTICES.json) and the complete [SIL Open Font License 1.1](public/licenses/OFL-1.1.txt). These files are also included in the production PWA at `licenses/FONT-NOTICES.json` and `licenses/OFL-1.1.txt` under the deployment base path, including `/Table-Games/licenses/` on Pages. The project's proprietary restrictions do not override the fonts' license.
