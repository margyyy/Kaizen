import { useState } from "react";
import { useData } from "../DataContext";
import { exportDataToFile, importDataFromFile } from "../storage";

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

  const handleExport = async () => {
    await exportDataToFile(data);
  };

  const handleImport = async () => {
    const imported = await importDataFromFile();
    if (imported) {
      if (confirm("Importing will replace all current data. Continue?")) {
        setData(() => imported);
      }
    }
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

      {/* Data */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h3 className="font-semibold">Data</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Export your data as a JSON file for backup, or import a previous backup.
          </p>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-sm btn-primary" onClick={handleExport}>
              Export data
            </button>
            <button className="btn btn-sm btn-outline" onClick={handleImport}>
              Import data
            </button>
          </div>
          <p className="text-xs text-base-content/40 mt-2">
            Importing replaces all current data with the backup. This cannot be undone.
          </p>
        </div>
      </div>

      {/* Version */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body">
          <h3 className="font-semibold">Version</h3>
          <p className="text-sm text-base-content/60 mt-1">
            {data.appVersion}
          </p>
        </div>
      </div>
    </div>
  );
}
