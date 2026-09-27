# Game Art and Gameplay Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace weak or misleading game artwork with consistent, theme-aware physical game pieces, then ship the requested Coin Flip, Checkers, Mancala, Word Guess, Dots & Boxes, Hangman, and Word Grid corrections without regressing responsive or offline PWA behavior.

**Architecture:** Keep rules, labels, hit targets, and board geometry code-rendered. Store individually generated transparent source art in the repository, normalize it deterministically into committed WebP sprites, expose those sprites through the existing typed catalog/registry, and keep game-specific presentation logic in small pure helpers with unit tests. Shared engine/session state remains independent of screens so round progression and dictionary validation can be tested without React Native.

**Tech Stack:** Expo Router, React Native Web, TypeScript, Node test runner, Reanimated, Sharp for deterministic image inspection/normalization, built-in image generation, and Playwright CLI for responsive browser verification.

**Spec:** `docs/design/2026-09-27-game-art-and-gameplay-refresh.md`

## Global Constraints

- Work directly on `master`, as requested. Do not create a worktree or feature branch.
- Preserve unrelated local changes. Inspect `git status --short --branch` before every commit and stage only files owned by the current task.
- Follow test-driven development: add the smallest failing regression first, run it to see the expected failure, implement the minimum change, rerun it green, then run the broader related suite.
- Use the built-in image-generation tool for custom bitmap assets. Generate every distinct sprite as a separate transparent image; do not generate or crop multi-object sprite sheets.
- Inspect every generated source before normalization. Reject text, watermarks, opaque backgrounds, clipped silhouettes, incorrect geometry, duplicated stages, and wrong semantic colors.
- Keep letters, values, pips, score badges, focus rings, selection rings, legal-move indicators, and touch targets code-native.
- No runtime network image or dictionary fetches. Everything needed after installation must be committed and included in the service-worker precache.
- Keep final production paths under `assets/pieces/{theme}/{family}/`. Keep accepted source art under `docs/design/source-art/{theme}/{family}/` and provenance in `docs/design/game-art-sources.json`.
- Run Node commands under Node 22 in WSL: `source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && <command>`.
- Use `docs/design/` for the plan and evidence because the public-readiness gate intentionally rejects tracked internal planning folders.
- Do not push or deploy until the complete verification task passes and the user explicitly asks for it.

## Review Focus

- Sprite silhouettes must be recognizable at phone sizes, consistently centered, and never clipped.
- Semantic player colors must match the on-screen legends in all three themes.
- Dense Dots & Boxes boards must remain usable by touch without overlapping visual controls or ambiguous edge selection.
- Hangman names, roles, winners, score, and saved results must stay correct for at least three alternating rounds.
- Word Grid must use one shared offline dictionary path and accept `SEE` only when it is traceable.
- The 390×664 and 390×844 layouts must not reserve unnecessary margins or create horizontal document overflow.
- Reduced motion, keyboard input, accessibility labels, and offline reloads are release blockers.

---

## Task 1: Establish the Individual-Asset Contract

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/design/game-art-sources.json`
- Modify: `docs/design/game-art-production.md`
- Modify: `scripts/normalize-game-art.mjs`
- Modify: `scripts/game-assets.test.mjs`
- Modify: `src/game-visuals/catalog.test.ts`
- Create: `scripts/game-art-lib.mjs`

**Interfaces:**

- Consumes: `GAME_VISUAL_PATHS`, `REQUIRED_FILES`, and the existing production asset budget.
- Produces: the manifest record contract plus `readImageMetrics()`, `normalizeGameArtAsset()`, and `createContactSheet()` exports used by Tasks 2, 3, and 10.

- [ ] **Step 1: Record the clean baseline**

  Run:

  ```sh
  git status --short --branch
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:unit
  ```

  Expected: the existing asset and unit suites pass; note any pre-existing failure before changing files.

- [ ] **Step 2: Add failing manifest and alpha-bound tests**

  Update `scripts/game-assets.test.mjs` to require one manifest record per final sprite with these fields:

  ```ts
  interface GameArtSourceRecord {
    theme: 'modern' | 'retro' | 'arcade';
    family: string;
    role: string;
    prompt: string;
    sourcePath: string;
    finalPath: string;
    targetSize: number;
    visibleBounds: { minFill: number; maxFill: number; safePadding: number };
    expectedOwner?: string;
    generatedAt: string;
    reviewedAt: string;
  }
  ```

  Add assertions for exactly 117 unique records, repository-relative paths, final-path parity with `GAME_VISUAL_PATHS`, square dimensions, alpha channel, transparent corners, safe padding, 72–80% visible fill, a dominant connected component, per-family dimension consistency, and the existing total PWA asset budget. Add a test proving an edge-touching synthetic fixture is rejected.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  ```

  Expected: FAIL because the current manifest describes 27 local sprite sheets and the current tests do not inspect decoded alpha pixels.

