---
phase: 01-bug-fixes-auth-sync-and-timer-stability
plan: 02
subsystem: Timer
tags:
  - timer
  - beforeunload
  - state-reset
  - navigation-continuity
  - TIMER-01
  - TIMER-02
  - TIMER-03
  - TIMER-04
requires: []
provides:
  - TIMER-01: Timer state isolated to studyflow.timer key
  - TIMER-02: Timer fully resets on app/tab close
  - TIMER-03: No timer state survives app restart
  - TIMER-04: Timer correctly continues across in-app navigation
affects:
  - src/pages/Dashboard.tsx
tech-stack:
  added: []
  patterns:
    - "localStorage.removeItem(TIMER_KEY) for complete timer state wipe"
    - "Unconditional closedWhileRunning flag in beforeunload"
key-files:
  created: []
  modified:
    - src/pages/Dashboard.tsx
decisions:
  - "Use localStorage.removeItem instead of saveTimer with cleared fields to prevent stale timer state from leaking through lazy initializers on remount"
metrics:
  duration: 103s
  completed_date: 2026-05-03
---

# Phase 1 Plan 2: Timer Stability (TIMER-01 through TIMER-04)

Timer beforeunload handler now unconditionally marks `closedWhileRunning` regardless of timer running state. Mount effect performs complete timer state reset (all UI state reinitialized to defaults, timer key removed from localStorage) when the flag is detected. Timer isolation and navigation continuity verified.

## Tasks Completed

### Task 1: Fix timer reset on app/tab close -- always mark for reset in beforeunload

**Commit:** `ea3ed07`

Changed the beforeunload effect's guard from `if (stored?.isRunning)` to `if (stored)`, so ANY timer state at close time sets `closedWhileRunning: true`. Running timers still compute remaining via `computeRemaining` (accounting for elapsed time). Paused timers preserve `stored.remainingSec` for consistency (will be reset on mount). This ensures TIMER-03's "always starts fresh" requirement is met for both running and paused timers.

**Files modified:** `src/pages/Dashboard.tsx` (4 insertions, 2 deletions)

### Task 2: Full timer state reset on mount when closedWhileRunning is set

**Commit:** `f6a2b5d`

Replaced the mount effect's `closedWhileRunning` handler to perform a complete state reset:
- `setSelectedSubjectId("")`, `setSelectedTaskId("")` -- clear stale selections
- `setMode("focus")`, `setRemainingSec(DEFAULT_FOCUS)` -- reset to focus defaults
- `setCompletedFocuses(0)` -- reset completion counter
- `localStorage.removeItem(TIMER_KEY)` -- completely remove timer state from localStorage

Previously the handler only reset `isRunning` and `remainingSec`, saving back a partial timer object. This left stale `subjectId`, `taskId`, and `mode` values that the lazy useState initializers would pick up on subsequent remounts, violating TIMER-03. The key change is using `localStorage.removeItem` instead of `saveTimer`, ensuring no stale timer object remains for lazy initializers to read.

**Files modified:** `src/pages/Dashboard.tsx` (7 insertions, 9 deletions)

### Task 3: Verify timer isolation and navigation continuity

**No code changes.**

Verified that:
1. **TIMER-01 (timer isolation):** Timer state is exclusively stored in `studyflow.timer` key used by `Dashboard.tsx` and `Overlay.tsx`. AppData has no timer fields. DataContext never reads/writes timer state. sync/index.ts and storage/index.ts have no timer references. The only reference to `studyflow.timer` outside those files is in `App.tsx:321` (`handleDesktopDelete` which clears ALL storage including the timer on profile deletion -- correct behavior).
2. **TIMER-04 (navigation continuity):** The mount effect correctly restores running timer state when `stored.isRunning` is true and `closedWhileRunning` is not set. `computeRemaining` correctly accounts for elapsed time. The beforeunload effect cleanup removes the listener on unmount, preventing false triggers during navigation. The tick interval depends on `[isRunning]` and starts when `setIsRunning(true)` is called in the mount effect.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED (zero errors)
- `studyflow.timer` grep: Only in Dashboard, Overlay, and App (profile delete path)
- `TIMER_KEY` grep: Only in Dashboard and Overlay
- AppData interface: No timer fields -- verified clean
- `sync/index.ts` timer references: None
- `DataContext.tsx` timer references: None
- `storage/index.ts` timer references: None

## Success Criteria

- [x] Timer completely resets after app/tab close regardless of running or paused state
- [x] Timer correctly continues running across in-app navigation (no interruption on route change)
- [x] Timer state is isolated to `studyflow.timer` key -- never embedded in AppData or synced
- [x] TypeScript compiles with zero errors

## Known Stubs

None.

## Threat Flags

None -- no new security-relevant surface introduced by this plan.

## Self-Check: PASSED

| Artifact | Status |
|----------|--------|
| `src/pages/Dashboard.tsx` committed Task 1 changes (`ea3ed07`) | FOUND |
| `src/pages/Dashboard.tsx` committed Task 2 changes (`f6a2b5d`) | FOUND |
| beforeunload sets `closedWhileRunning` for ANY timer state | CONFIRMED (line 138) |
| Mount effect fully resets all state when closedWhileRunning | CONFIRMED (lines 110-119) |
| Mount effect removes timer key via `localStorage.removeItem` | CONFIRMED (line 117) |
| Navigation continuity restores running timer correctly | CONFIRMED (lines 121-129) |
| Timer isolation verified (no leaks to DataContext/sync/storage) | CONFIRMED |
