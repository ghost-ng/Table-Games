// Crossword puzzle data - 10 pre-built puzzles (9x9 to 11x11)
// null = black square, string = letter (uppercase)
// Clues numbered left-to-right, top-to-bottom

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  direction: 'across' | 'down';
}

export interface CrosswordPuzzle {
  id: number;
  size: number;
  grid: (string | null)[][];
  clues: CrosswordClue[];
}

// ---------------------------------------------------------------------------
// Helper to build a puzzle from word placements
// ---------------------------------------------------------------------------

type WordPlacement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
};

function buildPuzzle(id: number, size: number, words: WordPlacement[]): CrosswordPuzzle {
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array<string | null>(size).fill(null),
  );

  for (const w of words) {
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.direction === 'across' ? w.row : w.row + i;
      const c = w.direction === 'across' ? w.col + i : w.col;
      grid[r][c] = w.answer[i];
    }
  }

  const startCells = new Set<string>();
  for (const w of words) startCells.add(`${w.row},${w.col}`);

  const numberMap = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`;
      if (startCells.has(key) && !numberMap.has(key)) {
        numberMap.set(key, num++);
      }
    }
  }

  const clues: CrosswordClue[] = words.map((w) => ({
    number: numberMap.get(`${w.row},${w.col}`)!,
    clue: w.clue,
    answer: w.answer,
    startRow: w.row,
    startCol: w.col,
    direction: w.direction,
  }));

  clues.sort((a, b) => {
    if (a.direction === b.direction) return a.number - b.number;
    return a.direction === 'across' ? -1 : 1;
  });

  return { id, size, grid, clues };
}

// ---------------------------------------------------------------------------
// 10 puzzles (10-15 words each) – all intersections verified by test
// ---------------------------------------------------------------------------

export const CROSSWORD_PUZZLES: CrosswordPuzzle[] = [

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 1 (9×9) – Nature  (12 words)
  //     0 1 2 3 4 5 6 7 8
  //  0: S T O R M . . . .
  //  1: U R . A . . . . .
  //  2: N E . I . L E A F
  //  3: . E . N . O . . .
  //  4: F . . . . G . . .
  //  5: L O W . I C E . .
  //  6: O . . . V . . . .
  //  7: W A V E Y . D E W
  //  8: . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(1, 9, [
    { answer: 'STORM', clue: 'Rough weather with thunder',   row: 0, col: 0, direction: 'across' },
    { answer: 'LEAF',  clue: 'Falls from a tree in autumn',  row: 2, col: 5, direction: 'across' },
    { answer: 'LOW',   clue: 'Not high',                     row: 5, col: 1, direction: 'across' },
    { answer: 'ICE',   clue: 'Frozen water',                 row: 5, col: 4, direction: 'across' },
    { answer: 'WAVE',  clue: 'Ocean swell',                  row: 7, col: 0, direction: 'across' },
    { answer: 'DEW',   clue: 'Morning moisture on grass',    row: 7, col: 6, direction: 'across' },
    { answer: 'SUN',   clue: 'Center of our solar system',   row: 0, col: 0, direction: 'down' },
    { answer: 'TREE',  clue: 'It has bark and branches',     row: 0, col: 1, direction: 'down' },
    { answer: 'RAIN',  clue: 'Drops from the clouds',        row: 0, col: 3, direction: 'down' },
    { answer: 'FLOW',  clue: 'Move like a river',            row: 4, col: 0, direction: 'down' },
    { answer: 'LOG',   clue: 'Fallen tree trunk',            row: 2, col: 5, direction: 'down' },
    { answer: 'IVY',   clue: 'Climbing green plant',         row: 5, col: 4, direction: 'down' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 2 (9×9) – Food  (10 words)
  //     0 1 2 3 4 5 6 7 8
  //  0: B R E A D . . . .
  //  1: A I . P . L I M E
  //  2: K C . P . . . . .
  //  3: E E . L . M E A T
  //  4: . . . E . I . . .
  //  5: . . . . S L I C E
  //  6: P I E . . K . . .
  //  7: . . . . . . . . .
  //  8: . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(2, 9, [
    { answer: 'BREAD', clue: 'Baked loaf for sandwiches',    row: 0, col: 0, direction: 'across' },
    { answer: 'LIME',  clue: 'Small green citrus fruit',     row: 1, col: 5, direction: 'across' },
    { answer: 'MEAT',  clue: 'Protein from animals',         row: 3, col: 5, direction: 'across' },
    { answer: 'SLICE', clue: 'A thin piece cut off',         row: 5, col: 4, direction: 'across' },
    { answer: 'PIE',   clue: 'Baked dish with a crust',      row: 6, col: 0, direction: 'across' },
    { answer: 'BAKE',  clue: 'Cook in an oven',              row: 0, col: 0, direction: 'down' },
    { answer: 'RICE',  clue: 'Grain popular in Asia',        row: 0, col: 1, direction: 'down' },
    { answer: 'APPLE', clue: 'Red or green fruit',           row: 0, col: 3, direction: 'down' },
    { answer: 'MILK',  clue: 'White drink from cows',        row: 3, col: 5, direction: 'down' },
    { answer: 'JAM',   clue: 'Fruity spread for toast',      row: 4, col: 0, direction: 'across' },
    { answer: 'OAT',   clue: 'Grain used in porridge',       row: 7, col: 0, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 3 (9×9) – Animals  (10 words)
  //     0 1 2 3 4 5 6 7 8
  //  0: H O R S E . . . .
  //  1: E W . . A . . . .
  //  2: N L . . G . . . .
  //  3: . . . . L . . . .
  //  4: . . . . E . . . .
  //  5: D U C K . B E A R
  //  6: . . O . . I . . .
  //  7: . . W . . R . . .
  //  8: . . . . . D . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(3, 9, [
    { answer: 'HORSE', clue: 'Animal you can ride',          row: 0, col: 0, direction: 'across' },
    { answer: 'DUCK',  clue: 'Quacking waterfowl',           row: 5, col: 0, direction: 'across' },
    { answer: 'BEAR',  clue: 'Large furry forest animal',    row: 5, col: 5, direction: 'across' },
    { answer: 'HEN',   clue: 'Female chicken',               row: 0, col: 0, direction: 'down' },
    { answer: 'OWL',   clue: 'Wise nocturnal bird',          row: 0, col: 1, direction: 'down' },
    { answer: 'EAGLE', clue: 'Majestic bird of prey',        row: 0, col: 4, direction: 'down' },
    { answer: 'BIRD',  clue: 'Feathered flying creature',    row: 5, col: 5, direction: 'down' },
    { answer: 'COW',   clue: 'Farm animal that gives milk',  row: 5, col: 2, direction: 'down' },
    { answer: 'RAW',   clue: 'Uncooked, like sushi',          row: 7, col: 0, direction: 'across' },
    { answer: 'FIN',   clue: 'Fish uses it to swim',         row: 1, col: 6, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 4 (10×10) – Sports  (10 words)
  //     0 1 2 3 4 5 6 7 8 9
  //  0: G O A L . . . . . .
  //  1: . . C . . . . . . .
  //  2: . T E A M . . . . .
  //  3: . E . . A . . . . .
  //  4: . N . . T . . . . .
  //  5: . N . . C . R U N .
  //  6: . I . . H . . . . .
  //  7: . S . . . P O O L .
  //  8: . . K I C K . . . .
  //  9: . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(4, 10, [
    { answer: 'GOAL',   clue: 'What you score in soccer',    row: 0, col: 0, direction: 'across' },
    { answer: 'TEAM',   clue: 'Group of players',            row: 2, col: 1, direction: 'across' },
    { answer: 'RUN',    clue: 'Move fast on foot',           row: 5, col: 6, direction: 'across' },
    { answer: 'POOL',   clue: 'You swim laps in it',         row: 7, col: 5, direction: 'across' },
    { answer: 'KICK',   clue: 'Strike with your foot',       row: 8, col: 2, direction: 'across' },
    { answer: 'ACE',    clue: 'Unreturnable tennis serve',   row: 0, col: 2, direction: 'down' },
    { answer: 'TENNIS', clue: 'Racket sport with a net',     row: 2, col: 1, direction: 'down' },
    { answer: 'MATCH',  clue: 'A competitive contest',       row: 2, col: 4, direction: 'down' },
    { answer: 'SWIM',   clue: 'Move through water',          row: 3, col: 6, direction: 'across' },
    { answer: 'BAT',    clue: 'You hit a ball with this',     row: 9, col: 0, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 5 (10×10) – Music  (10 words)
  //     0 1 2 3 4 5 6 7 8 9
  //  0: D R U M . . . . . .
  //  1: . . . . . T U N E .
  //  2: . . . . . I . O . .
  //  3: B A S S . C . T . .
  //  4: E . I . . K . E . .
  //  5: A . N . . . . . . .
  //  6: T . G . . J A Z Z .
  //  7: . . . . . . . . . .
  //  8: . . . . H A R P . .
  //  9: . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(5, 10, [
    { answer: 'DRUM', clue: 'Percussion instrument you hit', row: 0, col: 0, direction: 'across' },
    { answer: 'TUNE', clue: 'A melody or song',              row: 1, col: 5, direction: 'across' },
    { answer: 'BASS', clue: 'Low-pitched instrument',        row: 3, col: 0, direction: 'across' },
    { answer: 'JAZZ', clue: 'Music genre from New Orleans',  row: 6, col: 5, direction: 'across' },
    { answer: 'HARP', clue: 'Large stringed instrument',     row: 8, col: 4, direction: 'across' },
    { answer: 'BEAT', clue: 'Rhythm of the music',           row: 3, col: 0, direction: 'down' },
    { answer: 'SING', clue: 'Use your voice musically',      row: 3, col: 2, direction: 'down' },
    { answer: 'TICK', clue: 'Sound a metronome makes',       row: 1, col: 5, direction: 'down' },
    { answer: 'NOTE', clue: 'Single musical sound',          row: 1, col: 7, direction: 'down' },
    { answer: 'ROCK', clue: 'Guitar-heavy music genre',     row: 2, col: 0, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 6 (10×10) – Travel  (10 words)
  //     0 1 2 3 4 5 6 7 8 9
  //  0: . . . . . . . . . .
  //  1: . H O T E L . . . .
  //  2: . . . R . . . . . .
  //  3: T A X I . . . . . .
  //  4: O . . P . . . . . .
  //  5: U . P A T H . . . .
  //  6: R . A . . . . . . .
  //  7: . . C . . . . B U S
  //  8: . . K . V I S A . .
  //  9: . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(6, 10, [
    { answer: 'HOTEL', clue: 'Place to stay on vacation',    row: 1, col: 1, direction: 'across' },
    { answer: 'TAXI',  clue: 'Yellow car for hire',          row: 3, col: 0, direction: 'across' },
    { answer: 'PATH',  clue: 'A trail to walk on',           row: 5, col: 2, direction: 'across' },
    { answer: 'VISA',  clue: 'Travel document stamp',        row: 8, col: 4, direction: 'across' },
    { answer: 'TRIP',  clue: 'A journey or vacation',        row: 1, col: 3, direction: 'down' },
    { answer: 'TOUR',  clue: 'Guided sightseeing outing',    row: 3, col: 0, direction: 'down' },
    { answer: 'PACK',  clue: 'Fill your suitcase',           row: 5, col: 2, direction: 'down' },
    { answer: 'BUS',   clue: 'Public transport vehicle',      row: 7, col: 7, direction: 'across' },
    { answer: 'ROAM',  clue: 'Wander freely',                row: 9, col: 0, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 7 (11×11) – Space  (10 words)
  //     0 1 2 3 4 5 6 7 8 9 10
  //  0: S T A R . . . . . . .
  //  1: U . . O . . . . . . .
  //  2: N . . C . M A R S . .
  //  3: . . . K . . . . . . .
  //  4: . . . E . . . G A S .
  //  5: . . . T . M O O N . .
  //  6: O R B I T . . . . . .
  //  7: . . . . . . . . . . .
  //  8: . . . . C O M E T . .
  //  9: N O V A . . . . . . .
  // 10: . . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(7, 11, [
    { answer: 'STAR',   clue: 'Twinkling light in the sky',  row: 0, col: 0, direction: 'across' },
    { answer: 'MARS',   clue: 'The red planet',              row: 2, col: 5, direction: 'across' },
    { answer: 'GAS',    clue: 'What nebulae are made of',    row: 4, col: 7, direction: 'across' },
    { answer: 'MOON',   clue: 'Earth\'s natural satellite',  row: 5, col: 5, direction: 'across' },
    { answer: 'ORBIT',  clue: 'Path around a planet',        row: 6, col: 0, direction: 'across' },
    { answer: 'COMET',  clue: 'Icy space object with a tail', row: 8, col: 4, direction: 'across' },
    { answer: 'NOVA',   clue: 'Exploding star',              row: 9, col: 0, direction: 'across' },
    { answer: 'SUN',    clue: 'Center of our solar system',  row: 0, col: 0, direction: 'down' },
    { answer: 'ROCKET', clue: 'Vehicle that launches to space', row: 0, col: 3, direction: 'down' },
    { answer: 'SKY',    clue: 'Where stars appear at night',  row: 3, col: 8, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 8 (10×10) – Home  (10 words)
  //     0 1 2 3 4 5 6 7 8 9
  //  0: . . C H A I R . . .
  //  1: . . O . . . O . . .
  //  2: . . O . . . O . . .
  //  3: . . K . L A M P . .
  //  4: . . . . . . . . . .
  //  5: T A B L E . . . . .
  //  6: I . . . V . . . . .
  //  7: L . . . A . D O G .
  //  8: E . . . S . . . . .
  //  9: . . . . E . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(8, 10, [
    { answer: 'CHAIR', clue: 'Seat with a back',             row: 0, col: 2, direction: 'across' },
    { answer: 'LAMP',  clue: 'Light on your nightstand',     row: 3, col: 4, direction: 'across' },
    { answer: 'TABLE', clue: 'Furniture you eat dinner on',  row: 5, col: 0, direction: 'across' },
    { answer: 'DOG',   clue: 'Pet that greets you at home',  row: 7, col: 6, direction: 'across' },
    { answer: 'COOK',  clue: 'Prepare food in the kitchen',  row: 0, col: 2, direction: 'down' },
    { answer: 'ROOM',  clue: 'A space inside a house',       row: 0, col: 6, direction: 'down' },
    { answer: 'TILE',  clue: 'Square piece on a floor',      row: 5, col: 0, direction: 'down' },
    { answer: 'VASE',  clue: 'Container for flowers',        row: 6, col: 4, direction: 'down' },
    { answer: 'RUG',   clue: 'Floor covering',               row: 9, col: 0, direction: 'across' },
    { answer: 'BED',   clue: 'Where you sleep',              row: 4, col: 7, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 9 (11×11) – Weather  (10 words)
  //     0 1 2 3 4 5 6 7 8 9 10
  //  0: C L O U D . . . . . .
  //  1: O . . . . . . . . . .
  //  2: O . . . H A I L . . .
  //  3: L . S N O W . . . . .
  //  4: . . T . . A . . . . .
  //  5: . . O . . R . . . . .
  //  6: . . R . . M . F O G .
  //  7: . . M . . . . . . . .
  //  8: . . . . S L E E T . .
  //  9: . . . . . . . . . . .
  // 10: . . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(9, 11, [
    { answer: 'CLOUD', clue: 'White fluffy thing in the sky', row: 0, col: 0, direction: 'across' },
    { answer: 'HAIL',  clue: 'Ice balls from the sky',       row: 2, col: 4, direction: 'across' },
    { answer: 'SNOW',  clue: 'White winter precipitation',   row: 3, col: 2, direction: 'across' },
    { answer: 'FOG',   clue: 'Thick mist near the ground',   row: 6, col: 7, direction: 'across' },
    { answer: 'SLEET', clue: 'Mix of rain and ice',          row: 8, col: 4, direction: 'across' },
    { answer: 'COOL',  clue: 'Slightly cold',                row: 0, col: 0, direction: 'down' },
    { answer: 'STORM', clue: 'Severe weather event',         row: 3, col: 2, direction: 'down' },
    { answer: 'WARM',  clue: 'Pleasantly hot',               row: 3, col: 5, direction: 'down' },
    { answer: 'DRY',   clue: 'Not wet',                      row: 10, col: 0, direction: 'across' },
    { answer: 'WET',   clue: 'Soaked with water',            row: 1, col: 8, direction: 'across' },
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PUZZLE 10 (11×11) – School  (10 words)
  //     0 1 2 3 4 5 6 7 8 9 10
  //  0: B O O K . . . M A T H
  //  1: E . . . . A R T . . .
  //  2: L . . . P E N . . . .
  //  3: L . . . . X . . . . .
  //  4: C L A S S . . . . . .
  //  5: H . . . . . . . . . .
  //  6: A . R U L E . . . . .
  //  7: L . . . . . . . . . .
  //  8: K . . . D E S K . . .
  //  9: . . . . . . . . . . .
  // 10: . . . . . . . . . . .
  // ═══════════════════════════════════════════════════════════════
  buildPuzzle(10, 11, [
    { answer: 'BOOK',  clue: 'You read this for fun or study', row: 0, col: 0, direction: 'across' },
    { answer: 'MATH',  clue: 'Subject with numbers',         row: 0, col: 7, direction: 'across' },
    { answer: 'ART',   clue: 'Drawing and painting class',   row: 1, col: 5, direction: 'across' },
    { answer: 'PEN',   clue: 'Writing tool with ink',        row: 2, col: 4, direction: 'across' },
    { answer: 'CLASS', clue: 'Group of students in a room',  row: 4, col: 0, direction: 'across' },
    { answer: 'RULE',  clue: 'A regulation to follow',       row: 6, col: 2, direction: 'across' },
    { answer: 'DESK',  clue: 'Table for studying',           row: 8, col: 4, direction: 'across' },
    { answer: 'BELL',  clue: 'Rings between classes',        row: 0, col: 0, direction: 'down' },
    { answer: 'CHALK', clue: 'White stick for the blackboard', row: 4, col: 0, direction: 'down' },
    { answer: 'EXAM',  clue: 'A test at school',             row: 2, col: 5, direction: 'down' },
  ]),
];
