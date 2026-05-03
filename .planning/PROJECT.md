# Kaizen (改善)

## What This Is

Kaizen is a Pomodoro-based study companion app. It tracks focus sessions across subjects, manages tasks with due dates, supports spaced-repetition flashcards, and awards achievements for consistent study habits. Available as both a web app (React SPA) and a native desktop app (Tauri v2).

## Core Value

Reliable, distraction-free Pomodoro timer that persists study sessions and syncs seamlessly across web and desktop via Google-authenticated cloud sync.

## Requirements

### Validated

- ✓ Pomodoro timer with focus/short-break/long-break modes — existing
- ✓ Subject and task management — existing
- ✓ Study session tracking with heatmap calendar — existing
- ✓ Flashcard system with spaced repetition — existing
- ✓ Achievement/badge system — existing
- ✓ Light/dark theme with accent colors — existing
- ✓ Desktop app with system tray (Tauri v2) — existing
- ✓ Supabase cloud sync with Google OAuth — existing
- ✓ Roadmap planning (macro/micro topics) — existing
- ✓ Landing page (web only) — existing

### Active

- [ ] BUGFIX-01: Web login broken + remove desktop-app-only registration gate
- [ ] BUGFIX-02: Desktop sync conflict dialog must appear every time user logs in, re-enables sync, or toggles sync
- [ ] BUGFIX-03: Desktop Google session not persistent across app restarts
- [ ] BUGFIX-04: Timer state must fully reset when app/page is closed (never remember old session)
- [ ] BUGFIX-05: Web is always cloud — no local-first concept on web

### Out of Scope

- Offline-only mode for desktop — user wants cloud sync when logged in
- Multiple simultaneous timers — one timer at a time

## Context

**Technical environment:** React 18 + TypeScript + Vite 5 frontend, Tauri v2 Rust desktop shell, Supabase (Postgres + Auth) backend, Tailwind CSS + daisyUI styling.

**Current state:** App is functionally complete but has critical bugs in auth flow, sync logic, and timer state persistence. The web login is broken. Desktop Google session is lost on restart. The sync conflict dialog doesn't trigger at the right moments. Timer state persists when it should reset.

**Known issues to address:**
1. Web login flow broken — `handleSplashDone` web path has issues after recent changes
2. Desktop registration gate ("no-account" phase) blocks web users who never used desktop
3. Desktop sync conflict only checked at startup, not on every login/sync-toggle
4. Desktop Google session (`sb-*-auth-token` in localStorage) not properly restored on cold start
5. Timer `beforeunload` marks `closedWhileRunning` but the flag may not be handled correctly in all paths
6. Web flow incorrectly retained local-first concepts from earlier architecture

## Constraints

- **Tech stack**: React 18, TypeScript, Vite 5, Tauri v2, Supabase — fixed
- **Auth**: Google OAuth via Supabase — fixed
- **Data model**: AppData JSON in localStorage + Supabase `user_data` table — fixed
- **Timer isolation**: Timer state stored in separate localStorage key (`studyflow.timer`), never in AppData JSON or Supabase — fixed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web is always cloud, desktop is local-first with optional sync | User's explicit requirement — web never prompts about local vs cloud | — Pending |
| Timer resets on app close, never resumes | User's explicit requirement — prevents timer from running while app is closed | — Pending |
| Sync conflict dialog on desktop only | Web has no local concept; desktop shows conflict when both local and cloud data exist | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
