# Codebase Structure

**Analysis Date:** 2026-05-03

## Directory Layout

```
kaizen/
├── src/                    # React SPA (shared by browser + Tauri)
├── src-tauri/              # Tauri v2 desktop shell (Rust)
├── public/                 # Static assets served at root
├── media/                  # Promotional media and achievement SVGs
├── dist/                   # Vite build output
├── release/                # Packaged platform releases
├── index.html              # HTML entry point
├── package.json            # NPM dependencies and scripts
├── vite.config.ts          # Vite bundler configuration
├── tailwind.config.js      # Tailwind CSS + DaisyUI theme definitions
├── postcss.config.js       # PostCSS config
├── tsconfig.json           # TypeScript configuration
├── tsconfig.node.json      # TypeScript config for Node (Vite)
├── vercel.json             # Vercel deployment config
├── seed-data.mjs           # Database seed script (standalone)
└── .gitignore
```

## Directory Purposes

**`src/` (Frontend Application):**
- Purpose: All React application code -- routing, pages, data management, and utilities
- Contains: App entrypoint, React components, data layer, type definitions, CSS
- Key files:
  - `src/main.tsx` -- ReactDOM root mount
  - `src/App.tsx` -- Main app component: routing, phase machine, auth, sync orchestration
  - `src/DataContext.tsx` -- Central state: React Context + localStorage persistence + debounced sync
  - `src/db.ts` -- Type definitions for all domain models (Subject, StudySession, TimerState, etc.)
  - `src/supabase.ts` -- Supabase client singleton creation
  - `src/index.css` -- Global styles (Tailwind directives + custom styles)

**`src/pages/` (Page Components):**
- Purpose: One component per route, each representing a full page
- Contains:
  - `Dashboard.tsx` -- Pomodoro timer with subject/task selection, focus tracking
  - `Overview.tsx` -- Study stats dashboard with charts (uses recharts)
  - `Subjects.tsx` -- Subject CRUD management
  - `Tasks.tsx` -- Study task list management
  - `Flashcards.tsx` -- Flashcard review with spaced repetition
  - `Roadmap.tsx` -- Subject roadmap viewer (macro/micro structure)
  - `Achievements.tsx` -- Achievement/badge progress display
  - `Settings.tsx` -- User settings (export/import, sync status, timer durations)
  - `Overlay.tsx` -- Compact timer overlay for the always-on-top Tauri window
  - `Tour.tsx` -- Interactive onboarding tour guide
  - `Landing.tsx` -- Marketing landing page (web only, at `/`)
  - `CalendarView.tsx` -- Calendar-based session view
  - `Statistics.tsx` -- Detailed statistics view

**`src/storage/` (Data Persistence):**
- Purpose: localStorage read/write layer for AppData
- Contains:
  - `index.ts` -- `loadData()`, `saveData()`, `clearData()`, file export/import with Tauri dialog fallback
  - `types.ts` -- `AppData` interface definition and `createEmptyData()` factory

**`src/sync/` (Cloud Synchronization):**
- Purpose: Push/pull AppData to/from Supabase, OAuth sign-in
- Contains:
  - `index.ts` -- `pushData()`, `pullData()`, `signInWithGoogle()`, `signOut()`, `deleteAccount()`, sync flag helpers

**`src-tauri/` (Desktop Shell):**
- Purpose: Rust backend that wraps the web frontend in a native desktop application
- Contains:
  - `src/main.rs` -- Rust entrypoint: window management, system tray, overlay window, single-instance lock
  - `tauri.conf.json` -- Tauri v2 config: window size, build commands, app identifier
  - `capabilities/default.json` -- Permission grants (core, notifications, window, tray, shell)
  - `Cargo.toml` -- Rust dependencies (tauri, plugins, image, serde)
  - `build.rs` -- Tauri build script
  - `icons/` -- Application icons (icon.png, 32x32.png, 128x128.png)
  - `gen/schemas/` -- Auto-generated Tauri schema files

**`public/` (Static Assets):**
- Purpose: Files served as-is at the root URL
- Contains: `favicon.png`, `favicon.svg`, `icon.svg`

**`media/` (Marketing & Visuals):**
- Purpose: Static media files (not served by the app)
- Contains: Achievement badge SVGs (`usaquesto_argento.svg`, `usaquesto_bronze.svg`, `usaquesto_oro.svg`), generated promo image

