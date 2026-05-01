import type { AppData } from "./types";

const STORAGE_KEY = "studyflow.data";

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate old data that doesn't have theme/accent
    if (!parsed.theme) parsed.theme = "dark";
    if (!parsed.accent) parsed.accent = "slate";
    return parsed as AppData;
  } catch {
    return null;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function tryTauriExport(json: string): Promise<boolean> {
  const dialogMod = "@tauri-apps/plugin-dialog";
  const fsMod = "@tauri-apps/plugin-fs";
  const [{ save }, { writeTextFile }] = await Promise.all([
    import(/* @vite-ignore */ dialogMod),
    import(/* @vite-ignore */ fsMod),
  ]);
  const path = await save({
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: "studyflow-backup.json",
  });
  if (!path) return false;
  await writeTextFile(path, json);
  return true;
}

export async function exportDataToFile(data: AppData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  try {
    const done = await tryTauriExport(json);
    if (done) return;
  } catch { /* fall back to browser */ }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "studyflow-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function tryTauriImport(): Promise<AppData | null> {
  const dialogMod = "@tauri-apps/plugin-dialog";
  const fsMod = "@tauri-apps/plugin-fs";
  const [{ open }, { readTextFile }] = await Promise.all([
    import(/* @vite-ignore */ dialogMod),
    import(/* @vite-ignore */ fsMod),
  ]);
  const path = await open({
    filters: [{ name: "JSON", extensions: ["json"] }],
    multiple: false,
  });
  if (!path) return null;
  const text = await readTextFile(path as string);
  return JSON.parse(text) as AppData;
}

export async function importDataFromFile(): Promise<AppData | null> {
  try {
    return await tryTauriImport();
  } catch {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const text = await file.text();
        resolve(JSON.parse(text) as AppData);
      };
      input.click();
    });
  }
}
