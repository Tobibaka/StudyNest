import React,{ useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@components/TopBar";
import { useUIStore } from "@store/uiStore";
import { logFocusedMinutes } from "@store/focusService";
import { useSettingsStore } from "@store/settingsStore";

const POMODORO_DURATION = 25 * 60; // seconds

const formatTime = (remaining: number) => {
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = Math.floor(remaining % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const ClockSection = () => {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const theme = useSettingsStore((state) => state.theme);

  const formatDigit = (num: number): string => num.toString().padStart(2, '0');

  // Canvas progress circle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth, 360);
      canvas.width = size * 2;
      canvas.height = size * 2;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Theme-aware colors
    const bgColor = theme === "dark" ? "#0B1220" : "#f8fafc";
    const trackColor = theme === "dark" ? "rgba(56, 189, 248, 0.2)" : "rgba(37, 99, 235, 0.2)";
    const progressColor = theme === "dark" ? "#38BDF8" : "#2563eb";

    // Fill canvas background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const center = canvas.width / 2;
    const radius = canvas.width / 2 - 20;

    // Background circle
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 40;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress circle
    const progress = elapsed / POMODORO_DURATION;
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }, [elapsed, theme]);

  // Timer logic
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - elapsed * 1000;
      }
      const delta = Math.floor((timestamp - startTimeRef.current) / 1000);
      const nextElapsed = Math.min(delta, POMODORO_DURATION);
      setElapsed(nextElapsed);
      setTimeLeft(POMODORO_DURATION - nextElapsed);

      if (nextElapsed >= POMODORO_DURATION) {
        setIsRunning(false);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, elapsed]);

  const handleStart = () => {
    if (elapsed >= POMODORO_DURATION) {
      setElapsed(0);
      setTimeLeft(POMODORO_DURATION);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setTimeLeft(POMODORO_DURATION);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Theme-aware style variables
  const containerBg = theme === "dark" ? "#0B1220" : "#f8fafc";
  const textColor = theme === "dark" ? "white" : "#0f172a";
  const textMutedColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const primaryColor = theme === "dark" ? "#38BDF8" : "#2563eb";
  const digitTopBg = theme === "dark" ? "#1e3a5f" : "#e0e7ff";
  const digitBottomBg = theme === "dark" ? "#2d4a6f" : "#c7d2fe";

  return (
    <div className="relative flex h-screen flex-col gap-5 p-6" style={{ backgroundColor: containerBg }}>
      <style>{`
        @keyframes flipDownFade {
          0% {
            transform: rotateX(0deg);
            opacity: 1;
          }
          100% {
            transform: rotateX(-180deg);
            opacity: 0;
          }
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .flip-card {
          perspective: 1000px;
        }

        .digit-half {
          position: absolute;
          width: 100%;
          height: 50%;
          overflow: hidden;
          background: ${digitTopBg};
        }

        .digit-top {
          top: 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .digit-bottom {
          bottom: 0;
          border-radius: 0 0 0.5rem 0.5rem;
          background: ${digitBottomBg};
        }

        .digit-content {
          position: absolute;
          width: 100%;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .digit-content-top {
          height: 200%;
          top: 0;
        }

        .digit-content-bottom {
          height: 200%;
          bottom: 0;
        }

        .flip-top-animated {
          position: absolute;
          top: 0;
          width: 100%;
          height: 50%;
          overflow: hidden;
          transform-origin: bottom;
          animation: flipDownFade 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
          z-index: 20;
          backface-visibility: hidden;
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          border-radius: 0.5rem 0.5rem 0 0;
          background: ${digitTopBg};
        }

        .flip-bottom-animated {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 50%;
          overflow: hidden;
          animation: fadeOut 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
          z-index: 20;
          border-radius: 0 0 0.5rem 0.5rem;
          background: ${digitBottomBg};
        }
      `}</style>

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: textColor }}>Clock & Focus</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFocusMode(!focusMode)}
            className="rounded-full border-2 px-4 py-2 text-sm font-semibold transition hover:opacity-80"
            style={{ borderColor: textColor, color: textColor }}
          >
            {focusMode ? "Disable Focus Mode" : "Enter Focus Mode"}
          </button>
        </div>
      </div>

      {/* Clock Section */}
      <section
        className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl p-8 transition-all duration-500 ${
          focusMode 
            ? "fixed inset-0 z-50 m-0 rounded-none bg-transparent scale-100" 
            : "border shadow-lg"
        }`}
        style={{ 
          backgroundColor: focusMode ? 'transparent' : containerBg,
          borderColor: theme === "dark" ? "#374151" : "#e5e7eb"
        }}
      >
        <canvas ref={canvasRef} className="mb-8" />
        
        {/* Flip Clock Display */}
        <div className="flex items-center gap-3 mb-6">
          <FlipDigit value={formatDigit(minutes)[0]} textColor={textColor} digitTopBg={digitTopBg} digitBottomBg={digitBottomBg} />
          <FlipDigit value={formatDigit(minutes)[1]} textColor={textColor} digitTopBg={digitTopBg} digitBottomBg={digitBottomBg} />
          <div className="text-6xl font-bold mx-2" style={{ color: textColor }}>:</div>
          <FlipDigit value={formatDigit(seconds)[0]} textColor={textColor} digitTopBg={digitTopBg} digitBottomBg={digitBottomBg} />
          <FlipDigit value={formatDigit(seconds)[1]} textColor={textColor} digitTopBg={digitTopBg} digitBottomBg={digitBottomBg} />
        </div>

        <p className="text-sm mb-8" style={{ color: textMutedColor }}>
          {isRunning ? "Stay focused and keep momentum." : "Start a session when you're ready."}
        </p>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleStart}
            style={{ backgroundColor: primaryColor }}
            className="min-w-[140px] rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            {isRunning ? "Keep Going" : "Start"}
          </button>
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className="min-w-[120px] rounded-full border-2 px-5 py-3 text-sm font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ 
              backgroundColor: containerBg,
              borderColor: textColor,
              color: textColor
            }}
          >
            Pause
          </button>
          <button
            onClick={handleReset}
            className="min-w-[120px] rounded-full border-2 px-5 py-3 text-sm font-semibold transition hover:opacity-80"
            style={{ 
              backgroundColor: containerBg,
              borderColor: textColor,
              color: textColor
            }}
          >
            Reset
          </button>
        </div>
      </section>

      {/* Blur overlay for focus mode */}
      {focusMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 pointer-events-none" />
      )}
    </div>
  );
};

interface FlipDigitProps {
  value: string;
  textColor: string;
  digitTopBg: string;
  digitBottomBg: string;
}

const FlipDigit: React.FC<FlipDigitProps> = ({ value, textColor, digitTopBg, digitBottomBg }) => {
  const [displayDigit, setDisplayDigit] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== displayDigit) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setDisplayDigit(value);
        setIsFlipping(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [value, displayDigit]);

  return (
    <div className="flip-card relative w-16 h-24 sm:w-20 sm:h-28">
      <div className="relative w-full h-full">
        <div className="digit-half digit-top" style={{ zIndex: 10 }}>
          <div className="digit-content digit-content-top text-5xl sm:text-6xl font-bold" style={{ color: textColor }}>
            {value}
          </div>
        </div>
        <div className="digit-half digit-bottom" style={{ zIndex: 5 }}>
          <div className="digit-content digit-content-bottom text-5xl sm:text-6xl font-bold" style={{ color: textColor }}>
            {value}
          </div>
        </div>
        {isFlipping && (
          <>
            <div className="flip-top-animated">
              <div className="digit-content digit-content-top text-5xl sm:text-6xl font-bold" style={{ color: textColor }}>
                {displayDigit}
              </div>
            </div>
            <div className="flip-bottom-animated">
              <div className="digit-content digit-content-bottom text-5xl sm:text-6xl font-bold" style={{ color: textColor }}>
                {displayDigit}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClockSection;