## Key File Locations

**Entry Points:**
- `index.html` -- HTML root with `<div id="root">`, loads `/src/main.tsx`
- `src/main.tsx` -- React 18 `createRoot` rendering `<App />` with StrictMode
- `src/App.tsx` -- Application root: BrowserRouter, routing, phase machine, auth, sync orchestration
- `src-tauri/src/main.rs` -- Rust `fn main()`: sets up Tauri builder, plugins, tray, window event handling

**Configuration:**
- `package.json` -- NPM dependencies, scripts (dev, build, tauri commands, packaging)
- `vite.config.ts` -- Vite: React plugin, port 5173, env prefix, externalized Tauri dialog/fs plugins
- `tailwind.config.js` -- DaisyUI themes: 12 accent colors x 2 modes (light/dark), content paths
- `tsconfig.json` -- TypeScript: strict mode, ESNext modules, JSX react-jsx, includes src/
- `src-tauri/tauri.conf.json` -- Tauri: app identifier, window config, build commands, bundle settings
- `src-tauri/Cargo.toml` -- Rust crate config and dependencies
- `vercel.json` -- Vercel deployment configuration

**Data Layer:**
- `src/DataContext.tsx` -- React Context providing `data` and `setData` to all page components
- `src/storage/index.ts` -- Raw localStorage read/write plus file import/export
- `src/storage/types.ts` -- `AppData` interface defining the complete data shape
- `src/sync/index.ts` -- Supabase push/pull and OAuth helpers
- `src/supabase.ts` -- Supabase client initialized with URL and anon key

**Domain Logic:**
- `src/db.ts` -- All domain model type definitions (Subject, StudySession, TimerState, StudyTask, etc.)
- `src/achievements.ts` -- Achievement definitions and progress calculation logic
- `src/spaced-repetition.ts` -- SM-2 spaced repetition algorithm for flashcards
- `src/notifications.ts` -- Cross-platform notification dispatch (Tauri plugin + browser fallback)
- `src/updateCheck.ts` -- Version check against Supabase config table, OS detection
- `src/seed.ts` -- Seed data generation for development
- `src/version.ts` -- `APP_VERSION` constant matching the Tauri version

## Naming Conventions

**Files:**
- React components: PascalCase (`Dashboard.tsx`, `App.tsx`)
- Utility/data modules: camelCase (`achievements.ts`, `spaced-repetition.ts`, `supabase.ts`)
- Page components are flat in `src/pages/` with no subdirectories
- Barrel pattern: `src/sync/index.ts` and `src/storage/index.ts` for module exports

**Directories:**
- `src/pages/` -- All page-level components
- `src/storage/` -- Data persistence layer
- `src/sync/` -- Cloud sync layer
- `src-tauri/` -- Desktop shell (Capitalized convention from Tauri)

## Where to Add New Code

**New Feature Page:**
- Implementation: `src/pages/{FeatureName}.tsx` -- a React component using `useData()` for state
- Routing: Add `<Route>` in the `Routes` block inside `AppShell` (`src/App.tsx`, line 867)
- Navigation: Add entry to the `navLinks` array in `AppShell` (`src/App.tsx`, line 796)

**New Data Entity:**
- Types: Add interface to `src/db.ts`
- Add field to `AppData` in `src/storage/types.ts`
- Initialize in `createEmptyData()` factory

**New Utility Module:**
- Place standalone file in `src/` (e.g., `src/achievements.ts`, `src/spaced-repetition.ts`)

**New Desktop-Only Feature:**
- Rust backend: Add Tauri command to `src-tauri/src/main.rs`
- JS binding: Add command invocation in the frontend using `@tauri-apps/api/core`
- Permission: Add corresponding capability to `src-tauri/capabilities/default.json`

## Special Directories

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`release/`:**
- Purpose: Packaged platform-specific release artifacts (binaries, tarballs)
- Generated: Yes (by `npm run package:*`)
- Committed: No (gitignored)

**`src-tauri/gen/schemas/`:**
- Purpose: Auto-generated Tauri permission and capability JSON schemas
- Generated: Yes (by Tauri build)
- Committed: Yes (Tauri generates these in place)

**`src-tauri/target/`:**
- Purpose: Rust build artifacts
- Generated: Yes (by `cargo build`)
- Committed: No (gitignored)

---

*Structure analysis: 2026-05-03*
