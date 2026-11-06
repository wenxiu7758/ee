import { AuthoritativeBoardState } from '../engine/gameStateTypes.ts';

export type { AuthoritativeBoardState };

export function createDefaultBoardState(roomId: string, gameType: string): AuthoritativeBoardState {
  return {
    roomId,
    gameType: gameType as any,
    phase: 'playing',
    turnSeat: 0,
    actionSeq: 1,
    moveCount: 0,
    multiplier: 1,
    handsCount: gameType === 'shisanshui' && roomId.includes('eight') ? [13, 13, 13, 13, 13, 13, 13, 13] : [13, 13, 13, 13],
    lastCombo: null,
    winnerSeat: null,
    discardsHistory: [],
    updatedAt: Date.now(),
  };
}
