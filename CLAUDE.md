<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kaizen (改善)**

Kaizen is a Pomodoro-based study companion app. It tracks focus sessions across subjects, manages tasks with due dates, supports spaced-repetition flashcards, and awards achievements for consistent study habits. Available as both a web app (React SPA) and a native desktop app (Tauri v2).

**Core Value:** Reliable, distraction-free Pomodoro timer that persists study sessions and syncs seamlessly across web and desktop via Google-authenticated cloud sync.

### Constraints

- **Tech stack**: React 18, TypeScript, Vite 5, Tauri v2, Supabase — fixed
- **Auth**: Google OAuth via Supabase — fixed
- **Data model**: AppData JSON in localStorage + Supabase `user_data` table — fixed
- **Timer isolation**: Timer state stored in separate localStorage key (`studyflow.timer`), never in AppData JSON or Supabase — fixed
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
## Runtime
- Node.js (via Vite dev server on `http://localhost:5173`)
- Package Manager: npm
- Lockfile: `package-lock.json` present
## Frameworks
- React 18.3.1 with `react-dom` 18.3.0 - Component UI
- Vite 5.4.2 - Build tool and dev server
- Tauri 2.x (Rust) - Desktop wrapper with native OS capabilities
- `@tauri-apps/api` ^2.0.0 - JS bindings to Tauri runtime
- Tauri plugins: notification (^2.3.3), shell (^2.3.5)
- Tailwind CSS 3.4.10 - Utility-first CSS framework
- daisyUI 4.12.13 - Component library for Tailwind
- PostCSS 8.4.39 + autoprefixer 10.4.19 - CSS processing pipeline
- `react-router-dom` ^6.26.2 - Client-side routing (BrowserRouter)
- Custom `DataContext` (`src/DataContext.tsx`) - React context for app state
- `localStorage` - Primary persistence (serialized JSON)
- `@supabase/supabase-js` ^2.105.1 - Supabase client (Auth + Database)
- `recharts` ^2.12.7 - Charts and statistics
- `react-big-calendar` ^1.13.2 - Calendar view for study sessions
- `katex` ^0.16.45 - LaTeX math rendering
- `date-fns` ^3.6.0 - Date manipulation
## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `@supabase/supabase-js` | ^2.105.1 | Auth + Database client |
| `@tauri-apps/api` | ^2.0.0 | Desktop native API bridge |
| `react-router-dom` | ^6.26.2 | Client-side routing |
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^3.4.10 | CSS utility framework |
| `daisyui` | ^4.12.13 | Pre-built Tailwind components |
| `vite` | ^5.4.2 | Build tool and dev server |
| `@vitejs/plugin-react` | ^4.3.1 | Vite React integration |
| Package | Version | Purpose |
|---------|---------|---------|
| `@tauri-apps/cli` | ^2.0.0 | Tauri build/dev CLI |
| `typescript` | ^5.5.4 | Type checking |
| `autoprefixer` | ^10.4.19 | CSS vendor prefixes |
| `postcss` | ^8.4.39 | CSS processing |
## Rust Backend Dependencies
| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2 | Desktop framework (feature: `tray-icon`) |
| `tauri-plugin-notification` | 2 | Native OS notifications |
| `tauri-plugin-shell` | 2 | Open URLs/files via OS shell |
| `serde` / `serde_json` | 1 | JSON serialization |
| `image` | 0.25 | Decode and convert tray icon PNG to RGBA |
## Configuration
## Platform Requirements
- Node.js (npm)
- Rust toolchain (for Tauri)
- Linux: typically `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, etc.
- Linux: `npm run package:linux` -> `Kaizen-linux-x64.tar.gz`
- macOS: `npm run package:macos` -> `Kaizen-macos-arm64.zip`
- Windows: `npm run package:windows` -> `Kaizen-windows-x64.zip`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React component files: PascalCase (e.g., `Dashboard.tsx`, `DataContext.tsx`, `UpdateOverlay.tsx`)
- Utility/data files: camelCase or kebab-case (e.g., `db.ts`, `auth.ts`, `notifications.ts`, `spaced-repetition.ts`)
- Barrel/entry files: lowercase (e.g., `storage/index.ts`, `sync/index.ts`)
- Regular functions: camelCase (`loadData`, `saveData`, `pushData`, `computeNextReview`)
- Event handlers: `handle*` prefix (`handleCompletion`, `handleSplashDone`, `handleDeleteCard`)
- PascalCase, exported as `export default function ComponentName` (`Dashboard`, `Flashcards`, `Settings`)
- camelCase for all JS values (`draftName`, `remainingSec`, `selectedSubjectId`)
- UPPER_SNAKE_CASE for true constants (`THEME_KEY = "studyflow.theme"`, `ACCENT_KEY = "studyflow.accent"`, `DEFAULT_FOCUS = 25 * 60`)
- Module-level constants at top of file using `const` only (no `let` for module-scoped values)
- Interfaces for data shapes: `interface Subject`, `interface StudySession`, `interface AppData` -- all in `src/db.ts` and `src/storage/types.ts`
- `type` for unions/aliases: `type TimerMode = "focus" | "shortBreak" | "longBreak"`, `type OnboardingStep = "name" | "theme" | "accent"`
- Discriminated unions for state machines: `type EditSetState = { type: "new" } | { type: "edit"; set: FlashcardSet } | null`
## TypeScript Usage
- `tsconfig.json` sets `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`
- All files typed, no `any` found in the codebase
- `import type { AppData } from "./storage/types"` -- uses `import type` for type-only imports consistently across all files (see `App.tsx`, `Dashboard.tsx`, `DataContext.tsx`, `sync/index.ts`)
- All database-adjacent types in `src/db.ts`: `Subject`, `StudySession`, `StudyTask`, `TimerState`, `Roadmap`, `RoadmapMacro`, `RoadmapMicro`, `AchievementProgress`, `Flashcard`, `FlashcardSet`
- `src/storage/types.ts` re-imports db types and composes them into `AppData` (the root application state)
## React Patterns
- `export default function ComponentName()` pattern used throughout (no arrow function components with `React.FC`)
- No class components anywhere
- `useState` with lazy initializer functions for derived-from-storage state (`useState(() => loadTimer()?.subjectId ?? "")`)
- `useData()` custom hook from `DataContext.tsx` via React Context for app-wide state
- State updates use functional updater `setData((prev) => ({...prev, ...updates}))`
- `useEffect` with proper cleanup: `useEffect(() => { ...; return () => clearTimeout(t); }, [])` in `App.tsx`
- `useEffect` dependency arrays are managed; some suppress warnings with eslint-disable comments (e.g., `// eslint-disable-next-line react-hooks/exhaustive-deps` in `Dashboard.tsx` lines 133, 176)
- `useCallback` used in `DataContext.tsx` to memoize `setData` at provider level
- `useMemo` for derived data like filtered lists (`tasksForSubject`, `setReviewInfo`, `durationForMode`)
- `useRef` for values needed in interval callbacks without stale closures (`isRunningRef` in `Dashboard.tsx`)
- Lazy initializer for localStorage-derived state to avoid hydration mismatch (see `Dashboard.tsx` lines 46-78, `Settings.tsx` lines 34-35)
## Styling Approach
- Utility classes exclusively; no CSS modules, no styled-components
- Theme via `data-theme` attribute on `<html>`: `"${accent}-${theme}"` (e.g., "slate-dark", "purple-light")
- daisyUI components: `card`, `btn`, `input`, `badge`, `modal`, `toggle`, `progress`, `dropdown`, `navbar`, `loading`
- CSS custom properties via `oklch()` for dynamic theming (e.g., `oklch(var(--p))` for primary, `oklch(var(--b2))` for base-200)
- Custom CSS in `src/index.css` for animations, calendar overrides, roadmap styles, achievement styles
- Separate CSS file used only when Tailwind utilities are insufficient (animations, third-party overrides)
- Defined in `tailwind.config.js` with programmatic generation combining `BASE_LIGHT`/`BASE_DARK` with accent color sets
- 11 accent colors x 2 themes = 22 generated daisyUI themes
## File Organization
- `storage/` and `sync/` are flat barrel modules with `index.ts` exports
- No subdirectory nesting beyond one level
- Page components in `pages/` are imported individually in `App.tsx` (no barrel export for pages)
## Import Organization
## Error Handling
- Optional chaining for nullable access: `data?.access_token`
- `confirm()` dialogs for destructive actions (delete profile, delete flashcard set)
- `handleCompletion` and related timer functions catch and handle errors inline
- `null` returns for data-not-found: `loadData(): AppData | null`
## localStorage Key Convention
- `"studyflow.data"` -- persisted AppData
- `"studyflow.timer"` -- timer state
- `"studyflow.theme"`, `"studyflow.accent"` -- theme preferences
- `"studyflow.durations"` -- timer duration config
- `"studyflow.username"` -- stored username
- `"studyflow.active"` -- profile active flag
- `"studyflow.sync"` -- sync enabled flag
- `"studyflow.tourComplete"` -- tour completion flag
- `"studyflow.syncResolved"` -- sync conflict resolution flag
## Secret Keys
## Comments
- `// ─── Section ────────────────────────────────` style separators used in `App.tsx`
- Minimal inline comments; most code is self-documenting
- `// eslint-disable-next-line` comments used to suppress lint rules where intentional
- No JSDoc/TSDoc annotations found anywhere in the codebase
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- React 18 with react-router-dom v6 for client-side routing
- Tauri v2 Rust backend for desktop-specific features (system tray, notifications, separate overlay window)
- Local-first data model with optional cloud sync via Supabase
- DaisyUI/Tailwind CSS for theming with 12 accent colors x 2 theme modes (light/dark)
## Layers
- Purpose: The entire application UI and business logic
- Location: `src/`
- Contains: App entry point, routing, data context, pages, storage, sync, utility modules
- Depends on: React 18, react-router-dom, Supabase JS client, Tauri JS APIs (desktop only)
- Used by: Both browser and Tauri webview
- Purpose: Native window management, system tray, notifications, overlay window
- Location: `src-tauri/`
- Contains: Rust main.rs, Tauri config, capability declarations, icons
- Depends on: Tauri v2, tauri-plugin-notification, tauri-plugin-shell
- Used by: The web frontend via `@tauri-apps/api` and `@tauri-apps/plugin-*` imports
- Purpose: Read/write AppData to localStorage
- Location: `src/storage/index.ts`
- Contains: `loadData()`, `saveData()`, `clearData()`, `exportDataToFile()`, `importDataFromFile()`
- Depends on: localStorage API, Tauri file dialog plugins
- Used by: DataContext, App.tsx, sync module
- Purpose: Push/pull AppData to/from Supabase
- Location: `src/sync/index.ts`
- Contains: `pushData()`, `pullData()`, `signInWithGoogle()`, `signOut()`, `deleteAccount()`
- Depends on: Supabase JS client, `src/supabase.ts`
- Used by: DataContext (debounced auto-sync), App.tsx (initial sync)
## Data Flow
- Centralized: `DataContext` (`src/DataContext.tsx`) holds the single `AppData` object
- The `setData` callback pattern uses `(prev: AppData) => AppData` for immutable updates
- Timer state is NOT in DataContext -- uses separate localStorage key `studyflow.timer` for shared access between Dashboard and Overlay
## Component Hierarchy
```
```
## Initialization Phases
- `profile` -- After sign-out, shows profile with Continue/Create New/Delete options
## Desktop vs Web Branching
```typescript
```
- Landing page visibility (web-only, at `/`)
- Auth flow: desktop uses session recovery; web uses full OAuth redirect
- Sync conflict resolution: desktop shows conflict dialog; web always overwrites local
- Navigation: desktop shows "Sign out" in menu; web does not
- Update checks: desktop only, via `src/updateCheck.ts`
- File export/import: desktop uses native file dialogs; web falls back to browser download/file input
## Auth Flow
## Sync Architecture
- All data is always persisted to localStorage first
- Cloud sync is optional and enabled only when a Supabase session exists
- Sync status tracked via `studyflow.sync` (boolean) and `studyflow.lastSync` (ISO timestamp)
## Timer State Management
- `studyflow.timer` -- TimerState JSON (mode, remaining, isRunning, subjectId, taskId, etc.)
- `studyflow.durations` -- Duration settings (focus, shortBreak, longBreak)
- `studyflow.theme` / `studyflow.accent` -- Theme settings (synced via StorageEvent listener in Overlay)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
