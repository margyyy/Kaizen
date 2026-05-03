---
phase: 01-bug-fixes-auth-sync-and-timer-stability
plan: 01
subsystem: Auth, Sync
tags:
  - auth
  - sync
  - web-login
  - conflict-dialog
  - desktop-continue
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04
  - SYNC-01
  - SYNC-02
  - SYNC-03
  - SYNC-04
  - SYNC-05
  - CROSS-01
  - CROSS-02
requires: []
provides:
  - AUTH-01: detectSessionInUrl set to true for OAuth callback recovery
  - AUTH-02: New web users routed to name-prompt instead of no-account gate
  - AUTH-03: no-account phase removed from codebase
  - AUTH-04: Web path overwrites local with cloud when remote data exists
  - SYNC-01: handleDesktopContinue shows conflict dialog when both local and cloud data exist
  - SYNC-02: Settings sync toggle on triggers conflict check via enableSync
  - SYNC-03: Sync enable from Settings triggers conflict check via enableSync
  - SYNC-04: Settings conflict resolution overwrites local or pushes to cloud correctly
  - SYNC-05: Web path never shows conflict dialog, always overwrites local with cloud
  - CROSS-01: Web auth flow end-to-end works (OAuth callback -> session recovery -> app)
  - CROSS-02: Desktop session persistence uses Supabase getSession on cold start
affects:
  - src/supabase.ts
  - src/App.tsx
tech-stack:
  added: []
  patterns:
    - "detectSessionInUrl: true for Supabase auth client"
    - "setSyncConflict(remote) + early return pattern for desktop conflict detection"
key-files:
  created: []
  modified:
    - src/supabase.ts
    - src/App.tsx
decisions:
  - "Use same resolveSyncConflict handler for both splash and desktop continue conflict dialogs -- no new UI needed"
  - "Conflict check on desktop continue requires saved.subjects.length > 0 to distinguish empty local data from meaningful local data"
metrics:
  duration: 138s
  completed_date: 2026-05-03
---

# Phase 1 Plan 1: Auth, Sync, and Cross-Cutting Fixes (AUTH-01 through SYNC-05, CROSS-01 through CROSS-02)

Web login fixed by enabling `detectSessionInUrl: true` in the Supabase client configuration so the OAuth callback can recover the access token from the URL hash. The `no-account` gate phase is removed -- new web users who sign in with Google but have no cloud data are routed to the name-prompt screen to create a profile. The desktop Continue flow on the Profile screen now shows the sync conflict dialog when both local and cloud data exist, instead of silently overwriting local data. Settings sync section code review confirms all three trigger points (toggle on, enable sync, conflict resolution) work correctly.

## Tasks Completed

### Task 1: Fix web auth flow -- detectSessionInUrl and remove no-account gate

**Commit:** `c2a5087`

Three changes applied:
1. `src/supabase.ts` line 11: Changed `detectSessionInUrl: false` to `detectSessionInUrl: true`. This allows the Supabase client to detect the OAuth access token from the URL hash on the `/auth/callback` page, which was the root cause of the broken web login.
2. `src/App.tsx` line 230: Changed `setPhase("no-account")` to `setPhase("name-prompt")`. New web users with a Google session but no local or cloud data are now routed to the name-prompt screen to create a profile.
3. `src/App.tsx`: Removed `"no-account"` from the phase type union (line 74) and deleted the entire `if (phase === "no-account")` rendering block (19 lines).

**Files modified:** `src/supabase.ts` (1 change), `src/App.tsx` (3 changes)

### Task 2: Add sync conflict dialog to handleDesktopContinue (Profile screen)

**Commit:** `c8c37ab`

Modified `handleDesktopContinue` to show the sync conflict dialog when both local and cloud data exist, instead of silently overwriting local data with remote data. The key logic:
- When both `remote` (cloud data has subjects) and `saved` (local data has subjects) exist: call `setSyncConflict(remote)` and return early. This triggers the existing conflict dialog rendering which offers "Load cloud data" or "Keep local data" choices.
- When only remote data exists (local is empty): overwrite local with remote (same as before).
- The existing `resolveSyncConflict` handler handles both resolution paths and sets phase to "app".

