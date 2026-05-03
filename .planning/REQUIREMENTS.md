# Requirements -- Kaizen Bug Fixes

## v1 Requirements

### Auth & Platform

- [ ] **AUTH-01**: Web login with Google must work -- user signs in, cloud data loads, app opens
- [ ] **AUTH-02**: Any user must be able to register/sign in from web -- remove the "desktop app required first" gate (`no-account` phase)
- [ ] **AUTH-03**: On desktop, Google session must persist across app restarts -- closing and reopening the app keeps the user signed in
- [ ] **AUTH-04**: Web has no local-first concept -- web is always cloud, never prompts about local vs cloud data

### Sync & Data

- [ ] **SYNC-01**: On desktop, when user signs in with Google and both local and cloud data exist -- immediately show conflict dialog ("Load cloud data" overwriting local, or "Keep local data" uploading to cloud)
- [ ] **SYNC-02**: Same conflict dialog (SYNC-01) must appear when user toggles sync off and back on
- [ ] **SYNC-03**: Same conflict dialog (SYNC-01) must appear when user enables sync from Settings -- Sync section
- [ ] **SYNC-04**: When "Load cloud data" is chosen, ALL cloud data overwrites local completely
- [ ] **SYNC-05**: On web, cloud data always overwrites local on sign-in -- no conflict dialog ever

### Timer

- [ ] **TIMER-01**: Timer state (`studyflow.timer`) is stored in a separate localStorage key, never in AppData JSON, never synced to Supabase
- [ ] **TIMER-02**: When the app or browser tab is completely closed, the timer must reset -- on next launch, no timer state is remembered
- [ ] **TIMER-03**: Timer must NOT resume from a previous session under any circumstance -- always starts fresh after app restart
- [ ] **TIMER-04**: Timer continues running when navigating between pages within the app (navbar navigation does not stop the timer)

### Cross-cutting

- [ ] **CROSS-01**: Desktop OAuth flow must work correctly -- after Google sign-in, the callback reaches the Tauri webview and stores the session token
- [ ] **CROSS-02**: Supabase session token (`sb-*-auth-token` in localStorage) must be checked on every desktop cold start

## Out of Scope

- Multi-device real-time sync -- not needed, single-user app
- Offline-only desktop mode -- user wants cloud sync when signed in
- Timer sync across devices -- timer is local-only by design

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SYNC-01 | Phase 1 | Pending |
| SYNC-02 | Phase 1 | Pending |
| SYNC-03 | Phase 1 | Pending |
| SYNC-04 | Phase 1 | Pending |
| SYNC-05 | Phase 1 | Pending |
| TIMER-01 | Phase 1 | Pending |
| TIMER-02 | Phase 1 | Pending |
| TIMER-03 | Phase 1 | Pending |
| TIMER-04 | Phase 1 | Pending |
| CROSS-01 | Phase 1 | Pending |
| CROSS-02 | Phase 1 | Pending |

---
*Last updated: 2026-05-03*
