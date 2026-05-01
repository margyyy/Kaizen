import { supabase } from "./supabase";
import { APP_VERSION } from "./version";

export interface Download {
  label: string;
  url: string;
}

export interface VersionCheckResult {
  updateRequired: boolean;
  latestVersion: string | null;
  downloads: Download[];
  error: boolean;
}

const DOWNLOAD_KEY_LINUX = "download_linux";
const DOWNLOAD_KEY_MACOS = "download_macos";
const DOWNLOAD_KEY_WINDOWS = "download_windows";

function detectOS(): "linux" | "macos" | "windows" {
  if (typeof navigator === "undefined") return "linux";
  const p = navigator.platform?.toLowerCase() ?? "";
  if (p.includes("linux")) return "linux";
  if (p.includes("mac") || p.includes("darwin")) return "macos";
  if (p.includes("win")) return "windows";
  return "linux";
}

const OS_LABELS: Record<string, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
};

const OS_KEY_MAP: Record<string, string> = {
  linux: DOWNLOAD_KEY_LINUX,
  macos: DOWNLOAD_KEY_MACOS,
  windows: DOWNLOAD_KEY_WINDOWS,
};

export function getCurrentOS(): string {
  return detectOS();
}

export async function checkForUpdate(): Promise<VersionCheckResult> {
  try {
    const keys = ["current_version", DOWNLOAD_KEY_LINUX, DOWNLOAD_KEY_MACOS, DOWNLOAD_KEY_WINDOWS];
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", keys);

    if (error) throw error;
    if (!data?.length) return { updateRequired: false, latestVersion: null, downloads: [], error: false };

    const rowMap = new Map(data.map((r) => [r.key, r.value as string]));

    const latestVersion = rowMap.get("current_version") ?? null;
    const updateRequired = latestVersion !== null && latestVersion !== APP_VERSION;

    // Show downloads for current OS
    const os = detectOS();
    const osKey = OS_KEY_MAP[os];
    const url = rowMap.get(osKey);
    const downloads: Download[] = url ? [{ label: OS_LABELS[os], url }] : [];

    return { updateRequired, latestVersion, downloads, error: false };
  } catch {
    return { updateRequired: false, latestVersion: null, downloads: [], error: true };
  }
}
