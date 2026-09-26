# Table Games PWA Visual Refresh Design

## Goal

Refresh the complete Table Games PWA so the home screen, all twelve games, and both tools feel like one polished product on phones and desktop. Preserve the current routes, game rules, local statistics, offline-first PWA behavior, pass-and-play flows, and the Retro, Arcade, and Modern themes.

The work also fixes Hangman's visual progression. The current screen has no image at zero misses and then displays six inconsistent images offset by one guess. The corrected sequence will show an empty gallows before any miss and add exactly one body part for each of six wrong guesses.

## Product Direction

The app should feel like a contemporary digital tabletop cabinet: friendly, tactile, immediately playable, and visually coherent without becoming ornamental or crowded. Modern remains the clean baseline. Retro and Arcade retain their distinct typography, colors, textures, and piece art through the same shared layout and interaction system.

The visual refresh will favor strong boards, readable game state, large touch targets, and restrained motion. Decorative elements must support the game rather than compete with it.

## Information Architecture

The existing navigation model remains unchanged:

- Home presents twelve games and a separate two-tool area.
- Selecting a game opens the existing mode selector, then the existing game route.
- Coin Flip and Dice continue opening directly.
- Settings, theme selection, PWA install/update messaging, and score persistence retain their current behavior.

No new accounts, networking, cloud state, advertisements, or monetization behavior are introduced.

## Shared Visual System

### App shell

Create a shared game-screen presentation pattern with:

- A consistent back affordance, game title, and optional secondary action.
- A prominent but compact status rail for turns, timers, score, progress, and remaining moves.
- A centered play region that expands appropriately on desktop instead of leaving the game as a tiny mobile column in a large white viewport.
- A bottom action region for rematch, new puzzle, roll, flip, submit, or similar primary controls.
- Stable vertical space for transient status messages so boards do not jump when state changes.

The shell must respect safe areas, landscape layouts, keyboard visibility, and the existing responsive board-fitting utilities.

### Theme tokens

Extend the existing theme system rather than adding hard-coded per-screen colors. Each theme will define or derive:

- App background, elevated play surface, board surface, borders, and shadows.
- Primary and secondary actions plus hover, pressed, focus, selected, and disabled states.
- Player colors and semantic success, warning, and error colors.
- Heading, body, label, score, and monospaced/game typography.
- Shared radii, spacing, elevation, and motion timings.

### Controls and feedback

Shared buttons, selectors, player badges, turn indicators, score displays, dialogs, and game-over presentation will use the same visual grammar. Emoji-only navigation controls will be replaced with clear icon or text affordances. All interactive targets must be at least 44 CSS pixels in their shortest dimension where layout permits.

Motion will be short and purposeful: presses, piece placement, valid selection, score changes, rolls/flips, and game-over transitions. Reduced-motion preferences must be respected.

## Home Screen

The home screen will retain the complete catalog and existing generic game names. It will be reorganized into a clearer, more spacious responsive grid with stronger typography and consistent card treatment.

Game artwork will use a coherent tabletop illustration style across all twelve games. Tools will remain visually distinct from full games but use the same component system. The settings and theme controls will become recognizable, accessible controls rather than emoji-only circles.

The first viewport must communicate the product name and expose playable choices immediately without a marketing-style hero or unrelated promotional copy.

## Game-Specific Refresh

Each game keeps its engine and rules while receiving targeted presentation work:

