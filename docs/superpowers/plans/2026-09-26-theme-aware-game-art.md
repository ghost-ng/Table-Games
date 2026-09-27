# Theme-Aware Game Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all fourteen games theme-specific, playful production graphics and full-width portrait-phone boards while preserving gameplay, accessibility, performance, and offline PWA behavior.

**Architecture:** A typed static `GAME_VISUALS` registry owns all local bitmap assets, while a small set of shared game-visual components renders theme materials around responsive code-native boards. A pure board-sizing function standardizes phone behavior, and route migrations are grouped into independently reviewable game families.

**Tech Stack:** Expo 55, React 19, React Native / React Native Web, TypeScript 5.9, Expo Router, React Native Reanimated, Node test runner through `tsx`, local WebP assets, Playwright CLI for browser QA.

**Spec:** `docs/superpowers/specs/2026-09-26-theme-aware-game-art-design.md`

## Global Constraints

- Preserve all game rules, AI behavior, scores, persistence, modes, and routing.
- Use generated transparent WebP only for tactile objects; boards, letters, pips, numbers, focus, and responsive geometry stay code-native.
- Every asset is local and referenced through a literal static `require()`; no runtime or remote asset loading.
- Equivalent pieces keep the same silhouette and hit target across Modern, Retro, and Arcade.
- Hangman has exactly seven stages, `0` through `6`, and resets immediately to stage `0`.
- Dice and letter assets contain no baked values or characters.
- Portrait phone boards below 600 logical pixels fill the shell width after safe-area and 12-pixel shell padding, unless required controls would be hidden vertically.
- Compact landscape may remain height-bound; tablet and desktop keep comfortable maximum widths.
- Motion is brief, non-essential, and disabled when reduced motion is active.
- Preserve semantic labels, focus rings, non-color state indicators, and WCAG AA text contrast.
- Do not add a new animation, image-loading, or UI component dependency.
- Keep home tools as compact icon-and-name cards, never full-width rows.

## Review Focus

- A 320-, 390-, or 430-pixel portrait viewport should show each board at the full shell width with no nested gutter, clipping, or horizontal scroll; Task 1 adds pure sizing tests and Task 9 measures rendered bounds.
- Missing or misnamed art must fail verification before bundling rather than silently falling back; Task 2 adds exhaustive registry and filesystem validation.
- A theme switch during an active round must change visuals without resetting game state; Tasks 4–8 explicitly exercise this in browser QA.
- Stage/value overlays must remain correct when images change: Hangman stage `0–6`, checker kings, coin result, and every die value; Tasks 2 and 7 pin these states.
- Reduced motion, keyboard focus, screen-reader labels, and offline reload must retain all information; Tasks 3 and 9 test these paths.

---

## File Structure

### New shared system

- `src/game-visuals/types.ts` — registry and material contracts.
- `src/game-visuals/catalog.ts` — pure theme/family/stage/type constants used by tests and tooling.
- `src/game-visuals/registry.ts` — literal static asset requires for all three themes.
- `src/game-visuals/presentation.ts` — pure state-to-style/motion decisions.
- `src/game-visuals/catalog.test.ts` — registry-shape and stage/type coverage.
- `src/game-visuals/presentation.test.ts` — non-color markers and reduced-motion decisions.
- `src/components/game-visuals/GamePieceImage.tsx` — normalized piece image and pressed/disabled state.
- `src/components/game-visuals/ThemedBoardSurface.tsx` — board frame/material layer and `game-board` test id.
- `src/components/game-visuals/TactileCell.tsx` — shared selected/legal/winning cell shell.
- `src/components/game-visuals/LetterTile.tsx` — code-rendered letters and correctness/selection markers.
- `src/components/game-visuals/SelectionTrail.tsx` — code-native word-path overlay.
- `src/components/game-visuals/VictoryAccent.tsx` — one-shot accessible victory treatment.
- `scripts/game-assets.test.mjs` — filesystem and naming validation for production WebP assets.
- `docs/design/game-art-production.md` — prompts, batch provenance, cleanup notes, and final asset inventory.

### Modified shared system

