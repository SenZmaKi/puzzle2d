// Puzzle2D - Shared Constants
// Edit these values to change piece counts per round

export const ROUNDS = [
  { round: 1, pieces: 15, cols: 5, rows: 3 },
  { round: 2, pieces: 25, cols: 5, rows: 5 },
  { round: 3, pieces: 35, cols: 7, rows: 5 },
];

export const TOTAL_ROUNDS = ROUNDS.length;
export const TOTAL_IMAGES_REQUIRED = TOTAL_ROUNDS;

export const GAME_STATES = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  ROUND_COMPLETE: 'round_complete',
  GAME_COMPLETE: 'game_complete',
  CANCELLED: 'cancelled',
};