- [ ] **Step 3: Add the deterministic image dependency and shared helpers**

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm install --save-dev sharp
  ```

  Implement pure/exported helpers in `scripts/game-art-lib.mjs` to decode metadata and alpha, calculate visible bounds/fill/padding, count meaningful connected components, center visible pixels, resize without upscaling, and encode WebP. Keep ImageMagick out of the required path.

- [ ] **Step 4: Replace sheet extraction with one-source/one-output normalization**

  Rewrite `scripts/normalize-game-art.mjs` to accept `--all`, `--family <name>`, or `--asset <theme/family/role>`. For each manifest record, read its individual `sourcePath`, validate it, normalize it to `targetSize`, and write exactly its `finalPath`. Fail rather than silently repairing missing alpha, edge-touching silhouettes, extra objects, or dimension mismatches.

- [ ] **Step 5: Convert the manifest schema without claiming new art yet**

  Replace absolute machine paths, grid dimensions, crops, and sheet fields in `docs/design/game-art-sources.json` with the individual record schema. During this contract-only step, records may point at the current committed WebPs as temporary source/final pairs only if tests explicitly mark them `legacy: true`; Task 2 must eliminate that flag before acceptance.

  Update `docs/design/game-art-production.md` so it documents individual generation and the new authoring commands, not sprite-sheet extraction.

- [ ] **Step 6: Make the contract tests pass**

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:unit
  ```

  Expected: PASS. Do not weaken an image constraint to make existing art pass.

- [ ] **Step 7: Commit the contract**

  ```sh
  git add package.json package-lock.json docs/design/game-art-sources.json docs/design/game-art-production.md scripts/normalize-game-art.mjs scripts/game-art-lib.mjs scripts/game-assets.test.mjs src/game-visuals/catalog.test.ts
  git commit -m "test: enforce individual game art contract"
  ```

---

## Task 2: Generate and Normalize the Custom Sprite Families

**Files:**

- Create/replace: `docs/design/source-art/{modern,retro,arcade}/**/*.png`
- Replace: `assets/pieces/{modern,retro,arcade}/**/*.webp`
- Modify: `docs/design/game-art-sources.json`
- Modify: `docs/design/game-art-production.md`
- Modify: `docs/design/game-art-fidelity-ledger.md`
- Replace/create: `docs/design/qa/*.webp`
- Modify if ownership order changes: `src/game-visuals/catalog.ts`
- Modify if ownership order changes: `src/game-visuals/registry.ts`
- Modify: `scripts/game-assets.test.mjs`

**Interfaces:**

- Consumes: Task 1's manifest schema and image normalization/inspection helpers.
- Produces: 108 accepted custom WebP sprites, nine explicitly pending quarter slots, portable source provenance, and unchanged `GameVisuals` keys for all consuming screens.

- [ ] **Step 1: Freeze a per-role generation checklist**

  Enumerate the 36 generated roles per theme from `REQUIRED_FILES`: Tic-Tac-Toe (2), Connect Four (2), Checkers (3), Chinese Checkers (6), Mancala (6), Pop & Race (4), dice (6), and Hangman (7). Record one final prompt per role before generation. Prompts must repeat the approved theme material, exact semantic color, top/front camera, square canvas, genuine alpha, 72–80% fill, full silhouette, no text, no watermark, and no ground plane. Mark the three Coin Flip roles per theme as `authorityReferencePending` for Task 3 rather than sending them to image generation.