- `src/utils/layout.ts`, `src/utils/layout.test.ts` — pure full-width board sizing plus hook integration.
- `src/theme/types.ts`, `src/theme/themes/{modern,retro,arcade}.ts` — semantic material tokens.
- `src/utils/tokens.ts` — retained unchanged through Tasks 2–3, then deleted in Task 4 after both consumers move to `GAME_VISUALS`.
- `package.json` — include new unit and asset checks in verification.
- `src/components/ui/{GameShell,GameCard,Card,Button,StatusRail,GameHeader}.tsx` — shared material treatment without layout churn.

### Modified routes

- Strategy/grid: `app/games/{tic-tac-toe,connect-four,checkers,dots-and-boxes}.tsx`
- Tactile board: `app/games/{chinese-checkers,mancala,trouble}.tsx`
- Word: `app/games/{word-search,crossword,boggle,wordle}.tsx`
- Tools/progression: `app/games/{hangman,coin-flip,dice}.tsx`
- Home: `app/index.tsx`

### Production assets

- `assets/pieces/{modern,retro,arcade}/{tic-tac-toe,connect-four,checkers,chinese-checkers,mancala,trouble,coin-flip,dice,hangman}/*.webp`

---

### Task 1: Full-Width Portrait-Phone Boards

**Files:**
- Modify: `src/utils/layout.ts`
- Create: `src/utils/layout.test.ts`
- Modify: `package.json`
- Modify: `app/games/word-search.tsx`
- Modify: `app/games/crossword.tsx`
- Modify: `app/games/boggle.tsx`
- Modify: `app/games/{tic-tac-toe,connect-four,checkers,dots-and-boxes,chinese-checkers,mancala,trouble,wordle}.tsx`

**Interfaces:**
- Produces: `calculateBoardSize(options: CalculateBoardSizeOptions): number`
- Produces: `BoardFitOptions.phoneInset?: number`, defaulting to `0` only for portrait phones and otherwise preserving `inset`
- Produces: a visible `game-board` test id on all board/game-surface roots for browser measurement

- [ ] **Step 1: Write failing pure sizing tests**

Add cases asserting that measured portrait-phone areas of `296`, `366`, and `406` produce those exact board widths when the hook resolves `phoneInset: 0` to `inset: 0`, while desktop remains capped and compact landscape remains height-bound. Add a fractional-size case asserting integer flooring and a tiny-area case asserting the configured minimum.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npx tsx --test src/utils/layout.test.ts`

Expected: FAIL because `calculateBoardSize` and `phoneInset` do not exist.

- [ ] **Step 3: Implement the pure calculation and hook integration**

Add these exact contracts in `src/utils/layout.ts`:

```ts
export interface CalculateBoardSizeOptions {
  areaWidth: number;
  areaHeight: number;
  maxSize: number;
  minSize: number;
  inset: number;
  aspectRatio: number;
  extraHeight: number;
}

export function calculateBoardSize(options: CalculateBoardSizeOptions): number;
```

`useBoardFit()` selects `phoneInset ?? 0` only when `isPhone && !isLandscape`; it otherwise uses the existing `inset`. Keep height and aspect-ratio constraints authoritative.

- [ ] **Step 4: Remove duplicate manual phone gutters**

Change Word Search and Word Grid from `contentWidth - 48` to `contentWidth - 24`, and Crossword from `contentWidth - 40` to `contentWidth - 24`. Preserve their short-landscape height caps. Add `testID="game-board"` to the eleven actual boards: Tic-Tac-Toe, Four in a Row, Checkers, Dots & Boxes, Chinese Checkers, Mancala, Pop & Race, Word Search, Crossword, Word Grid, and Word Guess. Do not apply the board-width assertion to Coin Flip, Dice, or Hangman.

- [ ] **Step 5: Run focused and existing layout tests**

Run: `npx tsx --test src/utils/responsive.test.ts src/utils/layout.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Type-check and commit**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Commit: `fix: fill portrait phone width with game boards`

---

### Task 2: Production Asset Catalog and Typed Registry

