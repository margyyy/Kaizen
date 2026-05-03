import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { DataProvider } from "./DataContext";
import type { AppData } from "./storage/types";
import { loadData, saveData } from "./storage";
import { createEmptyData } from "./storage/types";
import { getStoredUsername, setStoredUsername, clearStoredUsername } from "./auth";
import { supabase } from "./supabase";
import { pullData, pushData, setSyncEnabled, signInWithGoogle } from "./sync";
import { checkForUpdate } from "./updateCheck";
import UpdateOverlay from "./UpdateOverlay";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/Overview";
import Achievements from "./pages/Achievements";
import Tasks from "./pages/Tasks";
import Flashcards from "./pages/Flashcards";
import Roadmap from "./pages/Roadmap";
import Subjects from "./pages/Subjects";
import Settings from "./pages/Settings";
import Overlay from "./pages/Overlay";
import TourGuide from "./pages/Tour";
import Landing from "./pages/Landing";

const THEME_KEY = "studyflow.theme";
const ACCENT_KEY = "studyflow.accent";
const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

const ACCENTS: Record<string, string> = {
  slate: "Slate", ancient: "Ancient", red: "Red",
  green: "Green", teal: "Teal", purple: "Purple",
};

type OnboardingStep = "name" | "theme" | "accent";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const location = useLocation();

  // Web-only: show landing page at /
  if (!isTauri && location.pathname === "/" && !sessionStorage.getItem("landingSkip")) {
    return <Landing />;
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<AppRoot />} />
    </Routes>
  );
}

