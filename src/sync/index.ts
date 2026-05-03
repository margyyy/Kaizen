import { supabase } from "../supabase";
import type { AppData } from "../storage/types";

const SYNC_KEY = "studyflow.sync";
const LAST_SYNC_KEY = "studyflow.lastSync";

export function isSyncEnabled(): boolean {
  return localStorage.getItem(SYNC_KEY) === "true";
}

export function setSyncEnabled(enabled: boolean): void {
  localStorage.setItem(SYNC_KEY, String(enabled));
}

export function getLastSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

function setLastSync(time: string): void {
  localStorage.setItem(LAST_SYNC_KEY, time);
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/auth/callback",
      queryParams: {
        prompt: "select_account",
      },
    },
  });
}

export async function signInWithGoogleDesktop(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/auth/callback",
      queryParams: {
        prompt: "select_account",
      },
    },
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const googleId = session.user.id;
  await supabase.from("user_data").delete().eq("google_id", googleId);
  // Clear ALL local data
  const KEYS = [
    "studyflow.data", "studyflow.timer", "studyflow.active",
    "studyflow.sync", "studyflow.username", "studyflow.tourComplete",
    "studyflow.theme", "studyflow.accent", "studyflow.durations",
    "studyflow.syncResolved",
  ];
  for (const key of KEYS) {
    localStorage.removeItem(key);
  }
  await supabase.auth.signOut();
}

export async function pushData(data: AppData): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const googleId = session.user.id;
  const email = session.user.email ?? "";

  const { error } = await supabase.from("user_data").upsert(
    {
      google_id: googleId,
      email,
      data: JSON.parse(JSON.stringify(data)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "google_id" },
  );

  if (error) throw error;
  setLastSync(new Date().toISOString());
}

export async function pullData(): Promise<AppData | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const googleId = session.user.id;

  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("google_id", googleId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data.data as AppData;
}