**Files:**
- Create: `src/game-visuals/types.ts`
- Create: `src/game-visuals/catalog.ts`
- Create: `src/game-visuals/catalog.test.ts`
- Create: `src/game-visuals/registry.ts`
- Create: `scripts/game-assets.test.mjs`
- Create: `docs/design/game-art-production.md`
- Create: production WebP files under each `assets/pieces/{modern,retro,arcade}/{tic-tac-toe,connect-four,checkers,chinese-checkers,mancala,trouble,coin-flip,dice,hangman}/` directory
- Modify: `src/utils/hangmanStages.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `DICE_KINDS`, `HANGMAN_STAGES`, `THEME_NAMES`, and per-family required file names as readonly tuples
- Produces: `GameVisuals` exactly matching the approved spec and `GAME_VISUALS: Record<ThemeName, GameVisuals>`
- Produces: `getGameVisuals(themeName: ThemeName): GameVisuals`
- Produces: `npm run test:assets`

- [ ] **Step 1: Write failing catalog and asset-validation tests**

Assert all three themes exist; dice keys equal `d4,d6,d8,d10,d12,d20`; Hangman keys equal `0–6`; pawn arrays have four entries; marble arrays have six entries; seed arrays have six entries; every required relative path exists, is non-empty, ends in `.webp`, and resides below the matching theme directory.

- [ ] **Step 2: Expand Hangman boundary tests before changing assets**

Keep the direct `0–6` mapping test and assert `-Infinity`, negative values, fractions, overflow, `Infinity`, and `NaN`. Add a test proving `createGame()` and rematch-created state both map to stage `0`.

- [ ] **Step 3: Run tests and confirm the new catalog/asset checks fail**

Run: `npx tsx --test src/game-visuals/catalog.test.ts src/utils/hangmanStages.test.ts`

Expected: FAIL for missing catalog/registry production files.

- [ ] **Step 4: Generate and normalize production art families**

Use the approved reference sheets and image-generation skill. Create transparent, isolated families for all registry entries. Keep identical canvas bounds and camera angle within each family; use abstract coin crests; keep dice blank; implement friendly Modern desk-toy, Retro peg-doll, and Arcade robot Hangman sequences. Optimize to WebP at actual-use resolution and record source prompts, generated paths, crop/alpha cleanup, dimensions, and output paths in `docs/design/game-art-production.md`.

- [ ] **Step 5: Implement the catalog and literal static registry**

Define `GameVisuals` in `types.ts`; keep path/name constants pure in `catalog.ts`; place every literal `require('../../assets/...')` in `registry.ts`. Do not compute require paths or add runtime fallbacks.

- [ ] **Step 6: Implement the filesystem validator and package scripts**

Set `test:unit` to `tsx --test src/**/*.test.ts`, add `test:assets` as `node --test scripts/game-assets.test.mjs`, and run both before `typecheck` in `verify`.

- [ ] **Step 7: Run focused verification and inspect alpha quality**

Run: `npm run test:unit && npm run test:assets && npm run typecheck`

Expected: all PASS. Inspect each family on both light and dark backgrounds; reject baked backgrounds, clipped shadows, inconsistent scale, stray text, or illegible silhouettes.

- [ ] **Step 8: Commit**

Commit: `feat: add themed production game art registry`

---

### Task 3: Theme Materials and Shared Visual Primitives

**Files:**
- Modify: `src/theme/types.ts`
- Modify: `src/theme/themes/modern.ts`
- Modify: `src/theme/themes/retro.ts`
- Modify: `src/theme/themes/arcade.ts`
- Create: `src/game-visuals/presentation.ts`
- Create: `src/game-visuals/presentation.test.ts`
- Create: `src/components/game-visuals/GamePieceImage.tsx`
- Create: `src/components/game-visuals/ThemedBoardSurface.tsx`
- Create: `src/components/game-visuals/TactileCell.tsx`
- Create: `src/components/game-visuals/LetterTile.tsx`
- Create: `src/components/game-visuals/SelectionTrail.tsx`
- Create: `src/components/game-visuals/VictoryAccent.tsx`

**Interfaces:**
- Produces: `Theme.materials: ThemeMaterials`
- Produces: `getMotionPreset(kind: PieceMotionKind, reducedMotion: boolean): MotionPreset`
- Produces: shared components that accept semantic state and never game-engine state

- [ ] **Step 1: Write failing presentation tests**

Assert reduced motion returns zero duration for every motion kind; selected/winning/legal/king/found states each expose a non-color marker; Arcade `glowOpacity` is at most `0.28`; and no neutral state reports a victory marker.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npx tsx --test src/game-visuals/presentation.test.ts`

Expected: FAIL because the presentation contracts do not exist.

- [ ] **Step 3: Add semantic material tokens**

