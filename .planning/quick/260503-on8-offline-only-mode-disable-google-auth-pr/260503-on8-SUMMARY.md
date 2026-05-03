---
phase: quick-260503-on8
plan: 01
subsystem: auth, settings, timer
tags: [offline, auth-removal, data-export, timer-persistence]
requires: []
provides: [offline-only-mode]
affects: [App.tsx, DataContext.tsx, Settings.tsx, Dashboard.tsx]
tech-stack:
  added: []
  patterns: [offline-first local storage pattern]
key-files:
  created: []
  modified:
    - src/App.tsx
    - src/DataContext.tsx
    - src/pages/Settings.tsx
    - src/pages/Dashboard.tsx
decisions:
  - "Web users now use localStorage like desktop users (no cloud/sync distinction)"
  - "Web sign out clears local data and sends to onboarding (no google-signin phase)"
  - "Timer onCloseRequested handler removed so timer survives window hide to tray"
  - "All supabase/sync source files preserved on disk but no longer imported"
metrics:
  duration: 126s
  completed_date: "2026-05-03T22:27:31.000Z"
  tasks:
    total: 3
    committed: 3
  files_changed: 4
  commits:
    - d79d20b: "feat(quick-on8): disable Google auth in App.tsx and DataContext.tsx"
    - 56c236c: "feat(quick-on8): add data export/import to Settings, remove auth and sync sections"
    - e23f68e: "fix(quick-on8): remove Tauri onCloseRequested handler, keep beforeunload only"
---

# Quick [260503-on8] Plan 01: Offline-only mode -- disable Google auth, add data export/import, fix timer persistence

**One-liner:** Remove all Google auth and cloud sync imports/usage from the app boot flow, DataContext, and Settings; add JSON data export/import buttons; remove Tauri onCloseRequested timer reset so timer survives window hide to tray.

## Changes Made

### Task 1: Disable Google auth in App.tsx and DataContext.tsx (preserve all source files)
- **Files:** `src/App.tsx`, `src/DataContext.tsx`
- **Commit:** `d79d20b`
- Removed `supabase` and `sync` imports from both files
- Removed `scheduleSync()` function and call from DataContext
- Simplified boot flow: no session recovery, no token checks, no Google sign-in phases
- Removed `AuthCallback`, `NameForm`, `handleWebGoogleSignIn`, `handleWebName`, `handleWebSignOut`, `resolveSyncConflict`, `syncConflict` state, and related render blocks
- Simplified `handleSplashDone` and `handleDesktopContinue` -- no async, no supabase calls
- Updated phase state type: removed `"google-signin"` and `"name-prompt"`
- Preserved `src/sync/index.ts` and `src/supabase.ts` on disk unchanged

### Task 2: Add data export/import buttons to Settings, remove auth and sync sections
- **File:** `src/pages/Settings.tsx`
- **Commit:** `56c236c`
- Removed all supabase and sync imports
- Removed `WebAccountSection`, `SyncDeleteSection`, `SyncSection` components and their state
- Added new "Data" card with Export data and Import data buttons
- Added `handleExport` and `handleImport` handlers using existing `exportDataToFile`/`importDataFromFile`

### Task 3: Fix timer persistence on tray close (Dashboard.tsx)
- **File:** `src/pages/Dashboard.tsx`
- **Commit:** `e23f68e`
- Removed Tauri-specific `onCloseRequested` listener that triggered timer reset on window hide to tray
- Removed `tauriUnlisten`, `isTauriEnv`, and `@tauri-apps/api/window` dynamic import
- Kept `beforeunload` listener for web tab close (marks timer as `closedWhileRunning`)

## Verification

- `npx vite build` passes with zero errors
- All grep checks confirm removal of auth/sync references in modified files
- Source files `src/sync/index.ts` and `src/supabase.ts` remain on disk

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `d79d20b` | feat | Disable Google auth in App.tsx and DataContext.tsx |
| `56c236c` | feat | Add data export/import to Settings, remove auth and sync sections |
| `e23f68e` | fix | Remove Tauri onCloseRequested handler, keep beforeunload only |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

All created/modified files verified on disk. All three commits confirmed in git log. Build passes cleanly.
