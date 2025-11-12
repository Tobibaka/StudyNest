import { useCallback, useEffect, useRef, useState } from "react";
import type { GameModalProps } from "../EscapeSection";
import { useEscapeStore } from "@store/escapeStore";

interface FallingItem {
  x: number;
  y: number;
  speed: number;
  type: "book" | "bonus" | "distraction";
}

const width = 520;
const height = 320;
const playerWidth = 100;
const sessionDurationMs = 60_000;

const CatchBookGame = ({ onAwardXp, onClose }: GameModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number>(0);
  const runningRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const playerXRef = useRef(width / 2 - playerWidth / 2);
  const catchesRef = useRef(0);
  const pressedRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  const [running, setRunning] = useState(false);
  const [playerX, setPlayerX] = useState(playerXRef.current);
  const [score, setScore] = useState(0);
  const [catches, setCatches] = useState(0);
  const [misses, setMisses] = useState(0);
  const [golden, setGolden] = useState(0);
  const [remainingMs, setRemainingMs] = useState(sessionDurationMs);
  const [message, setMessage] = useState<string>("Press Start to begin!");

  const updateStats = useEscapeStore((state) => state.updateGameStats);
  const catchStats = useEscapeStore((state) => state.gameStats.catch);

  const itemsRef = useRef<FallingItem[]>([]);
  useEffect(() => {
    catchesRef.current = catches;
  }, [catches]);

  const drawFrame = useCallback((xPosition: number, renderItems: FallingItem[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const centerX = xPosition + playerWidth / 2;
    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.moveTo(centerX - playerWidth / 2, height - 18);
    ctx.quadraticCurveTo(centerX, height - 4, centerX + playerWidth / 2, height - 18);
    ctx.quadraticCurveTo(centerX, height - 32, centerX - playerWidth / 2, height - 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(centerX - playerWidth / 2.2, height - 16);
    ctx.quadraticCurveTo(centerX, height - 10, centerX + playerWidth / 2.4, height - 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - playerWidth / 2.6, height - 13);
    ctx.quadraticCurveTo(centerX, height - 7, centerX + playerWidth / 2.8, height - 14);
    ctx.stroke();

    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(centerX - playerWidth / 2.5, height - 23);
    ctx.quadraticCurveTo(centerX, height - 30, centerX + playerWidth / 2.6, height - 22);
    ctx.stroke();

    renderItems.forEach((item) => {
      ctx.fillStyle = item.type === "bonus" ? "#facc15" : item.type === "book" ? "#f87171" : "#94a3b8";
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.type === "bonus" ? 12 : 9, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const initializeSession = useCallback(
    (startMessage: string) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      runningRef.current = false;
      startRef.current = null;
      lastTimestampRef.current = null;
      spawnTimerRef.current = 0;
      itemsRef.current = [];
      setScore(0);
      setCatches(0);
  catchesRef.current = 0;
      setMisses(0);
      setGolden(0);
      setRemainingMs(sessionDurationMs);
      setMessage(startMessage);
      const center = width / 2 - playerWidth / 2;
      playerXRef.current = center;
      setPlayerX(center);
      drawFrame(center, []);
    },
    [drawFrame]
  );

  const spawnItem = useCallback(() => {
    const rand = Math.random();
    const type: FallingItem["type"] = rand > 0.92 ? "bonus" : rand > 0.8 ? "distraction" : "book";
    const x = Math.random() * (width - 40) + 20;
    const speed = 110 + Math.random() * 90;
    itemsRef.current = [...itemsRef.current, { x, y: -20, speed, type }];
    drawFrame(playerXRef.current, itemsRef.current);
  }, [drawFrame]);

  const finishSession = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    startRef.current = null;
    lastTimestampRef.current = null;
    spawnTimerRef.current = 0;
    const xpEarned = score + golden * 5;
    if (xpEarned > 0) {
      onAwardXp(xpEarned);
      updateStats("catch", {
        bestScore:
          catchStats?.bestScore && catchStats.bestScore > xpEarned ? catchStats.bestScore : xpEarned,
        streak: (catchStats?.streak ?? 0) + 1,
        additional: {
          ...(catchStats?.additional ?? {}),
          catches: (catchStats?.additional?.catches as number | undefined ?? 0) + catches,
          golden: Math.max(Number(catchStats?.additional?.golden ?? 0), golden)
        },
        lastPlayed: new Date().toISOString()
      });
      setMessage(`Session complete! +${xpEarned} XP`);
    } else {
      setMessage("Session complete! Keep trying for XP.");
    }
  }, [catchStats, catches, golden, onAwardXp, score, updateStats]);

  const loop = useCallback(
    (timestamp: number) => {
      if (!runningRef.current) return;
      if (startRef.current === null) {
        startRef.current = timestamp;
        spawnTimerRef.current = timestamp;
      }

      const elapsed = timestamp - (startRef.current ?? timestamp);
      const remaining = Math.max(0, sessionDurationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        finishSession();
        return;
      }

  const spawnDelay = Math.max(350, 1100 - catchesRef.current * 18);
      if (timestamp - spawnTimerRef.current > spawnDelay) {
        spawnItem();
        spawnTimerRef.current = timestamp;
      }

      const delta = lastTimestampRef.current ? (timestamp - lastTimestampRef.current) / 1000 : 0;
      lastTimestampRef.current = timestamp;

      const currentPlayerX = playerXRef.current;

      const currentItems = itemsRef.current;
      const updated: FallingItem[] = [];
      currentItems.forEach((item) => {
        const nextY = item.y + item.speed * delta;
        const catchesNest =
          nextY > height - 70 &&
          nextY < height - 18 &&
          item.x > currentPlayerX &&
          item.x < currentPlayerX + playerWidth;
        if (catchesNest) {
          if (item.type === "book") {
            setScore((s) => s + 5);
            setCatches((c) => c + 1);
          } else if (item.type === "bonus") {
            setScore((s) => s + 12);
            setGolden((g) => g + 1);
          } else {
            setScore((s) => Math.max(0, s - 4));
            setMisses((m) => m + 1);
          }
        } else if (nextY > height) {
          if (item.type === "book") {
            setMisses((m) => m + 1);
          }
        } else {
          updated.push({ ...item, y: nextY });
        }
      });
      itemsRef.current = updated;

      let nextX = currentPlayerX;
      if (pressedRef.current.left) nextX -= 260 * delta;
      if (pressedRef.current.right) nextX += 260 * delta;
      nextX = Math.max(0, Math.min(nextX, width - playerWidth));
      playerXRef.current = nextX;
      setPlayerX(nextX);

      drawFrame(nextX, itemsRef.current);
    },
    [drawFrame, finishSession, spawnItem]
  );

  useEffect(() => {
    runningRef.current = running;
    if (!running) return;

    const step = (timestamp: number) => {
      loop(timestamp);
      if (runningRef.current) {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [loop, running]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") pressedRef.current.left = true;
      if (event.key === "ArrowRight") pressedRef.current.right = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") pressedRef.current.left = false;
      if (event.key === "ArrowRight") pressedRef.current.right = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handlePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pos = event.clientX - rect.left;
      const next = Math.max(0, Math.min(pos - playerWidth / 2, width - playerWidth));
      playerXRef.current = next;
      setPlayerX(next);
    };
    canvas.addEventListener("pointermove", handlePointer);
    return () => canvas.removeEventListener("pointermove", handlePointer);
  }, []);

  const handleStart = () => {
    if (runningRef.current) return;
    initializeSession("Catch the books! Avoid the distractions.");
    runningRef.current = true;
    setRunning(true);
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    startRef.current = now;
    spawnTimerRef.current = now;
    spawnItem();
  };

  const handleReset = () => {
    initializeSession("Press Start to begin!");
    runningRef.current = false;
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Catch Book with Nest — Feed Your Nest</h2>
          <p className="text-sm text-text-muted">
            Move the nest with arrow keys or your pointer. Catch books, snatch golden bonuses, and dodge distractions.
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Time left: {Math.ceil(remainingMs / 1000)}s
        </div>
      </header>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-3xl border border-surface-muted/60 bg-slate-900"
      />

      <p className="text-sm text-text-muted">{message}</p>

      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <span>Score: {score}</span>
        <span>Catches: {catches}</span>
        <span>Golden: {golden}</span>
        <span>Misses: {misses}</span>
        <span>Best Score: {catchStats?.bestScore ?? 0}</span>
        <span>Streak: {catchStats?.streak ?? 0}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleStart}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
        >
          {running ? "Running" : "Start"}
        </button>
        <button
          onClick={handleReset}
          className="rounded-full border border-surface-muted/70 px-4 py-2 text-xs font-semibold text-text hover:border-primary/60 hover:text-primary"
        >
          Reset
        </button>
        <button
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold text-primary/80 hover:border-primary/70 hover:text-primary"
        >
          Back to Escape
        </button>
      </div>
    </div>
  );
};

export default CatchBookGame;
