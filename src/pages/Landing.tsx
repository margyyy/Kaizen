import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import goldMedal from "../../media/usaquesto_oro.svg";
import silverMedal from "../../media/usaquesto_argento.svg";
import bronzeMedal from "../../media/usaquesto_bronze.svg";

const ACCENTS: Record<string, string> = {
  slate: "Slate", ancient: "Ancient", red: "Red",
  green: "Green", teal: "Teal", purple: "Purple",
};

const THEME_KEY = "studyflow.theme";
const ACCENT_KEY = "studyflow.accent";
const LANDING_TIMER_KEY = "studyflow.landingTimer";

interface LandingTimerState {
  mode: "focus" | "shortBreak" | "longBreak";
  isRunning: boolean;
  startedAt: number | null;
  durationSec: number;
  remainingSec: number;
  completedFocuses: number;
}

const FOCUS_SEC = 25 * 60;
const SHORT_SEC = 5 * 60;
const LONG_SEC = 15 * 60;

function loadLandingTimer(): LandingTimerState | null {
  try {
    const raw = localStorage.getItem(LANDING_TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLandingTimer(s: LandingTimerState) {
  localStorage.setItem(LANDING_TIMER_KEY, JSON.stringify(s));
}

function computeLandingRemaining(s: LandingTimerState): number {
  if (!s.isRunning || !s.startedAt) return s.remainingSec ?? s.durationSec;
  return Math.max(0, s.durationSec - Math.floor((Date.now() - s.startedAt) / 1000));
}

function defaultDuration(mode: LandingTimerState["mode"]) {
  if (mode === "shortBreak") return SHORT_SEC;
  if (mode === "longBreak") return LONG_SEC;
  return FOCUS_SEC;
}

export default function Landing() {
  const navigate = useNavigate();
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) ?? "slate");
  const [theme] = useState(() => localStorage.getItem(THEME_KEY) ?? "dark");

  const handleOpenApp = () => {
    sessionStorage.setItem("landingSkip", "1");
    navigate("/");
  };

  // Timer state
  const [timerMode, setTimerMode] = useState<LandingTimerState["mode"]>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(FOCUS_SEC);
  const [completedFocuses, setCompletedFocuses] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", `${accent}-${theme}`);
  }, [accent, theme]);

  // Load timer on mount
  useEffect(() => {
    const stored = loadLandingTimer();
    if (stored) {
      const r = computeLandingRemaining(stored);
      if (stored.isRunning && r <= 0) {
        handleLandingCompletion(stored);
        return;
      }
      setTimerMode(stored.mode);
      setIsRunning(stored.isRunning);
      setRemainingSec(r);
      setCompletedFocuses(stored.completedFocuses);

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick
  useEffect(() => {
    if (!isRunning) return;
    const iv = setInterval(() => {
      const stored = loadLandingTimer();
      if (!stored || !stored.isRunning) return;
      const r = computeLandingRemaining(stored);
      if (r <= 0) {
        handleLandingCompletion(stored);
        return;
      }
      setRemainingSec(r);
      saveLandingTimer({ ...stored });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleLandingCompletion = (stored: LandingTimerState) => {
    const wasFocus = stored.mode === "focus";
    const nextFocuses = wasFocus ? stored.completedFocuses + 1 : stored.completedFocuses;
    const nextMode: LandingTimerState["mode"] = wasFocus
      ? nextFocuses % 4 === 0 ? "longBreak" : "shortBreak"
      : "focus";
    const nextDur = defaultDuration(nextMode);

    setTimerMode(nextMode);
    setCompletedFocuses(nextFocuses);
    setRemainingSec(nextDur);
    setIsRunning(true);

    const next: LandingTimerState = {
      mode: nextMode, isRunning: true,
      startedAt: Date.now(), durationSec: nextDur,
      remainingSec: nextDur, completedFocuses: nextFocuses,
    };

    saveLandingTimer(next);
  };

  const toggleTimer = () => {
    const stored = loadLandingTimer();
    if (isRunning) {
      // Pause
      const r = stored ? computeLandingRemaining(stored) : remainingSec;
      setIsRunning(false);
      setRemainingSec(r);
      const s: LandingTimerState = {
        mode: timerMode, isRunning: false, startedAt: stored?.startedAt ?? null,
        durationSec: stored?.durationSec ?? FOCUS_SEC, remainingSec: r,
        completedFocuses,
      };
  
      saveLandingTimer(s);
    } else {
      // Start / Resume
      const now = Date.now();
      if (stored && stored.startedAt && (stored.remainingSec ?? stored.durationSec) > 0) {
        const rem = stored.remainingSec ?? stored.durationSec;
        setIsRunning(true);
        setRemainingSec(rem);
        const s: LandingTimerState = {
          ...stored, isRunning: true, durationSec: rem, remainingSec: rem, startedAt: now,
        };
    
        saveLandingTimer(s);
      } else {
        const dur = defaultDuration(timerMode);
        setIsRunning(true);
        setRemainingSec(dur);
        const s: LandingTimerState = {
          mode: timerMode, isRunning: true, startedAt: now,
          durationSec: dur, remainingSec: dur, completedFocuses,
        };
    
        saveLandingTimer(s);
      }
    }
  };

  const resetTimer = () => {
    const dur = defaultDuration(timerMode);
    setIsRunning(false);
    setRemainingSec(dur);
    const s: LandingTimerState = {
      mode: timerMode, isRunning: false, startedAt: null,
      durationSec: dur, remainingSec: dur, completedFocuses,
    };

    saveLandingTimer(s);
  };

  const handleAccentChange = (key: string) => {
    localStorage.setItem(ACCENT_KEY, key);
    setAccent(key);
    document.documentElement.setAttribute("data-theme", `${key}-${theme}`);
  };

  const durationForMode = defaultDuration(timerMode);
  const progress = Math.min(100, Math.round((1 - remainingSec / durationForMode) * 100));
  const storedHasStarted = !!loadLandingTimer()?.startedAt;

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      {/* ── Nav ── */}
      <nav className="navbar bg-base-100/80 backdrop-blur border-b border-base-300 sticky top-0 z-50">
        <div className="flex-1 px-2">
          <span className="text-xl font-semibold tracking-tight">
            Kaizen<span className="ml-2 text-lg opacity-50">改善</span>
          </span>
        </div>
        <div className="flex gap-2 px-2">
          <button onClick={handleOpenApp} className="btn btn-primary btn-sm">Open App</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Kaizen<span className="ml-4 opacity-40">改善</span>
          </h1>
          <p className="text-xl sm:text-2xl text-base-content/70 max-w-xl mx-auto leading-relaxed">
            Continuous improvement, one Pomodoro at a time.
          </p>
          <p className="mt-6 text-base text-base-content/50 max-w-lg mx-auto leading-relaxed">
            Kaizen is a study companion built around the Pomodoro technique.
            Track your focus sessions across subjects, plan with roadmaps,
            review with spaced-repetition flashcards, and earn achievements
            as you build consistent study habits.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <button onClick={handleOpenApp} className="btn btn-primary btn-lg">Try the Web App</button>
            <a href="#download" className="btn btn-outline btn-lg">Download</a>
          </div>
        </div>
      </section>

      {/* ── Timer + Overview side by side ── */}
      <section className="py-16 px-4 bg-base-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
            {/* Monthly Overview (left) */}
            <div className="flex-1 w-full max-w-sm mx-auto lg:max-w-none text-center">
              <h2 className="text-2xl font-semibold mb-2">Monthly Overview</h2>
              <p className="text-sm text-base-content/50 mb-6">
                Track your study sessions and tasks across the month. Click any day to see details.
              </p>
              <SampleCalendar />
            </div>

            {/* Timer (right) */}
            <div className="flex-1 w-full max-w-sm mx-auto lg:max-w-none text-center">
              <h2 className="text-2xl font-semibold mb-2">Try the Pomodoro Timer</h2>
              <p className="text-sm text-base-content/50 mb-6">
                A classic 25-minute focus timer. Start a session and see how it works.
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {(["focus", "shortBreak", "longBreak"] as const).map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${timerMode === m ? "btn-primary" : "btn-ghost"}`}
                    disabled={isRunning}
                    onClick={() => {
                      const dur = defaultDuration(m);
                      setTimerMode(m);
                      setIsRunning(false);
                      setRemainingSec(dur);
                      saveLandingTimer({
                        mode: m, isRunning: false, startedAt: null,
                        durationSec: dur, remainingSec: dur, completedFocuses,
                      });
                    }}
                  >
                    {m === "focus" ? "Focus" : m === "shortBreak" ? "Short Break" : "Long Break"}
                  </button>
                ))}
              </div>

              {/* Ring */}
              <div className="relative flex items-center justify-center mb-6">
                <div
                  className="radial-progress text-base-300 absolute"
                  style={{ "--value": 100, "--size": "20rem", "--thickness": "14px" } as React.CSSProperties}
                />
                <div
                  className="radial-progress text-primary"
                  style={{ "--value": progress, "--size": "20rem", "--thickness": "14px" } as React.CSSProperties}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-5xl sm:text-6xl font-semibold tabular-nums">
                      {formatTime(remainingSec)}
                    </span>
                    <span className="text-sm text-base-content/60">
                      {timerMode === "focus" ? "Focus" : timerMode === "shortBreak" ? "Short Break" : "Long Break"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3 justify-center mb-4">
                {!isRunning ? (
                  <button className="btn btn-primary min-w-[110px]" onClick={toggleTimer}>
                    {storedHasStarted ? "Resume" : "Start"}
                  </button>
                ) : (
                  <button className="btn btn-outline min-w-[110px]" onClick={toggleTimer}>Pause</button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={resetTimer}
                  disabled={!isRunning && remainingSec === durationForMode}
                >
                  Reset
                </button>
              </div>

              {completedFocuses > 0 && (
                <p className="text-xs text-base-content/40">
                  {completedFocuses} focus session{completedFocuses !== 1 ? "s" : ""} completed
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Accent Switcher ── */}
      <section className="py-16 px-4 bg-base-200">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-2">Pick Your Accent</h2>
          <p className="text-sm text-base-content/50 mb-6">
            Customize the app with your favorite color.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.entries(ACCENTS).map(([key, label]) => (
              <button
                key={key}
                className={`btn ${accent === key ? "btn-primary" : "btn-ghost border border-base-300"}`}
                onClick={() => handleAccentChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Achievements ── */}
      <section className="py-16 px-4 bg-base-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-2">Achievements</h2>
          <p className="text-sm text-base-content/50 text-center mb-10">
            Earn trophies as you build consistent study habits.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {SAMPLE_ACHIEVEMENTS.map((item) => {
              const medal = item.tier === "gold" ? goldMedal : item.tier === "silver" ? silverMedal : bronzeMedal;
              return (
                <div key={item.id} className="card bg-base-200 border border-base-300">
                  <div className="card-body py-6 px-5 items-center text-center gap-4">
                    <div className="achievement-trophy" style={{ filter: "drop-shadow(0 0 10px oklch(var(--a) / 0.55))" }}>
                      <img src={medal} alt={item.tier} className="achievement-medal-img" style={{ width: 56, height: 56 }} />
                    </div>
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-base-content/50 capitalize mt-0.5">{item.tier} tier</div>
                    </div>
                    <p className="text-xs text-base-content/50 leading-relaxed">{item.howToUnlock}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-4 bg-base-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">Everything you need to study</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Subjects & Tasks", desc: "Organize your study material into subjects. Create tasks with due dates and track completion." },
              { title: "Roadmaps", desc: "Break down each subject into macro topics and micro steps. Plan your entire learning path." },
              { title: "Flashcards", desc: "Create decks with spaced repetition. Review cards daily to strengthen long-term memory." },
              { title: "Cloud Sync", desc: "Sign in with Google to sync your data across devices. Never lose your progress." },
              { title: "Desktop App", desc: "Native Tauri app for Windows, macOS, and Linux. Mini overlay window for focus sessions." },
              { title: "Overlay Window", desc: "Mini floating timer window for distraction-free focus. Always on top, always visible." },
            ].map((f) => (
              <div key={f.title} className="card bg-base-200 border border-base-300">
                <div className="card-body p-5">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-base-content/60">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download ── */}
      <section id="download" className="py-16 px-4 bg-base-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-2">Download the Desktop App</h2>
          <p className="text-sm text-base-content/50 mb-8">
            Available for Linux. Extract and run — no installation required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://lpnjxkzeyiifzzycmftg.supabase.co/storage/v1/object/public/Linux/Kaizen-linux-x64.tar.gz"
              className="btn btn-primary btn-lg min-w-[160px] gap-2"
              target="_blank"
              rel="noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Linux
              <span className="text-xs opacity-70 ml-1">.tar.gz</span>
            </a>
          </div>
          <p className="text-xs text-base-content/30 mt-4">
            6 MB &middot; Extract and run <code className="text-base-content/30">./kaizen</code>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-4 border-t border-base-300 bg-base-200">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-base-content/40">
            Kaizen 改善 &mdash; Continuous improvement
          </span>
          <button onClick={handleOpenApp} className="btn btn-primary btn-sm">Open App</button>
        </div>
      </footer>

    </div>
  );
}

const HEAT_ALPHA = [0, 0.2, 0.45, 0.7, 0.92];
const CELL_SIZE = 48;

function heatColorFor(intensity: number) {
  if (intensity <= 0) return "transparent";
  const alpha = HEAT_ALPHA[Math.min(intensity, HEAT_ALPHA.length - 1)];
  return `oklch(var(--a) / ${alpha})`;
}

function getIntensity(minutes: number, maxMinutes: number) {
  if (minutes <= 0 || maxMinutes <= 0) return 0;
  const ratio = minutes / maxMinutes;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

interface FakeTask { title: string; subject: string; completed: boolean; }

interface SampleAchievement {
  id: string;
  name: string;
  desc: string;
  tier: "bronze" | "silver" | "gold";
  howToUnlock: string;
}

const SAMPLE_ACHIEVEMENTS: SampleAchievement[] = [
  {
    id: "the_sage",
    name: "The Sage",
    desc: "Total hours accumulated since registration.",
    tier: "bronze",
    howToUnlock: "Study for 100 hours total to unlock the Bronze trophy.",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    desc: "Late-night study sessions between midnight and 4 AM.",
    tier: "bronze",
    howToUnlock: "Complete 2 late-night sessions in a month to unlock the Bronze trophy. Resets monthly.",
  },
  {
    id: "die_hard",
    name: "Die Hard",
    desc: "Longest daily study streak ever achieved.",
    tier: "silver",
    howToUnlock: "Maintain a 30-day study streak to unlock the Silver trophy.",
  },
];

function SampleCalendar() {
  // January 2026, "today" = Jan 17
  const todayDate = 17;

  // Build fake study data: dateKey → minutes
  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    // Create a nice pattern across January 2026
    const patterns: [number, number][] = [
      // [day, minutes]
      [2, 50], [2, 25],  // Fri Jan 2: 75 min (intensity 3)
      [5, 60], [5, 30],  // Mon Jan 5: 90 min (intensity 3)
      [6, 45],            // Tue Jan 6: 45 min (intensity 2)
      [7, 90], [7, 30],  // Wed Jan 7: 120 min (intensity 4)
      [8, 30],            // Thu Jan 8: 30 min (intensity 1)
      [9, 50], [9, 25],  // Fri Jan 9: 75 min (intensity 3)
      [12, 60],           // Mon Jan 12: 60 min (intensity 2)
      [13, 50], [13, 40],// Tue Jan 13: 90 min (intensity 3)
      [14, 60], [14, 60],// Wed Jan 14: 120 min (intensity 4)
      [15, 25],           // Thu Jan 15: 25 min (intensity 1)
      [16, 50],           // Fri Jan 16: 50 min (intensity 2)
      [19, 60],           // Mon Jan 19: 60 min (intensity 2)
      [20, 90],           // Tue Jan 20: 90 min (intensity 3)
      [21, 60], [21, 30],// Wed Jan 21: 90 min (intensity 3)
      [22, 25],           // Thu Jan 22: 25 min (intensity 1)
      [23, 50],           // Fri Jan 23: 50 min (intensity 2)
      [26, 50], [26, 50],// Mon Jan 26: 100 min (intensity 4)
      [27, 60],           // Tue Jan 27: 60 min (intensity 2)
      [28, 50],           // Wed Jan 28: 50 min (intensity 2)
      [29, 30],           // Thu Jan 29: 30 min (intensity 1)
      [30, 60], [30, 25],// Fri Jan 30: 85 min (intensity 3)
    ];
    for (const [day, mins] of patterns) {
      const key = `2026-01-${String(day).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + mins);
    }
    return map;
  }, []);

  // Build fake tasks: dateKey → tasks
  const tasksByDay = useMemo(() => {
    const map = new Map<string, FakeTask[]>();
    const add = (day: number, title: string, subject: string, completed: boolean) => {
      const key = `2026-01-${String(day).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ title, subject, completed });
    };
    add(2, "Review algebraic structures", "Mathematics", true);
    add(5, "Read chapter 4 — World War II", "History", true);
    add(7, "Solve integrals worksheet", "Mathematics", true);
    add(7, "Anki review — Biology terms", "Biology", true);
    add(9, "Outline essay on climate change", "Science", false);
    add(12, "Practice past exam questions", "Mathematics", false);
    add(14, "Memorize amino acid structures", "Biology", false);
    add(14, "Write lab report introduction", "Biology", false);
    add(19, "Read chapter 5 — Cold War", "History", false);
    add(21, "Flashcards: organic chemistry", "Chemistry", false);
    add(23, "Complete problem set 3", "Mathematics", false);
    add(26, "Study cell division diagrams", "Biology", false);
    add(30, "Prepare for Friday quiz", "Science", false);
    return map;
  }, []);

  const maxMinutes = 120;

  // Build padded calendar cells
  const cells = useMemo(() => {
    // Jan 1, 2026 is Thursday (getDay = 4)
    // Monday-based: (4 + 6) % 7 = 3 padding cells
    const jan1 = new Date(2026, 0, 1);
    const firstDayOfWeek = (jan1.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const daysInJan = 31;

    const result: { date: Date | null; isPadding: boolean }[] = [];
    // Padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push({ date: null, isPadding: true });
    }
    // January days
    for (let d = 1; d <= daysInJan; d++) {
      result.push({ date: new Date(2026, 0, d), isPadding: false });
    }
    // Trailing padding
    while (result.length % 7 !== 0) {
      result.push({ date: null, isPadding: true });
    }
    return result;
  }, []);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Task modal state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedTasks = selectedKey ? (tasksByDay.get(selectedKey) ?? []) : [];

  const openDay = (key: string) => {
    if (tasksByDay.has(key)) {
      setSelectedKey(key);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">January 2026</div>
        <div className="text-xs text-base-content/50">Today · 17 January</div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-semibold uppercase tracking-wider text-base-content/40 pb-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid — matches app: grid-template-rows, auto-flow column */}
      <div
        className="grid gap-1"
        style={{
          gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
          gridAutoFlow: "column",
        }}
      >
        {cells.map((cell, i) => {
          if (cell.isPadding || !cell.date) {
            return (
              <div
                key={`pad-${i}`}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            );
          }

          const d = cell.date.getDate();
          const key = `2026-01-${String(d).padStart(2, "0")}`;
          const minutes = minutesByDay.get(key) ?? 0;
          const intensity = getIntensity(minutes, maxMinutes);
          const hasTasks = tasksByDay.has(key);
          const isToday = d === todayDate;
          const isPast = d < todayDate;
          const isDisabled = isPast && !hasTasks;

          return (
            <button
              key={key}
              type="button"
              className={`relative rounded-[6px] border border-base-300/60 disabled:opacity-40 disabled:cursor-not-allowed ${isToday ? "overview-today-pulse" : ""}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: heatColorFor(intensity),
              }}
              title={`${weekdays[(cell.date.getDay() + 6) % 7]}, Jan ${d} · ${minutes} min`}
              disabled={isDisabled}
              onClick={() => openDay(key)}
            >
              <span className="absolute left-0.5 top-0.5 text-[11px] text-base-content/70 leading-none">
                {d}
              </span>
              {hasTasks && (
                <span className="absolute left-1/2 top-1/2 w-3 h-3 bg-base-content/70 rounded-full -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-base-content/40">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-[3px] border border-base-300/60 inline-block" style={{ backgroundColor: heatColorFor(1) }} /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-[3px] border border-base-300/60 inline-block" style={{ backgroundColor: heatColorFor(4) }} /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-base-content/70 inline-block" /> Tasks
        </span>
      </div>

      {/* Task modal */}
      {selectedKey && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <p className="text-sm text-base-content/50 mt-0.5">{selectedKey}</p>
            <div className="mt-4 space-y-2">
              {selectedTasks.map((task, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div className={`font-medium ${task.completed ? "line-through text-base-content/40" : ""}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-base-content/50">{task.subject}</div>
                  </div>
                  {task.completed && (
                    <span className="text-xs text-success">Done</span>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKey(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
