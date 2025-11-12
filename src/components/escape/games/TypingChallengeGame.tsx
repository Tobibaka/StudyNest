import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameModalProps } from "../EscapeSection";
import { useEscapeStore } from "@store/escapeStore";

interface FloatingWord {
  id: number;
  text: string;
  expiresAt: number;
  lane: number;
}

const sessionDurationMs = 60000;
const wordTtlMs = 6500;
const spawnIntervalMs = 1800;

const BASE_WORDS = [
  "focus",
  "syntax",
  "ledger",
  "mentor",
  "canvas",
  "galaxy",
  "cursor",
  "module",
  "buffer",
  "puzzle",
  "script",
  "vector",
  "lookup",
  "signal",
  "binary",
  "quartz",
  "branch",
  "anchor",
  "planet",
  "orbits",
  "studio",
  "nimbus",
  "cipher",
  "author",
  "energy"
];

const TypingChallengeGame = ({ onAwardXp, onClose }: GameModalProps) => {
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState("");
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(sessionDurationMs);
  const [message, setMessage] = useState("Press Start to begin!");
  const [typedLetters, setTypedLetters] = useState(0);

  const runningRef = useRef(false);
  const wordIdRef = useRef(0);
  const spawnTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);
  const [seed, setSeed] = useState(() => Math.random());

  const updateStats = useEscapeStore((state) => state.updateGameStats);
  const stats = useEscapeStore((state) => state.gameStats.typing);

  const wordPool = useMemo(() => {
    const shuffled = [...BASE_WORDS].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [seed]);

  const prepareSession = useCallback(() => {
    if (tickRef.current) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
    runningRef.current = false;
    spawnTimerRef.current = null;
    wordIdRef.current = 0;
    startTsRef.current = null;
    setFloatingWords([]);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setMissCount(0);
    setRemainingMs(sessionDurationMs);
    setInput("");
    setTypedLetters(0);
    setSeed(Math.random());
  }, []);

  const resetGame = useCallback(() => {
    setRunning(false);
    prepareSession();
    setMessage("Press Start to begin!");
  }, [prepareSession]);

  useEffect(() => {
    return () => {
      if (tickRef.current) {
        cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
    };
  }, []);

  const finishSession = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (tickRef.current) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
    spawnTimerRef.current = null;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedMs = startTsRef.current ? now - startTsRef.current : sessionDurationMs;
    const minutes = Math.max(elapsedMs / 60000, 0.01);
    const wpm = Math.round((typedLetters / 5) / minutes);
    const attempts = correctCount + missCount;
    const accuracy = attempts === 0 ? 0 : Math.round((correctCount * 100) / attempts);
    setFloatingWords([]);
    const xpEarned = Math.max(0, correctCount * 4 + bestCombo * 3 + Math.floor(wpm / 2));
    if (xpEarned > 0) {
      onAwardXp(xpEarned);
      updateStats("typing", {
        bestScore: stats?.bestScore && stats.bestScore > xpEarned ? stats.bestScore : xpEarned,
        streak: (stats?.streak ?? 0) + 1,
        accuracy,
        additional: {
          ...(stats?.additional ?? {}),
          bestCombo: Math.max(Number(stats?.additional?.bestCombo ?? 0), bestCombo),
          bestWpm: Math.max(Number(stats?.additional?.bestWpm ?? 0), wpm),
          sessions: (Number(stats?.additional?.sessions ?? 0) + 1)
        },
        lastPlayed: new Date().toISOString()
      });
      setMessage(`Session complete! ${wpm} WPM • +${xpEarned} XP`);
    } else {
      updateStats("typing", {
        additional: {
          ...(stats?.additional ?? {}),
          sessions: (Number(stats?.additional?.sessions ?? 0) + 1)
        },
        lastPlayed: new Date().toISOString()
      });
      setMessage("Session complete! Keep practicing to earn XP.");
    }
    startTsRef.current = null;
  }, [bestCombo, correctCount, missCount, onAwardXp, stats, typedLetters, updateStats]);

  const spawnWord = useCallback(
    (timestamp: number) => {
      wordIdRef.current += 1;
      const poolIndex = wordIdRef.current % wordPool.length;
      const candidate = wordPool[poolIndex] ?? BASE_WORDS[wordIdRef.current % BASE_WORDS.length];
  const lane = Math.floor(Math.random() * 4);
      const expiresAt = timestamp + wordTtlMs;
      setFloatingWords((prev) => [...prev, { id: wordIdRef.current, text: candidate, lane, expiresAt }]);
      spawnTimerRef.current = timestamp;
    },
    [wordPool]
  );

  const tick = useCallback(
    (timestamp: number) => {
      if (!runningRef.current) return;
      if (startTsRef.current === null) {
        startTsRef.current = timestamp;
        spawnTimerRef.current = null;
      }

      if (!spawnTimerRef.current || timestamp - spawnTimerRef.current >= spawnIntervalMs) {
        spawnWord(timestamp);
      }

      setFloatingWords((prev) => {
        let expired = 0;
        const next = prev.filter((word) => {
          const alive = word.expiresAt > timestamp;
          if (!alive) expired += 1;
          return alive;
        });
        if (expired) {
          setMissCount((value) => value + expired);
          setCombo(0);
        }
        return next;
      });

      const elapsed = startTsRef.current ? timestamp - startTsRef.current : 0;
      const remaining = Math.max(0, sessionDurationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        finishSession();
        return;
      }
    },
    [finishSession, spawnWord]
  );

  useEffect(() => {
    runningRef.current = running;
    if (!running) return;

    const step = (timestamp: number) => {
      tick(timestamp);
      if (runningRef.current) {
        tickRef.current = requestAnimationFrame(step);
      }
    };

    tickRef.current = requestAnimationFrame(step);
    return () => {
      if (tickRef.current) {
        cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running, tick]);

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const match = floatingWords.find((word) => word.text.toLowerCase() === trimmed.toLowerCase());
    if (!match) {
      setMessage("No match — combo reset.");
      setCombo(0);
      setMissCount((value) => value + 1);
      setInput("");
      return;
    }
    setFloatingWords((prev) => prev.filter((word) => word.id !== match.id));
    setCorrectCount((value) => value + 1);
    setCombo((value) => {
      const nextCombo = value + 1;
      setBestCombo((best) => Math.max(best, nextCombo));
      return nextCombo;
    });
    setTypedLetters((value) => value + match.text.length);
    setMessage(`Nice! ${match.text.toUpperCase()} captured.`);
    setInput("");
  };

  const handleStart = () => {
    if (runningRef.current) return;
    prepareSession();
    setMessage("Words incoming! Keep up the flow.");
    runningRef.current = true;
    setRunning(true);
  };

  const lifetimeBestCombo = Math.max(bestCombo, Number(stats?.additional?.bestCombo ?? 0));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Typing Challenge — Word Flow</h2>
          <p className="text-sm text-text-muted">
            Words drift across four lanes. Capture them with fast, accurate typing before they fade.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Time left: {Math.ceil(remainingMs / 1000)}s
        </div>
      </header>

      <div className="grid gap-3">
        {[0, 1, 2, 3].map((lane) => (
          <div key={lane} className="relative h-14 overflow-hidden rounded-2xl border border-surface-muted/60 bg-surface/70">
            <div className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold uppercase tracking-[0.35em] text-primary/60">
              Lane {lane + 1}
            </div>
            <div className="flex h-full items-center justify-end gap-3 pr-4">
              {floatingWords
                .filter((word) => word.lane === lane)
                .map((word) => {
                  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
                  const remaining = Math.max(0, word.expiresAt - now);
                  const progress = 1 - remaining / wordTtlMs;
                  const clamped = Math.min(1, Math.max(0, progress));
                  const translate = clamped * 160;
                  const widthPercent = Math.round((remaining / wordTtlMs) * 100);
                  return (
                    <div
                      key={word.id}
                      className="relative flex min-w-[90px] flex-col items-center rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm"
                      style={{ transform: `translateX(-${translate}px)`, transition: "none" }}
                    >
                      <span>{word.text}</span>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-primary/20">
                        <div className="h-full bg-primary" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <span>Combo: {combo}</span>
  <span>Best Combo: {lifetimeBestCombo}</span>
        <span>Caught: {correctCount}</span>
        <span>Missed: {missCount}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="flex-1 rounded-full border border-surface-muted/70 bg-surface px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary/60 focus:outline-none"
          placeholder="Type a word and press Enter"
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          disabled={!running}
        />
        <button
          onClick={handleSubmit}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
          disabled={!running}
        >
          Capture
        </button>
        <button
          onClick={handleStart}
          className="rounded-full border border-primary/70 px-4 py-2 text-xs font-semibold text-primary/90 hover:bg-primary/10"
        >
          {running ? "Running" : "Start"}
        </button>
        <button
          onClick={resetGame}
          className="rounded-full border border-surface-muted/70 px-4 py-2 text-xs font-semibold text-text hover:border-primary/50 hover:text-primary"
        >
          Reset
        </button>
        <button
          onClick={() => {
            resetGame();
            onClose();
          }}
          className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold text-primary/80 hover:border-primary/70 hover:text-primary"
        >
          Back to Escape
        </button>
      </div>

      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
};

export default TypingChallengeGame;
