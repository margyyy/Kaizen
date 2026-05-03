# Codebase Concerns

**Analysis Date:** 2026-05-03

## Architecture Smells

### App.tsx is an 882-line monolithic component
- **Files:** `src/App.tsx` (882 lines)
- **Issue:** Single component (`AppRoot`, line 65) manages: splash screen, onboarding flow, authentication routing, Google sign-in, sync conflict resolution, tour state, theme/ accent management, and the full app shell. Phase transitions are handled via a single `useState<"splash" | "onboarding" | "google-signin" | ...>` at line 74 with 8 possible states, each rendering completely different UI inline.
- **Impact:** Hard to reason about, modify, or test. Adding a new phase requires touching this one massive component. Logic for web and desktop is interleaved with `isTauri` branches throughout.
- **Fix approach:** Split into focused components: `SplashScreen`, `OnboardingFlow`, `SyncGate`, `AppShell`. Extract routing and auth orchestration into a dedicated hook or router guard.

### Dashboard.tsx mixes timer logic with UI rendering
- **Files:** `src/pages/Dashboard.tsx` (570 lines)
- **Issue:** Timer state machine (`startTimer`, `pauseTimer`, `resetTimer`, `handleCompletion`, `switchMode`, `handleDurationChange`) is defined inline inside the component, alongside localStorage persistence, polling logic, and JSX rendering. 347 lines of logic before the first return statement at line 435.
- **Impact:** No reuse possible. The overlay (`src/pages/Overlay.tsx`) duplicates identical timer logic: `loadTimer`, `saveTimer`, `computeRemaining` are independently reimplemented.
- **Fix approach:** Extract `useTimer` hook shared between Dashboard and Overlay.

### isTauri check duplicated
- **Files:** `src/App.tsx:32`, `src/pages/Settings.tsx:21`
- **Issue:** The exact same `isTauri` detection (`typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)`) is copy-pasted in two files.
- **Impact:** If the Tauri API detection changes, both locations must be updated.
- **Fix approach:** Export from a shared module (e.g., `src/tauri.ts`).

### Duplicate OAuth sign-in functions
- **Files:** `src/sync/index.ts:27-49`
- **Issue:** `signInWithGoogle()` (line 27) and `signInWithGoogleDesktop()` (line 39) are identical functions with the same redirect URL and same parameters.
- **Impact:** Confusing. Desktop OAuth callers use `signInWithGoogleDesktop` expecting a different flow, but get identical behavior. The desktop OAuth redirect using `window.location.origin` may not work in production (system browser resolves the URL, not the Tauri webview at localhost:5173).
- **Fix approach:** Merge into one function or add actual platform-aware redirect logic.

### Sync conflict resolution logic duplicated
- **Files:** `src/App.tsx:328-340`, `src/pages/Settings.tsx:284-296`
- **Issue:** The conflict resolution UI and logic (choose local vs cloud) is implemented separately in App.tsx and in `SyncSection` (Settings.tsx).
- **Impact:** Behavior could drift between the two locations.
- **Fix approach:** Extract shared conflict resolution component.

## Error Handling Gaps

### 25+ silent catch blocks
- **Files:** `src/App.tsx:85,99,185,203,228,235,243,253,299`, `src/DataContext.tsx:21`, `src/storage/index.ts:14,48,78`, `src/pages/Settings.tsx:158,214,278,289,313,342`, `src/pages/Overlay.tsx:14,131`, `src/pages/Landing.tsx:33`, `src/notifications.ts:18`, `src/updateCheck.ts:68`
- **Issue:** The majority of catch blocks either are completely empty (`catch {}` at App.tsx:85,99, Settings.tsx:158,214) or swallow errors with comments like `/* offline */` or `/* redirecting */`. None report errors to any monitoring system.
- **Impact:** Silent failures in sync, auth, data loading, and account deletion. Users get no feedback when operations fail.
- **Fix approach:** Log errors consistently. Show user-facing toasts for failures. Differentiate transient (retriable) from fatal errors.

### No React error boundaries
- **Files:** All pages, no `ErrorBoundary` usage found anywhere.
- **Issue:** If any component throws during render, the entire app unmounts to a white screen. No fallback UI.
- **Impact:** Any unhandled render error crashes the full application.
- **Fix approach:** Wrap each route in an error boundary with a user-friendly fallback.

