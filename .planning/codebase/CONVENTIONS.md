# Coding Conventions

**Analysis Date:** 2026-05-03

## Naming Patterns

**Files:**
- React component files: PascalCase (e.g., `Dashboard.tsx`, `DataContext.tsx`, `UpdateOverlay.tsx`)
- Utility/data files: camelCase or kebab-case (e.g., `db.ts`, `auth.ts`, `notifications.ts`, `spaced-repetition.ts`)
- Barrel/entry files: lowercase (e.g., `storage/index.ts`, `sync/index.ts`)

**Functions:**
- Regular functions: camelCase (`loadData`, `saveData`, `pushData`, `computeNextReview`)
- Event handlers: `handle*` prefix (`handleCompletion`, `handleSplashDone`, `handleDeleteCard`)

**Components:**
- PascalCase, exported as `export default function ComponentName` (`Dashboard`, `Flashcards`, `Settings`)

**Variables:**
- camelCase for all JS values (`draftName`, `remainingSec`, `selectedSubjectId`)
- UPPER_SNAKE_CASE for true constants (`THEME_KEY = "studyflow.theme"`, `ACCENT_KEY = "studyflow.accent"`, `DEFAULT_FOCUS = 25 * 60`)
- Module-level constants at top of file using `const` only (no `let` for module-scoped values)

**Types (TypeScript):**
- Interfaces for data shapes: `interface Subject`, `interface StudySession`, `interface AppData` -- all in `src/db.ts` and `src/storage/types.ts`
- `type` for unions/aliases: `type TimerMode = "focus" | "shortBreak" | "longBreak"`, `type OnboardingStep = "name" | "theme" | "accent"`
- Discriminated unions for state machines: `type EditSetState = { type: "new" } | { type: "edit"; set: FlashcardSet } | null`

## TypeScript Usage

**Strict mode enabled:**
- `tsconfig.json` sets `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`
- All files typed, no `any` found in the codebase

**Type import style:**
- `import type { AppData } from "./storage/types"` -- uses `import type` for type-only imports consistently across all files (see `App.tsx`, `Dashboard.tsx`, `DataContext.tsx`, `sync/index.ts`)

**Data models are centralized:**
- All database-adjacent types in `src/db.ts`: `Subject`, `StudySession`, `StudyTask`, `TimerState`, `Roadmap`, `RoadmapMacro`, `RoadmapMicro`, `AchievementProgress`, `Flashcard`, `FlashcardSet`
- `src/storage/types.ts` re-imports db types and composes them into `AppData` (the root application state)

## React Patterns

**Component definition:**
- `export default function ComponentName()` pattern used throughout (no arrow function components with `React.FC`)
- No class components anywhere

**State management:**
- `useState` with lazy initializer functions for derived-from-storage state (`useState(() => loadTimer()?.subjectId ?? "")`)
- `useData()` custom hook from `DataContext.tsx` via React Context for app-wide state
- State updates use functional updater `setData((prev) => ({...prev, ...updates}))`

**Effects:**
- `useEffect` with proper cleanup: `useEffect(() => { ...; return () => clearTimeout(t); }, [])` in `App.tsx`
- `useEffect` dependency arrays are managed; some suppress warnings with eslint-disable comments (e.g., `// eslint-disable-next-line react-hooks/exhaustive-deps` in `Dashboard.tsx` lines 133, 176)
- `useCallback` used in `DataContext.tsx` to memoize `setData` at provider level

**Performance hooks:**
- `useMemo` for derived data like filtered lists (`tasksForSubject`, `setReviewInfo`, `durationForMode`)
- `useRef` for values needed in interval callbacks without stale closures (`isRunningRef` in `Dashboard.tsx`)

**State initialization pattern:**
- Lazy initializer for localStorage-derived state to avoid hydration mismatch (see `Dashboard.tsx` lines 46-78, `Settings.tsx` lines 34-35)

## Styling Approach

**Framework:** Tailwind CSS v3 + daisyUI v4

**Pattern:**
- Utility classes exclusively; no CSS modules, no styled-components
- Theme via `data-theme` attribute on `<html>`: `"${accent}-${theme}"` (e.g., "slate-dark", "purple-light")
- daisyUI components: `card`, `btn`, `input`, `badge`, `modal`, `toggle`, `progress`, `dropdown`, `navbar`, `loading`
- CSS custom properties via `oklch()` for dynamic theming (e.g., `oklch(var(--p))` for primary, `oklch(var(--b2))` for base-200)
- Custom CSS in `src/index.css` for animations, calendar overrides, roadmap styles, achievement styles
- Separate CSS file used only when Tailwind utilities are insufficient (animations, third-party overrides)

**Theme system:**
- Defined in `tailwind.config.js` with programmatic generation combining `BASE_LIGHT`/`BASE_DARK` with accent color sets
- 11 accent colors x 2 themes = 22 generated daisyUI themes

## File Organization

**Top-level structure:**
```
src/
  main.tsx             -- React entry point, mounts App
  App.tsx              -- Root component, routing, auth, splash, onboarding
  index.css            -- Global styles, Tailwind directives
  db.ts                -- Database types (interfaces)
  storage/             -- Local persistence module
    types.ts           -- AppData type + factory
    index.ts           -- loadData/saveData/clearData/exportDataToFile/importDataFromFile
  sync/                -- Cloud sync module (Supabase)
    index.ts           -- pushData/pullData/signInWithGoogle/signOut/deleteAccount
  supabase.ts          -- Supabase client creation
  auth.ts              -- Local username persistence
  DataContext.tsx       -- React context for app state
  pages/               -- Page-level components
  spaced-repetition.ts  -- SM-2 algorithm
  notifications.ts     -- Tauri + browser notification helper
  updateCheck.ts       -- Supabase version check
  UpdateOverlay.tsx    -- Mandatory update screen
  achievements.ts      -- Achievement data definitions
  seed.ts              -- Mock data generator
  version.ts           -- APP_VERSION constant
```

**Module boundaries:**
- `storage/` and `sync/` are flat barrel modules with `index.ts` exports
- No subdirectory nesting beyond one level
- Page components in `pages/` are imported individually in `App.tsx` (no barrel export for pages)

## Import Organization

**Order observed:**
1. React/hooks imports (`import { useState, useMemo } from "react"`)
2. Third-party library imports (`import { supabase } from "../supabase"`)
3. Local module imports (relative paths `../storage`, `../DataContext`)
4. Type-only imports using `import type`

**No path aliases used** -- all imports use relative paths (`../db`, `./storage/types`)

## Error Handling

**Primary pattern:** try/catch with silent catch blocks
```typescript
try {
  const remote = await pullData();
  // ...
} catch { /* offline or not signed in */ }
```
Empty catch blocks are used extensively (at least 15 occurrences) -- no error logging, no user feedback for failures.

**Secondary patterns:**
- Optional chaining for nullable access: `data?.access_token`
- `confirm()` dialogs for destructive actions (delete profile, delete flashcard set)
- `handleCompletion` and related timer functions catch and handle errors inline
- `null` returns for data-not-found: `loadData(): AppData | null`

## localStorage Key Convention

All keys follow the pattern `"studyflow.*"`:
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

Supabase anon key and URL are hardcoded in `src/supabase.ts` rather than using environment variables. This is a concern for security best practices.

## Comments

- `// ─── Section ────────────────────────────────` style separators used in `App.tsx`
- Minimal inline comments; most code is self-documenting
- `// eslint-disable-next-line` comments used to suppress lint rules where intentional
- No JSDoc/TSDoc annotations found anywhere in the codebase

---

*Convention analysis: 2026-05-03*
