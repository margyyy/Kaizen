# Plan: Web Sync Refinement — Real-time JSON Push, Auth Flow, Fix Delete, App Version

**ID:** 260503-wfe
**Description:** Real-time JSON push on any data change (web only), fix delete account, new user onboarding with Google auth, app version in Settings + user JSON
**Desktop constraint:** Desktop stays completely offline. No auth, no sync. All changes gated behind `isTauri` checks.
**Web constraint:** No sync between desktop and web. Web pushes to Supabase, desktop is localStorage-only.
**Date:** 2026-05-03

---

## Tasks

### Task 1: App version in AppData + Settings display

**Objective:** Track app version in the data model so we know what version created the data, and display it in Settings.

**Files to modify:**
- `src/storage/types.ts`
- `src/storage/index.ts`
- `src/pages/Settings.tsx`

**Changes:**

1. `src/storage/types.ts` — Add `appVersion: string` to `AppData` interface and to `createEmptyData`:
   - Add `appVersion: APP_VERSION` (import `APP_VERSION` from `../version`)
   - Note: `createEmptyData` currently takes `(username, theme, accent)` — add `appVersion` to the return object.

2. `src/storage/index.ts` — Add migration in `loadData`:
   - If `parsed.appVersion` is missing, set `parsed.appVersion = "0.0.0"` (pre-version era data).

3. `src/pages/Settings.tsx` — Add a "Version" section:
   - New card section (or line within the Data card) displaying `data.appVersion`.
   - Simple text display, no edit needed.

---

### Task 2: Web auth flow — Google sign-in at splash, pull/push data, auth callback route

**Objective:** Web users sign in with Google before entering the app. After sign-in, pull existing data from Supabase. If data exists, go to app. If new user, go to onboarding then push data. Desktop flow unchanged.

**Files to modify:**
- `src/App.tsx`
- `src/pages/Landing.tsx` (minor: pass `isWeb` awareness)

**Changes in `src/App.tsx`:**

1. **Auth callback route** — Add a `/auth/callback` route in `AppRoutes`:
   - If path is `/auth/callback`, render a loading spinner, let Supabase `detectSessionInUrl` process the tokens, then redirect to `/` with `landingSkip` set.
   - This runs outside the splash/onboarding/app flow.

2. **Web splash vs desktop splash** — Modify `SplashScreen` to accept `isWeb` prop:
   - Web: Show "Sign in with Google" button (instead of "Continue").
   - On click: call `signInWithGoogle()`, which redirects to Supabase OAuth.
   - After returning from OAuth (via `/auth/callback` → redirected to `/`):
     - Check `getSession()`. If session exists, call `pullData()`.
     - If pull returns data → set it as app data, go to app.
     - If pull returns null (new user) → go to onboarding.
   - Desktop: Keep existing "Continue" button exactly as-is.

3. **Web onboarding finish** — Modify `finishOnboarding` (or create `finishOnboardingWeb`) for web:
   - After creating empty data via `createEmptyData`, call `pushData(fresh)` to store it in Supabase.
   - Desktop: keep existing `finishOnboarding` (no push, no auth).

4. **Session check on app mount** — After splash/onboarding, verify session exists for web:
   - If web user somehow reaches app without a session, redirect back to splash.

**Web splash flow (new):**
```
Landing page → click "Open App" → Web Splash (Google Sign In button) →
  → OAuth redirect → /auth/callback → detect session → redirect to app root →
  → pullData():
    → has data → go to app
    → no data (new user) → onboarding → pushData → go to app
```

**Desktop splash flow (unchanged):**
```
Splash (Continue button after 4s) →
  → savedData exists → app
  → no savedData → onboarding → tour/app
```

---

### Task 3: Real-time push in DataContext (web only)

**Objective:** Every `setData` call on web triggers a fire-and-forget push to Supabase, keeping cloud data in sync with every local change.

**File to modify:**
- `src/DataContext.tsx`

**Changes:**

1. Import `pushData` and `getSession` from `./sync`.

2. After `saveData(next)` in the `setData` callback, add:
   ```typescript
   // Web: fire-and-forget push to Supabase
   if (typeof window !== "undefined" && !("__TAURI__" in window)) {
     getSession().then(({ data: { session } }) => {
       if (session) {
         pushData(next).catch(() => {});
       }
     });
   }
   ```

3. This runs asynchronously and never blocks the UI. Errors are silently caught.

---

### Task 4: Fix delete account — clear local data + Supabase data

**Objective:** Delete account should clear all local data (all localStorage keys), delete user data from Supabase, and sign out.

**File to modify:**
- `src/sync/index.ts`

**Changes:**

1. `deleteAccount` function:
   - After verifying the session, delete the `user_data` row from Supabase.
   - Clear ALL relevant localStorage keys: `studyflow.data`, `studyflow.timer`, `studyflow.active`, `studyflow.sync`, `studyflow.username`, `studyflow.tourComplete`, `studyflow.theme`, `studyflow.accent`, `studyflow.durations`, `studyflow.syncResolved`.
   - Sign out from Supabase auth.
   - Cannot delete the Supabase Auth user itself from client (needs service_role key) — this is acceptable, the data + local state are wiped.

2. Edge case: if delete is called without a session, throw a clear error.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/storage/types.ts` | Add `appVersion: string` to AppData, update `createEmptyData` |
| `src/storage/index.ts` | Migrate old data without `appVersion` |
| `src/pages/Settings.tsx` | Display app version |
| `src/App.tsx` | Web auth flow: Google sign-in at splash, auth callback route, pull/push data for web |
| `src/DataContext.tsx` | Fire-and-forget pushData on every setData (web only, when authenticated) |
| `src/sync/index.ts` | Fix deleteAccount: clear all localStorage keys + sign out |

## Edge Cases & Error States

- **Web user without session reaching app:** Redirect to splash (handled by session check in AppRoot).
- **Push fails silently:** Fire-and-forget catches errors, no UI impact. Data remains in localStorage.
- **Desktop user always:** All web-only changes gated behind `!isTauri` checks. Desktop code path is NEVER executed.
- **Supabase OAuth redirect interrupted:** User returns to landing page, clicks "Open App" again, sees splash with "Sign in with Google" again — idempotent.
- **Import on web:** Imported data replaces localStorage. The next `setData` call will push it to Supabase. No special handling needed.
- **Delete account without session:** Throws clear error "Not authenticated" — the UI should guard against calling it without a session.
