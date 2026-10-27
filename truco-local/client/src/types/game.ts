export type GamePhase = "lobby" | "play" | "show" | "over";

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  token?: string | null;
}

export interface PendingBet {
  team: number;
  to: number;
}

export interface TableCard {
  s: number;
  c: string;
}

export interface GameState {
  code: string;
  host: string;
  phase: GamePhase;
  players: Player[];
  n: number;
  score: [number, number];
  hands: Record<number, string[]>;
  dealer: number;
  mao: number;
  turn: number;
  maoTeam: number;
  table: TableCard[];
  vazas: number[];
  value: number;
  lastRaise: number;
  pend: PendingBet | null;
  clear: boolean;
  ten: boolean;
  msg: string;
  winner: number | null;
}

export type GameActionType =
  | "addBot"
  | "removeBot"
  | "start"
  | "again"
  | "play"
  | "truco"
  | "accept"
  | "run"
  | "raise";

export interface GameAction {
  type: GameActionType;
  c?: string;
}

export const SUIT_SYMBOLS: Record<string, string> = {
  C: "♣",
  H: "♥",
  S: "♠",
  D: "♦",
};

export const MANILHAS: Record<string, number> = {
  "4C": 14,
  "7H": 13,
  AS: 12,
  "7D": 11,
};

export const ORDINARY_RANKS: Record<string, number> = {
  "3": 10,
  "2": 9,
  A: 8,
  K: 7,
  J: 6,
  Q: 5,
  "7": 4,
  "6": 3,
  "5": 2,
  "4": 1,
};

export function cardStrength(card: string): number {
  return MANILHAS[card] ?? ORDINARY_RANKS[card.charAt(0)] ?? 0;
}

export function nextBetValue(value: number): number {
  return value === 1 ? 3 : value + 3;
}

export function betLabel(value: number): string {
  const labels: Record<number, string> = {
    3: "TRUCO",
    6: "SEIS",
    9: "NOVE",
    12: "DOZE",
  };
  return labels[value] ?? String(value);
}

export function canAskTruco(state: GameState | null, seat: number): boolean {
  return Boolean(
    state &&
      state.phase === "play" &&
      !state.pend &&
      state.turn === seat &&
      !state.ten &&
      state.value < 12 &&
      state.lastRaise !== seat % 2
  );
}