function AppRoot() {
  // Check for existing data before deciding initial phase
  const savedData = typeof window !== "undefined" && isTauri ? loadData() : null;

  const [data, setData] = useState<AppData | null>(
    savedData && localStorage.getItem("studyflow.active") !== "false" ? savedData : null
  );

  // For web with cached session, check quickly before splash
  const [phase, setPhase] = useState<"splash" | "onboarding" | "google-signin" | "name-prompt" | "profile" | "tour" | "app">(() => {
    if (isTauri) {
      if (localStorage.getItem("studyflow.active") === "false") return "splash";
      // Always check Supabase session first — if present, go through splash
      // so handleSplashDone can pull cloud data and show conflict dialog if needed
      try {
        const raw = localStorage.getItem("sb-lpnjxkzeyiifzzycmftg-auth-token");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return "splash";
        }
      } catch {}
      if (savedData) {
        if (localStorage.getItem("studyflow.tourComplete") !== "true") return "tour";
        return "app";
      }
      return "splash";
    }
    // Web: check cached session synchronously via Supabase's localStorage
    try {
      const raw = localStorage.getItem("sb-lpnjxkzeyiifzzycmftg-auth-token");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) return "splash"; // has token, will check in handleSplashDone
      }
    } catch {}
    return "splash";
  });

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("name");
  const [draftName, setDraftName] = useState(() => getStoredUsername() ?? "");
  const [draftTheme, setDraftTheme] = useState(() => localStorage.getItem(THEME_KEY) ?? "dark");
  const [draftAccent, setDraftAccent] = useState(() => localStorage.getItem(ACCENT_KEY) ?? "slate");

  // Check profile screen on mount (desktop only, after sign out)
  const [showProfile] = useState(() => {
    if (!isTauri || typeof window === "undefined") return false;
    return localStorage.getItem("studyflow.active") === "false";
  });

  const [updateRequired, setUpdateRequired] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<import("./updateCheck").Download[]>([]);

  // Sync conflict: both local and remote data exist
  const [syncConflict, setSyncConflict] = useState<AppData | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    checkForUpdate().then((result) => {
      if (result.updateRequired) {
        setUpdateRequired(true);
        setLatestVersion(result.latestVersion);
        setDownloads(result.downloads);
      }
    });
  }, []);

  // Apply theme immediately for desktop skip-splash case
  if (isTauri && savedData && phase === "app") {
    document.documentElement.setAttribute("data-theme",
      `${savedData.accent || "slate"}-${savedData.theme || "dark"}`);
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", `${draftAccent}-${draftTheme}`);
  }, [draftAccent, draftTheme]);

  const applyTheme = (d: AppData) => {
    if (d.theme) {
      localStorage.setItem(THEME_KEY, d.theme);
      setDraftTheme(d.theme);
    }
    if (d.accent) {
      localStorage.setItem(ACCENT_KEY, d.accent);
      setDraftAccent(d.accent);
    }
    document.documentElement.setAttribute("data-theme", `${d.accent || "slate"}-${d.theme || "dark"}`);
  };

  // After splash, decide where to go
  const handleSplashDone = async () => {
    if (isTauri) {
      // Desktop: check for existing data, Google session, and cloud data
      if (showProfile) {
        localStorage.setItem("studyflow.active", "true");
        setPhase("profile");
        return;
      }
      const saved = loadData();
      if (saved) {
        setData(saved);
        applyTheme(saved);
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            setSyncEnabled(true);
            const remote = await pullData();
            if (remote && saved.subjects.length > 0) {
              // Both local and remote data — show conflict dialog
              setSyncConflict(remote);
              return;
            }
            if (remote) {
              // Only remote data — overwrite local
              saveData(remote);
              setData(remote);
              setStoredUsername(remote.username);
              applyTheme(remote);
            }
          }
        } catch { /* offline or not signed in */ }
        if (!syncConflict) setPhase("app");
      } else {
        // No local data — check if there's cloud data to load
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            setSyncEnabled(true);
            const remote = await pullData();
            if (remote) {
              saveData(remote);
              setData(remote);
              setStoredUsername(remote.username);
              applyTheme(remote);
              setPhase("app");
              return;
            }
          }
        } catch { /* offline */ }
        setPhase("onboarding");
      }
    } else {
      // Web: always cloud — never ask, always overwrite local with remote
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const remote = await pullData();
          const local = loadData();
          if (remote) {
            // Cloud data exists — always overwrite local
            setSyncEnabled(true);
            saveData(remote);
            setData(remote);
            setStoredUsername(remote.username);
            applyTheme(remote);
            setPhase("app");
          } else if (local) {
            // Only local data — push to cloud
            setSyncEnabled(true);
            setData(local);
            setStoredUsername(local.username);
            applyTheme(local);
            setPhase("app");
            try { await pushData(local); } catch { /* offline */ }
          } else {
            setPhase("name-prompt");
          }
        } else {
          setPhase("google-signin");
        }
      } catch {
        setPhase("google-signin");
      }
    }
  };

  // --- Web handlers ---
  const handleWebGoogleSignIn = async () => {
    try { await signInWithGoogle(); } catch { /* redirecting */ }
  };

  const handleWebName = async (username: string) => {
    const fresh = createEmptyData(username, draftTheme, draftAccent);
    setSyncEnabled(true);
    saveData(fresh);
    setStoredUsername(username);
    setData(fresh);
    setPhase("app");
    try { await pushData(fresh); } catch { /* offline */ }
  };

  const handleWebSignOut = async () => {
    await supabase.auth.signOut();
    setData(null);
    setPhase("google-signin");
  };

  // --- Desktop handlers ---
  const finishOnboarding = () => {
    const name = draftName.trim() || "User";
    localStorage.setItem(THEME_KEY, draftTheme);
    localStorage.setItem(ACCENT_KEY, draftAccent);
    document.documentElement.setAttribute("data-theme", `${draftAccent}-${draftTheme}`);

    const fresh = createEmptyData(name, draftTheme, draftAccent);
    saveData(fresh);
    setStoredUsername(name);
    setData(fresh);
    // New desktop users get the tour
    if (localStorage.getItem("studyflow.tourComplete") !== "true") {
      setPhase("tour");
    } else {
      setPhase("app");
    }
  };

  const handleDesktopContinue = async () => {
    const saved = loadData();
    if (saved) {
      setData(saved);
      setStoredUsername(saved.username);
      applyTheme(saved);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setSyncEnabled(true);
          const remote = await pullData();
          if (remote && saved.subjects.length > 0) {
            // Both local and remote data exist -- show conflict dialog
            setSyncConflict(remote);
            return;
          }
          if (remote) {
            // Only remote data -- overwrite local
            saveData(remote);
            setData(remote);
            setStoredUsername(remote.username);
            applyTheme(remote);
          }
        }
      } catch { /* offline or not signed in */ }
      setPhase("app");
    }
  };

  const handleDesktopCreateNew = () => {
    localStorage.removeItem("studyflow.tourComplete");
    setPhase("onboarding");
    setOnboardingStep("name");
    setDraftName("");
  };

  const handleDesktopDelete = () => {
    if (!confirm("Delete all data? This cannot be undone.")) return;
    clearStoredUsername();
    localStorage.removeItem("studyflow.data");
    localStorage.removeItem("studyflow.timer");
    localStorage.removeItem("studyflow.tourComplete");
    setPhase("onboarding");
    setOnboardingStep("name");
    setDraftName("");
  };

  const handleDesktopSignOut = () => {
    setData(null);
    setPhase("profile");
  };

  // Sync conflict resolution (web)
  const resolveSyncConflict = (useRemote: boolean) => {
    if (useRemote && syncConflict) {
      saveData(syncConflict);
      setData(syncConflict);
      setStoredUsername(syncConflict.username);
      applyTheme(syncConflict);
    } else if (data) {
      pushData(data).catch(() => {});
    }
    setSyncEnabled(true);
    setSyncConflict(null);
    setPhase("app");
  };

  // --- Render ---
  if (syncConflict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-md shadow-xl bg-base-100">
          <div className="card-body text-center">
            <h1 className="text-2xl font-semibold">
              Kaizen<span className="ml-2 text-xl opacity-60">改善</span>
            </h1>
            <p className="text-sm text-base-content/70 mt-4">
              You have data both locally and in the cloud. Which would you like to keep?
            </p>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-primary flex-1" onClick={() => resolveSyncConflict(true)}>
                Load cloud data
              </button>
              <button className="btn btn-outline flex-1" onClick={() => resolveSyncConflict(false)}>
                Keep local data
              </button>
            </div>
            <p className="text-xs text-base-content/40 mt-2">
              Choosing "Load cloud data" will replace all local data with your cloud data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (updateRequired && latestVersion && phase !== "splash") {
    return <UpdateOverlay latestVersion={latestVersion} downloads={downloads} />;
  }

  if (phase === "splash") {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  if (phase === "google-signin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-md shadow-xl bg-base-100">
          <div className="card-body items-center text-center">
            <h1 className="text-2xl font-semibold">
              Kaizen<span className="ml-2 text-xl opacity-60">改善</span>
            </h1>
            <p className="text-sm text-base-content/70 mt-2">
              Sign in to sync your study data across devices.
            </p>
            <button className="btn btn-primary mt-4" onClick={handleWebGoogleSignIn}>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "name-prompt") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-md shadow-xl bg-base-100">
          <div className="card-body">
            <h1 className="text-2xl font-semibold text-center">
              Kaizen<span className="ml-2 text-xl opacity-60">改善</span>
            </h1>
            <p className="text-sm text-base-content/70 text-center mt-2">
              You're signed in. Choose a display name.
            </p>
            <NameForm onName={handleWebName} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "onboarding") {
    return (
      <OnboardingScreen
        step={onboardingStep}
        name={draftName}
        theme={draftTheme}
        accent={draftAccent}
        onSetName={setDraftName}
        onSetTheme={(t) => { setDraftTheme(t); document.documentElement.setAttribute("data-theme", `${draftAccent}-${t}`); }}
        onSetAccent={(a) => { setDraftAccent(a); document.documentElement.setAttribute("data-theme", `${a}-${draftTheme}`); }}
        onNext={setOnboardingStep}
        onFinish={finishOnboarding}
      />
    );
  }

  if (phase === "profile") {
    const profileData = loadData();
    return (
      <ProfileScreen
        username={profileData?.username ?? getStoredUsername() ?? "User"}
        onContinue={handleDesktopContinue}
        onCreateNew={handleDesktopCreateNew}
        onDelete={handleDesktopDelete}
      />
    );
  }

  // phase === "tour"
  if (phase === "tour") {
    return (
      <DataProvider data={data!}>
        <TourGuide onFinish={() => setPhase("app")}>
          <AppShell
            onLogout={isTauri ? handleDesktopSignOut : handleWebSignOut}
            isWeb={!isTauri}
          />
        </TourGuide>
      </DataProvider>
    );
  }

  // phase === "app"
  return (
    <DataProvider data={data!}>
      <AppShell
        onLogout={isTauri ? handleDesktopSignOut : handleWebSignOut}
        isWeb={!isTauri}
      />
    </DataProvider>
  );
}

