# Theme-Aware Game Art System

**Status:** Approved visual direction; implementation pending

**Date:** 2026-09-26

**Application:** Table Games PWA (Expo / React Native Web)

## Intent

Refresh every game and utility so its board, pieces, tokens, progress graphics, and feedback feel playful and purpose-built for the selected theme. The three themes must share recognizable piece silhouettes and interaction patterns while expressing distinct materials:

- **Modern:** polished ceramic, soft polymer, dimensional tiles, restrained studio shadows.
- **Retro:** painted wood, glass marbles, felt, paper, carved edges, and light hand-crafted wear.
- **Arcade:** dark molded shells, translucent neon acrylic, pixel-inspired bevels, and controlled glow.

The result must remain a fast, accessible, offline-capable PWA. This is a visual-system change, not a rewrite of game rules.

## Approved References

These reference sheets define material, silhouette, lighting, edge treatment, and overall playfulness. They are art-direction references rather than UI screenshots to reproduce literally.

- [Modern reference](../../design/references/modern-game-art-direction.webp)
- [Retro reference](../../design/references/retro-game-art-direction.webp)
- [Arcade reference](../../design/references/arcade-game-art-direction.webp)

Production assets derived from these references must be isolated transparent cutouts, not crops that retain the reference-sheet background or neighboring objects. Coin artwork must use abstract crests rather than a human likeness. Hangman art must use the friendly construction/assembly concepts described below, not graphic execution imagery.

## Success Criteria

1. All fourteen routes have theme-aware board and piece treatment: Tic-Tac-Toe, Four in a Row, Checkers, Chinese Checkers, Mancala, Pop & Race, Dots & Boxes, Hangman, Word Search, Crossword, Word Grid, Word Guess, Coin Flip, and Dice.
2. Switching themes changes materials and finish without changing the meaning, size, or hit target of a game piece.
3. Hangman displays exactly seven coherent stages, from stage 0 through stage 6, with no skipped, duplicated, stale, or mismatched illustration.
4. Generated bitmap art is bundled locally through static `require()` mappings and works after installation and while offline.
5. Boards, labels, letters, values, focus states, and responsive geometry remain code-native and readable at desktop and phone widths.
6. Gameplay engines, persistence, scores, routing, and game modes retain existing behavior.
7. Motion adds feedback but never carries essential state; reduced-motion users receive immediate state changes.

## Design Principles

### One silhouette, three materials

An X remains the same chunky X, a pawn keeps the same outline, and a die retains the correct geometry across themes. Theme identity comes from surface, edge, shadow, palette, and restrained animation. This prevents theme switching from making a familiar game harder to scan.

### Generated objects, code-native systems

Use generated transparent art for tactile objects whose material is central to their appeal: tokens, checkers, marbles, seeds, pawns, coins, dice shells, crowns, and Hangman stages. Keep boards, grids, lines, selections, text, pips/numerals, focus rings, and responsive sizing in React Native styles/components. This provides authored character without sacrificing sharpness or adaptability.

### Playful, not noisy

Use a small number of strong material cues. Shadows, glows, textures, and celebration effects must not obscure cell boundaries or state. Arcade glow is tightly controlled; Retro wear is subtle; Modern highlights remain clean.

### State remains explicit

Color is never the sole signal. Existing accessible symbols and markers remain present. Selected, invalid, winning, king, found, and active-word states also use shape, outline, iconography, or text.

## Architecture

### Typed visual registry

Replace the narrow `THEME_TOKENS` mapping with one exhaustive `GAME_VISUALS` registry. It must be statically analyzable by Metro/Expo and contain only literal local `require()` calls.

Suggested shape:

```ts
type DiceKind = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
type HangmanStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface GameVisuals {
  ticTacToe: { x: ImageSourcePropType; o: ImageSourcePropType };
  connectFour: { player1: ImageSourcePropType; player2: ImageSourcePropType };
  checkers: {
    player1: ImageSourcePropType;
    player2: ImageSourcePropType;
    crown: ImageSourcePropType;
  };
  chineseCheckers: { marbles: readonly ImageSourcePropType[] };
  mancala: { seeds: readonly ImageSourcePropType[] };
  trouble: { pawns: readonly ImageSourcePropType[] };
  coinFlip: {
    heads: ImageSourcePropType;
    tails: ImageSourcePropType;
    edge: ImageSourcePropType;
  };
  dice: Record<DiceKind, ImageSourcePropType>;
  hangman: Record<HangmanStage, ImageSourcePropType>;
}

export const GAME_VISUALS: Record<ThemeName, GameVisuals> = { /* static requires */ };
```

