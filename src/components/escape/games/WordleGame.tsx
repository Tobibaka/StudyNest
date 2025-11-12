import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameModalProps } from "../EscapeSection";
import { useEscapeStore } from "@store/escapeStore";
import { WORDLE_WORDS } from "./wordleWords";

type LetterStatus = "correct" | "present" | "absent";

const referenceDate = new Date("2024-01-01T00:00:00Z");

const WordleGame = ({ onAwardXp, onClose }: GameModalProps) => {
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentRow, setCurrentRow] = useState(0);
  const [guesses, setGuesses] = useState<string[]>(() => Array(6).fill(""));
  const [guessStatuses, setGuessStatuses] = useState<LetterStatus[][]>(() => Array.from({ length: 6 }, () => []));
  const [keyboardState, setKeyboardState] = useState<Record<string, LetterStatus>>({});
  const [feedback, setFeedback] = useState("Guess the StudyNest word of the day. Six tries — you got this.");
  const [result, setResult] = useState<"playing" | "won" | "lost">("playing");

  const updateStats = useEscapeStore((state) => state.updateGameStats);
  const stats = useEscapeStore((state) => state.gameStats.wordle);

  const dictionary = useMemo<Set<string>>(() => new Set(WORDLE_WORDS), []);

  const targetWord = useMemo(() => {
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    const index = ((daysSince % WORDLE_WORDS.length) + WORDLE_WORDS.length) % WORDLE_WORDS.length;
    return WORDLE_WORDS[index];
  }, []);

  const evaluateGuess = useCallback((guess: string): LetterStatus[] => {
    const lowerGuess = guess.toLowerCase();
    const solution = targetWord;
    const resultStatuses: LetterStatus[] = Array(5).fill("absent");
    const solutionLetterCounts: Record<string, number> = {};

    for (let i = 0; i < solution.length; i += 1) {
      const char = solution[i];
      const current = solutionLetterCounts[char] ?? 0;
      solutionLetterCounts[char] = current + 1;
    }

    for (let i = 0; i < lowerGuess.length; i += 1) {
      if (lowerGuess[i] === solution[i]) {
        resultStatuses[i] = "correct";
        solutionLetterCounts[solution[i]] -= 1;
      }
    }

    for (let i = 0; i < lowerGuess.length; i += 1) {
      if (resultStatuses[i] === "correct") continue;
      const char = lowerGuess[i];
      if (solutionLetterCounts[char] && solutionLetterCounts[char] > 0) {
        resultStatuses[i] = "present";
        solutionLetterCounts[char] -= 1;
      }
    }

    return resultStatuses;
  }, [targetWord]);

  const updateKeyboard = useCallback((guess: string, statuses: LetterStatus[]) => {
    setKeyboardState((prev) => {
      const next = { ...prev };
      guess.split("").forEach((letter, index) => {
        const status = statuses[index];
        const existing = next[letter];
        switch (status) {
          case "correct":
            next[letter] = "correct";
            break;
          case "present":
            if (existing !== "correct") {
              next[letter] = "present";
            }
            break;
          case "absent":
            if (!existing) {
              next[letter] = "absent";
            }
            break;
          default:
            break;
        }
      });
      return next;
    });
  }, []);

  const finishGame = useCallback(
    (won: boolean, attempts: number) => {
      if (result !== "playing") return;
      const baseXp = won ? Math.max(15, 55 - attempts * 5) : 8;
      onAwardXp(baseXp);
      const previousStreak = stats?.streak ?? 0;
      const nextStreak = won ? previousStreak + 1 : 0;
      updateStats("wordle", {
        bestScore: stats?.bestScore && stats.bestScore > baseXp ? stats.bestScore : baseXp,
        streak: nextStreak,
        additional: {
          ...(stats?.additional ?? {}),
          gamesPlayed: Number(stats?.additional?.gamesPlayed ?? 0) + 1,
          gamesWon: Number(stats?.additional?.gamesWon ?? 0) + (won ? 1 : 0),
          lastWord: targetWord,
          lastResult: won ? "win" : "loss"
        },
        lastPlayed: new Date().toISOString()
      });
      setFeedback(won ? `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}! +${baseXp} XP` : `The word was ${targetWord.toUpperCase()}. +${baseXp} XP for the effort.`);
      setResult(won ? "won" : "lost");
    },
    [onAwardXp, result, stats, targetWord, updateStats]
  );

  const handleSubmit = useCallback(() => {
    if (result !== "playing") return;
    if (currentGuess.length !== 5) {
      setFeedback("Need a full five-letter word.");
      return;
    }
    if (!dictionary.has(currentGuess.toLowerCase())) {
      setFeedback("Word not in StudyNest dictionary.");
      return;
    }
    const statuses = evaluateGuess(currentGuess);
    updateKeyboard(currentGuess, statuses);

    setGuesses((prev) => {
      const next = [...prev];
      next[currentRow] = currentGuess.toUpperCase();
      return next;
    });
    setGuessStatuses((prev) => {
      const next = [...prev];
      next[currentRow] = statuses;
      return next;
    });

    const nextRow = currentRow + 1;
    setCurrentRow(nextRow);
    setCurrentGuess("");

    if (statuses.every((status) => status === "correct")) {
      finishGame(true, nextRow);
      return;
    }
    if (nextRow >= 6) {
      finishGame(false, nextRow);
      return;
    }
    setFeedback("Great attempt! Keep solving.");
  }, [currentGuess, currentRow, evaluateGuess, finishGame, result, updateKeyboard]);

  const handleKey = useCallback(
    (letter: string) => {
      if (result !== "playing") return;
      if (letter === "ENTER") {
        handleSubmit();
      } else if (letter === "BACK") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(letter) && currentGuess.length < 5) {
        setCurrentGuess((prev) => `${prev}${letter}`);
      }
    },
    [currentGuess.length, handleSubmit, result]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (result !== "playing") return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleKey("ENTER");
      } else if (event.key === "Backspace") {
        event.preventDefault();
        handleKey("BACK");
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKey(event.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKey, result]);

  const rows = guesses.map((guess, rowIndex) => {
    const letters = guess.split("");
    const statuses = guessStatuses[rowIndex] ?? [];
    return { letters, statuses };
  });

  const keyboardRows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"]
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Wordle — Daily Nest Word</h2>
          <p className="text-sm text-text-muted">Same rules you love, tuned for StudyNest. Letters highlight: green correct, amber present, slate absent.</p>
        </div>
      </header>

      <div className="grid gap-2">
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, colIndex) => {
              const letter = row.letters[colIndex] ?? (rowIndex === currentRow ? currentGuess[colIndex]?.toUpperCase() : "");
              const status = row.statuses[colIndex];
              const statusClass =
                status === "correct"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : status === "present"
                  ? "border-amber-400 bg-amber-500/20 text-amber-200"
                  : status === "absent"
                  ? "border-slate-600 bg-slate-700/40 text-slate-300"
                  : "border-slate-500/50 bg-slate-800/60 text-slate-200";
              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl font-bold transition ${statusClass}`}
                >
                  {letter ?? ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-sm text-text-muted">{feedback}</p>

      <div className="flex flex-col gap-2 text-xs">
        {keyboardRows.map((row, rowIndex) => (
          <div key={`kb-${rowIndex}`} className="flex justify-center gap-2">
            {row.map((key) => {
              const lower = key.toLowerCase();
              const status = keyboardState[lower];
              const baseClasses = "rounded-xl px-3 py-2 font-semibold shadow transition";
              const statusClass =
                status === "correct"
                  ? "bg-emerald-500/80 text-white"
                  : status === "present"
                  ? "bg-amber-500/80 text-white"
                  : status === "absent"
                  ? "bg-slate-700/80 text-slate-200"
                  : "bg-slate-600/60 text-slate-100";
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`${baseClasses} ${statusClass}`}
                  disabled={result !== "playing"}
                >
                  {key === "BACK" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-3 text-xs font-semibold text-text-muted">
        <button
          onClick={() => {
            setCurrentGuess("");
            setCurrentRow(0);
            setGuesses(Array(6).fill(""));
            setGuessStatuses(Array.from({ length: 6 }, () => []));
            setKeyboardState({});
            setFeedback("New round! Same word until tomorrow.");
            setResult("playing");
          }}
          className="rounded-full border border-primary/50 px-4 py-2 text-primary/80 hover:bg-primary/10"
        >
          Reset Board
        </button>
        <button
          onClick={() => onClose()}
          className="rounded-full border border-surface-muted/60 px-4 py-2 text-text hover:border-primary/50 hover:text-primary"
        >
          Back to Escape
        </button>
      </div>
    </div>
  );
};

export default WordleGame;