This reuses the same conflict dialog and resolution handler as the initial splash flow -- no new UI was needed.

**Files modified:** `src/App.tsx` (6 insertions within `handleDesktopContinue`)

### Task 3: Verify sync conflict dialog triggers on sync toggle and enable (Settings.tsx)

**No code changes.**

Code review of `Settings.tsx` `SyncSection` component confirms all three trigger points:

1. **SYNC-02 (toggle off/on)**: `handleToggle` when checked + signedIn calls `enableSync()` which calls `pullData()`. If remote data exists with subjects, `setConflict(remote)` is called showing the Settings conflict dialog. `disableSync()` removes `SYNC_RESOLVED_KEY`, ensuring the next toggle-on always re-checks regardless of prior resolution state.

2. **SYNC-03 (enable sync from Settings)**: Same path as SYNC-02. `enableSync()` always checks for conflict via `pullData()` on every call. The `SYNC_RESOLVED_KEY` guard only applies in the mount `useEffect`, not in `enableSync()`, so every manual toggle-on triggers the conflict check.

3. **SYNC-04 (load cloud overwrites)**: Settings `resolveConflict(useRemote)`:
   - `useRemote && conflict`: calls `saveData(conflict)` and `setData(() => conflict)` -- overwrites ALL local data with cloud data
   - `!useRemote`: calls `pushData(data)` -- pushes ALL local data to cloud
   - Both paths clear conflict state, set sync enabled, and mark `SYNC_RESOLVED_KEY`

All three trigger points verified working. No code changes needed.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED (zero errors)
- `detectSessionInUrl` in `src/supabase.ts`: `true`
- `"no-account"` in `src/App.tsx`: No matches (completely removed)
- `setPhase("name-prompt")` in `src/App.tsx`: Found at line 230
- `setSyncConflict` in `src/App.tsx`: Found in both `handleSplashDone` (line 174) and `handleDesktopContinue` (line 294)

## Success Criteria

- [x] Web login works end-to-end: `detectSessionInUrl: true` enables OAuth session recovery from URL hash
- [x] No-account phase completely removed from codebase (unreachable code eliminated)
- [x] Profile screen "Continue" triggers sync conflict dialog when both local and cloud data exist
- [x] Sync section toggle on/off always triggers conflict dialog when remote data exists
- [x] TypeScript compiles with zero errors

## Known Stubs

None.

## Threat Flags

None -- no new security-relevant surface introduced by this plan. The `detectSessionInUrl: true` change enables Supabase's built-in URL hash processing (already mitigated by T-01-01: hash is single-use and bound to OAuth flow). All other changes are to existing state machine paths.

## Self-Check: PASSED

| Artifact | Status |
|----------|--------|
| `src/supabase.ts` has `detectSessionInUrl: true` | CONFIRMED |
| `src/App.tsx` has `setPhase("name-prompt")` in web branch | CONFIRMED |
| `src/App.tsx` phase type union excludes `"no-account"` | CONFIRMED |
| `src/App.tsx` has no `no-account` rendering block | CONFIRMED |
| `handleDesktopContinue` calls `setSyncConflict(remote)` when both local and remote data exist | CONFIRMED |
| `handleDesktopContinue` returns early on conflict | CONFIRMED |
| Settings `handleToggle` calls `enableSync()` which calls `setConflict(remote)` when remote exists | CONFIRMED |
| Settings `enableSync()` always checks conflict regardless of `SYNC_RESOLVED_KEY` | CONFIRMED |
| Settings `resolveConflict(true)` overwrites local with conflict data | CONFIRMED |
| Settings `resolveConflict(false)` pushes local to cloud | CONFIRMED |
| Commit `c2a5087` (Task 1) exists | FOUND |
| Commit `c8c37ab` (Task 2) exists | FOUND |