- [ ] **Step 2: Generate Modern assets individually**

  Use the image-generation tool once for each Modern role. View every result at original detail. Save accepted sources to the matching `docs/design/source-art/modern/...` path, record generation metadata, then normalize:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family tic-tac-toe
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family connect-four
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family checkers
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family chinese-checkers
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family mancala
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family trouble
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family dice
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node scripts/normalize-game-art.mjs --family hangman
  ```

  Do not generate the quarter as fantasy art; Task 3 handles it from an authoritative reference.

- [ ] **Step 3: Generate Retro assets individually**

  Repeat the per-role calls and inspection using painted wood, Bakelite-style discs, warm glass, natural stones, light wear, and the approved Retro semantic palette. Reject any asset whose wear obscures the outline or ownership color.

- [ ] **Step 4: Generate Arcade assets individually**

  Repeat using dark translucent plastic and restrained neon rims. Reject silhouettes that only read because of glow or disappear on a dark board.

- [ ] **Step 5: Verify stage progression and family consistency**

  Add Hangman-specific checks for stages 0–6: shared framing/base position, monotonic progression, distinct hashes/perceptual difference, and no rope/noose imagery in the recorded prompt. Add dimension/orientation variance limits within checker, marble, pawn, seed, die, and token families.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  ```

  Expected: PASS with no `legacy` records, 108 accepted generated records, exactly nine `authorityReferencePending` coin records, and 117 distinct current final assets. Task 10 must reject any remaining pending record.

- [ ] **Step 6: Build visual QA contact sheets from final WebPs**

  Generate light- and dark-background contact sheets using the normalization library, not hand-edited screenshots. Inspect them at original detail and update the fidelity ledger with accept/reject notes for every family/theme. Regenerate individual failures only.

- [ ] **Step 7: Verify app size before committing**

  Run:

  ```sh
  du -sh assets/pieces docs/design/source-art
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run build
  ```

  Expected: production art remains within the tested offline-cache budget; source art does not enter `dist`.

- [ ] **Step 8: Commit the sprite library**

  Stage only source art, final art, manifest, QA evidence, and any required catalog/registry mapping corrections.

  ```sh
  git commit -m "feat: replace game sprites with themed physical pieces"
  ```

---

## Task 3: Use a Faithful Quarter and Correct Checker Presentation

**Files:**

- Replace: `docs/design/source-art/{modern,retro,arcade}/coin-flip/{heads,tails,edge}.png`
- Replace: `assets/pieces/{modern,retro,arcade}/coin-flip/{heads,tails,edge}.webp`
- Modify: `docs/design/game-art-sources.json`
- Modify: `docs/design/game-art-production.md`
- Modify: `app/games/coin-flip.tsx`
- Modify: `app/games/checkers.tsx`
- Modify: `src/game-visuals/presentation.ts`
- Modify: `src/game-visuals/presentation.test.ts`
- Modify: `scripts/game-assets.test.mjs`

**Interfaces:**

- Consumes: Task 2's normalized checker assets and Task 1's provenance contract.
- Produces: canonical quarter mappings plus checker sizing/state rules consumed directly by the two game screens.

- [ ] **Step 1: Add failing quarter and checker presentation assertions**

  Add asset metadata assertions that all themes map Coin Flip to the same natural-silver quarter faces/edge and that provenance identifies an authoritative, appropriately reusable U.S. quarter reference rather than a generated fantasy coin. Add pure presentation tests that checker art occupies at most 80% of a cell and king/selection markers remain outside the bitmap layer.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/game-visuals/presentation.test.ts
  ```

  Expected: FAIL against the current abstract coins and unconstrained checker composition.

- [ ] **Step 2: Prepare the real quarter cutouts**

  Obtain authoritative heads, tails, and reeded-edge reference imagery, record the direct source URL, work title, license/public-domain status, retrieval date, and transformation. Use image editing only to isolate/clean the coin; do not synthesize inscriptions or portrait details. Store one canonical source set and map it into all three themes so the coin itself remains natural silver.

- [ ] **Step 3: Integrate theme-only lighting around the quarter**

  Keep `GamePieceImage` decorative and pointer-transparent. In `app/games/coin-flip.tsx`, preserve existing spin/lift, history, labels, and reduced-motion behavior; apply Modern/Retro/Arcade differences only through code-rendered shadow/glow surrounding the same quarter sprites.

- [ ] **Step 4: Simplify checker piece composition**

  In `app/games/checkers.tsx`, render a complete top-down disc at `cellSize * 0.78` or less. Place the crown/state glyph as a centered code-rendered overlay, keep the selected ring outside the sprite, retain owner text for non-color identification, and remove any clip/border radius that crops transparent pixels.

- [ ] **Step 5: Verify focused suites and commit**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:unit
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:assets
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "fix: use a faithful quarter and complete checker pieces"
  ```

---

## Task 4: Rebuild Mancala Stone Presentation

