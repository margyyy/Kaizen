# Architecture

**Analysis Date:** 2026-05-03

## Pattern Overview

**Overall:** Single-Page Application (SPA) wrapped in a Tauri v2 desktop shell. The same React codebase runs in both the browser (via Vite dev server or static build) and natively (via Tauri webview). Platform branching is driven by a runtime `isTauri` flag.

**Key Characteristics:**
- React 18 with react-router-dom v6 for client-side routing
- Tauri v2 Rust backend for desktop-specific features (system tray, notifications, separate overlay window)
- Local-first data model with optional cloud sync via Supabase
- DaisyUI/Tailwind CSS for theming with 12 accent colors x 2 theme modes (light/dark)

## Layers

**Web Frontend (SPA):**
- Purpose: The entire application UI and business logic
- Location: `src/`
- Contains: App entry point, routing, data context, pages, storage, sync, utility modules
- Depends on: React 18, react-router-dom, Supabase JS client, Tauri JS APIs (desktop only)
- Used by: Both browser and Tauri webview

**Desktop Shell (Tauri):**
- Purpose: Native window management, system tray, notifications, overlay window
- Location: `src-tauri/`
- Contains: Rust main.rs, Tauri config, capability declarations, icons
- Depends on: Tauri v2, tauri-plugin-notification, tauri-plugin-shell
- Used by: The web frontend via `@tauri-apps/api` and `@tauri-apps/plugin-*` imports

**Data Persistence:**
- Purpose: Read/write AppData to localStorage
- Location: `src/storage/index.ts`
- Contains: `loadData()`, `saveData()`, `clearData()`, `exportDataToFile()`, `importDataFromFile()`
- Depends on: localStorage API, Tauri file dialog plugins
- Used by: DataContext, App.tsx, sync module

**Cloud Sync:**
- Purpose: Push/pull AppData to/from Supabase
- Location: `src/sync/index.ts`
- Contains: `pushData()`, `pullData()`, `signInWithGoogle()`, `signOut()`, `deleteAccount()`
- Depends on: Supabase JS client, `src/supabase.ts`
- Used by: DataContext (debounced auto-sync), App.tsx (initial sync)

## Data Flow

**Local State Flow:**

1. User interacts with a page component
2. Page calls `setData(updater)` from `useData()` context hook
3. `DataProvider.setState()` runs the updater, calls `saveData(next)` to persist to localStorage, and schedules a cloud sync via `scheduleSync()`
4. React re-renders consuming components with new data

**Cloud Sync Flow:**

1. On app start, after splash screen, `handleSplashDone()` attempts Supabase session recovery
2. If a session exists, sets `syncEnabled = true` and calls `pullData()` to fetch remote data
3. On conflict (local + remote both have data), shows a conflict resolution dialog
4. In `DataProvider`, any data change schedules a 2-second debounced `pushData()` call
5. Sync state is tracked via localStorage keys `studyflow.sync` and `studyflow.lastSync`

**State Management:**
- Centralized: `DataContext` (`src/DataContext.tsx`) holds the single `AppData` object
- The `setData` callback pattern uses `(prev: AppData) => AppData` for immutable updates
- Timer state is NOT in DataContext -- uses separate localStorage key `studyflow.timer` for shared access between Dashboard and Overlay

## Component Hierarchy

```
BrowserRouter (src/App.tsx)
  +-- AppRoutes
       +-- Route /auth/callback -> AuthCallback
       +-- Route * -> AppRoot
            +-- SplashScreen (phase === "splash")
            +-- OnboardingScreen (phase === "onboarding")
            +-- ProfileScreen (phase === "profile")
            +-- TourGuide (phase === "tour")
            |    +-- AppShell
            |         +-- Overlay (path=/overlay)
            |         +-- Dashboard (path=/)
            |         +-- Overview (path=/overview)
            |         +-- Subjects (path=/subjects)
            |         +-- Roadmap (path=/roadmap/:subjectId)
            |         +-- Tasks (path=/tasks)
            |         +-- Flashcards (path=/flashcards)
            |         +-- Achievements (path=/achievements)
            |         +-- Settings (path=/settings)
            +-- AppShell (phase === "app")
                 +-- (same page routes as above)
```

