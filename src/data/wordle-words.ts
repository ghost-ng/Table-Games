import { DICTIONARY } from './dictionary';
import { ALL_WORDS } from './words';
import { ENABLE_FIVE_LETTER_WORDS } from './wordle-guesses';

/** Common, familiar 5-letter words the game picks answers from. */
export const WORDLE_ANSWERS: string[] = [
  'ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD',
  'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMBER', 'AMONG', 'ANGEL',
  'ANGER', 'ANGLE', 'ANGRY', 'ANKLE', 'APPLE', 'APPLY', 'APRON', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'AROMA',
  'ARROW', 'ASIDE', 'AUDIO', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BACON', 'BADGE', 'BAGEL', 'BAKER', 'BASIC',
  'BASIN', 'BEACH', 'BEARD', 'BEAST', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BERRY', 'BIRTH', 'BLACK', 'BLADE',
  'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEND', 'BLESS', 'BLIND', 'BLINK', 'BLOCK', 'BLOOM', 'BLUSH', 'BOARD',
  'BOAST', 'BONUS', 'BOOST', 'BOOTH', 'BRAIN', 'BRAKE', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BRICK', 'BRIDE',
  'BRIEF', 'BRING', 'BRISK', 'BROAD', 'BROOK', 'BROOM', 'BROWN', 'BRUSH', 'BUDDY', 'BUILD', 'BUNCH', 'BURST',
  'CABIN', 'CABLE', 'CAMEL', 'CANDY', 'CANOE', 'CARGO', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHALK',
  'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEEK', 'CHEER', 'CHESS', 'CHEST', 'CHICK', 'CHIEF', 'CHILD',
  'CHILL', 'CHIRP', 'CHOIR', 'CHORD', 'CIDER', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF',
  'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD', 'CLOWN', 'COACH', 'COAST', 'COCOA', 'COLOR', 'COMET', 'CORAL',
  'COUCH', 'COUNT', 'COURT', 'COVER', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM', 'CREEK', 'CRISP', 'CROWD',
  'CROWN', 'CRUMB', 'CRUSH', 'CRUST', 'CURVE', 'CYCLE', 'DAILY', 'DAIRY', 'DAISY', 'DANCE', 'DEALT', 'DECAY',
  'DELAY', 'DEPTH', 'DIARY', 'DINER', 'DIRTY', 'DITCH', 'DIZZY', 'DODGE', 'DONUT', 'DOUBT', 'DOUGH', 'DOZEN',
  'DRAFT', 'DRAIN', 'DRAMA', 'DREAM', 'DRESS', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DWELL', 'EAGER', 'EAGLE',
  'EARLY', 'EARTH', 'EIGHT', 'ELBOW', 'ELDER', 'EMBER', 'EMPTY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR',
  'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FABLE', 'FAINT', 'FAIRY', 'FAITH', 'FALSE', 'FANCY', 'FEAST',
  'FENCE', 'FERRY', 'FEVER', 'FIBER', 'FIELD', 'FIFTY', 'FIGHT', 'FINAL', 'FLAME', 'FLASH', 'FLOAT', 'FLOCK',
  'FLOOD', 'FLOOR', 'FLOUR', 'FLUTE', 'FOCUS', 'FORCE', 'FORGE', 'FORTH', 'FORUM', 'FOUND', 'FRAME', 'FRESH',
  'FRONT', 'FROST', 'FRUIT', 'FUDGE', 'FUNNY', 'GHOST', 'GIANT', 'GLASS', 'GLEAM', 'GLIDE', 'GLOBE', 'GLOOM',
  'GLORY', 'GLOVE', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRAVY',
  'GREAT', 'GREEN', 'GREET', 'GRILL', 'GRIND', 'GROUP', 'GROVE', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HABIT',
  'HAPPY', 'HARSH', 'HASTE', 'HATCH', 'HAUNT', 'HEART', 'HEAVY', 'HEDGE', 'HELLO', 'HERON', 'HOBBY', 'HONEY',
  'HORSE', 'HOTEL', 'HOUND', 'HOUSE', 'HUMAN', 'HUMOR', 'HURRY', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT',
  'ISSUE', 'IVORY', 'JELLY', 'JEWEL', 'JOINT', 'JOLLY', 'JUDGE', 'JUICE', 'JUMBO', 'KAYAK', 'KNACK', 'KNEEL',
  'KNIFE', 'KNOCK', 'KNOWN', 'LABEL', 'LANCE', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASH',
  'LEAST', 'LEMON', 'LEVEL', 'LIGHT', 'LILAC', 'LIMIT', 'LINEN', 'LLAMA', 'LOCAL', 'LODGE', 'LOGIC', 'LOOSE',
  'LOVER', 'LOWER', 'LOYAL', 'LUCKY', 'LUNAR', 'LUNCH', 'MAGIC', 'MAJOR', 'MANGO', 'MANOR', 'MAPLE', 'MARCH',
  'MARSH', 'MATCH', 'MAYOR', 'MEDAL', 'MELON', 'MERCY', 'MERIT', 'MERRY', 'METAL', 'MIGHT', 'MINOR', 'MINUS',
  'MIRTH', 'MODEL', 'MONEY', 'MONTH', 'MOOSE', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUDDY',
  'MUSIC', 'NERVE', 'NEVER', 'NIGHT', 'NINJA', 'NOBLE', 'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCEAN', 'OFFER',
  'OFTEN', 'OLIVE', 'ONION', 'OPERA', 'ORBIT', 'ORDER', 'OTHER', 'OTTER', 'OUNCE', 'OUTER', 'OWNER', 'PAINT',
  'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PATCH', 'PAUSE', 'PEACE', 'PEACH', 'PEARL', 'PEDAL', 'PENNY',
  'PIANO', 'PIECE', 'PILOT', 'PINCH', 'PITCH', 'PIXEL', 'PIZZA', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE',
  'PLAZA', 'PLUSH', 'POINT', 'POLAR', 'PORCH', 'POUCH', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME',
  'PRINT', 'PRIZE', 'PROOF', 'PROUD', 'PULSE', 'PUPPY', 'PURSE', 'QUACK', 'QUEEN', 'QUERY', 'QUEST', 'QUICK',
  'QUIET', 'QUILT', 'QUOTE', 'RADAR', 'RADIO', 'RAINY', 'RAISE', 'RALLY', 'RANCH', 'RANGE', 'RAPID', 'RATIO',
  'RAVEN', 'REACH', 'READY', 'REALM', 'RELAX', 'REPLY', 'RHYME', 'RIDER', 'RIDGE', 'RIGHT', 'RIVAL', 'RIVER',
  'ROAST', 'ROBIN', 'ROBOT', 'ROCKY', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RULER', 'RURAL', 'SADLY', 'SAINT',
  'SALAD', 'SAUCE', 'SCALE', 'SCARF', 'SCENE', 'SCENT', 'SCOPE', 'SCORE', 'SCOUT', 'SENSE', 'SERVE', 'SEVEN',
  'SHADE', 'SHAKE', 'SHAPE', 'SHARE', 'SHARK', 'SHARP', 'SHEEP', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT',
  'SHOCK', 'SHORE', 'SHORT', 'SHOUT', 'SIGHT', 'SKATE', 'SKILL', 'SLEEP', 'SLICE', 'SLIDE', 'SLOPE', 'SMALL',
  'SMART', 'SMILE', 'SMOKE', 'SNACK', 'SNAKE', 'SOLAR', 'SOLID', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK',
  'SPEAK', 'SPEED', 'SPELL', 'SPEND', 'SPICE', 'SPINE', 'SPOON', 'SPORT', 'SPRAY', 'SQUAD', 'STACK', 'STAFF',
  'STAGE', 'STAIR', 'STAMP', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE',
  'STORM', 'STORY', 'STOVE', 'STRAW', 'STUDY', 'STYLE', 'SUGAR', 'SUNNY', 'SUPER', 'SWEET', 'SWIFT', 'SWING',
  'SWORD', 'SYRUP', 'TABLE', 'TASTE', 'TEACH', 'TEETH', 'THANK', 'THEME', 'THICK', 'THING', 'THINK', 'THREE',
  'THROW', 'THUMB', 'TIGER', 'TIMER', 'TIRED', 'TOAST', 'TODAY', 'TOKEN', 'TOOTH', 'TOPIC', 'TORCH', 'TOTAL',
  'TOUCH', 'TOWEL', 'TOWER', 'TRACE', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE',
  'TRICK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TULIP', 'TWICE', 'TWIST', 'UNCLE', 'UNDER', 'UNION', 'UNITY',
  'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USUAL', 'VALID', 'VALUE', 'VAPOR', 'VAULT', 'VENUE', 'VERSE', 'VIDEO',
  'VIRUS', 'VISIT', 'VITAL', 'VIVID', 'VOCAL', 'VOICE', 'WAGON', 'WAIST', 'WATCH', 'WATER', 'WHALE', 'WHEAT',
  'WHEEL', 'WHILE', 'WHISK', 'WHITE', 'WHOLE', 'WIDTH', 'WITCH', 'WOMAN', 'WORLD', 'WORRY', 'WORTH', 'WOUND',
  'WRIST', 'WRITE', 'YACHT', 'YEARN', 'YIELD', 'YOUNG', 'YOUTH', 'ZEBRA', 'ZESTY',
];

/**
 * Words accepted as guesses: the ENABLE list plus every 5-letter word the app already
 * knows (Boggle dictionary, Hangman list, answers). Built on first use.
 */
let validGuesses: Set<string> | null = null;

function getValidGuesses(): Set<string> {
  if (!validGuesses) {
    validGuesses = new Set(
      [
        ...ENABLE_FIVE_LETTER_WORDS.split(/\s+/),
        ...DICTIONARY,
        ...ALL_WORDS,
        ...WORDLE_ANSWERS,
      ].filter((w) => /^[A-Z]{5}$/.test(w)),
    );
  }
  return validGuesses;
}

export function isValidWordleGuess(word: string): boolean {
  return getValidGuesses().has(word.toUpperCase());
}

export function randomWordleAnswer(exclude?: string): string {
  let word: string;
  do {
    word = WORDLE_ANSWERS[Math.floor(Math.random() * WORDLE_ANSWERS.length)];
  } while (word === exclude && WORDLE_ANSWERS.length > 1);
  return word;
}
