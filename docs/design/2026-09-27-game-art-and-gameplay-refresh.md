# Game art and gameplay refresh

Status: approved design, ready for implementation planning  
Date: 2026-09-27

## Purpose

Refresh the Table Games PWA so its pieces read immediately as familiar physical game objects, remain playful in all three themes, and never appear clipped, abstract, or awkwardly overlaid. The refresh also resolves the gameplay and responsive-layout issues discovered while reviewing the current public build.

Success means a player can identify every piece without explanation, every board remains directly tappable, important state is never encoded only in artwork, and the installed PWA continues to work offline.

## Product goals

- Replace weak board-game artwork with individually generated, transparent production sprites.
- Preserve recognizable real-world silhouettes across Modern, Retro, and Arcade.
- Keep boards responsive and code-rendered; generated images provide pieces and subtle materials, not baked controls or game state.
- Prevent cropped, edge-touching, duplicated, or opaque-background sprites through automated validation.
- Correct Coin Flip, Checkers, and Mancala using the specific treatments below.
- Include the reported Word Guess, Dots & Boxes, Hangman, and Word Grid improvements in the same verified release.

## Non-goals

- No runtime image generation or network dependency.
- No replacement of semantic text, numbers, pips, scores, focus rings, or hit targets with bitmap text.
- No baked screenshots of complete game boards.
- No change to established game rules unless explicitly described in this document.
- No continuously looping decorative animation.

## Visual system

All themes share the same recognizable object shapes. A checker remains a checker, a race pawn remains a pawn, and a die retains its correct geometry. Themes change material, palette, lighting, and restrained surface detail rather than changing the object's identity.

### Modern

Clean tabletop product photography: molded plastic, polished resin, clear glass, controlled studio highlights, and short soft shadows.

### Retro

Familiar vintage game materials: painted wood, Bakelite-style discs, warm glass marbles, metal accents, and light wear that does not obscure the silhouette.

### Arcade

The same silhouettes in dark translucent plastic with restrained neon rims. Glow is an accent, not the object boundary, and must remain readable on dark backgrounds.

### Shared composition rules

- Transparent background with no checkerboard, ground plane, frame, text, watermark, or baked UI.
- Object centered on a square canvas with its complete silhouette visible.
- Visible bounds target 72-80% of the canvas and must leave safe alpha padding on every side.
- Camera angle, scale, and light direction remain consistent within each family.
- Player colors follow semantic ownership in the registry and on-screen legends.
- Generated textures are subtle overlays only and contain no grid lines or fake controls.

## Asset-generation and normalization pipeline

Use the built-in image-generation workflow. Each distinct production sprite is generated separately rather than extracted from a multi-object sheet. Prompts use the `product-mockup` or `stylized-concept` taxonomy as appropriate and explicitly require genuine transparency, complete silhouettes, consistent framing, no text, and no watermark.

Each generated source is inspected before normalization. Accepted sources are copied into the repository, normalized to the family's target square, centered by visible alpha bounds, and exported as WebP. The manifest records:

- family, role, and theme;
- final prompt;
- source and final paths;
- target dimensions;
- visible-bound and padding requirements;
- expected ownership color;
- generation and review date.

The application references committed local assets through literal registry entries. A missing or invalid asset fails tests and the production build; the app never fetches a fallback image at runtime.

### Automated asset constraints

- Valid WebP signature and nonzero dimensions.
- Required alpha channel with transparent corners.
- Visible pixels do not touch the outer safe-margin boundary.
- One connected primary object; small generation specks are rejected.
- Expected files are distinct and correctly mapped to their theme and owner.
- Family dimensions and orientation are consistent.
- Hangman stages are visually distinct and ordered.
- Asset and total PWA size remain within the established offline cache budget.

## Game-specific art integration

### Coin Flip

Use a faithful U.S. Washington quarter for heads, tails, and its ridged edge. The quarter stays natural silver in every theme; only the surrounding code-rendered shadow or glow changes. Accuracy takes priority over generative styling: official or otherwise appropriately licensed reference imagery may be used so the portrait, eagle reverse, inscriptions, and edge are not hallucinated. The current lift, rotation, reduced-motion behavior, result history, and accessibility labels remain.

### Checkers

Use complete, centered, top-down checker discs with realistic ridged edges and clear player colors. Kings receive a centered treatment that cannot obscure or clip the base piece. Pieces occupy at most 80% of a cell, while selection rings, legal destinations, ownership, and keyboard focus remain code-rendered outside the sprite.

### Mancala

Use recognizable individual stones or seeds with several shape and color variants per theme. A pit renders a deterministic cluster capped at 12 visible stones for clarity and performance. The exact seed count appears in a high-contrast code-rendered badge beside the pit, never on top of the stones. Stores use the same rule and preserve direct tap targets and accessible count labels.

### Other piece families

- Connect Four uses molded discs with complete circular silhouettes.
- Chinese Checkers uses consistent glass or acrylic marbles with six readable ownership colors.
- Pop & Race uses classic rounded tabletop pawns with four readable ownership colors.
- Tic-Tac-Toe uses tactile X and O tokens with unobstructed interior negative space.
- Dice use correct d4, d6, d8, d10, d12, and d20 geometry; values and pips remain code-rendered.
- Hangman retains a friendly non-execution concept, with seven coherent and unmistakably progressive stages.