- **Tic Tac Toe:** stronger board contrast, theme-aware marks, clearer active-player state, and satisfying placement/win feedback.
- **Four in a Row:** a tactile rack, legible drop targets, stronger red/yellow disc treatment, and clearer winning-line feedback.
- **Checkers:** a richer board, consistent piece scale and shadows, improved selected/legal-move states, and clearer captured-piece counts.
- **Chinese Checkers:** improved star-board contrast, larger playable pegs, clearer destination/selection states, and a more legible progress display.
- **Mancala:** tactile pits and stones, stronger store hierarchy, clearer active-side feedback, and responsive horizontal scaling.
- **Pop & Race:** a polished player-count setup, clearer instructions, a stronger board/dome treatment, legible home and finish lanes, and obvious movable-piece feedback.
- **Dots & Boxes:** a polished board-size selector, clearer line hit areas, player-color ownership, completed-box feedback, and responsive board scaling.
- **Hangman:** a coherent seven-state visual sequence, visible empty gallows at zero misses, one new part per wrong guess, clearer word slots and remaining-guess messaging, and a keyboard whose used/correct/incorrect states are immediately legible.
- **Word Search:** improved grid legibility, selection path, found-word states, player scoring, and a compact word bank that remains readable on small screens.
- **Crossword:** stronger active-cell and active-clue linkage, clearer blocked cells, improved clue hierarchy, and a keyboard/control layout that avoids crowding.
- **Word Grid:** tactile letter tiles, clearer drag/tap selection, visible submitted-word feedback, and a stronger timer/score hierarchy.
- **Word Guess:** improved tile and keyboard states, clearer secret-word setup and pass-device transitions, and a stable layout across short mobile screens.
- **Coin Flip:** a more dimensional coin, restrained flip animation, clearer result emphasis, and compact history/count feedback.
- **Dice:** consistent die geometry, theme-aware surfaces, clearer held state, improved type/count controls, and a legible total/result hierarchy.

## Hangman State Model and Artwork

Hangman remains a six-miss game. The display contract is:

| Wrong guesses | Visible state |
| --- | --- |
| 0 | Empty gallows and rope |
| 1 | Head |
| 2 | Head and torso |
| 3 | Add left arm |
| 4 | Add right arm |
| 5 | Add left leg |
| 6 | Add right leg; complete figure |

All seven states must share identical canvas dimensions, camera, gallows geometry, line weight, palette, and character position so the only perceived change is the newly added body part. The screen will index the sequence directly by the clamped `wrongGuesses` value, including zero.

The pure engine remains the source of truth for `maxWrongGuesses`, win/loss state, and guessed letters. Artwork selection is presentation-only and must not alter game logic.

## Component and Code Boundaries

Implementation should strengthen existing boundaries rather than rewrite the application:

- Theme files own visual tokens.
- Shared UI components own reusable shell, control, status, and modal behavior.
- Game screens compose shared presentation with game-specific boards and interactions.
- Engines remain pure and independent of React Native or image assets.
- Static artwork is imported through the existing asset pipeline so it is precached by the PWA build.

Large screen files may be split into focused board, setup, status, and control components when doing so reduces duplication or makes the refreshed UI testable. Unrelated engine refactors are out of scope.

## Accessibility and Responsive Behavior

- Preserve readable contrast in all three themes.
- Supply accessible labels for icon-only controls and non-text game actions.
- Keep keyboard focus indicators visible on web.
- Do not rely on color alone for selection, legal moves, turn state, or correctness.
- Support a compact phone viewport, short landscape viewport, tablet, and desktop.
- Prevent clipping, horizontal overflow, tiny desktop boards, and touch targets that collapse below usable sizes.
- Respect `prefers-reduced-motion` where the platform exposes it.

## Error Handling and Persistence

Invalid setup input continues to be handled within each game screen with specific, visible messages. A visual asset failure must not block gameplay; game state and controls remain code-native. Existing score recording remains once-per-game and is not changed by presentation transitions.

The service-worker update model, offline precache behavior, stored theme choice, and saved score format remain compatible with current installs.

## Verification

Verification will include:

- TypeScript type checking and production PWA build.
- Focused automated coverage for Hangman engine progression and the mapping from zero through six misses to visual stages.
- Browser smoke testing of the home screen, all twelve games, and both tools.
- Interaction testing of at least one core action per game or tool.
- Full Hangman multiplayer setup followed by six known-wrong guesses, verifying every visible stage and the final loss state.
- Desktop and mobile screenshots covering the home screen and every game/tool, with extra checks for short landscape layouts where applicable.
- Console, missing-asset, overflow, clipping, focus, and reduced-motion checks.
- Offline/PWA build validation without changing the existing service-worker update contract.

## Non-Goals

- Changing game rules, difficulty algorithms, word lists, puzzles, score formats, or route names.
- Adding online multiplayer, user accounts, cloud synchronization, or new games.
- Removing any current theme.
- Replacing React Native/Expo Router or the PWA build pipeline.
- Introducing a new paid dependency solely for visual effects.
