import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EscapeGameId = "sudoku" | "memory" | "catch" | "typing" | "wordle";

export interface EscapeGameStats {
  xp: number;
  bestScore?: number;
  streak?: number;
  bestTimeMs?: number;
  accuracy?: number;
  lastPlayed?: string;
  additional?: Record<string, number | string>;
}

interface EscapeState {
  totalXp: number;
  ambientSound: boolean;
  gameStats: Record<EscapeGameId, EscapeGameStats>;
  addXp: (gameId: EscapeGameId, amount: number) => void;
  updateGameStats: (gameId: EscapeGameId, stats: Partial<EscapeGameStats>) => void;
  toggleAmbientSound: () => void;
  resetAll: () => void;
}

const defaultStats = (): Record<EscapeGameId, EscapeGameStats> => ({
  sudoku: { xp: 0 },
  memory: { xp: 0 },
  catch: { xp: 0 },
  typing: { xp: 0 },
  wordle: { xp: 0 }
});

export const useEscapeStore = create<EscapeState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      ambientSound: false,
      gameStats: defaultStats(),
      addXp: (gameId: EscapeGameId, amount: number) => {
        if (amount <= 0) return;
        set((state) => {
          const nextStats = { ...state.gameStats };
          const current = nextStats[gameId] ?? { xp: 0 };
          const xp = (current.xp ?? 0) + amount;
          nextStats[gameId] = {
            ...current,
            xp,
            lastPlayed: new Date().toISOString()
          };
          return {
            totalXp: state.totalXp + amount,
            gameStats: nextStats
          };
        });
      },
      updateGameStats: (gameId: EscapeGameId, stats: Partial<EscapeGameStats>) => {
        set((state) => {
          const nextStats = { ...state.gameStats };
          const current = nextStats[gameId] ?? { xp: 0 };
          nextStats[gameId] = { ...current, ...stats };
          return { gameStats: nextStats };
        });
      },
      toggleAmbientSound: () => {
        set((state) => ({ ambientSound: !state.ambientSound }));
      },
      resetAll: () => {
        set({ totalXp: 0, gameStats: defaultStats() });
      }
    }),
    {
      name: "studynest-escape",
      version: 1,
      partialize: (state) => ({
        totalXp: state.totalXp,
        ambientSound: state.ambientSound,
        gameStats: state.gameStats
      })
    }
  )
);