Define `ThemeMaterials` with exact fields `boardTexture?: ImageSourcePropType`, `boardBorderWidth: number`, `cellDepth: number`, `pieceShadowOpacity: number`, `glowColor: string`, `glowOpacity: number`, `selectionTrail: string`, and `celebration: string`. Populate all three themes using the approved palette; set Modern and Retro `glowOpacity` to `0`, and cap Arcade at `0.28`.

- [ ] **Step 4: Implement pure presentation decisions**

Define `PieceMotionKind = 'press' | 'place' | 'drop' | 'sow' | 'flip' | 'roll' | 'victory'` and return durations within the spec ranges, with `0` for reduced motion. Define semantic marker helpers consumed by the shared components.

- [ ] **Step 5: Build the shared primitives**

Use `VisualCellState = 'neutral' | 'selected' | 'legal' | 'winning' | 'king' | 'found'`. `GamePieceImage` accepts `source`, `size`, `state?`, `pressed?`, `disabled?`, and `style?`. `ThemedBoardSurface` accepts `children`, `style?`, and `testID?`, defaults `testID` to `game-board`, and never fixes its own width. `TactileCell` and `LetterTile` accept `state` plus existing layout/text props; `SelectionTrail` accepts ordered normalized points and `found`; `VictoryAccent` accepts `visible` and `kind`. Every decorative image is inaccessible while the parent Pressable/cell remains semantic.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit && npm run typecheck`

Expected: PASS.

Commit: `feat: add shared themed game visual primitives`

---

### Task 4: Strategy and Grid Game Migration

**Files:**
- Modify: `app/games/tic-tac-toe.tsx`
- Modify: `app/games/connect-four.tsx`
- Modify: `app/games/checkers.tsx`
- Modify: `app/games/dots-and-boxes.tsx`
- Delete: `src/utils/tokens.ts` after all Task 4 imports move to the registry
- Create: `src/engines/tic-tac-toe.test.ts`
- Create: `src/engines/connect-four.test.ts`
- Create: `src/engines/checkers.test.ts`
- Create: `src/engines/dots-and-boxes.test.ts`

**Interfaces:**
- Consumes: `GAME_VISUALS`, `ThemedBoardSurface`, `GamePieceImage`, `TactileCell`, `VictoryAccent`, motion presets
- Produces: four theme-aware routes with unchanged engine calls and accessible Pressables

- [ ] **Step 1: Create the four state-focused engine test files**

Assert `checkWinner` returns the three winning Tic-Tac-Toe and Four in a Row cells; `getValidMoves` preserves mandatory jumps and `makeMove` promotes on the far row; `drawLine` assigns a completed box to the player and retains the turn. Do not test pixels in engine tests.

- [ ] **Step 2: Run focused tests before migration**

Run: `npx tsx --test src/engines/tic-tac-toe.test.ts src/engines/connect-four.test.ts src/engines/checkers.test.ts src/engines/dots-and-boxes.test.ts`

Expected: PASS before visual changes.

- [ ] **Step 3: Migrate Tic-Tac-Toe and Four in a Row**

Use registry X/O and disc assets, tactile cells/rack depth, one-shot placement/drop motion, and non-color winning outlines. Preserve labels and move handlers.

- [ ] **Step 4: Migrate Checkers and Dots & Boxes**

Use registry checker/crown art; preserve lift/legal-destination behavior and add a distinct king label/marker. Keep Dots geometry code-native, theme nodes/edges, and add owner marks plus a last-edge marker.

- [ ] **Step 5: Verify all four routes and commit**

Run: `npm run test:unit && npm run typecheck`

Browser-check each route in all three themes at `390x844` and one desktop viewport. Switch theme mid-round and confirm board state persists.

Commit: `feat: refresh strategy game boards and pieces`

---

### Task 5: Marble, Seed, and Race Game Migration

**Files:**
- Modify: `app/games/chinese-checkers.tsx`
- Modify: `app/games/mancala.tsx`
- Modify: `app/games/trouble.tsx`
- Create: `src/engines/chinese-checkers.test.ts`
- Create: `src/engines/mancala.test.ts`
- Create: `src/engines/trouble.test.ts`

**Interfaces:**
- Consumes: registry marble/seed/pawn assets and all Task 3 primitives
- Produces: theme-aware pieces with code-native holes, pits, track, counts, and legal-state overlays

- [ ] **Step 1: Pin move-state behavior with focused engine tests**

Assert `getLegalDestinations` returns adjacent and jump destinations without changing the board; Mancala `makeMove` conserves `TOTAL_SEEDS` and reports capture/extra-turn state; Pop & Race `getLegalMoves`, `applyMove`, and `rollDie` preserve seat ownership and values `1–6`.

- [ ] **Step 2: Run focused engine tests**

Run: `npx tsx --test src/engines/chinese-checkers.test.ts src/engines/mancala.test.ts src/engines/trouble.test.ts`

Expected: PASS before visual changes.

- [ ] **Step 3: Migrate Chinese Checkers**

Render registry marbles in recessed code-native holes; preserve player markers and add selection rings/path feedback independent of marble color.

- [ ] **Step 4: Migrate Mancala**

Distribute deterministic visual seed variants without changing numerical state; keep pit counts visible and accessible; use a short sow trail only when motion is allowed.

- [ ] **Step 5: Migrate Pop & Race**

Render four registry pawn variants over the existing responsive track and preserve the code-rendered die/pips. Replace looping legal-move pulse with a reduced-motion-safe semantic ring.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:unit && npm run typecheck`

