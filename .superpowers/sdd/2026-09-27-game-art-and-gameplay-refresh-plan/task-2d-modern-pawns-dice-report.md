# Task 2D: Modern Pawns and Dice

Date: 2026-09-27
Branch: `master`
Runtime: Node 22.23.3

## Result

Generated, inspected, normalized and committed ten Modern assets: Pop & Race `pawn-1` through `pawn-4`, and dice `d4`, `d6`, `d8`, `d10`, `d12`, `d20`. All ten source files are copied byte-for-byte from accepted built-in outputs. No behavior code or asset validator changes were made.

## Generation provenance and exact prompts

Each accepted asset came from a separate built-in image-generation call using the verbatim frozen prompt below. Timestamps in the manifest are UTC conversions of the generated PNG file times; `reviewedAt` records the actual source inspection time. The stored source PNGs are under `docs/design/source-art/modern/`.

1. `trouble/pawn-1` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-ccdaabb5-d941-423c-b3f2-9144bec89cb3.png`; accepted retry 1. Initial candidate `.../exec-8edbc687-74e8-40b6-8638-9838e3b38df5.png` was rejected because the image was not surfaced for native inspection; no review is claimed for it. Retry suffix: none; the retry repeated the exact manifest prompt.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: pawn-1; owner: seat2; color: #1A56DB. Primary request: One classic rounded tabletop pawn: spherical head, tapering body, broad circular foot; upright and fully visible. Molded plastic with consistent proportions and camera elevation across all four seats. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

2. `trouble/pawn-2` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-99a8d8ee-395e-4643-9a84-9803b5c4e2ea.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: pawn-2; owner: seat1; color: #DC2626. Primary request: One classic rounded tabletop pawn: spherical head, tapering body, broad circular foot; upright and fully visible. Molded plastic with consistent proportions and camera elevation across all four seats. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

3. `trouble/pawn-3` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-54c23125-9fc4-4a00-bfb9-d9902187dad5.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: pawn-3; owner: seat3; color: #059669. Primary request: One classic rounded tabletop pawn: spherical head, tapering body, broad circular foot; upright and fully visible. Molded plastic with consistent proportions and camera elevation across all four seats. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

4. `trouble/pawn-4` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-2bd6b810-56a8-4293-b159-5ad210f82be3.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: pawn-4; owner: seat4; color: #92400E. Primary request: One classic rounded tabletop pawn: spherical head, tapering body, broad circular foot; upright and fully visible. Molded plastic with consistent proportions and camera elevation across all four seats. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

5. `dice/d4` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-48879a79-bf3b-4166-ba51-c7796a1bf754.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d4; owner: shared; color: #1A56DB. Primary request: One physically correct d4 die: tetrahedron with four triangular faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

6. `dice/d6` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-cb36921e-60e2-4697-9443-50769270a7c1.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d6; owner: shared; color: #1A56DB. Primary request: One physically correct d6 die: cube with six square faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

7. `dice/d8` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-7b776679-6069-4556-8bb8-04ec4fed0f57.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d8; owner: shared; color: #1A56DB. Primary request: One physically correct d8 die: octahedron with eight triangular faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

8. `dice/d10` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-313e0a76-e1b9-4ce2-8c58-cf9df762c7d2.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d10; owner: shared; color: #1A56DB. Primary request: One physically correct d10 die: pentagonal trapezohedron with ten kite-shaped faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

9. `dice/d12` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-1f98f048-39ef-4076-af9b-5218d67de846.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d12; owner: shared; color: #1A56DB. Primary request: One physically correct d12 die: dodecahedron with twelve pentagonal faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

10. `dice/d20` — output `/mnt/c/Users/miguel/.codex/generated_images/01a0e4aa-81a5-79e0-baa6-1dfe293240d9/exec-6d0b1d14-7065-4633-8102-02d603e58b36.png`.

   > Use case: product-mockup. Asset type: individual production game sprite. Theme: Modern molded plastic, polished resin, clear glass; clean tabletop product photography with controlled studio highlights. Role: d20; owner: shared; color: #1A56DB. Primary request: One physically correct d20 die: icosahedron with twenty triangular faces. Blank faces, no numbers, no letters, no symbols, no pips. Facet edges reveal the true geometry; front-facing facet remains unobstructed for code-rendered values. Camera: front three-quarter; fixed upper-left soft studio lighting. Composition: one centered object on a square canvas with genuine alpha transparent background including openings; 72–80% target fill along the longest visible bound, at least 10% safe alpha padding on every side, complete silhouette. Constraints: no text; no watermark; no ground plane; no decorative border; no baked interface; no external shadow or detached specks.

## Inspection and source metrics

`view_image` could not start because bubblewrap is unavailable. Each accepted original was instead displayed at its native 1254×1254 resolution immediately after its own built-in generation; raw PNG measurements were computed from the untouched outputs under Node 22. The contact sheets were also inspected inline at their actual dimensions, without cropping or resizing.

| Asset | Stored source | Detached faint alpha cleared in memory | Final WebP bytes |
| --- | --- | ---: | ---: |
| pawn-1 | `docs/design/source-art/modern/trouble/pawn-1.png` | 539 px | 5,298 |
| pawn-2 | `docs/design/source-art/modern/trouble/pawn-2.png` | 131 px | 5,308 |
| pawn-3 | `docs/design/source-art/modern/trouble/pawn-3.png` | 1,477 px | 5,068 |
| pawn-4 | `docs/design/source-art/modern/trouble/pawn-4.png` | 731 px | 5,198 |
| d4 | `docs/design/source-art/modern/dice/d4.png` | 1,978 px | 10,782 |
| d6 | `docs/design/source-art/modern/dice/d6.png` | 2,147 px | 10,810 |
| d8 | `docs/design/source-art/modern/dice/d8.png` | 908 px | 8,818 |
| d10 | `docs/design/source-art/modern/dice/d10.png` | 333 px | 10,204 |
| d12 | `docs/design/source-art/modern/dice/d12.png` | 4,699 px | 8,142 |
| d20 | `docs/design/source-art/modern/dice/d20.png` | 562 px | 11,634 |

All ten source files are genuine-alpha PNGs with one meaningful connected object. Original faint alpha residue touched some canvas edges; the existing preparer removed only detached sub-13/255 pixels in memory. All source silhouettes then passed no-edge-touch validation; no meaningful pixels were removed from stored PNGs. Every final has one meaningful component, transparent corners, no edge contact, 76.04% fill for pawns or 76.17% for dice, and at least 11.72% padding. The ten WebPs total 81,262 bytes; largest is 11,634 bytes.

## Contact sheets and verification

- Full-size light/dark, 5 columns × 2 rows, 256px cells: [light](../../../docs/design/qa/modern-pawns-dice-full-light.webp), [dark](../../../docs/design/qa/modern-pawns-dice-full-dark.webp).
- Phone light/dark, 5 columns × 2 rows, 64px cells: [light](../../../docs/design/qa/modern-pawns-dice-phone-light.webp), [dark](../../../docs/design/qa/modern-pawns-dice-phone-dark.webp).
- Contact-sheet order: pawn-1 through pawn-4, then d4, d6, d8, d10, d12, d20.
- `npm run test:assets`: 43/43 passed.
- `npm run test:unit`: 88/88 passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; web export and PWA build completed.
- All verification ran under Node 22.23.3. Exact-asset normalization completed for all ten paths.

## Scope, self-review, and concerns

Only the ten target manifest records were completed. Stage remains `generation-batches`; custom records now have 29 completed and 79 pending, and all nine coin-quarter authority records remain pending. No other manifest records or behavior code changed. The task does not claim a fresh browser gameplay audit. Self-review confirmed source PNGs were copied without modification, final outputs match catalog paths, every die face remains blank, and source/final bounds satisfy the unchanged alpha and byte rules. The first pawn-1 output remains only in the generator’s external output directory and is not used; this report does not claim it was inspected.