### No retry logic for sync
- **Files:** `src/DataContext.tsx:21`
- **Issue:** `pushData` is called once after a 2-second debounce. If it fails (network, auth expiry, server error), the data is silently lost and not retried.
- **Impact:** Data silently fails to sync. The `saveData` has already been called (line 37), so localStorage is updated, but the cloud never receives the change.
- **Fix approach:** Add retry with exponential backoff and queue failed mutations.

## Data Integrity

### localStorage as single source of truth with no corruption recovery
- **Files:** `src/storage/index.ts:5-17`
- **Issue:** `loadData()` wraps `JSON.parse` in try-catch and returns `null` on any parse failure (line 14). This silently wipes all user data if localStorage is corrupted or if the schema changes incompatibly.
- **Impact:** Total data loss on corruption. No backup, no recovery path.
- **Fix approach:** Version the stored data. On parse failure, prompt user to restore from export or keep stale data. Add schema migration support.

### No data versioning or migration strategy
- **Files:** `src/storage/index.ts:10-12`
- **Issue:** Migration is done inline with ad-hoc checks for missing fields (`if (!parsed.theme) parsed.theme = "dark"`). No `version` field in stored data. Schema evolution is fragile.
- **Impact:** Future schema changes will silently corrupt or lose data.
- **Fix approach:** Add a `version` integer to `AppData`. Maintain a list of migration functions keyed by version.

### nextId counter can collide across devices
- **Files:** `src/storage/types.ts:29-49`
- **Issue:** Entity IDs are generated by incrementing a single `nextId` counter stored in `AppData`. When syncing from multiple devices, two devices can create entities with the same ID, causing silent data loss during upsert (sync uses `onConflict: "google_id"` at the row level, not the entity level).
- **Impact:** Study sessions, tasks, flashcards created on different devices can silently overwrite each other.
- **Fix approach:** Use UUIDs for entity IDs or partition ID ranges per device.

### Sync push uses redundant deep clone
- **Files:** `src/sync/index.ts:76`
- **Issue:** `JSON.parse(JSON.stringify(data))` is used before upsert, which is a full deep clone of potentially large data on every sync (2s debounce on every data change).
- **Impact:** Unnecessary CPU/memory overhead per keystroke.
- **Fix approach:** Remove the deep clone if data is already a plain object.

## Security Considerations

### Supabase localStorage token read directly
- **Files:** `src/App.tsx:80,94`
- **Issue:** The Supabase auth token is read directly from localStorage via the internal key `sb-lpnjxkzeyiifzzycmftg-auth-token` (line 80). This is an undocumented Supabase internal key format. If Supabase changes its storage format, session detection breaks.
- **Impact:** Fragile coupling to Supabase internals. Token exposed to any XSS in any part of the app.
- **Fix approach:** Use `supabase.auth.getSession()` instead of reading localStorage directly.

### Blocking confirm() dialogs for destructive operations
- **Files:** `src/App.tsx:312`, `src/pages/Flashcards.tsx:124`, `src/pages/Roadmap.tsx:78,125`
- **Issue:** Uses `confirm()` dialogs for delete operations. These block the JavaScript event loop, cannot be styled, and are not accessible (screen readers handle them inconsistently).
- **Impact:** Poor UX on desktop, no keyboard navigation support for the dialog itself.
- **Fix approach:** Replace with modal components.

## Performance Issues

### Heavy chart library bundled
- **Files:** `package.json:28`, `src/pages/Statistics.tsx:1-14`
- **Issue:** `recharts` (263KB+ gzipped) is imported and only used on the Statistics page. This is a single-route page.
- **Impact:** Unnecessary bundle size increase for all users, even those who never visit Statistics.
- **Fix approach:** Lazy-load the Statistics route with `React.lazy()`.

### react-big-calendar bundled
- **Files:** `package.json:25`, `src/pages/CalendarView.tsx:3,8`
- **Issue:** `react-big-calendar` + its CSS (react-big-calendar/lib/css/react-big-calendar.css) are imported eagerly. Only used on one page.
- **Impact:** Adds ~200KB to the initial bundle.
- **Fix approach:** Lazy-load CalendarView route.

### Dashboard polls localStorage every second
- **Files:** `src/pages/Dashboard.tsx:157-176`
- **Issue:** The timer tick interval reads and parses `localStorage` every 1000ms (line 161: `loadTimer()`). While not expensive individually, it runs continuously whenever the timer is running.
- **Impact:** Unnecessary I/O. On some platforms (Tauri on Linux), localStorage access can have higher overhead.
- **Fix approach:** Use in-memory state with the timer hook instead of re-reading from localStorage on every tick.