Browser-check all three themes, four-player ownership markers, narrow portrait width, and compact landscape.

Commit: `feat: refresh tactile race and seed games`

---

### Task 6: Word Game Surfaces and Selection Trails

**Files:**
- Modify: `app/games/word-search.tsx`
- Modify: `app/games/crossword.tsx`
- Modify: `app/games/boggle.tsx`
- Modify: `app/games/wordle.tsx`
- Create: `src/engines/word-search.test.ts`
- Create: `src/engines/crossword.test.ts`
- Create: `src/engines/boggle.test.ts`
- Create: `src/engines/wordle.test.ts`

**Interfaces:**
- Consumes: `LetterTile`, `SelectionTrail`, `ThemedBoardSurface`, theme materials, Task 1 sizing
- Produces: four responsive word boards with code-rendered letters and unchanged word engines

- [ ] **Step 1: Create the four pure word-engine test files**

Assert Word Search `getWordCells` and `checkSelection` return the expected ordered path; Crossword `selectCell` and `getClueForCell` preserve active direction; Word Grid `getAdjacentCells` and `traceWord` never reuse a cube; Word Guess `evaluateGuess` handles duplicate letters and returns exact correctness states.

- [ ] **Step 2: Run focused word-engine tests**

Run: `npx tsx --test src/engines/word-search.test.ts src/engines/crossword.test.ts src/engines/boggle.test.ts src/engines/wordle.test.ts`

Expected: PASS before rendering migration.

- [ ] **Step 3: Migrate Word Search and Crossword**

Use `LetterTile` and code-native selection/active-word surfaces. Word Search gets continuous start/end-capped trails and quieter persistent found trails. Crossword keeps clue numbers, selected cell, active word, and correctness visually distinct.

- [ ] **Step 4: Migrate Word Grid and Word Guess**

Use dimensional theme tiles while retaining code-rendered characters, path sequence markers, `Qu` behavior, correctness glyphs, keyboard state, and announcements. Respect reduced motion during reveal/selection.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:unit && npm run typecheck`

Browser-check every route at 320, 390, and 430 portrait widths; confirm no tile crop or horizontal scrolling and that boards fill available shell width when height permits.

Commit: `feat: refresh themed word game boards`

---

### Task 7: Hangman, Coin, and Dice Visuals

**Files:**
- Modify: `app/games/hangman.tsx`
- Modify: `app/games/coin-flip.tsx`
- Modify: `app/games/dice.tsx`
- Modify: `src/utils/hangmanStages.ts` only if a failing test proves a defect

**Interfaces:**
- Consumes: registry Hangman/coin/dice assets and motion presets
- Produces: `HangmanFigure` sourced only from `GAME_VISUALS[themeName].hangman[getHangmanStage(wrongGuesses)]`
- Produces: blank dice shells with code-rendered values/pips and themed coin faces/edge

- [ ] **Step 1: Verify progression tests fail if a stage is duplicated or omitted**

Extend the asset validator to compare the seven resolved Hangman paths within each theme and require seven distinct files.

- [ ] **Step 2: Migrate Hangman**

Delete the route-local image array. Use the registry lookup expression exactly once, keep “stage N of 6” plus “N of 6 incorrect guesses” semantics, and confirm difficulty start/rematch/multiplayer new round all display stage `0` immediately.

- [ ] **Step 3: Migrate Coin Flip**

Render theme heads/tails/edge assets, preserve a clearly labelled static result, and use the edge asset only during motion. Reduced motion skips rotation and directly reveals the result.

- [ ] **Step 4: Migrate Dice**

Place the matching blank shell behind existing code-rendered pips/value and d-type label. Preserve hold state, roll history, 1–6 dice count, every die type, and reduced-motion ellipsis/result behavior.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:unit && npm run test:assets && npm run typecheck`