Registry tests must fail if a theme, dice shell, Hangman stage, pawn set, seed set, or marble set is incomplete. Asset paths belong in this registry rather than inside screen components.

### Shared visual primitives

Create focused reusable components rather than duplicating theme logic in fourteen route files:

- `GamePieceImage`: consistent contain sizing, drop shadow, disabled treatment, accessibility hiding for decorative images, and optional pressed transform.
- `ThemedBoardSurface`: shared board depth, border, texture overlay, safe overflow, and responsive maximum size.
- `TactileCell`: raised/sunken/selected/winning cell states for grid games.
- `LetterTile`: shared letter/value rendering with variants for Crossword, Word Grid, and Word Guess.
- `SelectionTrail`: code-native line/cell overlay for Word Search and path-based word play.
- `PieceMotion`: brief drop, sow, flip, roll, placement, and victory transitions with reduced-motion fallback.
- `VictoryAccent`: small game-specific spark, ring, crown, or pulse; never a full-screen obstruction.

The components should consume the existing theme context and visual registry. They must not own game rules.

### Theme material tokens

Extend the theme model only where a reusable visual needs a semantic value that the existing palette cannot express cleanly. Prefer a compact `materials` group over one-off route constants, for example:

- board grain/texture image
- piece highlight and shadow strength
- cell bevel and inset depth
- glow color/intensity
- selection trail color
- celebration color

Do not encode layout sizes in theme files. Responsive layout remains shared.

## Asset Strategy

### Directory convention

```text
assets/pieces/
  modern/
    tic-tac-toe/
    connect-four/
    checkers/
    chinese-checkers/
    mancala/
    trouble/
    coin-flip/
    dice/
    hangman/
  retro/
    ...same categories...
  arcade/
    ...same categories...
```

File names describe function, not appearance: `player-1.webp`, `king-crown.webp`, `stage-0.webp`, `d20.webp`. Equivalent assets use equivalent names across themes.

### Production requirements

- Transparent WebP cutouts with clean alpha and no baked checkerboard/background.
- Consistent camera angle, visual center, padding, and nominal canvas within an asset family.
- No text, trademarks, signatures, watermarks, or human portraits.
- Dice shells contain no baked values; accessible values are code-rendered.
- Letter tiles contain no baked letters; characters are code-rendered.
- Assets are sized close to rendered requirements and optimized before commit. Avoid shipping full reference sheets in the application bundle.
- Source prompts and any manual crop/cleanup notes are documented with the asset batch.

### Reference-to-production process

Generate each theme as coordinated families so highlights and camera angles match. Extract or regenerate individual objects against transparent backgrounds, inspect alpha at light and dark backgrounds, normalize canvas bounds, convert to WebP, then register with static requires. Generated files must be copied into the repository before they are referenced by code.

## Theme Language

### Modern

- Base: `#FAFAFA`; primary blue `#1A56DB`; indigo `#6366F1`; player red `#DC2626`; success green `#059669`.
- Clean ceramic/polymer pieces with soft bevels, small contact shadows, and sparse highlights.
- Board surfaces use pale neutral layers and crisp, fine borders.
- Motion is short and physically plausible: settle, lift, and subtle spring.

### Retro

- Base parchment `#F5F0E8`; green `#4A7C59`; ochre `#8B6914`; terracotta `#C75B39`; blue `#2E6B8A`; walnut `#2C2416`.
- Painted wood, glass, felt, letterpress ink, and gently worn edges.
- Board surfaces may show restrained paper grain or wood tone without reducing contrast.
- Motion feels mechanical and tactile: clack, slide, flip, and bounce.

### Arcade

- Base `#0A0A1A`; board `#18182E`; pink `#FF2E8B`; cyan `#00E5FF`; lime `#BFFF00`; success green `#00FF88`.
- Dark shells with neon acrylic rims and limited pixel-step details.
- Glow stays within a small halo so grids and labels remain crisp.
- Motion uses snappy drops, scan pulses, and short energy bursts, with no endless ambient animation.