## Initialization Phases

The app uses a phase machine in `AppRoot` (`src/App.tsx`, line 74):

**Desktop (isTauri === true):**
1. `splash` -- Animated logo, "Continue" button appears after 4s
2. `onboarding` -- 3-step wizard: name -> theme -> accent
3. `tour` -- Interactive tour via `TourGuide` component wrapping `AppShell`
4. `app` -- Normal application mode

Additional desktop-only phases:
- `profile` -- After sign-out, shows profile with Continue/Create New/Delete options

**Web (isTauri === false):**
1. Landing page at `/` (unless `sessionStorage.landingSkip` is set)
2. `splash` -- Brief splash, then checks Supabase session
3. `google-signin` -- Google OAuth button
4. `name-prompt` -- Display name form
5. `app` -- Normal application mode

## Desktop vs Web Branching

The `isTauri` flag on line 32 of `src/App.tsx` is the primary branch point:

```typescript
const isTauri = typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);
```

Branching affects:
- Landing page visibility (web-only, at `/`)
- Auth flow: desktop uses session recovery; web uses full OAuth redirect
- Sync conflict resolution: desktop shows conflict dialog; web always overwrites local
- Navigation: desktop shows "Sign out" in menu; web does not
- Update checks: desktop only, via `src/updateCheck.ts`
- File export/import: desktop uses native file dialogs; web falls back to browser download/file input

## Auth Flow

1. Web: User clicks "Sign in with Google" -> `signInWithGoogle()` in `src/sync/index.ts` initiates OAuth redirect to Supabase
2. Supabase redirects back to `/auth/callback`
3. `AuthCallback` component (`src/App.tsx`, line 750) detects the session and redirects to `/`
4. Desktop: Session token recovered from localStorage on startup, no redirect needed
5. Session is persisted to localStorage under the key `sb-lpnjxkzeyiifzzycmftg-auth-token`

## Sync Architecture

**Local-first model:**
- All data is always persisted to localStorage first
- Cloud sync is optional and enabled only when a Supabase session exists
- Sync status tracked via `studyflow.sync` (boolean) and `studyflow.lastSync` (ISO timestamp)

**Push:** Debounced 2 seconds after any data mutation in `DataContext`. Calls `supabase.from("user_data").upsert()` keyed on `google_id`.

**Pull:** On app startup after splash. Calls `supabase.from("user_data").select("data").eq("google_id", ...)`.

**Conflict resolution:** When both local and remote data exist (desktop only), the user is prompted to choose. On web, remote always overwrites local.

## Timer State Management

Timer state is stored independently from the main AppData under localStorage key `studyflow.timer`. This allows the separate Overlay window (opened via Tauri command `open_overlay` at `/overlay`) to read the same timer state without needing access to the main DataContext.

**Shared timer keys across windows:**
- `studyflow.timer` -- TimerState JSON (mode, remaining, isRunning, subjectId, taskId, etc.)
- `studyflow.durations` -- Duration settings (focus, shortBreak, longBreak)
- `studyflow.theme` / `studyflow.accent` -- Theme settings (synced via StorageEvent listener in Overlay)

## Cross-Cutting Concerns

**Theming:** 12 accent colors x 2 themes = 24 DaisyUI themes defined in `tailwind.config.js`. Theme applied as `data-theme={accent}-{theme}` on `documentElement`.

**Notifications:** Uses Tauri plugin notifications on desktop with browser `Notification` API fallback. Managed in `src/notifications.ts`.

**Single instance:** Rust `main.rs` implements a PID file lock at `/tmp/kaizen.lock` to prevent multiple desktop instances.

**Window management:** Main window hides on close (does not quit). System tray icon provides "Apri" (Show) and "Esci" (Quit) menu. Tray click also shows the main window.

---

*Architecture analysis: 2026-05-03*
