# Table Games PWA Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cohesive, responsive visual refresh for the Table Games PWA, all twelve games, both tools, and settings while fixing Hangman's seven-state progression.

**Architecture:** Extend the current theme contract, introduce a small reusable game-shell layer, and migrate existing screens without changing engines, routes, score persistence, or the PWA pipeline. Keep game-specific boards in their existing screens, use shared chrome and interaction primitives for consistency, and isolate Hangman stage selection as pure tested logic backed by a new coherent seven-image asset set.

**Tech Stack:** Expo 55, React 19, React Native Web, expo-router, react-native-reanimated, TypeScript 5.9, AsyncStorage, Node test runner through `tsx`, production WebP assets, Playwright CLI for rendered QA.

**Spec:** `docs/superpowers/specs/2026-09-26-table-games-visual-refresh-design.md`

## Global Constraints

- Preserve all current routes, generic user-visible game names, game rules, difficulty behavior, local score formats, and pass-and-play flows.
- Preserve the Retro, Arcade, and Modern themes; Modern is the clean baseline and all visual values flow through theme tokens.
- Preserve the current offline-first export, precache, service-worker update, and stored theme behavior.
- Keep game and tool UI code-native; generated images are static artwork, never screenshots used as controls.
- Add no paid dependency and no dependency used only for decorative effects.
- Keep every practical touch target at least 44 CSS pixels and provide accessible labels for icon-only or non-text actions.
- Support compact phone, short landscape, tablet, and desktop layouts without clipping, overflow, or tiny centered boards.
- Respect reduced-motion preferences and never rely only on color to communicate selection, turn, legality, or correctness.
- Preserve all pre-existing uncommitted files; stage and commit only files intentionally changed by the active task.

## Review Focus

- A 320-pixel-wide phone and a short 844×390 landscape viewport must keep the header, board, primary action, and required keyboard controls usable; Task 1 adds layout-boundary tests and Task 7 verifies both viewports.
- Theme switching during a mounted game must recolor shared chrome and game surfaces without stale hard-coded colors; Task 1 adds token-completeness tests and Task 7 switches through all three themes in-browser.
- Repeated or invalid Hangman guesses must not advance the visual stage, while stage values outside 0–6 clamp safely; Task 3 adds engine and stage-mapping tests.
- Keyboard navigation must expose visible focus and accessible names for home controls, game navigation, selectors, and game actions; Tasks 1–6 add labels and Task 7 performs a tab-order audit.
- A production build must load every referenced WebP offline and must not change the service-worker waiting-worker behavior; Task 3 checks asset resolution and Task 7 validates the exported PWA and offline reload.

---

## File Structure

### New files

- `src/components/ui/GameShell.tsx` — shared themed background, safe-area frame, responsive content width, header slot, status slot, play region, and footer slot.
- `src/components/ui/GameHeader.tsx` — accessible back control, game title, and optional trailing action.
- `src/components/ui/StatusRail.tsx` — shared compact surface for turn, score, timer, progress, and message content.
- `src/utils/hangmanStages.ts` — pure `getHangmanStage(wrongGuesses)` clamp used by the Hangman screen and tests.
- `src/utils/layout.test.ts` — boundary tests for responsive width helpers extracted from `layout.ts`.
- `src/utils/hangmanStages.test.ts` — zero-through-six and out-of-range stage mapping tests.
- `src/engines/hangman.test.ts` — engine progression, duplicate guess, correct guess, win, and loss tests.
- `assets/pieces/hangman/hangman-0.webp` through `hangman-6.webp` — consistent fixed-camera progression assets.

### Shared files modified

- `package.json`, `package-lock.json` — add `test`/`test:unit` scripts and the `tsx` development dependency.
- `src/theme/types.ts`, `src/theme/themes/{modern,retro,arcade}.ts` — extend and populate the shared visual-token contract.
- `src/utils/layout.ts` — expose pure breakpoint/content-width helpers and allow wider desktop game canvases.
- `src/components/ui/{Button,Card,TurnIndicator,ScoreDisplay,PlayerBadge,ModeSelector,DifficultySelector,GameOverModal,GameCard}.tsx` — adopt shared tokens, accessible states, focus treatment, and consistent sizing.
- `app/index.tsx`, `app/settings.tsx` — refreshed catalog and settings surfaces.

### Game files modified