**Files:**

- Create: `src/game-visuals/mancalaPresentation.ts`
- Create: `src/game-visuals/mancalaPresentation.test.ts`
- Modify: `app/games/mancala.tsx`
- Modify: `src/game-visuals/presentation.ts`
- Modify: `src/game-visuals/presentation.test.ts`

**Interfaces:**

- Consumes: `GAME_VISUALS[themeName].mancala.seeds` and existing responsive pit geometry.
- Produces: `getMancalaStoneSlots(count, pitIndex)` for deterministic, capped stone placement.

- [ ] **Step 1: Add failing deterministic-cluster tests**

  Define and test:

  ```ts
  interface MancalaStoneSlot {
    seedIndex: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }

  getMancalaStoneSlots(count: number, pitIndex: number): readonly MancalaStoneSlot[]
  ```

  Required behavior: zero returns no slots, counts 1–12 return that many, counts above 12 return exactly 12, the same `(count, pitIndex)` is deterministic, different pit indices vary the arrangement, and all normalized coordinates keep the complete sprite within pit bounds.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/game-visuals/mancalaPresentation.test.ts
  ```

  Expected: FAIL because the helper does not exist.

- [ ] **Step 2: Implement the pure cluster helper**

  Use a small fixed set of safe normalized anchor positions plus a seeded permutation derived from `pitIndex`. Do not use `Math.random()` during render. Keep visible count capped at 12 and leave the exact count to the caller.

- [ ] **Step 3: Replace dot piles with actual seed sprites**

  Refactor `SeedArt` in `app/games/mancala.tsx` to render the theme's six seed assets using the helper slots. Use absolute, pointer-transparent images with stable keys; keep the pit itself as the single press target.

- [ ] **Step 4: Move exact counts beside pits and stores**

  Render a high-contrast badge in a reserved side gutter, not over the stone cluster. Ensure both stores and regular pits expose `accessibilityLabel` text with the exact count and remain tappable at phone size. Keep Rematch visible without horizontal scroll.

- [ ] **Step 5: Verify and commit**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/game-visuals/mancalaPresentation.test.ts src/game-visuals/presentation.test.ts
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "feat: render deterministic mancala stone clusters"
  ```

---

## Task 5: Expand Word Guess Board and Keyboard

**Files:**

- Modify: `src/utils/boardSizing.ts`
- Modify: `src/utils/layout.test.ts`
- Modify: `app/games/wordle.tsx`

**Interfaces:**

- Consumes: safe content dimensions from `useResponsive()` and the existing Wordle engine state.
- Produces: `calculateWordGuessLayout(...)` values for board, tile, keyboard, and key sizing.

- [ ] **Step 1: Add failing portrait layout regressions**

  Add pure layout cases for 390×844 and 390×664 that require the Word Guess board/keyboard width to consume the safe content width, keep five columns square, and avoid horizontal overflow. Include compact landscape coverage that remains height-bound.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/utils/layout.test.ts
  ```

  Expected: FAIL because the current caps/gutters preserve too much side margin.

- [ ] **Step 2: Extract or extend a pure Word Guess layout calculation**

  Add a board/keyboard sizing function to `src/utils/boardSizing.ts` that receives safe content width, available height, orientation, row/column counts, and key gaps. Return board width, tile size, keyboard width, and key height without reading global dimensions.

- [ ] **Step 3: Remove reserved toast space**

  In `app/games/wordle.tsx`, place transient feedback in an absolute, accessible overlay that does not change board geometry. Keep it clear of the header and keyboard and retain live-region behavior on web.

- [ ] **Step 4: Widen the board and keyboard**

  Use the full measured game width in portrait, raise the portrait board cap, reduce outer/key gaps, and increase key height while preserving compact landscape. Set Enter to the theme primary background with contrast-safe text and an explicit `Enter` label; keep Delete visually distinct.

- [ ] **Step 5: Verify keyboard and layout behavior**

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/utils/layout.test.ts src/engines/wordle.test.ts
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "fix: enlarge word guess board and keyboard"
  ```

---

## Task 6: Add Large Dots & Boxes Boards with Unambiguous Touch Input

**Files:**

- Create: `src/game-visuals/dotsAndBoxesInput.ts`
- Create: `src/game-visuals/dotsAndBoxesInput.test.ts`
- Modify: `src/engines/dots-and-boxes.test.ts`
- Modify: `app/games/dots-and-boxes.tsx`
- Modify: `src/utils/layout.test.ts`