// ─── Splash Screen ────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [showBtn, setShowBtn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowBtn(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-base-200">
      <div />

      <div className="text-center select-none">
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
          <span className="splash-kaizen">Kaizen</span>
          <span className="ml-6 splash-kanji inline-block">改善</span>
        </h1>
      </div>

      <div className="pb-8 h-16 flex items-center">
        {showBtn && (
          <button className="splash-fadein text-base-content/50 text-sm hover:text-base-content transition-colors" onClick={onDone}>
            Continue
          </button>
        )}
      </div>

      <style>{`
        .splash-kaizen {
          opacity: 0;
          animation: kaizenIn 2s ease-out 0.2s forwards;
        }
        .splash-kanji {
          opacity: 0;
          animation: kanjiIn 2s ease-out 0.4s forwards,
                     kanjiCycle 8s linear 2.4s infinite;
        }
        .splash-fadein {
          opacity: 0;
          animation: fadeIn 0.6s ease-out forwards;
        }
        @keyframes kaizenIn {
          0%   { opacity: 0; transform: scale(0.8); }
          30%  { opacity: 0.5; transform: scale(0.88); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes kanjiIn {
          0%   { opacity: 0; transform: translateY(18px); }
          40%  { opacity: 0; transform: translateY(18px); }
          70%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes kanjiCycle {
          /* slate hold */
          0%      { color: #64748b; transform: translateY(0); }
          14%     { color: #64748b; transform: translateY(0); }
          /* swipe down */
          16.5%   { color: #64748b; transform: translateY(10px); }
          /* instant color switch to ancient */
          16.51%  { color: #78716c; transform: translateY(10px); }
          /* snap back */
          18%     { color: #78716c; transform: translateY(0); }

          /* ancient hold */
          30.66%  { color: #78716c; transform: translateY(0); }
          /* swipe down */
          33.16%  { color: #78716c; transform: translateY(10px); }
          /* instant to red */
          33.17%  { color: #ef4444; transform: translateY(10px); }
          /* snap back */
          34.66%  { color: #ef4444; transform: translateY(0); }

          /* red hold */
          47.33%  { color: #ef4444; transform: translateY(0); }
          /* swipe down */
          49.83%  { color: #ef4444; transform: translateY(10px); }
          /* instant to green */
          49.84%  { color: #22c55e; transform: translateY(10px); }
          /* snap back */
          51.33%  { color: #22c55e; transform: translateY(0); }

          /* green hold */
          64%     { color: #22c55e; transform: translateY(0); }
          /* swipe down */
          66.5%   { color: #22c55e; transform: translateY(10px); }
          /* instant to teal */
          66.51%  { color: #14b8a6; transform: translateY(10px); }
          /* snap back */
          68%     { color: #14b8a6; transform: translateY(0); }

          /* teal hold */
          80.66%  { color: #14b8a6; transform: translateY(0); }
          /* swipe down */
          83.16%  { color: #14b8a6; transform: translateY(10px); }
          /* instant to purple */
          83.17%  { color: #a855f7; transform: translateY(10px); }
          /* snap back */
          84.66%  { color: #a855f7; transform: translateY(0); }

          /* purple hold */
          97.33%  { color: #a855f7; transform: translateY(0); }
          /* swipe down */
          99.83%  { color: #a855f7; transform: translateY(10px); }
          /* instant back to slate */
          99.84%  { color: #64748b; transform: translateY(10px); }
          100%    { color: #64748b; transform: translateY(10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────

function OnboardingScreen({
  step, name, theme, accent,
  onSetName, onSetTheme, onSetAccent, onNext, onFinish,
}: {
  step: OnboardingStep;
  name: string;
  theme: string;
  accent: string;
  onSetName: (n: string) => void;
  onSetTheme: (t: string) => void;
  onSetAccent: (a: string) => void;
  onNext: (s: OnboardingStep) => void;
  onFinish: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md shadow-xl bg-base-100">
        <div className="card-body">
          <h1 className="text-2xl font-semibold text-center">
            Kaizen<span className="ml-2 text-xl opacity-60">改善</span>
          </h1>

          <div className="flex justify-center gap-2 my-4">
            {(["name", "theme", "accent"] as OnboardingStep[]).map((s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? "bg-primary" : "bg-base-300"}`} />
            ))}
          </div>

          {step === "name" && <NameStep name={name} onChange={onSetName} onNext={() => onNext("theme")} />}
          {step === "theme" && <ThemeStep theme={theme} onSet={onSetTheme} accent={accent} onBack={() => onNext("name")} onNext={() => onNext("accent")} />}
          {step === "accent" && <AccentStep accent={accent} onSet={onSetAccent} theme={theme} onBack={() => onNext("theme")} onFinish={onFinish} />}
        </div>
      </div>
    </div>
  );
}

