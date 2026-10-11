export type HangmanPlayerId = 'player1' | 'player2';

export interface HangmanSession {
  names: Record<HangmanPlayerId, string>;
  setter: HangmanPlayerId;
  guesser: HangmanPlayerId;
  wins: Record<HangmanPlayerId, number>;
  round: number;
}

function displayName(name: string, fallback: string): string {
  return Array.from(name.trim()).slice(0, 24).join('') || fallback;
}

export function createHangmanSession(player1Name: string, player2Name: string): HangmanSession {
  return {
    names: {
      player1: displayName(player1Name, 'Player 1'),
      player2: displayName(player2Name, 'Player 2'),
    },
    setter: 'player1',
    guesser: 'player2',
    wins: { player1: 0, player2: 0 },
    round: 1,
  };
}

export function completeHangmanRound(session: HangmanSession, guesserSolved: boolean): HangmanSession {
  const winner = guesserSolved ? session.guesser : session.setter;
  return {
    names: { ...session.names },
    setter: session.guesser,
    guesser: session.setter,
    wins: { ...session.wins, [winner]: session.wins[winner] + 1 },
    round: session.round + 1,
  };
}
