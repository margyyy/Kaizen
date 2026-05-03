# Roadmap: Kaizen Bug Fixes

## Overview

Kaizen has critical bugs in auth, sync, and timer behavior across web and desktop. This single phase fixes all 15 identified issues to make the app reliable: web login works for anyone, desktop sessions persist across restarts, sync conflict resolution is predictable, timer state resets correctly, and cross-platform OAuth flows are robust.

## Phases

- [ ] **Phase 1: Bug Fixes -- Auth, Sync, and Timer Stability** - Fix all auth, sync, timer, and cross-platform bugs across web and desktop

## Phase Details

### Phase 1: Bug Fixes -- Auth, Sync, and Timer Stability
**Goal**: Users experience reliable authentication, predictable sync behavior, and correct timer state across web and desktop platforms
**Depends on**: Nothing (brownfield -- existing app)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, TIMER-01, TIMER-02, TIMER-03, TIMER-04, CROSS-01, CROSS-02
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google from web or desktop and stays signed in across browser/app restarts -- no re-authentication needed
  2. Desktop user sees sync conflict dialog on every login, sync toggle, and sync enable -- chosen data direction (cloud overwrites local or local replaces cloud) is fully applied
  3. Web user can register and sign in without ever using the desktop app -- no "desktop required first" gate, no local-first prompts, cloud data always overwrites local on sign-in
  4. Timer fully resets when app/tab is closed, never resumes from a previous session, but continues running during in-app navigation between pages
  5. Timer state is stored in isolated localStorage key (`studyflow.timer`) only, never embedded in AppData JSON or synced to Supabase
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 01-01-PLAN.md -- Auth & sync fixes: web login, no-account removal, conflict dialog triggers
- [x] 01-02-PLAN.md -- Timer fixes: full reset on app close, navigation continuity, isolation verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bug Fixes -- Auth, Sync, and Timer Stability | 1/2 | In progress | 2026-05-03 (Plan 2) |
