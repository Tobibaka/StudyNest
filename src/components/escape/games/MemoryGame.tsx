import { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import type { GameModalProps } from "../EscapeSection";
import { useEscapeStore } from "@store/escapeStore";

interface MemoryCard {
  id: number;
  icon: string;
  matched: boolean;
  revealed: boolean;
}

const icons = ["📚", "💡", "☕", "🪶", "🎧", "🧠", "✏️", "🗂️"];
const timeLimitSeconds = 75;

const MemoryGame = ({ onAwardXp, onClose }: GameModalProps) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [startTs, setStartTs] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [playerScores, setPlayerScores] = useState<[number, number]>([0, 0]);
  const [completed, setCompleted] = useState(false);
  const completionRef = useRef(false);

  const updateStats = useEscapeStore((state) => state.updateGameStats);
  const memoryStats = useEscapeStore((state) => state.gameStats.memory);

  const deck = useMemo(() => shuffle(createDeck()), []);

  useEffect(() => {
    setCards(deck);
  }, [deck]);

  useEffect(() => {
    if (completed) return;
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startTs);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startTs, completed]);

  const revealCard = (index: number) => {
    if (completed) return;
    const card = cards[index];
    if (!card || card.matched || card.revealed || selection.length === 2) return;
    const nextCards = cards.map((item, idx) => (idx === index ? { ...item, revealed: true } : item));
    const nextSelection = [...selection, index];
    setCards(nextCards);
    setSelection(nextSelection);

    if (nextSelection.length === 2) {
      const [firstIdx, secondIdx] = nextSelection;
      const first = nextCards[firstIdx];
      const second = nextCards[secondIdx];
      const isMatch = first.icon === second.icon;
      window.setTimeout(() => {
        if (isMatch) {
          const updated = nextCards.map((item, idx) =>
            idx === firstIdx || idx === secondIdx ? { ...item, matched: true } : item
          );
          setCards(updated);
          setMatches((prev) => prev + 1);
          setCombo((prev) => {
            const nextCombo = prev + 1;
            setBestCombo((best) => Math.max(best, nextCombo));
            return nextCombo;
          });
          if (twoPlayer) {
            setPlayerScores((prev) => {
              const copy: [number, number] = [...prev];
              copy[currentPlayer] += 1;
              return copy;
            });
          }
        } else {
          const hidden = nextCards.map((item, idx) =>
            idx === firstIdx || idx === secondIdx ? { ...item, revealed: false } : item
          );
          setCards(hidden);
          setCombo(0);
          if (twoPlayer) {
            setCurrentPlayer((prev) => (prev === 0 ? 1 : 0));
          }
        }
        setSelection([]);
        setMoves((prev) => prev + 1);
      }, 600);
    }
  };

  useEffect(() => {
    if (matches === icons.length && !completionRef.current) {
      completionRef.current = true;
      setCompleted(true);
      const totalSeconds = Math.round((Date.now() - startTs) / 1000);
      const finishedWithinLimit = totalSeconds <= timeLimitSeconds;
      const xpBase = 30;
      const xpBonus = finishedWithinLimit ? 10 : 0;
      const duoBonus = twoPlayer ? 5 : 0;
      onAwardXp(xpBase + xpBonus + duoBonus);
      updateStats("memory", {
        streak: (memoryStats?.streak ?? 0) + 1,
        bestScore:
          memoryStats?.bestScore && memoryStats.bestScore < totalSeconds
            ? memoryStats.bestScore
            : totalSeconds,
        additional: {
          ...(memoryStats?.additional ?? {}),
          bestCombo: Math.max(Number(memoryStats?.additional?.bestCombo ?? 0), bestCombo)
        },
        lastPlayed: new Date().toISOString()
      });
    }
  }, [bestCombo, matches, memoryStats, onAwardXp, startTs, twoPlayer, updateStats]);

  const handleRestart = () => {
    const reshuffled = shuffle(createDeck());
    setCards(reshuffled);
    setSelection([]);
    setMoves(0);
    setMatches(0);
    setCombo(0);
    setBestCombo(0);
    setPlayerScores([0, 0]);
    setCurrentPlayer(0);
    setCompleted(false);
    completionRef.current = false;
    setStartTs(Date.now());
    setElapsed(0);
  };

  const elapsedSeconds = Math.round(elapsed / 1000);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Memory Card — Memory Flip</h2>
          <p className="text-sm text-text-muted">
            Flip two cards to find matching pairs. Keep the streak glowing and earn XP bonuses for quick clears.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Moves {moves}</div>
          <div>Time {elapsedSeconds}s</div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={twoPlayer}
              onChange={(event) => {
                setTwoPlayer(event.target.checked);
                handleRestart();
              }}
            />
            <span>Two players</span>
          </label>
        </div>
      </div>

      {twoPlayer ? (
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span className={classNames("rounded-full px-3 py-1", currentPlayer === 0 ? "bg-primary/20 text-primary" : "bg-surface-muted/40") }>
            Player 1: {playerScores[0]}
          </span>
          <span className={classNames("rounded-full px-3 py-1", currentPlayer === 1 ? "bg-primary/20 text-primary" : "bg-surface-muted/40") }>
            Player 2: {playerScores[1]}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
        {cards.map((card, index) => (
          <button
            key={card.id}
            className={classNames(
              "flex h-20 items-center justify-center rounded-2xl border text-3xl transition",
              card.matched
                ? "border-primary/60 bg-primary/10 text-primary"
                : card.revealed
                ? "border-primary/30 bg-surface-muted/30"
                : "border-surface-muted/60 bg-surface-elevated/80 hover:border-primary/60"
            )}
            onClick={() => revealCard(index)}
          >
            {card.revealed || card.matched ? card.icon : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <span>Combo: {combo}</span>
        <span>Best Combo: {Math.max(bestCombo, Number(memoryStats?.additional?.bestCombo ?? 0))}</span>
        <span>Best Time: {formatSeconds(memoryStats?.bestScore)}</span>
        <span>Streak: {memoryStats?.streak ?? 0}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleRestart}
          className="rounded-full border border-surface-muted/70 px-4 py-2 text-xs font-semibold text-text hover:border-primary/60 hover:text-primary"
        >
          Restart
        </button>
        <button
          onClick={onClose}
          className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-primary/90"
        >
          Back to Escape
        </button>
      </div>
    </div>
  );
};

const createDeck = (): MemoryCard[] => {
  const doubled = icons.flatMap((icon, idx) => [
    { id: idx * 2, icon, matched: false, revealed: false },
    { id: idx * 2 + 1, icon, matched: false, revealed: false }
  ]);
  return doubled;
};

const shuffle = (list: MemoryCard[]): MemoryCard[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const formatSeconds = (seconds?: number) => {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default MemoryGame;
