import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  type TimerMode,
  type TimerState,
} from "../db";
import { useData } from "../DataContext";
import { notify } from "../notifications";

const DEFAULT_FOCUS = 25 * 60;
const DEFAULT_SHORT = 5 * 60;
const DEFAULT_LONG = 15 * 60;

const TIMER_KEY = "studyflow.timer";

function loadTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTimer(state: TimerState): void {
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function loadDurations(): { focus: number; shortBreak: number; longBreak: number } | null {
  try {
    const raw = localStorage.getItem("studyflow.durations");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { data, setData } = useData();

  const subjects = data.subjects;
  const tasks = data.tasks.filter((t) => !t.completedAt);
  const sessions = data.studySessions;

  // Initialize all state from localStorage so the first render is correct
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">(
    () => {
      const v = loadTimer()?.subjectId ?? "";
      console.log("[Dashboard init] selectedSubjectId:", v);
      return v;
    },
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | "">(
    () => {
      const v = loadTimer()?.taskId ?? "";
      console.log("[Dashboard init] selectedTaskId:", v);
      return v;
    },
  );
  const [sessionCount, setSessionCount] = useState(0);

  const [focusDuration, setFocusDuration] = useState(
    () => loadDurations()?.focus ?? DEFAULT_FOCUS,
  );
  const [shortBreakDuration, setShortBreakDuration] = useState(
    () => loadDurations()?.shortBreak ?? DEFAULT_SHORT,
  );
  const [longBreakDuration, setLongBreakDuration] = useState(
    () => loadDurations()?.longBreak ?? DEFAULT_LONG,
  );
  const [showDurations, setShowDurations] = useState(false);

  const [mode, setMode] = useState<TimerMode>(
    () => (loadTimer()?.mode as TimerMode) ?? "focus",
  );
  const [isRunning, setIsRunning] = useState(() => {
    const stored = loadTimer();
    if (!stored?.isRunning) return false;
    return computeRemaining(stored) > 0;
  });
  const [remainingSec, setRemainingSec] = useState(() => {
    const stored = loadTimer();
    if (!stored) return DEFAULT_FOCUS;
    return computeRemaining(stored);
  });
  const [completedFocuses, setCompletedFocuses] = useState(
    () => loadTimer()?.completedFocuses ?? 0,
  );

  // ---- Load today's session count for selected subject ----
  useEffect(() => {
    if (selectedSubjectId === "") {
      setSessionCount(0);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const count = sessions.filter(
      (s) => s.subjectId === Number(selectedSubjectId) && s.startedAt >= today,
    ).length;
    setSessionCount(count);
  }, [selectedSubjectId, sessions]);

  // ---- Handle pending task navigation and timer completion on mount ----
  useEffect(() => {
    const pendingRaw = sessionStorage.getItem("pendingTask");
    if (pendingRaw) {
      sessionStorage.removeItem("pendingTask");
      try {
        const pending = JSON.parse(pendingRaw);
        if (pending.subjectId) setSelectedSubjectId(Number(pending.subjectId));
        setSelectedTaskId(pending.taskId ?? "");
      } catch { /* ignore */ }
    }

    const stored = loadTimer();
    if (stored?.isRunning && computeRemaining(stored) <= 0) {
      handleCompletion(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ---- Tick interval ----
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const stored = loadTimer();
      if (!stored || !stored.isRunning) return;

      const remaining = computeRemaining(stored);
      if (remaining <= 0) {
        handleCompletion(stored);
        return;
      }

      setRemainingSec(remaining);
      saveTimer({ ...stored, lastTickAt: Date.now() });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // ---- Duration for current mode ----
  const durationForMode = useMemo(() => {
    switch (mode) {
      case "shortBreak": return shortBreakDuration;
      case "longBreak": return longBreakDuration;
      default: return focusDuration;
    }
  }, [focusDuration, longBreakDuration, mode, shortBreakDuration]);

  // ---- Tasks for selected subject ----
  const tasksForSubject = useMemo(
    () => selectedSubjectId === "" ? [] : tasks.filter((t) => t.subjectId === selectedSubjectId),
    [tasks, selectedSubjectId],
  );

  // ---- Persist idle timer config so overlay can access it ----
  useEffect(() => {
    const stored = loadTimer();
    // Don't overwrite running or paused timers
    if (stored?.isRunning || stored?.startedAt) return;

    saveTimer({
      userId: 0,
      mode,
      isRunning: false,
      durationSec: durationForMode,
      remainingSec: durationForMode,
      subjectId: selectedSubjectId === "" ? undefined : Number(selectedSubjectId),
      taskId: selectedTaskId === "" ? undefined : Number(selectedTaskId),
      completedFocuses,
    } as TimerState);
  }, [mode, durationForMode, selectedSubjectId, selectedTaskId, completedFocuses]);

  // ---- Persist duration config so overlay can access it ----
  useEffect(() => {
    localStorage.setItem("studyflow.durations", JSON.stringify({
      focus: focusDuration,
      shortBreak: shortBreakDuration,
      longBreak: longBreakDuration,
    }));
  }, [focusDuration, shortBreakDuration, longBreakDuration]);

  // ---- Poll for timer changes from overlay ----
  const isRunningRef = useRef(isRunning);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    const poll = setInterval(() => {
      const stored = loadTimer();
      if (!stored) return;
      if (stored.isRunning !== isRunningRef.current) {
        setIsRunning(stored.isRunning);
        setMode(stored.mode as TimerMode);
        setCompletedFocuses(stored.completedFocuses);
        if (stored.isRunning) {
          setRemainingSec(computeRemaining(stored));
        } else {
          setRemainingSec(stored.remainingSec ?? stored.durationSec);
        }
      }
    }, 500);
    return () => clearInterval(poll);
  }, []);

  const canStart = mode !== "focus" || selectedSubjectId !== "";
  const isBreak = mode === "shortBreak" || mode === "longBreak";

  // ---- Timer controls ----
  const buildState = (overrides: Partial<TimerState>): TimerState => ({
    userId: 0,
    mode,
    isRunning,
    durationSec: durationForMode,
    subjectId: selectedSubjectId === "" ? undefined : Number(selectedSubjectId),
    taskId: selectedTaskId === "" ? undefined : Number(selectedTaskId),
    completedFocuses,
    ...overrides,
  } as TimerState);

  const startTimer = async () => {
    if (!canStart) return;
    const stored = loadTimer();
    const now = Date.now();

    // Resume from paused state if the timer was previously started
    if (stored && !stored.isRunning && stored.startedAt && (stored.remainingSec ?? stored.durationSec) > 0) {
      const remaining = stored.remainingSec ?? stored.durationSec;
      const elapsed = stored.durationSec - remaining;
      const adjustedStart = now - elapsed * 1000;
      setIsRunning(true);
      setRemainingSec(remaining);
      saveTimer({
        ...stored,
        isRunning: true,
        startedAt: adjustedStart,
        lastTickAt: now,
      });
    } else {
      setIsRunning(true);
      setRemainingSec(durationForMode);
      saveTimer(buildState({
        isRunning: true,
        startedAt: now,
        durationSec: durationForMode,
        remainingSec: durationForMode,
        lastTickAt: now,
      }));
    }
    await notify("Pomodoro started", mode === "focus" ? "Focus session" : "Break started");
  };

  const pauseTimer = () => {
    const stored = loadTimer();
    if (!stored) return;
    const currentRemaining = computeRemaining(stored);
    setIsRunning(false);
    setRemainingSec(currentRemaining);
    saveTimer({ ...stored, isRunning: false, remainingSec: currentRemaining, lastTickAt: Date.now() });
  };

  const resetTimer = () => {
    setIsRunning(false);
    setRemainingSec(durationForMode);
    saveTimer(buildState({ isRunning: false, remainingSec: durationForMode }));
  };

  const skipBreak = () => {
    const stored = loadTimer();
    if (stored) {
      handleCompletion({ ...stored, mode: isBreak ? mode : "focus" });
    }
  };

  const switchMode = (nextMode: TimerMode) => {
    const nextDuration = durationFor(nextMode, focusDuration, shortBreakDuration, longBreakDuration);
    setMode(nextMode);
    setIsRunning(false);
    setRemainingSec(nextDuration);
    saveTimer({
      ...buildState({}),
      mode: nextMode,
      isRunning: false,
      durationSec: nextDuration,
      remainingSec: nextDuration,
    });
  };

  const handleDurationChange = (modeKey: TimerMode, minutes: number) => {
    const newSec = Math.max(60, minutes * 60);
    const setter =
      modeKey === "focus" ? setFocusDuration
      : modeKey === "shortBreak" ? setShortBreakDuration
      : setLongBreakDuration;

    let newRemainingSec: number | undefined;
    if (mode === modeKey && !isRunning) {
      const oldDuration = durationForMode;
      if (remainingSec >= oldDuration) {
        newRemainingSec = newSec;
        setRemainingSec(newSec);
      } else {
        const completedRatio = (oldDuration - remainingSec) / oldDuration;
        newRemainingSec = Math.round(newSec * (1 - completedRatio));
        setRemainingSec(newRemainingSec);
      }
    }

    setter(newSec);

    if (mode === modeKey && !isRunning && newRemainingSec !== undefined) {
      saveTimer(buildState({ durationSec: newSec, remainingSec: newRemainingSec }));
    }
  };

  const handleCompletion = (stored: TimerState) => {
    const subjectId = stored.subjectId;
    const wasFocus = stored.mode === "focus";

    if (wasFocus && subjectId) {
      const sessionMinutes = Math.round(stored.durationSec / 60);
      const sessionStartedAt = new Date(stored.startedAt ?? Date.now()).toISOString();
      const now = new Date();
      const completedTaskId = stored.taskId;
      setData((prev) => {
        const sessionId = prev.nextId;
        return {
          ...prev,
          nextId: prev.nextId + 1,
          studySessions: [
            ...prev.studySessions,
            {
              id: sessionId,
              userId: 0,
              subjectId,
              minutes: sessionMinutes,
              startedAt: sessionStartedAt,
              endedAt: now.toISOString(),
            },
          ],
          tasks: completedTaskId
            ? prev.tasks.map((t) =>
                t.id === completedTaskId ? { ...t, completedAt: now.toISOString() } : t,
              )
            : prev.tasks,
        };
      });

      // Refresh session count
      const today = new Date().toISOString().slice(0, 10);
      const count = [...data.studySessions, {
        id: -1,
        userId: 0,
        subjectId,
        minutes: sessionMinutes,
        startedAt: sessionStartedAt,
        endedAt: now.toISOString(),
      }].filter((s) => s.subjectId === subjectId && s.startedAt >= today).length;
      setSessionCount(count);
    }

    const nextCompletedFocuses = wasFocus ? stored.completedFocuses + 1 : stored.completedFocuses;
    const nextMode = wasFocus
      ? nextCompletedFocuses % 4 === 0 ? "longBreak" : "shortBreak"
      : "focus";
    const nextDuration = durationFor(nextMode, focusDuration, shortBreakDuration, longBreakDuration);

    setMode(nextMode as TimerMode);
    setCompletedFocuses(nextCompletedFocuses);
    setRemainingSec(nextDuration);
    setIsRunning(true);

    if (wasFocus) setSelectedTaskId("");

    notify(
      wasFocus ? "Focus complete" : "Break complete",
      wasFocus ? "Break time" : "Back to focus",
    );

    saveTimer({
      ...stored,
      mode: nextMode,
      isRunning: true,
      startedAt: Date.now(),
      durationSec: nextDuration,
      completedFocuses: nextCompletedFocuses,
      lastTickAt: Date.now(),
      taskId: wasFocus ? undefined : stored.taskId,
    } as TimerState);
  };

  const formattedTime = formatTime(remainingSec);
  const progress = Math.min(100, Math.round((1 - remainingSec / durationForMode) * 100));

  const openOverlay = async () => {
    try { await invoke("open_overlay"); } catch { /* Tauri only */ }
  };

  const ringSize = "18rem";
  const ringThickness = "16px";

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="card bg-base-100 shadow-sm border border-base-300 w-full max-w-xl p-6 sm:p-8 flex flex-col items-center">
        {/* ---- Modes ---- */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button className={`btn btn-sm ${mode === "focus" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("focus")} disabled={isRunning}>Focus</button>
          <button className={`btn btn-sm ${mode === "shortBreak" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("shortBreak")} disabled={isRunning}>Short Break</button>
          <button className={`btn btn-sm ${mode === "longBreak" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("longBreak")} disabled={isRunning}>Long Break</button>
        </div>

        {/* ---- Timer ring ---- */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="radial-progress text-base-300 absolute" style={{ "--value": 100, "--size": ringSize, "--thickness": ringThickness } as React.CSSProperties} />
          <div className="radial-progress text-primary" style={{ "--value": progress, "--size": ringSize, "--thickness": ringThickness } as React.CSSProperties}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-semibold tabular-nums">{formattedTime}</span>
              <span className="text-sm text-base-content/60">
                {mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short break" : "Long break"}
              </span>
              {selectedSubjectId !== "" && sessionCount > 0 && (
                <span className="text-xs text-base-content/40">{sessionCount} session{sessionCount !== 1 ? "s" : ""} today</span>
              )}
            </div>
          </div>
        </div>

        {/* ---- Controls ---- */}
        <div className="flex gap-3 mb-4 w-full max-w-xs">
          {!isRunning ? (
            <button className="btn btn-primary flex-1" onClick={startTimer} disabled={!canStart}>
              {loadTimer()?.startedAt ? "Resume" : "Start"}
            </button>
          ) : (
            <button className="btn btn-outline flex-1" onClick={pauseTimer}>Pause</button>
          )}
          <button className="btn btn-ghost flex-1" onClick={resetTimer} disabled={!isRunning && remainingSec === durationForMode}>Reset</button>
          {isBreak && isRunning && <button className="btn btn-outline" onClick={skipBreak}>Skip</button>}
        </div>

        {/* ---- Subject & Task selection ---- */}
        <div className="w-full max-w-xs space-y-3 mb-4">
          <div className={`dropdown w-full ${isRunning ? "pointer-events-none opacity-60" : ""}`}>
            <div tabIndex={0} role="button" className="btn btn-outline btn-sm w-full justify-between font-normal">
              <span className={selectedSubjectId === "" ? "text-base-content/50" : ""}>
                {selectedSubjectId === "" ? "Select subject" : subjects.find((s) => s.id === selectedSubjectId)?.name ?? "Select subject"}
              </span>
              <span className="text-xs opacity-50">▾</span>
            </div>
            <ul tabIndex={0} className="dropdown-content menu z-[1] w-full rounded-box bg-base-100 p-2 shadow mt-1 max-h-48 overflow-y-auto">
              <li><button type="button" onClick={() => { setSelectedSubjectId(""); setSelectedTaskId(""); (document.activeElement as HTMLElement)?.blur(); }}>— None</button></li>
              {subjects.map((s) => (
                <li key={s.id}><button type="button" onClick={() => { setSelectedSubjectId(s.id!); setSelectedTaskId(""); (document.activeElement as HTMLElement)?.blur(); }}>{s.name}</button></li>
              ))}
            </ul>
          </div>

          {selectedSubjectId !== "" && tasksForSubject.length > 0 && (
            <div className={`dropdown w-full ${isRunning ? "pointer-events-none opacity-60" : ""}`}>
              <div tabIndex={0} role="button" className="btn btn-outline btn-sm w-full justify-between font-normal">
                <span className={selectedTaskId === "" ? "text-base-content/50" : ""}>
                  {selectedTaskId === "" ? "Select task (optional)" : tasksForSubject.find((t) => t.id === selectedTaskId)?.title ?? "Select task"}
                </span>
                <span className="text-xs opacity-50">▾</span>
              </div>
              <ul tabIndex={0} className="dropdown-content menu z-[1] w-full rounded-box bg-base-100 p-2 shadow mt-1 max-h-48 overflow-y-auto">
                <li><button type="button" onClick={() => { setSelectedTaskId(""); (document.activeElement as HTMLElement)?.blur(); }}>— No task</button></li>
                {tasksForSubject.map((t) => (
                  <li key={t.id}><button type="button" onClick={() => { setSelectedTaskId(t.id!); (document.activeElement as HTMLElement)?.blur(); }}>{t.title}</button></li>
                ))}
              </ul>
            </div>
          )}

          {!canStart && <div className="text-xs text-accent text-center">Select a subject before starting focus.</div>}
        </div>

        {/* ---- Durations ---- */}
        {(() => {
          const timerStarted = !!loadTimer()?.startedAt;
          return (
        <div className="w-full max-w-xs mt-4">
          <button className="btn btn-ghost btn-xs w-full justify-between mb-2" onClick={() => setShowDurations(!showDurations)}>
            <span className="text-xs text-base-content/50">Durations</span>
            <span className={`transition-transform text-[10px] ${showDurations ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showDurations && (
            <div className="flex gap-2">
              {([
                ["Focus", focusDuration, "focus"],
                ["Break", shortBreakDuration, "shortBreak"],
                ["Long", longBreakDuration, "longBreak"],
              ] as [string, number, string][]).map(([label, dur, key]) => (
                <div key={key} className={`flex-1 flex flex-col items-center gap-1 bg-base-200/50 rounded-lg py-2 px-1 ${timerStarted ? "opacity-50" : ""}`}>
                  <span className="text-[10px] text-base-content/50">{label}</span>
                  <div className="flex items-center gap-0.5">
                    <button className="btn btn-ghost btn-xs w-5 h-5 min-h-0 min-w-0 p-0 text-base-content/40 hover:text-base-content"
                      onClick={() => { const mins = Math.round(dur / 60); handleDurationChange(key as TimerMode, mins <= 5 ? 1 : mins - 5); }}
                      disabled={timerStarted || Math.round(dur / 60) <= 1}>−</button>
                    <span className="text-sm font-mono font-medium tabular-nums w-8 text-center">{Math.round(dur / 60)}</span>
                    <button className="btn btn-ghost btn-xs w-5 h-5 min-h-0 min-w-0 p-0 text-base-content/40 hover:text-base-content"
                      onClick={() => { const mins = Math.round(dur / 60); const max = key === "focus" ? 120 : 60; handleDurationChange(key as TimerMode, mins < 5 ? 5 : Math.min(max, mins + 5)); }}
                      disabled={timerStarted || Math.round(dur / 60) >= (key === "focus" ? 120 : 60)}>+</button>
                  </div>
                  <span className="text-[10px] text-base-content/40">min</span>
                </div>
              ))}
            </div>
          )}
        </div>
          );
        })()}

        {typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window) && (
          <button className="btn btn-ghost btn-sm mt-4 hidden md:inline-flex" onClick={openOverlay}>Open overlay</button>
        )}
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function durationFor(mode: TimerMode, focus: number, shortBreak: number, longBreak: number) {
  switch (mode) {
    case "shortBreak": return shortBreak;
    case "longBreak": return longBreak;
    default: return focus;
  }
}

function computeRemaining(state: TimerState): number {
  if (!state.isRunning) return state.remainingSec ?? state.durationSec;
  const elapsed = Math.floor((Date.now() - (state.startedAt ?? Date.now())) / 1000);
  return Math.max(0, state.durationSec - elapsed);
}
