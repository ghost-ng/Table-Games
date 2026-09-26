export type Player = 'player1' | 'player2';
export type PieceType = 'normal' | 'king';
export type Piece = { player: Player; type: PieceType } | null;
export type Board = Piece[][];
export type Position = { row: number; col: number };
export type Move = { from: Position; to: Position; captured?: Position };
export type GameState = {
  board: Board;
  currentPlayer: Player;
  selectedPiece: Position | null;
  validMoves: Move[];
  mustJump: boolean;
  jumpSequence: Position | null;
  winner: Player | null;
  isGameOver: boolean;
  pieces: { player1: number; player2: number };
};

const BOARD_SIZE = 8;

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function countPieces(board: Board): { player1: number; player2: number } {
  let player1 = 0;
  let player2 = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.player === 'player1') player1++;
        else player2++;
      }
    }
  }
  return { player1, player2 };
}

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function createGame(): GameState {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  // player2 at top rows 0-2
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        board[r][c] = { player: 'player2', type: 'normal' };
      }
    }
  }

  // player1 at bottom rows 5-7
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        board[r][c] = { player: 'player1', type: 'normal' };
      }
    }
  }

  return {
    board,
    currentPlayer: 'player1',
    selectedPiece: null,
    validMoves: [],
    mustJump: false,
    jumpSequence: null,
    winner: null,
    isGameOver: false,
    pieces: countPieces(board),
  };
}

export function getJumpMoves(
  board: Board,
  pos: Position,
  player: Player,
  isKing: boolean
): Move[] {
  const moves: Move[] = [];
  const opponent: Player = player === 'player1' ? 'player2' : 'player1';

  // Forward directions for each player
  const forwardDirs: [number, number][] =
    player === 'player1'
      ? [[-1, -1], [-1, 1]] // player1 moves up
      : [[1, -1], [1, 1]];  // player2 moves down

  const dirs: [number, number][] = isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : forwardDirs;

  for (const [dr, dc] of dirs) {
    const midRow = pos.row + dr;
    const midCol = pos.col + dc;
    const landRow = pos.row + dr * 2;
    const landCol = pos.col + dc * 2;

    if (
      isOnBoard(landRow, landCol) &&
      board[midRow][midCol]?.player === opponent &&
      board[landRow][landCol] === null
    ) {
      moves.push({
        from: pos,
        to: { row: landRow, col: landCol },
        captured: { row: midRow, col: midCol },
      });
    }
  }

  return moves;
}

function getSimpleMoves(
  board: Board,
  pos: Position,
  player: Player,
  isKing: boolean
): Move[] {
  const moves: Move[] = [];

  const forwardDirs: [number, number][] =
    player === 'player1'
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

  const dirs: [number, number][] = isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : forwardDirs;

  for (const [dr, dc] of dirs) {
    const newRow = pos.row + dr;
    const newCol = pos.col + dc;

    if (isOnBoard(newRow, newCol) && board[newRow][newCol] === null) {
      moves.push({
        from: pos,
        to: { row: newRow, col: newCol },
      });
    }
  }

  return moves;
}

export function getValidMoves(
  board: Board,
  pos: Position,
  currentPlayer: Player
): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece || piece.player !== currentPlayer) return [];

  const isKing = piece.type === 'king';
  const jumps = getJumpMoves(board, pos, currentPlayer, isKing);

  // If there are mandatory jumps anywhere for this player, only return jump moves
  if (hasMandatoryJumps(board, currentPlayer)) {
    return jumps;
  }

  // Otherwise return simple moves + any jumps
  return [...getSimpleMoves(board, pos, currentPlayer, isKing), ...jumps];
}

export function hasMandatoryJumps(board: Board, player: Player): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        const jumps = getJumpMoves(
          board,
          { row: r, col: c },
          player,
          piece.type === 'king'
        );
        if (jumps.length > 0) return true;
      }
    }
  }
  return false;
}

export function getAllPlayerMoves(
  board: Board,
  player: Player
): { pos: Position; moves: Move[] }[] {
  const result: { pos: Position; moves: Move[] }[] = [];
  const mustJump = hasMandatoryJumps(board, player);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        const pos = { row: r, col: c };
        const isKing = piece.type === 'king';

        let moves: Move[];
        if (mustJump) {
          moves = getJumpMoves(board, pos, player, isKing);
        } else {
          moves = [
            ...getSimpleMoves(board, pos, player, isKing),
            ...getJumpMoves(board, pos, player, isKing),
          ];
        }

        if (moves.length > 0) {
          result.push({ pos, moves });
        }
      }
    }
  }

  return result;
}

export function checkGameOver(board: Board, currentPlayer: Player): Player | null {
  const allMoves = getAllPlayerMoves(board, currentPlayer);
  const pieces = countPieces(board);

  if (pieces.player1 === 0) return 'player2';
  if (pieces.player2 === 0) return 'player1';

  // If current player has no moves, they lose
  if (allMoves.length === 0) {
    return currentPlayer === 'player1' ? 'player2' : 'player1';
  }

  return null;
}

export function makeMove(
  state: GameState,
  from: Position,
  to: Position
): GameState {
  if (state.isGameOver) return state;

  const newBoard = cloneBoard(state.board);
  const piece = newBoard[from.row][from.col];
  if (!piece) return state;

  // Find the matching move to get captured position
  const validMoves = state.jumpSequence
    ? getJumpMoves(
        newBoard,
        from,
        state.currentPlayer,
        piece.type === 'king'
      )
    : getValidMoves(newBoard, from, state.currentPlayer);

  const move = validMoves.find(
    (m) => m.to.row === to.row && m.to.col === to.col
  );
  if (!move) return state;

  // Move the piece
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;

  // Remove captured piece
  if (move.captured) {
    newBoard[move.captured.row][move.captured.col] = null;
  }

  // Promote to king
  const movedPiece = newBoard[to.row][to.col]!;
  if (
    (movedPiece.player === 'player1' && to.row === 0) ||
    (movedPiece.player === 'player2' && to.row === BOARD_SIZE - 1)
  ) {
    movedPiece.type = 'king';
  }

  const pieces = countPieces(newBoard);

  // Check for multi-jump: only if this was a jump move
  if (move.captured) {
    const additionalJumps = getJumpMoves(
      newBoard,
      to,
      state.currentPlayer,
      movedPiece.type === 'king'
    );
    if (additionalJumps.length > 0) {
      // Multi-jump continues
      return {
        board: newBoard,
        currentPlayer: state.currentPlayer,
        selectedPiece: to,
        validMoves: additionalJumps,
        mustJump: true,
        jumpSequence: to,
        winner: null,
        isGameOver: false,
        pieces,
      };
    }
  }

  // Switch turns
  const nextPlayer: Player =
    state.currentPlayer === 'player1' ? 'player2' : 'player1';
  const winner = checkGameOver(newBoard, nextPlayer);

  return {
    board: newBoard,
    currentPlayer: nextPlayer,
    selectedPiece: null,
    validMoves: [],
    mustJump: hasMandatoryJumps(newBoard, nextPlayer),
    jumpSequence: null,
    winner,
    isGameOver: winner !== null,
    pieces,
  };
}