## Platform-Specific Issues

### Overlay window not in Tauri capabilities
- **Files:** `src-tauri/capabilities/default.json:4` (windows: ["main"])
- **Issue:** The capability file only lists the `"main"` window, but `src/pages/Overlay.tsx` creates/runs in a separate webview window (`getCurrentWebviewWindow()`). The overlay window may not have the permissions it needs.
- **Impact:** Overlay window may silently fail to access Tauri APIs (notifications, window controls).
- **Fix approach:** Add `"overlay"` to the windows list in capabilities, or use a wildcard `"*"`.

### Desktop OAuth redirect URL may fail in production
- **Files:** `src/sync/index.ts:31,43`
- **Issue:** Both OAuth functions use `redirectTo: window.location.origin + "/auth/callback"`. In the Tauri desktop app, `window.location.origin` points to the Tauri webview (e.g., `tauri://localhost`), which the system browser cannot route back to after OAuth completes. Supabase redirects the *system browser* to this URL, not the Tauri webview.
- **Impact:** OAuth flow likely fails silently in production desktop builds. Works during development because the browser tab is at `localhost:5173`.
- **Fix approach:** Use Tauri's deep-link plugin or a custom protocol handler for OAuth callbacks.

### noreferrer without noopener
- **Files:** `src/pages/Landing.tsx:409`, `src/UpdateOverlay.tsx:50`
- **Issue:** Download links use `rel="noreferrer"` without `noopener`. In older browsers, `noreferrer` does not imply `noopener`, leaving a potential tab-napping vulnerability.
- **Impact:** Low risk (both links point to Supabase storage, not untrusted sites), but incorrect pattern.
- **Fix approach:** Use `rel="noreferrer noopener"`.

## Missing Functionality

### No error page or 404 route
- **Files:** `src/App.tsx:59-62`
- **Issue:** The router catch-all route (`Route path="*"`) renders `AppRoot` for all unknown paths. There is no 404/NotFound page.
- **Impact:** Navigating to a non-existent route renders the full app shell with a blank content area.
- **Fix approach:** Add a 404 page and add Route entries only for known paths.

### No loading states for async operations
- **Files:** All pages
- **Issue:** No loading skeletons, spinners, or placeholder UI during data fetch/sync operations. `SyncSection` has one `pushing` boolean check (Settings.tsx:394) that shows "Syncing..." text, but most async operations (`handleSplashDone`, `handleDesktopContinue`, conflict resolution) block the UI with no feedback.
- **Impact:** Users experience unresponsive UI during async operations with no indication of progress.
- **Fix approach:** Add loading spinners to async operations, especially initial data load and sync.

### Minimal accessibility
- **Files:** All pages
- **Issue:** Only 3 `aria-label` attributes exist across the entire codebase (App.tsx:822,835: menu buttons; Achievements.tsx:558). Many interactive elements use `role="button"` with `tabIndex={0}` but no keyboard event handlers for Enter/Space. The splash screen has a 4-second timer before the Continue button appears with no way to skip it.
- **Impact:** Screen reader users get minimal context. Keyboard-only navigation is unreliable. The splash screen creates an unnecessary barrier.
- **Fix approach:** Add `aria-label` to all icon-only buttons, `aria-expanded` to dropdowns, keyboard handlers to custom buttons, and a skip-splash mechanism.

### Context menu disabled globally
- **Files:** `index.html:12`
- **Issue:** `document.addEventListener('contextmenu', e => e.preventDefault())` disables the right-click context menu globally.
- **Impact:** Blocks legitimate context menu actions (copy, paste, inspect, dictionary lookup) with no benefit for this app type.
- **Fix approach:** Remove the global context menu blocker.

### html lang attribute set to Italian
- **Files:** `index.html:2`
- **Issue:** `<html lang="it">` declares the page language as Italian, but all UI text is in English.
- **Impact:** Screen readers may apply Italian pronunciation rules to English text.
- **Fix approach:** Set `lang="en"`.

## Test Coverage Gaps

### No tests detected
- **Files:** No `.test.ts`, `.spec.ts`, or test configuration files found.
- **Issue:** The entire codebase has zero tests. No unit tests for timer logic, sync operations, data migration, or any business logic. No integration tests for OAuth flow or Supabase interactions.
- **Risk** Any change risks regressions with no safety net. The timer state machine (Dashboard.tsx ~200 lines of state logic) has no automated verification.
- **Priority:** High

---

*Concerns audit: 2026-05-03*
