import { useEffect, useLayoutEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type TimerState } from "../db";

const TIMER_KEY = "studyflow.timer";
const THEME_KEY = "studyflow.theme";
const ACCENT_KEY = "studyflow.accent";
const DURATIONS_KEY = "studyflow.durations";

function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Overlay() {
  const [state, setState] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState(0);

  // Apply theme and accent BEFORE paint to avoid flash
  useLayoutEffect(() => {
    const theme = localStorage.getItem(THEME_KEY) ?? "dark";
    const accent = localStorage.getItem(ACCENT_KEY) ?? "slate";
    document.documentElement.setAttribute("data-theme", `${accent}-${theme}`);
  }, []);

  // Listen for theme/accent changes from the main window
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY || e.key === ACCENT_KEY) {
        const theme = localStorage.getItem(THEME_KEY) ?? "dark";
        const accent = localStorage.getItem(ACCENT_KEY) ?? "slate";
        document.documentElement.setAttribute("data-theme", `${accent}-${theme}`);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const unlockResize = async () => {
      const win = getCurrentWebviewWindow();
      await win.setResizable(true);
    };
    unlockResize();
  }, []);

  useEffect(() => {
    const tick = () => {
      const stored = loadTimer();
      if (!stored) {
        setState(null);
        setRemaining(0);
        return;
      }
      setState(stored);
      setRemaining(computeRemaining(stored));

      // Sync theme in case storage event didn't fire (Tauri)
      const theme = localStorage.getItem(THEME_KEY) ?? "dark";
      const accent = localStorage.getItem(ACCENT_KEY) ?? "slate";
      const current = document.documentElement.getAttribute("data-theme");
      const expected = `${accent}-${theme}`;
      if (current !== expected) {
        document.documentElement.setAttribute("data-theme", expected);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTimer = () => {
    const stored = loadTimer();
    if (!stored) return;

    // Don't allow starting focus without a subject
    if (!stored.isRunning && stored.mode === "focus" && !stored.subjectId) return;

    const currentRemaining = computeRemaining(stored);

    if (stored.isRunning) {
      localStorage.setItem(TIMER_KEY, JSON.stringify({
        ...stored,
        isRunning: false,
        remainingSec: currentRemaining,
        lastTickAt: Date.now(),
      }));
    } else {
      const elapsed = stored.durationSec - currentRemaining;
      const adjustedStart = Date.now() - elapsed * 1000;
      localStorage.setItem(TIMER_KEY, JSON.stringify({
        ...stored,
        isRunning: true,
        startedAt: adjustedStart,
        lastTickAt: Date.now(),
      }));
    }
  };

  const skipBreak = () => {
    const stored = loadTimer();
    if (!stored || stored.mode === "focus") return;

    let focusDuration = 25 * 60;
    try {
      const raw = localStorage.getItem(DURATIONS_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.focus) focusDuration = cfg.focus;
      }
    } catch { /* use default */ }

    localStorage.setItem(TIMER_KEY, JSON.stringify({
      ...stored,
      mode: "focus",
      isRunning: true,
      startedAt: Date.now(),
      durationSec: focusDuration,
      lastTickAt: Date.now(),
    }));
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  if (!state) {
    return (
      <div data-tauri-drag-region className="w-screen h-screen bg-base-100 flex items-center justify-center cursor-move rounded-none">
        <span data-tauri-drag-region className="text-sm opacity-50">Open the app and select a subject</span>
        <button
          onClick={async () => { const win = getCurrentWebviewWindow(); await win.hide(); }}
          className="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost text-base-content/50 w-6 h-6 min-h-0 min-w-0"
        >✕</button>
      </div>
    );
  }

  const isBreak = state.mode !== "focus";
  const canStart = !state.isRunning && state.mode === "focus" && !state.subjectId ? false : true;

  return (
    <div data-tauri-drag-region className="w-screen h-screen bg-base-100 text-base-content flex flex-col items-center justify-center cursor-move rounded-none relative">
      <div className="absolute top-2 left-3 flex items-center gap-2" data-tauri-drag-region>
        <span className="text-sm uppercase tracking-widest opacity-60 font-semibold pointer-events-none">
          {state.mode === "focus" ? "Focus" : state.mode === "shortBreak" ? "Short Break" : "Long Break"}
        </span>
      </div>

      <button
        onClick={async () => { const win = getCurrentWebviewWindow(); await win.hide(); }}
        className="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost text-base-content/50 hover:bg-base-content/20 w-8 h-8 min-h-0 min-w-0 z-50"
      >✕</button>

      <div className="flex flex-col items-center justify-center flex-1 w-full p-4 mt-6" data-tauri-drag-region>
        <div className="text-6xl sm:text-7xl md:text-8xl lg:text-[8rem] font-bold tabular-nums tracking-tight leading-none mb-6 pointer-events-none transition-all">
          {formatTime(remaining)}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          <button onClick={toggleTimer} disabled={!canStart} className="btn btn-primary w-full min-h-0 h-12 sm:h-14 text-sm sm:text-base font-bold tracking-widest">
            {state.isRunning ? "PAUSE" : state.startedAt ? "RESUME" : "START"}
          </button>

          {isBreak && (
            <button onClick={skipBreak} className="btn btn-ghost w-full min-h-0 h-10 sm:h-12 text-xs sm:text-sm tracking-widest text-base-content/60">
              SKIP BREAK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function computeRemaining(state: TimerState): number {
  if (!state.isRunning) return state.remainingSec ?? state.durationSec;
  const elapsed = Math.floor((Date.now() - (state.startedAt ?? Date.now())) / 1000);
  return Math.max(0, state.durationSec - elapsed);
}