**Interfaces:**

- Consumes: Dots & Boxes engine line arrays and the measured square board size.
- Produces: `resolveNearestOpenEdge(...)` for pointer input while preserving semantic per-edge controls.

- [ ] **Step 1: Add failing grid-size and pointer-resolution tests**

  Add engine creation/playthrough coverage for 8×8 and 10×10 dot grids. Define and test a pure resolver:

  ```ts
  type EdgeCandidate = { orientation: 'horizontal' | 'vertical'; row: number; col: number };

  resolveNearestOpenEdge(
    point: { x: number; y: number },
    boardSize: number,
    gridSize: number,
    occupied: ReadonlySet<string>,
  ): EdgeCandidate | null
  ```

  Tests must cover exact line taps, taps near a line, the intersection tie rule, already occupied nearest edges, outside-board taps, and deterministic behavior for 3×3, 8×8, and 10×10 boards.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/game-visuals/dotsAndBoxesInput.test.ts src/engines/dots-and-boxes.test.ts
  ```

  Expected: FAIL because the resolver and larger UI options do not exist.

- [ ] **Step 2: Implement nearest-edge pointer resolution**

  Resolve pointer/touch coordinates to the nearest eligible geometric edge within a maximum normalized tolerance. Do not create overlapping invisible pressables for dense grids. Keep one semantic per-edge control path for keyboard and assistive technology, but route pointer input through the board-level resolver.

- [ ] **Step 3: Add 8×8 and 10×10 selectors**

  Extend the existing size choices without changing engine rules. Reset safely when size changes, preserve current AI gating, and state the selected dot-grid size in accessible text.

- [ ] **Step 4: Maximize the usable board area**

  Keep portrait width near full safe-area width, reduce nonessential vertical reservations, and ensure the 390×664 board remains the largest square that fits. Keep lines visually thin even though pointer tolerance is larger. Do not reintroduce duplicate line-action rows below the board.

- [ ] **Step 5: Verify and commit**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/game-visuals/dotsAndBoxesInput.test.ts src/engines/dots-and-boxes.test.ts src/utils/layout.test.ts
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "feat: add large dots and boxes boards"
  ```

---

## Task 7: Add Named, Alternating Hangman Sessions

**Files:**

- Create: `src/engines/hangman-session.ts`
- Create: `src/engines/hangman-session.test.ts`
- Modify: `app/games/hangman.tsx`
- Modify: `src/components/ui/GameOverModal.tsx`
- Modify: `src/engines/hangman.test.ts`

**Interfaces:**

- Consumes: round-local `createGame()`/`guessLetter()` state and `GameOverModal`'s existing result shape.
- Produces: `HangmanSession`, `createHangmanSession()`, and `completeHangmanRound()` plus an optional modal primary-action label.

- [ ] **Step 1: Add failing session-state tests**

  Define and test:

  ```ts
  type HangmanPlayerId = 'player1' | 'player2';

  interface HangmanSession {
    names: Record<HangmanPlayerId, string>;
    setter: HangmanPlayerId;
    guesser: HangmanPlayerId;
    wins: Record<HangmanPlayerId, number>;
    round: number;
  }

  createHangmanSession(player1Name: string, player2Name: string): HangmanSession;
  completeHangmanRound(session: HangmanSession, guesserSolved: boolean): HangmanSession;
  ```

  Cover trimmed names, empty defaults, preservation of distinct Unicode display names, initial Player 1 setter/Player 2 guesser roles, named winner calculation, score increment, role swap, round increment, and three consecutive alternating rounds.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/engines/hangman-session.test.ts
  ```

  Expected: FAIL because session state does not exist.

- [ ] **Step 2: Implement the pure session reducer**

  Keep secret-word `GameState` round-local. Make role changes explicit in the session helper and return fresh immutable records. Names should be trimmed, length-limited for layout, and default independently to `Player 1`/`Player 2`.

- [ ] **Step 3: Add multiplayer name setup**

  Add a setup phase before first word entry with two labeled fields and a Start action. Retain names and cumulative wins until Home/session reset. Never store the secret word in the session object or display it during pass-device transitions.

- [ ] **Step 4: Replace hard-coded role text**

  Drive word-entry, pass-device, status, accessibility labels, result modal, and saved score records from `session.setter`, `session.guesser`, and `session.names`. Record the actual named round winner, not always Player 2.

- [ ] **Step 5: Continue with Next Round**

  Add an optional primary-action label to `GameOverModal` with `Rematch` as the backward-compatible default. Hangman passes `Next Round`; the action hides the modal, applies the completed session, clears only round-local state, swaps roles, and returns to word entry. Show cumulative wins in the modal and setup/status area.

- [ ] **Step 6: Verify three rounds and commit**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/engines/hangman-session.test.ts src/engines/hangman.test.ts src/utils/hangmanStages.test.ts
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "feat: add continuous named hangman sessions"
  ```