## Game-by-Game Treatment

### Tic-Tac-Toe

Use dimensional X/O cutouts and theme-specific cell materials. A placed piece settles into the cell. The winning three receive a restrained shared highlight or connecting sweep. Preserve button semantics and board labels.

### Four in a Row

Use tactile red/blue or theme-equivalent discs behind a code-native rack with visible holes and depth. A move drops from the top and settles once. Winning discs receive an outline/ring independent of color.

### Checkers

Use weighty pieces with a crown overlay for kings. The selected piece lifts slightly; legal destinations remain code-native. Keep square contrast and coordinate readability intact.

### Chinese Checkers

Use translucent marbles with consistent silhouettes and recessed code-native holes. Selection adds an outer ring, while a legal path or destination gets a short trail/pulse. Do not rely on marble color alone to identify active state.

### Mancala

Use a small coordinated pool of varied seed stones per theme and tactile code-native pits. Sowing animates as a short sequence or trail while the engine remains authoritative. Seed counts remain legible and available to assistive technology.

### Pop & Race

Use four themed pawn colors with consistent outlines, a clear track, and a tactile center popper/die area. The popper compresses and rebounds; the resulting die value remains code-rendered. Safe zones and home lanes retain shape/pattern distinctions.

### Dots & Boxes

Use theme-specific nodes and line strokes with code-native geometry. Claimed boxes gain a material fill plus owner mark. Keep unclaimed edges neutral and make the most recent edge detectable without color alone.

### Hangman

Provide three complete, friendly seven-stage progressions:

- Modern: a clean modular desk-toy frame and friendly character assembly.
- Retro: a wooden craft frame assembled in stages, ending with a smiling peg-doll mascot.
- Arcade: a neon gantry/hologram assembled in stages, ending with a cheerful robot/avatar.

Stage 0 is the empty/base setup. Stages 1–5 add one coherent structural or character element each. Stage 6 is the complete non-graphic scene. The illustration source is `GAME_VISUALS[theme].hangman[getHangmanStage(wrongGuesses)]`; no secondary offset or fallback stage calculation is allowed. Resetting or starting a new round must immediately return the image to stage 0.

### Word Search

Use crisp code-native letters on theme-specific cells. Drag/tap selections form a continuous themed trail with distinct start/end caps. Found words keep a quieter persistent finish so multiple paths remain readable.

### Crossword

Use tactile blank tiles with code-rendered clue numbers and letters. The active word has a gentle shared surface treatment; the focused cell has a stronger border. Correctness feedback must not replace focus/selection feedback.

### Word Grid

Use dimensional letter cubes with code-rendered characters. Selected cubes press in or lift depending on the theme, and the active path is visible. Ensure cubes do not crop at narrow widths.

### Word Guess

Use richer tactile letter tiles while preserving current correctness markers, labels, keyboard state, and accessible announcements. A reveal is brief and sequential only when motion is allowed.

### Coin Flip

Use matching heads, tails, and edge assets per theme. Modern uses abstract geometric/crest faces, Retro uses sun/star and laurel ornament, and Arcade uses pixel star/lightning power-up symbols. No human portraits. The result settles to a static, clearly labelled face; reduced motion skips the spin.

### Dice

