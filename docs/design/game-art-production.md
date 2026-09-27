# Production game artwork

The application loads 117 committed local WebP sprites: 39 per theme across Modern, Retro, and Arcade. Individual source images and authoring dependencies never become runtime dependencies. The inventory in `src/game-visuals/catalog.ts` remains the source of truth for final paths.

## Inventory

| Family | Files per theme | Square canvas |
| --- | --- | --- |
| Tic-Tac-Toe | x, o | 256 px |
| Connect Four | player-1, player-2 | 192 px |
| Checkers | player-1, player-2, king-crown | 192 px |
| Chinese Checkers | marble-1 through marble-6 | 128 px |
| Mancala | seed-1 through seed-6 | 96 px |
| Pop & Race | pawn-1 through pawn-4 | 192 px |
| Coin Flip | heads, tails, edge | 256 px |
| Dice | d4, d6, d8, d10, d12, d20 | 256 px |
| Hangman | stage-0 through stage-6 | 384 px |

Final paths are `assets/pieces/{theme}/{family}/{role}.webp`; all nine family directory names and variant filenames are enumerated by `REQUIRED_FILES`. Each family shares the same target dimension across themes.

## Portable individual-source manifest

[game-art-sources.json](game-art-sources.json) uses an envelope with `schemaVersion: 1`, a migration `stage`, and 117 individual `records`. Every record contains:

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

Paths are portable, repository-relative paths with forward slashes. Absolute machine paths, parent traversal, grid dimensions, crops, and sheet-extraction fields are rejected. Individual accepted source paths differ from their final WebP paths. Store new source PNGs under `docs/design/source-art/{theme}/{family}/{role}.png`. Record the exact final generation prompt and real generation/inspection dates; visual inspection establishes semantic accuracy that decoded alpha alone cannot prove.

The manifest currently has `stage: "contract-only"` and 117 `legacy: true` records whose source/final paths point to the existing committed sprites. Their prompts and dates describe historical generation and inspection on 2026-09-26. They are explicit migration placeholders, not newly generated or newly accepted artwork. This task generates no art and changes no production bitmap.

Migration stages are enforced structurally by `validateManifest()`:

| Stage | Allowed temporary records | Acceptance |
| --- | --- | --- |
| `contract-only` | `legacy: true`; pending coin authority references | Task 1 contract migration only |
| `individual-assets` | `authorityReferencePending: true` only for Coin Flip | Task 2 must remove the `legacy` property from every record and advance to this stage; its nine coin slots await Task 3 |
| `accepted` | None | Final acceptance must advance to this stage; any legacy property or pending reference fails |

Do not replace `legacy: true` with `legacy: false`; remove the property and provide an actual individual source. Pending and legacy flags cannot coexist. Strict composition checks apply to every migrated record. Temporary placeholders still undergo square-dimension, genuine-alpha, transparent-corner, unclipped-edge, path, distinctness, registry, and byte-budget checks.

## Individual generation and normalization

Generate one object or stage per source image, on a square canvas with genuine alpha. Prompts should specify the approved theme material, semantic owner/color, consistent camera and lighting, a complete silhouette, no text/watermark/ground plane, and a longest visible bound occupying 72–80% of the canvas. Dice faces remain blank so the application can render values. Hangman stages share scene framing and base placement; visual QA must confirm progression and reject rope/noose imagery. Quarter faces and edge use authoritative reference imagery in Task 3.

The authoring tools require Node 22 and the locked `sharp` development dependency, installed through npm. ImageMagick is not required. Select exactly one authoring mode:

```sh
node scripts/normalize-game-art.mjs --all
node scripts/normalize-game-art.mjs --family checkers
node scripts/normalize-game-art.mjs --asset modern/checkers/player-1
```

Every selected record reads exactly one `sourcePath` and writes exactly its `finalPath`. Missing files, absent alpha, non-square images, edge-touching silhouettes (including faint alpha), opaque corners, unsafe padding, wrong fill, and extra meaningful objects fail before any output is replaced. Legacy and pending records cannot be normalized. The CLI validates every selected source before writing output files.

`readImageMetrics(input)` accepts a file path or encoded buffer and returns decoded dimensions, original `hasAlpha`, format, visible bounds, fill, per-side padding, corner/edge checks, visible-pixel count, and connected-component metrics. Geometry includes every nonzero alpha pixel. Connectivity uses alpha at least 13/255 (approximately 5%), eight-neighbor connectivity, and a meaningful component threshold of the greater of four pixels or 1% of connected foreground. Valid art requires one meaningful component containing at least 95% of the connected foreground.

`assertImageMetrics(metrics, record)` enforces the record's square target dimension, alpha requirements, at least 10% transparent padding on every side, and 72–80% longest-bound fill. Fill is the maximum of visible width/canvas width and visible height/canvas height, not opaque pixel area; thin quarter edges and wide Hangman platforms therefore retain sensible framing. The manifest's bounds are fixed at `{ minFill: 0.72, maxFill: 0.80, safePadding: 0.10 }` and cannot be weakened to make an image pass.

`normalizeGameArtAsset(record, { root, write = true })` validates the source, crops only its empty border, scales visible pixels down toward 76% of the target canvas, and centers them. It never upscales, removes objects, fabricates alpha, or repairs clipped art. The final WebP uses quality 86, alpha quality 100, and effort 6, then is decoded and revalidated before writing. Too-small sources fail if they cannot meet minimum fill without upscaling. It returns `{ data, metrics, finalPath }`; `write: false` allows a no-write preflight. Repeat runs with the same sources and locked image-tool versions produce identical bytes.

`createContactSheet(inputs, { root, columns = 6, cellSize = 160, background = '#f5f5f5', outputPath })` accepts manifest records, relative image paths, or image buffers in display order. It returns a lossless WebP buffer and optionally writes a repository-relative QA path. Produce both `#f5f5f5` and `#101020` backgrounds, inspect at original size, and retain QA outputs under `docs/design/qa/`. Contact sheets are inspection artifacts, not generation sources.

## Semantic ownership

The existing Modern Connect Four and Checkers `player-2.webp` sprites map to semantic `player1` (red), and `player-1.webp` maps to `player2` (blue). Modern race `pawn-2.webp` is `seat1`, `pawn-1.webp` is `seat2`, and seats 3/4 retain their numbered files. The manifest records these actual semantic identities in `expectedOwner`; do not infer ownership from numbered legacy filenames. Catalog ownership assertions and exact static-registry parity preserve the current application mapping during migration.

## Verification and production byte budget

```sh
npm run test:assets
npm run test:unit
npm run verify
```

The asset suite checks 117 unique manifest records and final-path parity with the catalog, portable schema and migration stages, required variant coverage, WebP signatures, resolved theme containment, per-theme distinctness, decoded alpha/dimensions, family dimensions, literal Metro require paths, and registry selection. Synthetic fixtures cover edge clipping, invalid transparency, unsafe framing, extra components, deterministic normalization, no upscaling, and contact-sheet backgrounds.

`MAX_GAME_ART_BYTES = 2 * 1024 * 1024` limits the 117 registered nested theme sprites to 2 MiB total; `MAX_GAME_ART_FILE_BYTES = 64 * 1024` limits each final WebP to 64 KiB. The registered baseline is 759,902 bytes total with a 17,732-byte maximum. Source PNGs, QA images, and unrelated top-level legacy assets are outside this production-art allowance and are not added to the application's offline precache by this contract. Build/PWA verification remains responsible for application-wide cache contents and excluding authoring sources from `dist`.
