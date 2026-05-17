/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  role?: string;
  isHost: boolean;
  avatar?: string;
  stats: {
    wins: number;
    gamesPlayed: number;
    spyWins: number;
  };
}

export type GameMode = 'classic' | 'hardcore' | 'speedrun';

export interface GameSettings {
  spyCount: number;
  votingTime: number; // seconds
  category: string;
  mode: GameMode;
}

export interface GameState {
  id: string;
  players: Player[];
  status: 'lobby' | 'playing' | 'voting' | 'result' | 'ended';
  location?: string;
  spyIds: string[]; // Supports multiple spies
  locations: string[];
  votes?: Record<string, string>; // voterId -> targetPlayerId
  winner?: 'agents' | 'spy';
  winningReason?: string;
  settings: GameSettings;
  votingTimer?: number;
  isPaused: boolean;
}

export interface UserSummary {
  name: string;
  avatar: string;
  stats: {
    wins: number;
    gamesPlayed: number;
    spyWins: number;
  };
}

export interface ServerToClientEvents {
  gameUpdated: (game: GameState) => void;
  error: (message: string) => void;
  timerUpdate: (timeLeft: number) => void;
  leaderboardUpdated: (users: UserSummary[]) => void;
}

export interface ClientToServerEvents {
  createGame: (playerName: string) => void;
  joinGame: (gameId: string, playerName: string) => void;
  startGame: (gameId: string) => void;
  updateSettings: (gameId: string, settings: GameSettings) => void;
  leaveGame: (gameId: string) => void;
  kickPlayer: (gameId: string, playerId: string) => void;
  pauseGame: (gameId: string) => void;
  resumeGame: (gameId: string) => void;
  startVoting: (gameId: string) => void;
  castVote: (gameId: string, targetId: string) => void;
  spyGuess: (gameId: string, location: string) => void;
  resetGame: (gameId: string) => void;
  getLeaderboard: () => void;
}
