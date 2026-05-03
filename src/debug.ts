import type { AppData } from "./storage/types";
import type { TimerState } from "./db";

const DEBUG_DIR = "/home/margy/Documents/DEBUGAPP";

function debugPath(filename: string): string {
  return `${DEBUG_DIR}/${filename}`;
}

export async function debugSaveAppData(data: AppData): Promise<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    // Try Tauri FS first
    try {
      const fs = await import(/* @vite-ignore */ "@tauri-apps/plugin-fs");
      const { writeTextFile, mkdir } = fs as any;
      await mkdir(DEBUG_DIR, { recursive: true });
      await writeTextFile(debugPath(`appdata-${data.username || "unknown"}.json`), json);
    } catch {
      // Fall back: use a download link (won't work silently, but keeps code safe)
      console.debug("[debug] AppData:", json.slice(0, 500));
    }
  } catch { /* debug only, never break the app */ }
}

export async function debugSaveTimer(state: TimerState): Promise<void> {
  try {
    const json = JSON.stringify(state, null, 2);
    try {
      const fs = await import(/* @vite-ignore */ "@tauri-apps/plugin-fs");
      const { writeTextFile, mkdir } = fs as any;
      await mkdir(DEBUG_DIR, { recursive: true });
      await writeTextFile(debugPath(`timer-${state.subjectId || "nosubject"}.json`), json);
    } catch {
      console.debug("[debug] Timer:", json.slice(0, 300));
    }
  } catch { /* debug only */ }
}

export async function debugLog(event: string, detail?: string): Promise<void> {
  try {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${event}${detail ? `: ${detail}` : ""}\n`;
    try {
      const fs = await import(/* @vite-ignore */ "@tauri-apps/plugin-fs");
      const { writeTextFile, mkdir, readTextFile } = fs as any;
      await mkdir(DEBUG_DIR, { recursive: true });
      const path = debugPath("log.txt");
      let existing = "";
      try { existing = await readTextFile(path); } catch { /* new file */ }
      await writeTextFile(path, existing + line);
    } catch {
      console.debug("[debug]", line);
    }
  } catch { /* debug only */ }
}