Browser-check Hangman stages `0–6` in all themes, both coin outcomes, and `d4,d6,d8,d10,d12,d20` at minimum and maximum values.

Commit: `feat: refresh hangman coin and dice visuals`

---

### Task 8: App Chrome and Compact Home Tools

**Files:**
- Modify: `src/components/ui/GameCard.tsx`
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/StatusRail.tsx`
- Modify: `src/components/ui/GameHeader.tsx`
- Modify: `src/components/ui/GameShell.tsx`
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `Theme.materials` and existing component props
- Produces: unchanged public component signatures; all material styling is read from the existing theme context

- [ ] **Step 1: Preserve component contracts and accessibility**

Record current accessible labels, roles, minimum heights, and focus handling in a review checklist. Do not remove or rename existing required props.

- [ ] **Step 2: Apply material-aware shared styling**

Use borders, cell depth, shadows, and restrained Arcade glow consistently. Keep board hierarchy stronger than status and controls. Avoid large decorative gradients.

- [ ] **Step 3: Keep tools compact**

For `variant="tool"`, render the existing icon/art and name in a compact card matching the game grid rhythm. At two phone columns it must use the same calculated card width as game cards; never switch to a full-width list row.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm run build`

Browser-check home, theme picker, mode selector, headers, status rails, dialogs, and buttons in all three themes at phone and desktop widths.

Commit: `feat: unify themed app chrome and tool cards`

---

### Task 9: Full Verification, Visual Fidelity, and Offline PWA QA

**Files:**
- Modify only defects found by verification
- Create: `docs/design/game-art-fidelity-ledger.md`

**Interfaces:**
- Consumes: complete Tasks 1–8 implementation
- Produces: passing repository verification, browser evidence, fidelity ledger, and offline confirmation

- [ ] **Step 1: Run the full automated suite from a clean state**

Run: `npm run clean && npm run verify:all && npm run check:public`

Expected: all unit, WSL, asset, typecheck, production build, and public-readiness checks PASS.

- [ ] **Step 2: Start the production preview and use real-browser QA**

The Browser plugin is currently unavailable, so use the Playwright skill/CLI fallback and record that reason in the ledger. Test the built output rather than only the dev server.

- [ ] **Step 3: Measure phone board bounds**

At portrait widths `320`, `390`, and `430`, measure every `[data-testid="game-board"]`. When height does not constrain the board, assert its width equals viewport width minus the shell's 24 total horizontal pixels within a 2-pixel rounding tolerance. Assert document scroll width never exceeds viewport width.

- [ ] **Step 4: Capture the complete visual matrix**

Capture all fourteen routes in Modern, Retro, and Arcade at `390x844`, plus representative desktop captures. Exercise selected/legal/winning/king/found/result states and all Hangman stages. Capture reduced-motion and keyboard-focus examples.

- [ ] **Step 5: Compare implementation against approved references**

Inspect reference and implementation images side by side. Record at least five concrete findings in `game-art-fidelity-ledger.md`: silhouette consistency, material cues, lighting/shadows, palette, restrained effects, plus any correction made.

- [ ] **Step 6: Verify theme switching and offline installation behavior**

Switch theme during active representative rounds and confirm state persists. Load the production PWA once, simulate offline, reload Home plus at least one image-heavy game and Hangman in each theme, and confirm all art renders locally.

- [ ] **Step 7: Fix only evidence-backed defects and rerun affected checks**

For every defect, reproduce first, apply the smallest correction, rerun the focused automated/browser check, then rerun `npm run verify:all` after the final correction.

- [ ] **Step 8: Final commit**

Commit: `test: verify themed game art and responsive boards`

Do not claim completion until the final command output and browser captures have been inspected.