---

## Task 8: Replace Word Grid’s Local Dictionary with 12dicts

**Files:**

- Create: `vendor/wordlists/12dicts/3of6game.txt`
- Create: `vendor/wordlists/12dicts/README.md`
- Create: `scripts/build-boggle-dictionary.mjs`
- Create: `src/data/boggle-dictionary.generated.ts`
- Modify: `src/data/dictionary.ts`
- Modify: `src/engines/boggle.ts`
- Modify: `src/engines/boggle.test.ts`
- Modify: `app/games/boggle.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: vendored 12dicts `3of6game` text and existing Boggle board-trace rules.
- Produces: one generated `DICTIONARY` set and one engine submission path used by both typed and traced UI input.

- [ ] **Step 1: Add the `SEE` regressions before importing data**

  Add tests using a fixed board that prove:

  - traceable `SEE` is accepted;
  - untraceable `SEE` is rejected;
  - a tile cannot be reused to fake `SEE`;
  - submitting `SEE` twice scores only once;
  - UI submission delegates to the engine result instead of a screen-local set.

  Run:

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/engines/boggle.test.ts
  ```

  Expected: the engine-level trace may pass with the current shared set, but the new single-validation-path/source assertion fails because `app/games/boggle.tsx` still declares `FALLBACK_DICTIONARY`.

- [ ] **Step 2: Vendor and document 3of6game**

  Add the unmodified public-domain `3of6game` source and a README containing its official source URL, public-domain statement, upstream filename/version/date, retrieval date, and SHA-256. Do not fetch it during app build or runtime.

- [ ] **Step 3: Build a deterministic compact module**

  `scripts/build-boggle-dictionary.mjs` must normalize uppercase A–Z words, retain playable words of at least three letters, sort/dedupe deterministically, assert required sentinels including `SEE`, and write `src/data/boggle-dictionary.generated.ts`. Add `dictionary:boggle` and `dictionary:boggle:check` package scripts; the check command fails if regeneration changes tracked output.

- [ ] **Step 4: Remove the inline fallback and route through the engine**

  Delete `FALLBACK_DICTIONARY` and local validation from `app/games/boggle.tsx`. Export one shared dictionary from `src/data/dictionary.ts`, and use engine `submitWord`/validation for both typed and traced submissions. Preserve the three-letter rule, no tile reuse, duplicates, scoring, and multiplayer turn behavior.

- [ ] **Step 5: Verify dictionary integrity, app size, and offline behavior**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run dictionary:boggle:check
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && node --import tsx --test src/engines/boggle.test.ts
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run build
  ```

  Expected: generated output is clean, `SEE` regressions pass, and the dictionary is included locally without exceeding the PWA budget.

- [ ] **Step 6: Commit the dictionary correction**

  ```sh
  git add vendor/wordlists/12dicts scripts/build-boggle-dictionary.mjs src/data/boggle-dictionary.generated.ts src/data/dictionary.ts src/engines/boggle.ts src/engines/boggle.test.ts app/games/boggle.tsx package.json package-lock.json
  git commit -m "fix: use shared word game dictionary"
  ```

---

## Task 9: Integrate Theme Materials Without Baked Board UI

**Files:**

- Modify: `src/theme/materials.ts`
- Modify: `src/theme/types.ts`
- Modify: `src/game-visuals/presentation.ts`
- Modify: `src/game-visuals/presentation.test.ts`
- Modify as needed: `src/components/game-visuals/ThemedBoardSurface.tsx`
- Modify as needed: `app/games/{tic-tac-toe,connect-four,chinese-checkers,dice,trouble}.tsx`
- Modify as needed: `app/games/{boggle,wordle,dots-and-boxes}.tsx`

**Interfaces:**

- Consumes: Task 2's final sprites and existing `ThemeMaterials`/`ThemedBoardSurface` contracts.
- Produces: bounded board-surface tokens and unclipped sprite presentation without changing any engine interface.

- [ ] **Step 1: Add failing material/accessibility assertions**

  Test that Modern, Retro, and Arcade expose subtle board-surface tokens with bounded opacity/contrast, Arcade glow remains restrained, and no material token encodes text, grid geometry, or state. Add source assertions that generated images are decorative and semantic labels remain on their code-rendered controls.

- [ ] **Step 2: Apply shared material treatments**

  Use code-native color, border, inset, and restrained texture/gradient treatment in `ThemedBoardSurface`. Do not add a bitmap board screenshot. Update remaining sprite-consuming games only where sizing or clipping prevents the new assets from displaying at 72–80% of their cell.

- [ ] **Step 3: Confirm every game family in every theme**

  Exercise Tic-Tac-Toe, Connect Four, Chinese Checkers, Dice, and Pop & Race with new sprites. Confirm piece placement, ownership order, values/pips, focus, selection, winning state, and reduced motion are still visible independently of the bitmap.

- [ ] **Step 4: Verify and commit**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:unit
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run typecheck
  git commit -m "feat: refine themed board materials"
  ```

