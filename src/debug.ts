import type { AppData } from "./storage/types";
import type { TimerState } from "./db";

const DEBUG_DIR = "/home/margy/Documents/DEBUGAPP";

const isTauri = typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

function debugPath(filename: string): string {
  return `${DEBUG_DIR}/${filename}`;
}

// Use a variable so Vite doesn't try to statically resolve the Tauri plugin import
const FS_MODULE = "@tauri-apps/plugin-fs";

async function getTauriFs(): Promise<any> {
  if (!isTauri) return null;
  try {
    return await import(/* @vite-ignore */ FS_MODULE);
  } catch {
    return null;
  }
}

export async function debugSaveAppData(data: AppData): Promise<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    const fs = await getTauriFs();
    if (fs) {
      await fs.mkdir(DEBUG_DIR, { recursive: true });
      await fs.writeTextFile(debugPath(`appdata-${data.username || "unknown"}.json`), json);
    } else {
      console.debug("[debug] AppData:", json.slice(0, 500));
    }
  } catch { /* debug only */ }
}

export async function debugSaveTimer(state: TimerState): Promise<void> {
  try {
    const json = JSON.stringify(state, null, 2);
    const fs = await getTauriFs();
    if (fs) {
      await fs.mkdir(DEBUG_DIR, { recursive: true });
      await fs.writeTextFile(debugPath(`timer-${state.subjectId || "nosubject"}.json`), json);
    } else {
      console.debug("[debug] Timer:", json.slice(0, 300));
    }
  } catch { /* debug only */ }
}

export async function debugLog(event: string, detail?: string): Promise<void> {
  try {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${event}${detail ? `: ${detail}` : ""}\n`;
    const fs = await getTauriFs();
    if (fs) {
      await fs.mkdir(DEBUG_DIR, { recursive: true });
      const path = debugPath("log.txt");
      let existing = "";
      try { existing = await fs.readTextFile(path); } catch { /* new file */ }
      await fs.writeTextFile(path, existing + line);
    } else {
      console.debug("[debug]", line.trim());
    }
  } catch { /* debug only */ }
}
