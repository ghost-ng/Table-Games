# Production game artwork

Generated 2026-09-26 with the built-in image-generation tool, using the approved Modern, Retro, and Arcade art-direction references. The registry consumes only committed local WebP files. Source sheets are provenance, never application dependencies.

## Inventory

Each of Modern, Retro, and Arcade has **39 unique cutouts**, for **117 total**:

| Family | Files per theme | Canvas |
| --- | --- | --- |
| Tic-Tac-Toe | x, o | 256 × 256 |
| Connect Four | player-1, player-2 | 192 × 192 |
| Checkers | player-1, player-2, king-crown | 192 × 192 |
| Chinese Checkers | marble-1 through marble-6 | 128 × 128 |
| Mancala | seed-1 through seed-6 | 96 × 96 |
| Pop & Race | pawn-1 through pawn-4 | 192 × 192 |
| Coin Flip | heads, tails, edge | 256 × 256 |
| Dice | d4, d6, d8, d10, d12, d20 | 256 × 256 |
| Hangman | stage-0 through stage-6 | 384 × 384 |

Every filename ends in `.webp` and lives under `assets/pieces/{modern,retro,arcade}/{family}/`. All filenames, including exact directory names, are enumerated in `src/game-visuals/catalog.ts` and the source manifest.

## Prompts and provenance

[game-art-sources.json](game-art-sources.json) records all 27 generated PNG source paths, complete family prompts, grid dimensions, output names, target dimensions, hand-inspected crop overrides, and alpha-opening settings. The built-in tool generated each coordinated family sheet separately. No CLI/API fallback or external network image dependency was used.

The first Modern Tic-Tac-Toe prompt, whose manifest entry is abbreviated, was:

> Use case: stylized-concept. Production game sprite family for a polished modern tabletop game. Generate one transparent PNG sprite sheet, 1024x512, two equal 512x512 cells in a single row, NO grid lines. Left cell: one thick chunky rounded cobalt-blue ceramic X. Right cell: one thick chunky rounded red ceramic O ring. Match the polished dimensional ceramic and soft polymer art direction in the provided modern reference, but these are isolated production cutouts, NOT a reference scene. Camera directly front-facing with tiny visible beveled depth and soft studio highlights. Each object centered in its own cell, same visual height 360px, generous empty padding, no overlap. Genuine alpha transparent background everywhere, including inside the O hole. No ground plane, no baked background, no shadow beyond small contact shade, no letters other than the two requested game piece silhouettes, no watermarks. Save local PNG output for production extraction.

All other complete prompts are stored verbatim in the manifest. Source images were requested as genuine transparent PNGs; inspection confirmed RGBA with transparency. Generated dimensions vary from requested dimensions, so extraction reads actual source dimensions rather than assuming 1024 pixels.

## Normalization and cleanup

`scripts/normalize-game-art.mjs` is an optional authoring utility requiring Node and ImageMagick. Run it with the local source PNGs available:

```sh
node scripts/normalize-game-art.mjs
# Reprocess one family only:
node scripts/normalize-game-art.mjs hangman
```

The normalizer extracts the documented grid cells, cleans their alpha, scales their visible bounds to at most 82% of the nominal square canvas, centers them, and writes WebP with quality 86 and method 6. It preserves the generated color and original alpha underneath its cleanup mask. No background color, checkerboard, text, runtime numeral, or runtime letter is added.

The cleanup mask thresholds alpha at 5%, removes disconnected components below 40 source pixels (400 for Hangman), and multiplies this mask by the original alpha. Coin and Hangman masks additionally receive a six-pixel disk opening to remove narrow stray horizontal generation artifacts. The original alpha still supplies the retained edges and translucent material.

Coin sheets used uneven spacing; the manifest records exact fractional crop bounds for each face and edge. Hangman uses one shared vertical crop and equal-width columns for all seven stages of each theme. It deliberately does **not** trim or independently scale each stage, preserving consistent scene scale and base position while parts are added. Stage 0 is the empty platform, followed by posts, crossbar, head, torso, arms, and feet. Modern is a modular desk toy, Retro a wooden peg-doll craft frame, and Arcade a cheerful holographic robot portal. None has a rope or execution imagery.

## Visual acceptance

Each of the nine families in every theme was inspected at normalized dimensions on both `#f5f5f5` and `#101020` backgrounds. Contact sheets are retained under `docs/design/qa/`.

- Modern: polished ceramic/polymer, soft dimensional highlights, clean blue/red pieces.
- Retro: painted wood with restrained wear, glass marbles, natural stones, antique abstract coins.
- Arcade: dark molded shells, bright acrylic rims, restrained neon edges, readable silhouettes.
- All dice remain blank; runtime values and pips belong to code.
- Coin faces contain abstract sun/star and diamond/lightning crests, never human portraits.
- Within each family, output dimensions and orientation are consistent, with transparent padding and no clipped silhouettes.
- The 21 Hangman files are visually distinct and ordered from empty base through complete friendly character.
- Marbles, pawns, and seeds preserve their separate color/material variants.
- No opaque background boxes or baked checkerboard appeared on either inspection background.

Inspection caught and corrected a compositing-mode carryover during normalization, uneven coin-sheet spacing, excess Hangman whitespace, and small generation specks. The accepted production outputs were inspected after correction.

## Contract and verification

`types.ts` owns `GameVisuals`; material tokens remain outside this task. The pure catalog exports readonly theme/dice/stage/file tuples and structured relative paths without loading bitmap modules. `registry.ts` contains 117 literal local require calls and an exhaustive theme map, with `getGameVisuals(themeName)` returning the selected entry.

`npm run test:assets` checks all required files, nonempty WebP signatures, theme-directory containment after resolving symlinks, per-theme distinctness, literal require syntax, registry/catalog parity, and theme selection. Catalog tests check exact family and variant coverage. Hangman tests cover stages 0–6, fractions, negative values, both infinities, overflow, NaN, and fresh/rematch state returning to stage zero.

Route consumption, browser gameplay checks, and installed-PWA offline verification follow in the later migration tasks; this task supplies their complete local asset contract.
