import {
  HOME,
  LANE_START,
  TRACK_LENGTH,
  getLegalMoves,
  startSpace,
  trackPosition,
  type TroubleMove,
  type TroubleState,
} from '../engines/trouble';

export type TroubleDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Can an opponent of `playerIdx` land on absolute track position `pos` next roll?
 * Opponent pegs 1–6 spaces behind threaten it (unless they turn into their lane first),
 * and an opponent's start space is threatened while that opponent still has pegs at home.
 */
export function isThreatened(
  state: TroubleState,
  playerIdx: number,
  pos: number,
  ignore?: { player: number; peg: number } | null,
): boolean {
  for (let o = 0; o < state.players.length; o++) {
    if (o === playerIdx) continue;
    const opp = state.players[o];
    for (let q = 0; q < opp.pegs.length; q++) {
      if (ignore && ignore.player === o && ignore.peg === q) continue;
      const progress = opp.pegs[q];
      if (progress === HOME) {
        if (startSpace(opp.seat) === pos) return true;
        continue;
      }
      const oppPos = trackPosition(opp.seat, progress);
      if (oppPos === null) continue;
      const d = (pos - oppPos + TRACK_LENGTH) % TRACK_LENGTH;
      if (d >= 1 && d <= 6 && progress + d < LANE_START) return true;
    }
  }
  return false;
}

function scoreMove(state: TroubleState, move: TroubleMove, hard: boolean): number {
  const seat = state.players[move.player].seat;
  let score = 0;

  if (move.capture) {
    const victim = state.players[move.capture.player].pegs[move.capture.peg];
    score += 50 + victim * 0.5;
  }
  if (move.to >= LANE_START && move.from < LANE_START) score += 45; // reaches the safe lane
  else if (move.to >= LANE_START) score += 4; // shuffles deeper, freeing lane slots
  if (move.from === HOME) score += 35;

  const fromPos = trackPosition(seat, move.from);
  const toPos = trackPosition(seat, move.to);
  // A captured peg goes home, so it no longer threatens anything.
  const destThreatened = toPos !== null && isThreatened(state, move.player, toPos, move.capture);
  if (fromPos !== null && isThreatened(state, move.player, fromPos) && !destThreatened) {
    score += 30; // escape danger
  }
  if (move.from !== HOME) score += move.from * 0.3; // push the lead peg
  if (hard && destThreatened) score -= 15;

  return score;
}

/** Picks a move for the current player, or null when no legal move exists. */
export function getAIMove(
  state: TroubleState,
  roll: number,
  difficulty: TroubleDifficulty,
  rng: () => number = Math.random,
): TroubleMove | null {
  const moves = getLegalMoves(state, roll);
  if (moves.length === 0) return null;
  if (difficulty === 'easy') return moves[Math.floor(rng() * moves.length)] ?? moves[0];

  const hard = difficulty === 'hard';
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const s = scoreMove(state, move, hard) + rng() * 0.5; // tiny jitter breaks ties
    if (s > bestScore) {
      bestScore = s;
      best = move;
    }
  }
  return best;
}
