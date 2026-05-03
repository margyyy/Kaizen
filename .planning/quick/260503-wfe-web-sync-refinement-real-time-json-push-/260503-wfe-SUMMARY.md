---
phase: quick
plan: 260503-wfe
subsystem: auth, sync, data-model
tags: [web-sync, google-auth, realtime-push, delete-account, app-version]
requires: []
provides: [app-version-tracking, web-auth-flow, realtime-sync, delete-account]
affects: [src/App.tsx, src/DataContext.tsx, src/sync/index.ts, src/storage/types.ts, src/storage/index.ts, src/pages/Settings.tsx]
tech-stack:
  added: [src/version.ts (APP_VERSION constant)]
  patterns: [fire-and-forget async push, web-only gating via isTauri check, session guard useEffect]
key-files:
  created: []
  modified:
    - src/storage/types.ts: appVersion in AppData + createEmptyData
    - src/storage/index.ts: migration for old data without appVersion
    - src/pages/Settings.tsx: version display in card
    - src/App.tsx: web auth flow, /auth/callback route, SplashScreen for web
    - src/DataContext.tsx: real-time push on every setData (web only)
    - src/sync/index.ts: deleteAccount clears all localStorage keys
decisions:
  - App version 0.1.1 baked into createEmptyData via APP_VERSION constant
  - Web auth uses Supabase Google OAuth with PKCE, desktop stays offline-only
  - Fire-and-forget push never blocks UI; errors silently caught
  - Web session guard redirects to splash if no session during app render
metrics:
  duration: N/A
  completed_date: 2026-05-03
---

# Phase quick Plan 260503-wfe: Web Sync Refinement Summary

Web sync refinement: app version tracking, Google auth flow for web users, real-time JSON push on every data change, and fixed delete account that clears all local state.

## Tasks Completed

### Task 1: App version in AppData + Settings display

- Added `appVersion: string` to `AppData` interface in `src/storage/types.ts`
- Imported `APP_VERSION` from `src/version.ts` (value `0.1.1`)
- `createEmptyData` now includes `appVersion: APP_VERSION` in return object
- `loadData` migration sets `appVersion = "0.0.0"` for pre-version-era data
- Settings page shows version in a dedicated card section

**Commit:** `a20ff77`

### Task 2: Web auth flow — Google sign-in at splash, pull/push data, auth callback route

- Added `/auth/callback` route in `AppRoutes` with `AuthCallback` component:
  - Calls `getSession()` to pick up OAuth tokens from URL
  - Sets `landingSkip` and redirects to `/`
- Modified `SplashScreen` for web:
  - Shows "Sign in with Google" button instead of "Continue"
  - On mount, checks for existing session — auto-proceeds if found (returning from OAuth)
  - Shows loading spinner while session/pull resolves
- `handleSplashDone` web branch:
  - Checks session → `pullData()` → if data exists, set and go to app
  - If no data (new user), go to onboarding
- `finishOnboarding` web branch:
  - After creating fresh data, calls `pushData(fresh)` to store in Supabase
  - No tour for web users
- Added web session guard: `useEffect` checks session when `phase === "app"` on web
  - If no session found, redirects back to splash

**Commit:** `68ce51a`

### Task 3: Real-time push in DataContext (web only)

- Imported `pushData` and `getSession` from `./sync`
- Added fire-and-forget push after `saveData(next)` in `setData` callback
- Gated behind `!isTauri` check (desktop never executes)
- Only pushes when a Supabase session exists
- Errors silently caught with `.catch(() => {})`

**Commit:** `afb61c4`

### Task 4: Fix delete account — clear local data + Supabase data

- `deleteAccount` now clears ALL relevant localStorage keys after deleting Supabase row:
  - `studyflow.data`, `studyflow.timer`, `studyflow.active`, `studyflow.sync`
  - `studyflow.username`, `studyflow.tourComplete`, `studyflow.theme`
  - `studyflow.accent`, `studyflow.durations`, `studyflow.syncResolved`
- Still throws "Not authenticated" if no session
- Supabase Auth user itself is not deleted (requires service_role key)

**Commit:** `66ceb8c`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — all modified files operate within the existing threat model (no new network endpoints, auth paths remain Supabase-managed).

## Edge Cases

- **Web user without session redirected to app:** Session guard catches this and sends back to splash
- **Push fails silently:** `.catch(() => {})` prevents UI impact; data remains in localStorage
- **Desktop user never affected:** All web-only changes gated behind `!isTauri` / `!("__TAURI__" in window)` checks
- **Supabase OAuth redirect interrupted:** AuthCallback redirects to `/`, splash shows "Sign in with Google" again — idempotent
- **Delete account without session:** Throws clear error — UI should guard against calling it

## Self-Check: PASSED

All tasks committed and verified:
- `a20ff77` — feat(wfe): add appVersion to AppData and display in Settings
- `68ce51a` — feat(wfe): web auth flow with Google sign-in, pull/push data, auth callback
- `afb61c4` — feat(wfe): real-time push to Supabase on every data change (web only)
- `66ceb8c` — fix(wfe): delete account clears all local storage keys