Use themed blank shells for each supported type (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`). Render values/pips in code so results remain correct, selectable for contrast, and accessible. Roll movement is brief and ends at an unambiguous orientation/value display.

## App-Level Aesthetic Updates

- Retain the illustrated home-card artwork, but make frames, shadows, badges, pressed states, and section surfaces reflect the selected material theme.
- Keep utilities/tools as compact icon-and-name items consistent with game cards; do not turn them into full-width rows.
- Apply theme materials consistently to headers, modals, score rails, mode controls, and primary actions without replacing familiar navigation or layout.
- Keep the visual hierarchy calm: the board is primary, status is secondary, and controls are tertiary.
- Avoid gradients unless a small generated object naturally contains a material highlight; do not add large decorative gradients to app chrome.

## Interaction and Motion

- Press feedback: 80–140 ms.
- Placement/drop/sow/flip/roll feedback: generally 180–450 ms.
- Victory accents: at most one short pass; no looping celebration.
- Use transform and opacity where practical. Avoid JS-driven layout thrashing during play.
- Honor the platform reduced-motion preference. With reduced motion enabled, every state change is immediate and all information remains available.
- Haptics remain best-effort and must not be required to understand an action.

## Responsive Behavior

- Boards remain square or preserve their game-specific aspect ratio and use the existing responsive helpers.
- Minimum interactive target is 44 by 44 logical pixels where the game geometry permits; dense board cells remain operable through the entire cell.
- Generated pieces use `resizeMode="contain"` and normalized transparent padding to avoid clipping.
- On phone layouts, controls may wrap below the board; they must not shrink the board into illegibility or cause horizontal scrolling.
- Test at representative small-phone, large-phone/tablet, and desktop viewport sizes.

## Accessibility

- Preserve accessible names, roles, hints, live announcements, and keyboard/focus behavior.
- Decorative bitmap layers are hidden from accessibility APIs; the semantic cell/button remains the accessible element.
- Focus rings meet contrast requirements on every theme and are not obscured by glows or shadows.
- Player ownership, validity, result, selection, and victory use at least one non-color signal.
- Text and code-rendered values meet WCAG AA contrast against their actual surface.
- Hangman stages have concise state descriptions such as “2 of 6 incorrect guesses”; the illustration is not the only progress indicator.

## Performance and Offline Constraints

- All gameplay art ships locally and is reachable through literal static requires.
- No runtime image generation, remote asset fetch, or theme network dependency.
- Optimize WebP dimensions and quality for expected display density; do not bundle unused source canvases.
- Reuse images and memoize stable visual primitives where it avoids rerenders, but do not add memoization without a measured or obvious benefit.
- Avoid importing all screen implementations into the initial route. Maintain route-level loading behavior provided by Expo Router.
- Confirm the service worker/PWA build includes the new hashed assets and that an installed app can reopen representative games offline.

## Verification

### Automated checks

1. Existing unit tests remain green.
2. Expand Hangman progression tests to cover negative values, zero, every integer stage, overflow, fractional values, `NaN`, and reset/new-round behavior.
3. Add registry coverage tests for all themes, required games, dice types, exactly seven Hangman stages, and the required number of pawn/marble/seed variants.
4. Add focused component tests for visual-registry selection, king overlay, result/value layering, and reduced-motion fallback where the current test stack supports them.
5. Run type checking, linting, production web build, and any repository asset validation script.

### Visual QA

Use the available real-browser tooling; if the Browser plugin is unavailable, record that fact and use Playwright. Capture desktop and phone screenshots for all routes across all three themes. Review at minimum:

- transparent edges and unexpected background boxes;
- piece clipping and inconsistent scale;
- readability of letters, counts, values, and board boundaries;
- selected, focus, legal-move, winning, king, found, and result states;
- Hangman stages 0–6 in each theme;
- reduced motion and keyboard navigation;
- home cards and compact icon/name utility presentation;
- installed/offline PWA loading of newly added art.

Compare representative implemented screenshots directly with the approved references for material fidelity. Maintain a short fidelity ledger covering silhouette consistency, material cues, lighting/shadow, palette, and restrained effects.

## Delivery Sequence

1. Inventory current screens and codify the exhaustive registry contract.
2. Add failing registry and Hangman progression tests.
3. Generate, isolate, normalize, optimize, and register production assets theme by theme.
4. Build shared board/piece/tile/motion primitives.
5. Migrate the fourteen games in related groups, verifying behavior after each group.
6. Apply the shared material treatment to home cards and app-level surfaces.
7. Run automated checks and full visual/browser QA.
8. Verify the production PWA build and offline asset availability.

## Non-Goals

- Changing rules, AI difficulty, scoring, puzzle data, monetization, or navigation structure.
- Replacing responsive boards with fixed bitmap screenshots.
- Adding online dependencies or downloadable theme packs.
- Using visual effects as a substitute for semantic state or accessible text.
- Recreating the reference-sheet compositions inside a game screen.

## Open Implementation Decisions

These may be resolved in the implementation plan without changing the approved design:

- Exact production canvas dimensions per asset family after measuring rendered sizes.
- Whether a small material texture is an image overlay or a CSS/React Native style when both produce equivalent fidelity.
- The smallest useful number of mancala seed and marble variants after testing repetition at actual board scale.
- Whether motion uses the existing Animated API or a dependency already present in the project; no new animation dependency is assumed.