### Code-rendered board families

Dots & Boxes and the word games keep responsive code-rendered lines, dots, cells, letters, trails, and state markers. Generated material textures may enrich their surfaces but remain quiet enough for text, focus, ownership, and touch targets to dominate.

## Reported gameplay and layout corrections

### Word Guess

- Raise the portrait board cap and use the full safe-area game width.
- Remove permanently reserved empty toast space by using a non-layout-shifting message overlay.
- Expand the keyboard to the full game width with larger keys and compact gaps.
- Give Enter the theme primary color with high-contrast text; Delete remains visually separate.
- Preserve compact side-by-side landscape behavior and physical-keyboard support.

### Dots & Boxes

- Keep the existing near-full-width responsive board and remove unnecessary vertical reservations.
- Add 8x8 and 10x10 dot-grid choices alongside the existing sizes.
- Preserve minimum direct-tap targets by separating visual line thickness from an invisible hit zone.
- Keep duplicate line-action rows removed.

### Hangman multiplayer

- Add a setup phase for two trimmed custom player names, with Player 1 and Player 2 as empty-field defaults.
- Track setter and guesser roles independently from engine state.
- After each result, show the named winner, cumulative wins, and a Next Round action.
- Swap setter and guesser every round, then return to secret-word entry instead of ending the session.
- Preserve names and running score until Home or an explicit session reset.
- Record each completed round using the active player's custom name.

### Word Grid dictionary

- Remove the screen-local fallback dictionary that currently omits common words such as `SEE`.
- Route UI validation through the shared Boggle engine and a single offline dictionary.
- Build the shared list from the public-domain 12dicts `3of6game` source, filtered to playable alphabetic words and committed with attribution.
- Preserve the minimum three-letter rule, board tracing, no tile reuse, duplicate-word rejection, and scoring.

## State, accessibility, and motion

Artwork is decorative. Buttons and cells retain semantic roles, labels, disabled state, selected or pressed state, and web focus rings. Ownership, kings, legal moves, found words, remaining guesses, seed counts, die values, and results always have a non-color text or shape signal.

Generated sprites never intercept pointer events. Theme changes update only presentation and do not reset active games. Reduced-motion users receive the same final state immediately without lift, spin, drop, or reveal motion.

## Responsive behavior

Boards use the shared measured-area sizing utilities. Portrait phones prioritize safe-area width; compact landscape remains height-bound; tablet and desktop retain comfortable caps. No screen may create horizontal document overflow. Control rows must not reintroduce board-mapping buttons below directly tappable boards.

Mancala may remain height-bound in portrait because of its board aspect ratio, but its pits, side count badges, and Rematch control must remain visible and tappable without horizontal scrolling.

## Verification

### Automated

- Unit tests for game logic and new Hangman session-role transitions.
- Regression tests showing `SEE` is accepted when traceable, rejected when untraceable, and scored only once.
- Responsive calculation tests for Word Guess and larger Dots & Boxes grids.
- Asset signature, transparency, alpha-bound, distinctness, mapping, dimension, and size-budget tests.
- TypeScript, complete application tests, WSL script tests, public-readiness checks, and production PWA export.

### Browser

Exercise every affected route in Modern, Retro, and Arcade at 390x844, 390x664, compact landscape, and desktop. Verify:

- complete sprites with no clipping or opaque boxes;
- direct board interaction, focus, and reduced motion;
- Coin Flip's three visual states;
- normal and king checker pieces;
- Mancala clusters and side badges at low and high counts;
- 8x8 and 10x10 Dots & Boxes boards;
- Word Guess board, keyboard, and Enter emphasis;
- two named Hangman players across at least three alternating rounds;
- traceable `SEE` acceptance in Word Grid;
- zero horizontal overflow and decoded local images.

Warm the installed PWA once, switch offline, and reload representative sprite-heavy games in each theme. All required artwork must be served from the local service-worker cache.

## Risks and mitigations

- **Generated inconsistency:** generate distinct assets individually, normalize mechanically, and reject framing outliers.
- **Unreadable themed materials:** keep shared silhouettes, semantic color mapping, and code-rendered state markers.
- **Bundle growth:** enforce per-family and total size budgets; resize and compress final WebP files rather than shipping source PNGs.
- **Mancala visual clutter:** cap rendered stones at 12 and place exact counts beside pits.
- **Large Dots & Boxes grids:** keep invisible hit targets large enough even when lines and cells become dense.
- **Dictionary over-acceptance:** use the word-game-specific 3of6game source, alphabetic filtering, and one shared validation path.
- **Quarter inaccuracies:** prefer authoritative reference imagery over synthesizing legal text or portrait details.

## Acceptance criteria

The refresh is complete when all requested visual and gameplay corrections are implemented, the generated assets pass automated framing and offline checks, affected interactions pass browser verification in all themes, the production build and public-readiness checks are green, and the result is reviewed from fresh screenshots before merge or deployment.
