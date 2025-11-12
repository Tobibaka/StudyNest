import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CubeTransparentIcon,
  SparklesIcon,
  CursorArrowRippleIcon,
  BoltIcon,
  AcademicCapIcon
} from "@heroicons/react/24/outline";
import { useEscapeStore, type EscapeGameId } from "@store/escapeStore";
import SudokuGame from "./games/SudokuGame";
import MemoryGame from "./games/MemoryGame";
import CatchBookGame from "./games/CatchBookGame";
import TypingChallengeGame from "./games/TypingChallengeGame";
import WordleGame from "./games/WordleGame";

export type GameModalProps = {
  onClose: () => void;
  onAwardXp: (amount: number) => void;
};

type GameCard = {
  id: EscapeGameId;
  title: string;
  subtitle: string;
  description: string;
  icon: JSX.Element;
};

const gameCards: GameCard[] = [
  {
    id: "sudoku",
    title: "Sudoku",
    subtitle: "Logic Grid",
    description: "Fill the 9×9 grid without repeating numbers and race the timer.",
    icon: <CubeTransparentIcon className="h-7 w-7 text-primary" />
  },
  {
    id: "memory",
    title: "Memory Card",
    subtitle: "Flip & Match",
    description: "Pair icons, build combos, and keep your focus sharp.",
    icon: <SparklesIcon className="h-7 w-7 text-primary" />
  },
  {
    id: "catch",
    title: "Catch Book with Nest",
    subtitle: "Reflex Rush",
    description: "Glide the nest, snag books, and dodge distractions for points.",
    icon: <CursorArrowRippleIcon className="h-7 w-7 text-primary" />
  },
  {
    id: "typing",
    title: "Typing Challenge",
    subtitle: "Word Flow",
    description: "Capture drifting words, build streaks, and track your WPM.",
    icon: <BoltIcon className="h-7 w-7 text-primary" />
  },
  {
    id: "wordle",
    title: "Wordle",
    subtitle: "Daily Nest Word",
    description: "Guess the five-letter StudyNest word of the day in six tries.",
    icon: <AcademicCapIcon className="h-7 w-7 text-primary" />
  }
];

const components: Record<EscapeGameId, (props: GameModalProps) => JSX.Element> = {
  sudoku: SudokuGame,
  memory: MemoryGame,
  catch: CatchBookGame,
  typing: TypingChallengeGame,
  wordle: WordleGame
};

const xpPerLevel = 120;

const EscapeSection = () => {
  const totalXp = useEscapeStore((state) => state.totalXp);
  const gameStats = useEscapeStore((state) => state.gameStats);
  const addXp = useEscapeStore((state) => state.addXp);

  const [activeGame, setActiveGame] = useState<EscapeGameId | null>(null);
  const [xpFlash, setXpFlash] = useState<{ amount: number; title: string } | null>(null);

  const levelInfo = useMemo(() => {
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const currentLevelXp = totalXp % xpPerLevel;
    const percent = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));
    return { level, currentLevelXp, percent };
  }, [totalXp]);

  const handleAwardXp = (gameId: EscapeGameId, amount: number) => {
    if (amount <= 0) return;
    addXp(gameId, amount);
    const title = gameCards.find((card) => card.id === gameId)?.title ?? "Escape";
    setXpFlash({ amount, title });
    window.setTimeout(() => setXpFlash(null), 1800);
  };

  const GameComponent = activeGame ? components[activeGame] : null;

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-surface-muted/60 bg-surface-elevated/60 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-text">Escape</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Take a mindful break with five cozy StudyNest mini-games. Earn XP offline and sync when you are back online.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-muted">
          <div className="flex min-w-[220px] flex-1 flex-col gap-2">
            <span className="flex items-baseline justify-between">
              <span className="font-semibold text-text">XP Level {levelInfo.level}</span>
              <span>{levelInfo.currentLevelXp}/{xpPerLevel}</span>
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${levelInfo.percent}%` }} />
            </div>
          </div>
          <div className="rounded-full border border-surface-muted/60 px-4 py-2 font-semibold text-text">
            Total XP: {totalXp}
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {gameCards.map((card) => {
          const stats = gameStats[card.id];
          return (
            <article
              key={card.id}
              className="flex h-full flex-col justify-between rounded-3xl border border-surface-muted/50 bg-surface-elevated/60 p-5 shadow-sm transition hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-primary/60">{card.subtitle}</p>
                  <h2 className="mt-1 text-lg font-semibold text-text">{card.title}</h2>
                  <p className="mt-1 text-sm text-text-muted">{card.description}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-text-muted">
                <div>
                  <span className="font-semibold text-text">XP</span>: {stats?.xp ?? 0}
                  {stats?.streak ? <span className="ml-3">Streak: {stats.streak}</span> : null}
                  {typeof stats?.bestScore === "number" ? <span className="ml-3">Best: {stats.bestScore}</span> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveGame(card.id)}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-primary/90"
                >
                  Play
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {xpFlash ? (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="rounded-full bg-primary/20 px-6 py-3 text-sm font-semibold text-primary backdrop-blur">
            +{xpFlash.amount} XP · {xpFlash.title}
          </div>
        </div>
      ) : null}

      {activeGame && GameComponent
        ? createPortal(
            <GameModal onClose={() => setActiveGame(null)}>
              <GameComponent
                onClose={() => setActiveGame(null)}
                onAwardXp={(amount) => handleAwardXp(activeGame, amount)}
              />
            </GameModal>,
            document.body
          )
        : null}
    </section>
  );
};

const GameModal = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur">
    <div className="relative max-h-[90vh] w-[min(960px,95vw)] overflow-hidden rounded-3xl border border-white/10 bg-surface p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Escape Game</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-primary/40 px-4 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Back to Escape
        </button>
      </div>
      <div className="custom-scroll max-h-[78vh] overflow-y-auto pr-2">{children}</div>
    </div>
  </div>
);

export default EscapeSection;