function NameStep({ name, onChange, onNext }: { name: string; onChange: (n: string) => void; onNext: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a name"); return; }
    onNext();
  };
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-base-content/70 text-center">What should we call you?</p>
      <input className="input input-bordered w-full" value={name} onChange={(e) => onChange(e.target.value)} placeholder="Your name" autoFocus />
      {error && <p className="text-xs text-error text-center">{error}</p>}
      <button className="btn btn-primary w-full" type="submit">Next</button>
    </form>
  );
}

function ThemeStep({ theme, onSet, accent, onBack, onNext }: { theme: string; onSet: (t: string) => void; accent: string; onBack: () => void; onNext: () => void }) {
  const isDark = theme === "dark";
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70 text-center">Choose your theme</p>
      <div className="flex gap-3 justify-center">
        <button className={`card p-4 cursor-pointer border-2 transition-colors flex-1 ${!isDark ? "border-primary bg-base-200" : "border-base-300 bg-base-100"}`}
          onClick={() => { onSet("light"); document.documentElement.setAttribute("data-theme", `${accent}-light`); }}>
          <div className="text-center"><span className="text-sm font-medium">Light</span></div>
        </button>
        <button className={`card p-4 cursor-pointer border-2 transition-colors flex-1 ${isDark ? "border-primary bg-base-200" : "border-base-300 bg-base-100"}`}
          onClick={() => { onSet("dark"); document.documentElement.setAttribute("data-theme", `${accent}-dark`); }}>
          <div className="text-center"><span className="text-sm font-medium">Dark</span></div>
        </button>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm flex-1" onClick={onBack}>Back</button>
        <button className="btn btn-primary btn-sm flex-1" onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function AccentStep({ accent, onSet, theme, onBack, onFinish }: { accent: string; onSet: (a: string) => void; theme: string; onBack: () => void; onFinish: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70 text-center">Pick an accent color</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.entries(ACCENTS).map(([key, label]) => (
          <button key={key} className={`btn btn-sm ${accent === key ? "btn-primary" : "btn-ghost border border-base-300"}`}
            onClick={() => { onSet(key); document.documentElement.setAttribute("data-theme", `${key}-${theme}`); }}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm flex-1" onClick={onBack}>Back</button>
        <button className="btn btn-primary btn-sm flex-1" onClick={onFinish}>Get started</button>
      </div>
    </div>
  );
}

// ─── Name form (web) ──────────────────────────────────────────────

function NameForm({ onName }: { onName: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a name"); return; }
    onName(name.trim());
  };
  return (
    <form className="space-y-3 mt-4" onSubmit={handleSubmit}>
      <input className="input input-bordered w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
      {error && <p className="text-xs text-error text-center">{error}</p>}
      <button className="btn btn-primary w-full" type="submit">Get started</button>
    </form>
  );
}

// ─── Profile screen (desktop, after sign out) ─────────────────────

function ProfileScreen({ username, onContinue, onCreateNew, onDelete }: {
  username: string; onContinue: () => void; onCreateNew: () => void; onDelete: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md shadow-xl bg-base-100">
        <div className="card-body items-center text-center">
          <h1 className="text-2xl font-semibold">Kaizen<span className="ml-2 text-xl opacity-60">改善</span></h1>
          <div className="bg-base-200 rounded-xl p-6 my-4 w-full">
            <p className="text-sm text-base-content/50 mb-1">Current profile</p>
            <p className="text-2xl font-bold">{username}</p>
          </div>
          <button className="btn btn-primary w-full" onClick={onContinue}>Continue as {username}</button>
          <button className="btn btn-outline btn-sm w-full" onClick={onCreateNew}>Create new profile</button>
          <button className="btn btn-ghost btn-sm w-full text-error/60 hover:text-error" onClick={onDelete}>Delete profile & data</button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth callback ────────────────────────────────────────────────

function AuthCallback() {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function handle() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) { window.location.href = "/"; return; }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled && session) window.location.href = "/";
      });
      if (cancelled) {
        listener.subscription.unsubscribe();
        return;
      }
      unsubscribe = () => listener.subscription.unsubscribe();
    }

    handle();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="flex items-center gap-3">
        <span className="loading loading-ring loading-lg" />
        <span className="text-base-content/60">Completing sign in...</span>
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────