---

## Task 10: Browser QA, Offline Verification, and Release Gate

**Files:**

- Create/update: `docs/design/qa/game-art-refresh-*.png`
- Modify if defects are found: only the owning files from Tasks 1–9
- Modify: `docs/design/game-art-fidelity-ledger.md`

**Interfaces:**

- Consumes: all deliverables and focused tests from Tasks 1–9.
- Produces: complete automated/browser/offline evidence and a reviewed, release-ready local `master` state.

- [ ] **Step 1: Run the complete automated gate**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run verify:all
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run test:public
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run check:public
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run build:pages
  git status --short --branch
  ```

  Expected: all WSL, unit, asset, typecheck, production build, public-readiness, and Pages-base-path checks pass. The tree contains only intended QA evidence or is clean.

- [ ] **Step 2: Start a production preview**

  ```sh
  source /home/ghost/.nvm/nvm.sh && nvm use 22 >/dev/null && npm run preview
  ```

  Keep the server session running and record its local URL. Use Playwright CLI because no Browser plugin is available in this workspace.

- [ ] **Step 3: Verify all affected routes at required viewports**

  Test Modern, Retro, and Arcade at 390×844, 390×664, compact landscape, and desktop. Capture fresh screenshots after exercising:

  - Coin Flip heads, tails, edge/spin, history, and reduced motion;
  - normal and king Checkers pieces, selection, legal moves, and focus;
  - Mancala low, 12, and greater-than-12 pits/stores with side counts;
  - Word Guess full-width board/keyboard, Enter emphasis, toast overlay, and physical keys;
  - Dots & Boxes 3×3, 8×8, and 10×10 pointer/keyboard input;
  - two named Hangman players through at least three alternating rounds;
  - traceable and untraceable `SEE` in Word Grid;
  - the remaining sprite families with no clipping, opaque boxes, or ownership mismatch.

  For every viewport, evaluate that document scroll width does not exceed viewport width and every decoded image reports nonzero natural dimensions.

- [ ] **Step 4: Verify installed/offline PWA behavior**

  Load a fresh production build online once, wait for service-worker readiness, then switch the browser context offline and reload Coin Flip, Checkers, Mancala, Hangman, and Word Grid. Confirm local art, dictionary validation, and navigation still work with no failed asset requests.

- [ ] **Step 5: Correct defects in their owning task and rerun gates**

  For each defect, first add or tighten an automated regression where feasible. Do not patch screenshots, suppress console failures, or relax asset/layout budgets. Re-run the focused test, then Task 10 Step 1.

- [ ] **Step 6: Request code review**

  Use `superpowers:requesting-code-review` against the complete `master` diff. Resolve review findings with `superpowers:receiving-code-review`, rerun the complete automated gate, and refresh only screenshots affected by fixes.

- [ ] **Step 7: Commit final QA evidence**

  ```sh
  git add docs/design/qa docs/design/game-art-fidelity-ledger.md
  git commit -m "test: verify game art and gameplay refresh"
  ```

- [ ] **Step 8: Stop before external publication**

  Report the final commit list, test totals, build result, screenshot paths, offline result, remaining local `git status`, and `master` ahead/behind state. Do not push or deploy until the user explicitly authorizes that external action.
