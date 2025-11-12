import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import type { GameModalProps } from "../EscapeSection";
import { useEscapeStore } from "@store/escapeStore";

const sudokuPresets = {
  easy: {
    puzzle:
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution:
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  medium: {
    puzzle:
      "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution:
      "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
  },
  hard: {
    puzzle:
      "300000000005009000200504000040000700020007060000401008000200030000705800000000104",
    solution:
      "369817245415629387278534691846352719921748563753491268187296354634175892592183174"
  }
} satisfies Record<string, { puzzle: string; solution: string }>;

type Difficulty = keyof typeof sudokuPresets;

type Cell = {
  value: string;
  fixed: boolean;
};

const gridIndices = Array.from({ length: 81 }, (_, index) => index);

const SudokuGame = ({ onClose, onAwardXp }: GameModalProps) => {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cells, setCells] = useState<Cell[]>([]);
  const [completed, setCompleted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [startTs, setStartTs] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const updateStats = useEscapeStore((state) => state.updateGameStats);
  const sudokuStats = useEscapeStore((state) => state.gameStats.sudoku);

  const setupBoard = (level: Difficulty) => {
    const preset = sudokuPresets[level];
    const nextCells = preset.puzzle.split("").map((char) => ({
      value: char === "0" ? "" : char,
      fixed: char !== "0"
    }));
    setCells(nextCells);
    setCompleted(false);
    setCelebrate(false);
    setStartTs(Date.now());
    setElapsed(0);
  };

  useEffect(() => {
    setupBoard(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startTs);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startTs]);

  const solution = useMemo(() => sudokuPresets[difficulty].solution, [difficulty]);

  const handleChange = (index: number, value: string) => {
    if (cells[index]?.fixed) return;
    const sanitized = value.replace(/[^1-9]/g, "").slice(0, 1);
    setCells((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value: sanitized };
      return next;
    });
  };

  const handleCheck = () => {
    const current = cells.map((cell) => cell.value || "0").join("");
    if (current.length !== 81) return;
    if (current === solution) {
      const elapsedSeconds = Math.round((Date.now() - startTs) / 1000);
      const xpAward = difficulty === "easy" ? 25 : difficulty === "medium" ? 40 : 60;
      onAwardXp(xpAward);
      updateStats("sudoku", {
        streak: (sudokuStats?.streak ?? 0) + 1,
        bestTimeMs:
          sudokuStats?.bestTimeMs && sudokuStats.bestTimeMs < elapsedSeconds * 1000
            ? sudokuStats.bestTimeMs
            : elapsedSeconds * 1000,
        lastPlayed: new Date().toISOString()
      });
      setCompleted(true);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3200);
    }
  };

  const handleReset = () => setupBoard(difficulty);

  const formatElapsed = () => {
    const seconds = Math.floor(elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Sudoku — Logic Grid</h2>
          <p className="text-sm text-text-muted">
            Solve the puzzle to earn StudyNest XP. Choose a difficulty, fill the grid, and tap check when ready.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span>Time: {formatElapsed()}</span>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-text">
            Difficulty
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              className="rounded-full border border-surface-muted/60 bg-surface px-3 py-1 text-xs"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="rounded-3xl border border-surface-muted/60 bg-surface-elevated/70 p-4 shadow">
          <div className="grid grid-cols-9 overflow-hidden rounded-xl border border-surface-muted/60 text-center text-lg font-semibold">
            {gridIndices.map((index) => {
              const cell = cells[index];
              const row = Math.floor(index / 9);
              const col = index % 9;
              const borderClasses = classNames({
                "border-b": row < 8,
                "border-r": col < 8,
                "border-surface-muted/30": true,
                "border-b-2": (row + 1) % 3 === 0 && row < 8,
                "border-r-2": (col + 1) % 3 === 0 && col < 8
              });
              return (
                <div key={index} className={classNames("relative", borderClasses)}>
                  <input
                    value={cell?.value ?? ""}
                    onChange={(event) => handleChange(index, event.target.value)}
                    readOnly={cell?.fixed}
                    className={classNames(
                      "h-12 w-full border-none bg-transparent text-center outline-none",
                      cell?.fixed ? "text-primary" : "text-text"
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-full border border-surface-muted/70 px-4 py-2 text-xs font-semibold text-text hover:border-primary/60 hover:text-primary"
            >
              Reset
            </button>
            <button
              onClick={handleCheck}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
            >
              Check Solution
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 rounded-3xl border border-primary/30 bg-primary/10 p-5 shadow-inner">
          <p className="text-sm font-semibold text-primary">StudyNest Bird Cheer</p>
          <p className="text-sm text-text-muted">
            Each solved grid feeds your main nest with XP. Complete harder puzzles to climb faster and unlock the
            StudyNest bird celebratory twirls.
          </p>
          <div className="flex items-center gap-4">
            <div className={classNames("text-4xl", celebrate ? "animate-bounce" : "")}>🐦</div>
            <div className="text-sm text-text-muted">
              {completed ? "Brilliant logic! The nest just got a new twig." : "The bird is watching your elegant moves."}
            </div>
          </div>
          <div className="text-xs text-text-muted/80">
            <p>Best Time: {formatBestTime(sudokuStats?.bestTimeMs)}</p>
            <p>Streak: {sudokuStats?.streak ?? 0}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold text-primary/80 hover:border-primary/70 hover:text-primary"
          >
            Back to Escape
          </button>
        </div>
      </div>
    </div>
  );
};

const formatBestTime = (ms?: number) => {
  if (!ms) return "--";
  const seconds = Math.round(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default SudokuGame;