- Board games: `app/games/{tic-tac-toe,connect-four,checkers,chinese-checkers,mancala,trouble,dots-and-boxes}.tsx`.
- Hangman: `app/games/hangman.tsx` and `src/engines/hangman.ts`.
- Word games: `app/games/{word-search,crossword,boggle,wordle}.tsx`.
- Tools: `app/games/{coin-flip,dice}.tsx`.

## Task 1: Test Harness, Theme Contract, and Shared Game Shell

**Files:**
- Create: `src/utils/layout.test.ts`
- Create: `src/components/ui/GameShell.tsx`
- Create: `src/components/ui/GameHeader.tsx`
- Create: `src/components/ui/StatusRail.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/theme/types.ts`
- Modify: `src/theme/themes/modern.ts`
- Modify: `src/theme/themes/retro.ts`
- Modify: `src/theme/themes/arcade.ts`
- Modify: `src/utils/layout.ts`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/TurnIndicator.tsx`
- Modify: `src/components/ui/ScoreDisplay.tsx`
- Modify: `src/components/ui/PlayerBadge.tsx`
- Modify: `src/components/ui/GameOverModal.tsx`

**Interfaces:**
- Produces: `getResponsiveLayout(width: number, height: number): ResponsiveLayoutFlags` and the existing `useResponsive(): ResponsiveLayout` backed by that helper.
- Produces: `GameShellProps { title: string; onBack: () => void; children: ReactNode; status?: ReactNode; footer?: ReactNode; trailingAction?: ReactNode; scroll?: boolean; contentMaxWidth?: number }`.
- Produces: `GameHeaderProps { title: string; onBack: () => void; trailingAction?: ReactNode }`.
- Produces: `StatusRailProps { children: ReactNode; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }`.
- Produces: required theme colors `surfaceRaised`, `surfaceSunken`, `board`, `boardAlt`, `onPrimary`, `focus`, `warning`, and `overlay` in `ThemeColors`.

- [ ] **Step 1: Add the failing responsive-layout tests and test command**

Add `tsx` as a dev dependency, set `"test:unit": "tsx --test src/**/*.test.ts"`, and test `getResponsiveLayout` at widths 320, 599, 600, 1023, 1024, and 1440. Assert phone/tablet/desktop flags, landscape detection, and desktop content width greater than the current 720-pixel cap but no greater than 1120 pixels.

- [ ] **Step 2: Run the layout tests and verify the missing helper fails**

Run: `npm run test:unit -- src/utils/layout.test.ts`

Expected: FAIL because `getResponsiveLayout` is not exported.

- [ ] **Step 3: Implement the pure layout helper and update `useResponsive`**

Keep `BREAKPOINTS` unchanged, set screen-shell maximums to 480/720/1120 for phone/tablet/desktop, and keep `useBoardFit` reactive to its measured region.

- [ ] **Step 4: Extend the theme contract and populate every theme**

Add the eight required colors to `ThemeColors`; choose high-contrast values derived from each existing theme palette. Do not introduce per-component literal colors for shared states.

- [ ] **Step 5: Implement `GameHeader`, `StatusRail`, and `GameShell`**

`GameShell` owns themed `ImageBackground`, safe-area padding, the responsive outer canvas, optional scrolling, and stable header/status/footer regions. `GameHeader` exposes an accessible “Back” button with a code-native arrow icon and 44-pixel target.

- [ ] **Step 6: Migrate shared primitives to the token contract**

Add `accessibilityRole`, disabled state, focus-visible web styling where React Native Web supports it, `hitSlop` where needed, and reduced-motion-safe press feedback. Keep existing public props source-compatible.

- [ ] **Step 7: Run unit tests and type checking**

Run: `npm run test:unit && npm run typecheck`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit Task 1**

```bash
git add package.json package-lock.json src/theme src/utils/layout.ts src/utils/layout.test.ts src/components/ui
git commit -m "feat: add responsive game visual system"
```

## Task 2: Home, Selectors, and Settings Refresh

**Files:**
- Modify: `app/index.tsx`
- Modify: `app/settings.tsx`
- Modify: `src/components/ui/GameCard.tsx`
- Modify: `src/components/ui/ModeSelector.tsx`
- Modify: `src/components/ui/DifficultySelector.tsx`
- Modify: `src/components/ui/ThemePicker.tsx`
- Modify: `src/components/ui/PwaBanner.tsx`
- Reuse: `assets/games/*.webp`

**Interfaces:**
- Consumes: Task 1 theme tokens and shared `Button`/`Card` behavior.
- Produces: `GameCardProps` extended with `image: ImageSourcePropType`, `subtitle?: string`, and `variant?: 'game' | 'tool'` while retaining `game`, `width`, and `onPress`.

- [ ] **Step 1: Refactor the home grid to use `GameCard` for games and tools**

Replace the inline card renderer with the shared component, preserve `GAMES`, `TOOLS`, `GAME_THUMBNAILS`, routes, and generic display names, and use two/three/four columns at compact/tablet/desktop sizes without shrinking labels below 13 pixels.

- [ ] **Step 2: Implement the approved home hierarchy**

Use a simple title/header row, accessible Stats and Theme actions, a primary games section, and a visually quieter tools rail. Reframe the existing coherent thumbnail set rather than adding promotional copy or a marketing hero.

- [ ] **Step 3: Refresh mode, difficulty, theme, PWA, and settings surfaces**

Use shared surfaces/buttons, remove hard-coded difficulty colors in favor of semantic theme colors plus text labels, preserve purchase/stat/PWA behaviors, and add accessible names and modal semantics.

- [ ] **Step 4: Verify the catalog and modal flows in the browser**

Run the Expo web server, open `/`, select one game, switch modes, open Theme Picker, visit Settings, and return. Assert every one of the 12 game names and 2 tool names appears once and each target route is unchanged.

- [ ] **Step 5: Run type checking**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add app/index.tsx app/settings.tsx src/components/ui/GameCard.tsx src/components/ui/ModeSelector.tsx src/components/ui/DifficultySelector.tsx src/components/ui/ThemePicker.tsx src/components/ui/PwaBanner.tsx
git commit -m "feat: refresh catalog and setup surfaces"
```

## Task 3: Correct and Rebuild Hangman Progression

**Files:**
- Create: `src/utils/hangmanStages.ts`
- Create: `src/utils/hangmanStages.test.ts`
- Create: `src/engines/hangman.test.ts`
- Create: `assets/pieces/hangman/hangman-0.webp`
- Create: `assets/pieces/hangman/hangman-1.webp`
- Create: `assets/pieces/hangman/hangman-2.webp`
- Create: `assets/pieces/hangman/hangman-3.webp`
- Create: `assets/pieces/hangman/hangman-4.webp`
- Create: `assets/pieces/hangman/hangman-5.webp`
- Create: `assets/pieces/hangman/hangman-6.webp`
- Modify: `src/engines/hangman.ts`
- Modify: `src/ai/hangman-ai.ts`
- Modify: `app/games/hangman.tsx`

**Interfaces:**
- Produces: `export const MAX_WRONG_GUESSES = 6` from `src/engines/hangman.ts`.
- Produces: `getHangmanStage(wrongGuesses: number): 0 | 1 | 2 | 3 | 4 | 5 | 6` from `src/utils/hangmanStages.ts`.
- Consumes: Task 1 `GameShell`, `StatusRail`, theme tokens, and shared buttons.

- [ ] **Step 1: Write failing engine and visual-stage tests**

Assert `createGame('APPLE')` starts at stage 0 with six misses remaining; correct guesses and duplicate guesses do not advance; six distinct wrong guesses yield stages 1–6 and a loss; `getHangmanStage(-1) === 0`, `getHangmanStage(7) === 6`, and non-integer input is truncated before clamping.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm run test:unit -- src/engines/hangman.test.ts src/utils/hangmanStages.test.ts`

Expected: FAIL because `MAX_WRONG_GUESSES` and `getHangmanStage` do not exist.

- [ ] **Step 3: Implement the shared constant and pure stage mapper**

Use `MAX_WRONG_GUESSES` in `createGame` and remove the duplicate stage-count/body-part helpers from `src/ai/hangman-ai.ts` if they have no consumers.

- [ ] **Step 4: Generate the seven fixed-camera Hangman assets**

Use the approved friendly tabletop visual direction. All images must use the same 512×512 canvas, gallows, rope, character position, line weight, transparent or exact matching background, and add only the required part for states 0–6. Convert to WebP and visually inspect the seven-image contact sheet before integration.

- [ ] **Step 5: Map `wrongGuesses` directly to the seven assets**

Replace the offset/conditional rendering with `HANGMAN_STAGE_IMAGES[getHangmanStage(gameState.wrongGuesses)]`, so stage zero is always visible while playing. Refresh the slots, remaining-guesses copy with singular/plural grammar, keyboard states, multiplayer setup, and pass-device surface using shared components.

- [ ] **Step 6: Run focused tests, type checking, and the complete progression flow**

Run: `npm run test:unit -- src/engines/hangman.test.ts src/utils/hangmanStages.test.ts && npm run typecheck`

Browser flow: `/games/hangman?mode=multiplayer` → enter `APPLE` → Ready → guess `B,C,D,F,G,H`; assert image names/stages 0–6 in order, six remaining down to zero, and final loss text.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/engines/hangman.ts src/engines/hangman.test.ts src/ai/hangman-ai.ts src/utils/hangmanStages.ts src/utils/hangmanStages.test.ts app/games/hangman.tsx assets/pieces/hangman
git commit -m "fix: rebuild Hangman visual progression"
```

## Task 4: Refresh the Seven Board-Game Screens

**Files:**
- Modify: `app/games/tic-tac-toe.tsx`
- Modify: `app/games/connect-four.tsx`
- Modify: `app/games/checkers.tsx`
- Modify: `app/games/chinese-checkers.tsx`
- Modify: `app/games/mancala.tsx`
- Modify: `app/games/trouble.tsx`
- Modify: `app/games/dots-and-boxes.tsx`

**Interfaces:**
- Consumes: Task 1 `GameShell`, `StatusRail`, theme tokens, `Button`, `PlayerBadge`, `TurnIndicator`, and responsive helpers.
- Produces: no engine or route interface changes; each screen continues consuming its current engine state and AI functions.

- [ ] **Step 1: Migrate Tic Tac Toe, Four in a Row, and Checkers**

Use the shared shell/status hierarchy, increase desktop play scale, preserve theme-specific X/O and checker assets, add non-color selection/legal-move cues, and keep rematch/game-over state stable.

- [ ] **Step 2: Verify one complete interaction in each migrated game**

Play a legal mark, disc, and checker move in multiplayer mode. Assert the turn changes, the piece remains visible, no board reflow occurs, and no console error appears.

- [ ] **Step 3: Migrate Chinese Checkers and Mancala**

Improve board/pit contrast, peg/stone depth, selection and legal destinations, player progress/stores, and desktop scaling without changing engines or move validation.

- [ ] **Step 4: Verify one complete interaction in Chinese Checkers and Mancala**

Play one legal move in each and assert the engine-driven count/turn display updates with no overflow at 390×844 and 1440×900.

- [ ] **Step 5: Migrate Pop & Race and Dots & Boxes**

Refresh setup selectors, instruction hierarchy, board surfaces, dice dome/peg states, board-size chooser, line hit areas, and box ownership while keeping player counts and board sizes unchanged.

- [ ] **Step 6: Verify setup and core interactions**

Start a two-player Pop & Race game and roll once; start 3×3 Dots & Boxes and draw one line. Assert visible state change, minimum target size, and unchanged route/query behavior.

- [ ] **Step 7: Run type checking and rendered smoke captures**

Run: `npm run typecheck`

Capture desktop and compact-phone screenshots for all seven board games and inspect board size, player state, controls, and overflow.

- [ ] **Step 8: Commit Task 4**

```bash
git add app/games/tic-tac-toe.tsx app/games/connect-four.tsx app/games/checkers.tsx app/games/chinese-checkers.tsx app/games/mancala.tsx app/games/trouble.tsx app/games/dots-and-boxes.tsx
git commit -m "feat: refresh classic board games"
```

## Task 5: Refresh the Four Word-Game Screens

**Files:**
- Modify: `app/games/word-search.tsx`
- Modify: `app/games/crossword.tsx`
- Modify: `app/games/boggle.tsx`
- Modify: `app/games/wordle.tsx`

**Interfaces:**
- Consumes: Task 1 shared shell, theme tokens, selectors, status components, and responsive helpers.
- Produces: no changes to puzzle, dictionary, answer, score, or route contracts.

- [ ] **Step 1: Migrate Word Search and Crossword**

Strengthen cell typography, active/selected/found states, clue linkage, word-bank hierarchy, player scores, timers, and keyboard layout. Add shape/underline/border cues so state is not color-only.

- [ ] **Step 2: Verify selection and entry flows**

Select a Word Search path and a Crossword cell, enter a letter, switch Across/Down, and assert visible state plus unchanged puzzle data.

- [ ] **Step 3: Migrate Word Grid and Word Guess**

Refresh tile depth, selected-word path, timer/score hierarchy, entry feedback, guess tiles, keyboard states, secret-word setup, and pass-device transitions. Preserve the mandated user-visible names “Word Grid” and “Word Guess.”

- [ ] **Step 4: Verify word interactions**

Select at least three adjacent Word Grid letters and submit; in Word Guess multiplayer, enter a valid five-letter secret, pass the device, and submit one valid guess. Assert feedback appears and no layout shift hides the keyboard.

- [ ] **Step 5: Check short landscape and mobile layouts**

Verify 844×390 and 390×844 viewports for all four games, including the existing Word Guess grid-beside-keyboard behavior on short screens.

- [ ] **Step 6: Run type checking and commit Task 5**

Run: `npm run typecheck`

```bash
git add app/games/word-search.tsx app/games/crossword.tsx app/games/boggle.tsx app/games/wordle.tsx
git commit -m "feat: refresh word games"
```

## Task 6: Refresh Coin Flip and Dice

**Files:**
- Modify: `app/games/coin-flip.tsx`
- Modify: `app/games/dice.tsx`

**Interfaces:**
- Consumes: Task 1 shared shell, theme tokens, buttons, and reduced-motion behavior.
- Produces: no changes to the unbiased random helpers or tool routes.

- [ ] **Step 1: Refresh Coin Flip**

Use a dimensional theme-aware coin, preserve code-native Heads/Tails labels, keep result counts legible, add a short reduced-motion-safe flip transition, and expose one accessible Flip action.

- [ ] **Step 2: Refresh Dice**

Use consistent die geometry and pip spacing across d4/d6/d8/d10/d12/d20 modes, make held dice visually and textually distinct, and clarify count controls, total, and Roll action.

- [ ] **Step 3: Verify randomness-driven interactions**

Flip ten times and confirm counts total ten; roll two dice, hold one, roll again, and confirm the held value remains unchanged while the total matches visible values.

- [ ] **Step 4: Run type checking and commit Task 6**

Run: `npm run typecheck`

```bash
git add app/games/coin-flip.tsx app/games/dice.tsx
git commit -m "feat: refresh tabletop tools"
```

## Task 7: Cross-App Visual QA, Accessibility, and PWA Verification

**Files:**
- Modify as required by findings: files changed in Tasks 1–6 only.
- Do not commit: temporary screenshots, Playwright sessions, contact sheets, or traces.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: a verified production build with no intentional route, persistence, or PWA behavior changes.

- [ ] **Step 1: Run the complete automated verification suite**

Run: `npm run test:unit && npm run typecheck && npm run build`

Expected: all tests PASS, TypeScript exits 0, Expo export succeeds, and `build-pwa.mjs` reports a versioned precache with all seven Hangman assets.

- [ ] **Step 2: Run the catalog-wide desktop smoke test**

At 1440×900, load home, all 12 game routes in multiplayer mode, Coin Flip, Dice, and Settings. Check page identity, meaningful content, missing assets, console errors, board scale, header consistency, status hierarchy, focus visibility, and primary action response.

- [ ] **Step 3: Run compact mobile and short-landscape smoke tests**

Repeat all screens at 390×844 and the keyboard-heavy/non-scrolling games at 844×390. Fail on horizontal scrolling, clipped primary content, inaccessible controls, overlapping keyboards, or boards below their usable minimum.

- [ ] **Step 4: Audit all three themes and reduced motion**

Switch Retro → Arcade → Modern on home and representative board, word, Hangman, and tool screens. Assert shared surfaces update immediately, contrast remains readable, and reduced-motion mode removes nonessential movement without hiding state changes.

- [ ] **Step 5: Verify Hangman progression and browser accessibility**

Repeat the exact `APPLE`/`B,C,D,F,G,H` flow, inspect all seven images together, tab through setup/keyboard/navigation controls, and confirm accessible names and visible focus.

- [ ] **Step 6: Verify production PWA behavior**

Serve `dist/`, load online once, switch Playwright offline, reload home and one game route, and confirm cached assets render. Restore online and confirm the waiting-worker update flow remains available rather than forcing mid-game reload.

- [ ] **Step 7: Create the fidelity ledger and repair all fixable mismatches**

For home, each game family, Hangman, and tools, record at least five comparison points covering typography, palette, board scale, container model, asset treatment, controls, responsive behavior, and motion. Re-run the relevant browser interaction after each repair.

- [ ] **Step 8: Remove temporary QA artifacts and rerun final checks**

Run: `npm run test:unit && npm run typecheck && npm run build && git status --short`

Expected: automated checks PASS; only intentional source changes plus the user's pre-existing work remain; no `.playwright-cli`, screenshots, traces, or generated contact sheets are staged.

- [ ] **Step 9: Commit final QA repairs**

```bash
git add <only files intentionally repaired during Task 7>
git commit -m "fix: complete responsive visual QA"
```
