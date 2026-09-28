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
  expectedColor?: string; // Exact hexadecimal color named in the production prompt.
  generatedAt: string | null; // Null while generation/reference acquisition is pending.
  reviewedAt: string | null;
  generationPending?: true;
  authorityReferencePending?: true;
}
```

Paths are portable, repository-relative paths with forward slashes. Absolute machine paths, parent traversal, grid dimensions, crops, and sheet-extraction fields are rejected. Individual accepted source paths differ from their final WebP paths. Store new source PNGs under `docs/design/source-art/{theme}/{family}/{role}.png`. Record the exact final generation prompt and real generation/inspection dates; visual inspection establishes semantic accuracy that decoded alpha alone cannot prove.

Task 2A sets `stage: "generation-batches"` with 108 `generationPending: true` custom sprites and nine `authorityReferencePending: true` quarter slots. All source paths now point to distinct planned PNGs under `docs/design/source-art/`. All generation and inspection dates are `null`: the prompts are frozen instructions, not claims that generation or visual review has occurred. Existing final WebPs remain unchanged until each production batch supplies and inspects its replacement. There are no `legacy` records.

Migration stages are enforced structurally by `validateManifest()`:

| Stage | Allowed temporary records | Acceptance |
| --- | --- | --- |
| `contract-only` | `legacy: true`; pending coin authority references | Task 1 contract migration only |
| `generation-batches` | `generationPending: true` for custom sprites; `authorityReferencePending: true` for quarters | Task 2 batches only; completed records coexist with pending roles |
| `individual-assets` | `authorityReferencePending: true` only for Coin Flip | All 108 custom sources generated, inspected, and normalized; nine coin slots await Task 3 |
| `accepted` | None | Final acceptance must advance to this stage; any legacy property or pending reference fails |

Do not replace status flags with `false`; remove the property when the real source has been generated and inspected, then record its actual generation and review dates. Migration flags cannot coexist. Pending records require both dates to be `null`; completed records require real dates. `generationPending` cannot survive `individual-assets` or `accepted`. Strict composition checks apply to completed replacements. Pending placeholders still undergo square-dimension, genuine-alpha, transparent-corner, unclipped-edge, path, distinctness, registry, and byte-budget checks. Duplicate source paths and physical source aliases are rejected, so one image cannot stand in for multiple roles.

## Individual generation and normalization

Generate one object or stage per source image, on a square canvas with genuine alpha. Prompts should specify the approved theme material, semantic owner/color, consistent camera and lighting, a complete silhouette, no text/watermark/ground plane, and a longest visible bound occupying 72–80% of the canvas. Dice faces remain blank so the application can render values. Hangman stages share scene framing and base placement; visual QA must confirm progression and reject rope/noose imagery. Quarter faces and edge use authoritative reference imagery in Task 3.

The authoring tools require Node 22 and the locked `sharp` development dependency, installed through npm. ImageMagick is not required. Select exactly one authoring mode:

```sh
node scripts/normalize-game-art.mjs --all
node scripts/normalize-game-art.mjs --family checkers
node scripts/normalize-game-art.mjs --asset modern/checkers/player-1
```

Checkerboard-to-alpha recovery is a separate, explicit preparation step for a
built-in PNG that visibly flattened transparency into a regular matte:

```sh
node scripts/recover-checkerboard-alpha.mjs --input /path/to/raw.png --output /path/to/recovered.png
```

Use recovery only when the CLI verifies two strongly covered neutral tones,
regular horizontal/vertical cell scale, exterior grid phase, and border safety.
Enclosed matte is removed only when it continues that verified grid or is a
large, palette-balanced region with the same cell scale and at least 90% local
checker periodicity. Solid or gradient backgrounds, colorful patterns,
non-periodic neutral regions, foreground edge contact, and implicit processing
of already-transparent inputs are refused. Inputs are limited to 4096 pixels per
dimension, four million pixels total, and a 64-pixel inferred checker cell. The
tool removes only phase- and periodicity-verified matte pixels. Boundary
antialiasing is unmatted only when the verified checker phase and a stable,
nearby opaque foreground seed produce a consistent least-squares alpha and
decontaminated foreground color. The established source sanitizer may then
discard detached alpha below 13/255, but connected or meaningful edge contact
still refuses. Recovery does not replace normal source inspection or final
alpha, framing, component, budget, and Hangman group checks, and is never
invoked automatically by the normalizer. The output path must not already
exist; creation is exclusive so a concurrent file cannot be overwritten. Keep
the raw built-in output path and SHA-256 in the ignored generation report,
inspect recovered light/dark and phone previews, then copy only an accepted
recovered PNG to its manifest `sourcePath`.

Each output is derived from its own individual `sourcePath` and writes exactly its `finalPath`; Hangman also reads its six sibling sources to establish the shared framing. Missing files, absent alpha, non-square images, meaningful clipped content, and extra meaningful objects fail before any output is replaced. Non-Hangman source preparation removes only detached sub-5% alpha residue in memory; connected antialiasing remains intact. Strict final WebP validation still rejects every nonzero-alpha edge contact, opaque corners, unsafe padding, wrong fill, and extra meaningful objects. Legacy, generation-pending, and authority-pending records cannot be normalized. The CLI preflights every selected source and final output before writing output files.

`readImageMetrics(input)` accepts a file path or encoded buffer and returns decoded dimensions, original `hasAlpha`, format, visible bounds, fill, per-side padding, corner/edge checks, visible-pixel count, and connected-component metrics. Geometry includes every nonzero alpha pixel. Connectivity uses alpha at least 13/255 (approximately 5%), eight-neighbor connectivity, and a meaningful component threshold of the greater of four pixels or 1% of connected foreground. Valid art requires one meaningful component containing at least 95% of the connected foreground.

`assertImageMetrics(metrics, record)` enforces the record's square target dimension, alpha requirements, at least 10% transparent padding on every side, and 72–80% longest-bound fill. Fill is the maximum of visible width/canvas width and visible height/canvas height, not opaque pixel area; thin quarter edges and wide Hangman platforms therefore retain sensible framing. The manifest's bounds are fixed at `{ minFill: 0.72, maxFill: 0.80, safePadding: 0.10 }` and cannot be weakened to make an image pass.

`normalizeGameArtAsset(record, { root, write = true })` handles non-Hangman families, prepares the source without changing its file, crops empty borders, scales visible pixels down toward 76% of the target canvas, and centers them. It never upscales, removes meaningful objects, fabricates a missing alpha channel, or repairs clipped art. Oversized or off-center source framing can be normalized when the complete source silhouette is intact. The final WebP uses quality 86, alpha quality 100, and effort 6, then is decoded and revalidated against the unchanged strict contract before writing. Too-small sources fail if they cannot meet minimum fill without upscaling. It returns `{ data, metrics, finalPath }`; `write: false` allows a no-write preflight. Repeat runs with the same sources and locked image-tool versions produce identical bytes.

Task 2B exposed faint detached alpha in built-in PNGs, which the original source preflight incorrectly treated as clipped production art. `prepareGameArtSource(input)` first requires square genuine-alpha art with one meaningful component containing at least 95% of foreground at alpha >=13/255. Every pixel at that threshold is preserved and must be clear of the canvas edge. An eight-neighbor flood through nonzero alpha preserves all connected antialiasing; only unconnected pixels below 13/255 are cleared in memory. Connected faint bridges reaching an edge still fail. The helper returns `{ input, metrics, removedPixels }`; original source PNGs remain byte-identical. `readImageMetrics`, strict final assertions, and Hangman group framing are unchanged. Synthetic regressions cover residue cleanup, antialias preservation, meaningful edge/secondary-object rejection, deterministic output, source preservation, and no upscaling.

Hangman must use `normalizeHangmanGroup(records, { root, write = true })`, which requires all seven inspected sources for one theme. It derives one union crop from every alpha bound, one shared scale, and one shared lower base anchor at `targetSize - floor(targetSize * 0.12)`. All seven images receive that same transform; independent centering is rejected. Source canvases must match and their base bottoms must agree within one source pixel. The frozen stage prompts keep a 778px-wide platform centered at x=512 with bottom y=901 on a 1024px canvas. Sources with inconsistent framing must be regenerated rather than independently repositioned. The helper returns `{ results, transform }` and preflights the complete group before writing any result.

During incomplete theme work, use exact-asset selection. For Hangman, `--asset modern/hangman/stage-0` reads all seven Modern stages to derive the shared transform but writes only stage 0. It rejects missing or still-pending sibling sources. Repeat exact selections for the remaining stages after all seven are inspected. Run `--family hangman` only when all three themes are ready; use other family-wide selectors only once every selected source exists and its pending flag has been removed.

The production prompt inventory is the manifest itself: each custom role names its theme materials, exact semantic owner and hexadecimal color, fixed camera and light, square genuine-alpha canvas, 72–80% longest-bound fill, complete silhouette, and the no-text/no-watermark/no-ground-plane constraints. `validateProductionPrompt` checks these invariants, rejects sheet or multi-object instructions, requires blank dice and individual Mancala stones, and keeps Hangman instructions to friendly assembly. It is a text-contract check; original-detail visual inspection remains mandatory after each actual generation. No images are generated in Task 2A.

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