function AppShell({ onLogout, isWeb }: { onLogout: () => void; isWeb?: boolean }) {
  const location = useLocation();
  const isOverlay = location.pathname === "/overlay";
  const [menuOpen, setMenuOpen] = useState(false);

  if (isOverlay) return <Overlay />;

  const navLinks = [
    { to: "/", label: "Timer" },
    { to: "/overview", label: "Overview" },
    { to: "/subjects", label: "Subjects" },
    { to: "/tasks", label: "Tasks" },
    { to: "/flashcards", label: "Flashcards" },
    { to: "/achievements", label: "Achievements" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <nav className="navbar bg-base-100 shadow-sm">
        <div className="flex-1 px-2 text-lg sm:text-xl font-semibold truncate">
          Kaizen<span className="ml-2 text-lg opacity-60">改善</span>
        </div>

        <div className="hidden lg:flex gap-1 px-2">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return <Link key={link.to} className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`} to={link.to}>{link.label}</Link>;
          })}
        </div>

        <div className="flex lg:hidden gap-1">
          <div className="relative">
            <button className="btn btn-ghost btn-square btn-sm" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {menuOpen && (
              <div className="fixed inset-0 z-50 flex flex-col bg-base-100/95 backdrop-blur-md animate-fade-in">
                <div className="flex justify-end p-4">
                  <button className="btn btn-ghost btn-circle btn-lg" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 pb-8">
                  {navLinks.map((link, i) => {
                    const active = location.pathname === link.to;
                    return (
                      <Link key={link.to} className={`btn btn-lg w-full max-w-xs text-lg font-medium justify-start gap-4 ${active ? "btn-primary" : "btn-ghost"}`}
                        to={link.to} onClick={() => setMenuOpen(false)} style={{ animationDelay: `${i * 60}ms` }}>
                        {link.label}
                      </Link>
                    );
                  })}
                  {!isWeb && <hr className="border-base-300 my-4 w-full max-w-xs" />}
                  {!isWeb && (
                    <button className="btn btn-ghost btn-lg w-full max-w-xs text-lg font-medium justify-start text-error"
                      onClick={() => { setMenuOpen(false); onLogout(); }}>
                      Sign out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="p-4 sm:p-6 flex justify-center items-start min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-5xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/roadmap/:subjectId" element={<Roadmap />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/overlay" element={<Overlay />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
