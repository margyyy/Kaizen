import { supabase } from "../supabase";
import { useEffect, useState } from "react";
import type { AppData } from "../storage/types";
import { useData } from "../DataContext";
import { saveData } from "../storage";
import {
  isSyncEnabled,
  setSyncEnabled,
  getLastSync,
  signInWithGoogle,
  signInWithGoogleDesktop,
  signOut,
  deleteAccount,
  getSession,
  pushData,
  pullData,
} from "../sync";

const THEME_KEY = "studyflow.theme";
const ACCENT_KEY = "studyflow.accent";
const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

const ACCENTS: Record<string, string> = {
  slate: "Slate",
  ancient: "Ancient",
  red: "Red",
  green: "Green",
  teal: "Teal",
  purple: "Purple",
};

export default function Settings() {
  const { data, setData } = useData();
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) ?? "dark");
  const [accent, setAccent] = useState(localStorage.getItem(ACCENT_KEY) ?? "slate");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.username);

  const syncThemeToData = (newAccent: string, newTheme: string) => {
    setData((prev) => ({ ...prev, theme: newTheme, accent: newAccent }));
  };

  const handleThemeChange = (nextAccent: string) => {
    localStorage.setItem(ACCENT_KEY, nextAccent);
    document.documentElement.setAttribute("data-theme", `${nextAccent}-${theme}`);
    setAccent(nextAccent);
    syncThemeToData(nextAccent, theme);
  };

  const handleDarkMode = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute("data-theme", `${accent}-${next}`);
    setTheme(next);
    syncThemeToData(accent, next);
  };

  const handleSaveName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setData((prev) => ({ ...prev, username: trimmed }));
    setEditingName(false);
  };

  return (
    <div className="space-y-8 w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>

      {/* Name */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h3 className="font-semibold">Profile</h3>
          {editingName ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                className="input input-bordered input-sm flex-1"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveName}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setNameDraft(data.username); setEditingName(false); }}>Cancel</button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">{data.username}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => { setNameDraft(data.username); setEditingName(true); }}>Change nickname</button>
            </div>
          )}
          {isTauri && (
            <div className="mt-3 pt-3 border-t border-base-300">
              <button className="btn btn-ghost btn-sm text-error" onClick={() => { localStorage.setItem("studyflow.active", "false"); window.location.reload(); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h3 className="font-semibold">Appearance</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">Dark mode</span>
            <input
              type="checkbox"
              className="toggle"
              checked={theme === "dark"}
              onChange={handleDarkMode}
            />
          </div>
          <div className="mt-4">
            <span className="text-sm font-medium">Accent</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(ACCENTS).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn btn-sm ${accent === key ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  onClick={() => handleThemeChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account — web only */}
      {!isTauri && <WebAccountSection />}

      {/* Sync — desktop only */}
      {isTauri && <SyncSection />}
    </div>
  );
}

function WebAccountSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;
    try { await deleteAccount(); } catch {}
    window.location.reload();
  };

  if (!email) return null;

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body">
        <h3 className="font-semibold">Account</h3>
        <div className="flex items-center gap-2 text-sm mt-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>{email}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="btn btn-sm btn-ghost text-error" onClick={handleSignOut}>
            Sign out
          </button>
          {!deleteConfirm ? (
            <button className="btn btn-sm btn-ghost text-error/50" onClick={() => setDeleteConfirm(true)}>
              Delete account
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                className="input input-bordered input-xs w-28"
                placeholder="Type DELETE"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                autoFocus
              />
              <button
                className="btn btn-xs btn-error"
                disabled={deleteText !== "DELETE"}
                onClick={handleDelete}
              >
                Confirm
              </button>
              <button className="btn btn-xs btn-ghost" onClick={() => { setDeleteConfirm(false); setDeleteText(""); }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SyncDeleteSection({ onSignOut }: { onSignOut: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");

  const handleDelete = async () => {
    if (text !== "DELETE") return;
    try { await deleteAccount(); } catch {}
    window.location.reload();
  };

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button className="btn btn-sm btn-ghost text-error" onClick={onSignOut}>
        Sign out
      </button>
      {!confirming ? (
        <button className="btn btn-sm btn-ghost text-error/50" onClick={() => setConfirming(true)}>
          Delete account
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            className="input input-bordered input-xs w-28"
            placeholder="Type DELETE"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            autoFocus
          />
          <button className="btn btn-xs btn-error" disabled={text !== "DELETE"} onClick={handleDelete}>
            Confirm
          </button>
          <button className="btn btn-xs btn-ghost" onClick={() => { setConfirming(false); setText(""); }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const SYNC_RESOLVED_KEY = "studyflow.syncResolved";

function SyncSection() {
  const { data, setData } = useData();
  const [syncOn, setSyncOn] = useState(isSyncEnabled());
  const [lastSync, setLastSync] = useState(getLastSync());
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [conflict, setConflict] = useState<AppData | null>(null);

  // On mount, check if signed in and if there's an unresolved conflict
  useEffect(() => {
    getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session) return;
      setSignedIn(true);
      setEmail(sessionData.session.user.email ?? null);
      setLastSync(getLastSync());

      // Only check conflict if sync is ON but never resolved
      if (isSyncEnabled() && !localStorage.getItem(SYNC_RESOLVED_KEY)) {
        try {
          const remote = await pullData();
          if (remote) {
            setConflict(remote);
            return;
          }
          // No remote data, no conflict
          localStorage.setItem(SYNC_RESOLVED_KEY, "true");
        } catch { /* offline */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveConflict = async (useRemote: boolean) => {
    if (useRemote && conflict) {
      saveData(conflict);
      setData(() => conflict);
    } else {
      try { await pushData(data); } catch { /* offline */ }
    }
    setConflict(null);
    setSyncEnabled(true);
    setSyncOn(true);
    setLastSync(getLastSync());
    localStorage.setItem(SYNC_RESOLVED_KEY, "true");
  };

  const enableSync = async () => {
    setSyncEnabled(true);
    setSyncOn(true);
    setPushing(true);
    try {
      const remote = await pullData();
      if (remote) {
        setConflict(remote);
        setPushing(false);
        return;
      }
      // No remote data, no conflict — push local
      localStorage.setItem(SYNC_RESOLVED_KEY, "true");
      await pushData(data);
      setLastSync(getLastSync());
    } catch { /* offline */ }
    setPushing(false);
  };

  const disableSync = () => {
    setSyncEnabled(false);
    setSyncOn(false);
    localStorage.removeItem(SYNC_RESOLVED_KEY);
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (signedIn) {
        enableSync();
      }
      setSyncEnabled(true);
      setSyncOn(true);
    } else {
      disableSync();
    }
  };

  const handleSignIn = async () => {
    try {
      if (isTauri) {
        await signInWithGoogleDesktop();
      } else {
        await signInWithGoogle();
      }
    } catch { /* redirecting */ }
  };

  const handleSignOut = async () => {
    await signOut();
    setSignedIn(false);
    setEmail(null);
    setSyncOn(false);
    setSyncEnabled(false);
    localStorage.removeItem(SYNC_RESOLVED_KEY);
  };

  return (
    <div className="card bg-base-100 shadow-sm border border-base-300">
      <div className="card-body">
        <h3 className="font-semibold">Sync</h3>
        <p className="text-sm text-base-content/60 mt-1">
          Sync your data automatically to the cloud via Google.
        </p>

        {conflict ? (
          <div className="mt-3 p-3 bg-warning/10 rounded-lg text-sm space-y-2">
            <p className="font-medium">Existing data found in the cloud.</p>
            <p className="text-base-content/60">
              You already have synced data. Do you want to load it (replacing your local data) or keep your local data and upload it?
            </p>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={() => resolveConflict(true)}>
                Load cloud data
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => resolveConflict(false)}>
                Keep local data
              </button>
            </div>
          </div>
        ) : signedIn ? (
          <>
            <div className="flex items-center gap-2 text-sm mt-3">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>{email}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">{syncOn ? "Sync active" : "Sync paused"}</span>
              <input
                type="checkbox"
                className="toggle"
                checked={syncOn}
                onChange={handleToggle}
              />
            </div>

            {pushing && (
              <span className="text-xs text-base-content/50">Syncing…</span>
            )}

            {lastSync && (
              <p className="text-xs text-base-content/40">
                Last sync: {new Date(lastSync).toLocaleString()}
              </p>
            )}

            <SyncDeleteSection onSignOut={handleSignOut} />
          </>
        ) : (
          <div className="mt-3">
            <button className="btn btn-sm btn-primary" onClick={handleSignIn}>
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
