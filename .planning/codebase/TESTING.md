# Testing Patterns

**Analysis Date:** 2026-05-03

## Test Infrastructure

**Status: No test infrastructure exists.**

- No test runner is configured (no vitest, jest, mocha, or other test framework in `package.json` dependencies or devDependencies)
- No test configuration files (`vitest.config.ts`, `jest.config.ts`, `.jestrc`, etc.)
- No test files found anywhere in the repository (no `*.test.*`, `*.spec.*`, or `__tests__` directories)
- No test-related npm scripts in `package.json` -- only `dev`, `build`, `preview`, `tauri`, `package:*` scripts exist
- No Testing Library (`@testing-library/react`) or any test utility installed
- No code coverage tooling installed

**Relevant `package.json` test script section:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "package:linux": "...",
  "package:macos": "...",
  "package:windows": "...",
  "package": "npm run package:linux"
}
```

No `test`, `test:watch`, `test:coverage`, `lint`, or `type-check` scripts exist.

## What Is Tested

**Nothing.** There are zero test files and zero test infrastructure. The project has no automated test coverage of any kind.

## What Is NOT Tested (and Should Be)

The following critical paths have no test coverage:

### Timer Logic (`src/pages/Dashboard.tsx`)
- Timer `computeRemaining()` function (lines 566-570): computes elapsed time based on `startedAt` -- core math for accuracy
- Timer mode transitions (focus -> shortBreak -> longBreak cycle) with `completedFocuses` tracking
- `handleCompletion()`: session recording, task completion, mode switching, notification triggering
- `formatTime()` utility (line 552-555)
- `durationFor()` lookup function
- Timer persistence round-trip: `loadTimer()` / `saveTimer()` to localStorage
- Cross-tab timer polling (overlay integration)
- `beforeunload` handler for crash detection (`closedWhileRunning`)

### Data Sync (`src/sync/index.ts`)
- `pushData()`: serializes AppData to JSON, upserts to Supabase
- `pullData()`: fetches user_data from Supabase and deserializes
- `deleteAccount()`: deletes user_data then signs out
- Sync conflict resolution: both web (happens inline) and desktop (`SyncSection`)

### Auth Flow (`src/App.tsx`)
- Phase state machine transitions: splash -> onboarding -> tour -> app (desktop); splash -> google-signin -> name-prompt -> app (web)
- `handleSplashDone()` async orchestration: session check, local data check, cloud data pull, conflict detection
- `AuthCallback` redirect handling with Supabase auth state listener
- `handleWebGoogleSignIn()`, `handleWebName()`, `handleWebSignOut()` chains
- Desktop handlers: `finishOnboarding()`, `handleDesktopContinue()`, `handleDesktopCreateNew()`, `handleDesktopDelete()`

### Data Persistence (`src/storage/index.ts`)
- `loadData()`: localStorage read + JSON parse + migration (backfill theme/accent)
- `saveData()`: JSON stringify + setItem
- `clearData()`: removeItem
- `exportDataToFile()` / `importDataFromFile()`: Tauri vs browser fallback
- `createEmptyData()` factory function in `src/storage/types.ts`

### Data Context (`src/DataContext.tsx`)
- Update-then-persist-then-sync chain via `setData` callback
- Debounced sync scheduling (2-second debounce via setTimeout)

### Spaced Repetition (`src/spaced-repetition.ts`)
- `computeNextReview()`: SM-2 algorithm with ease factor, interval, repetitions
- `isDue()`: date comparison for review readiness
- Edge cases: first review, fractional ease factor adjustments, minimum ease factor clamping

### Achievement System (`src/achievements.ts`)
- Tier evaluation logic (permanent and recurring achievements)
- Reset period logic: weekly, monthly, yearly

### Other Untested Utilities
- `notify()` in `src/notifications.ts`: Tauri notification permission flow + browser Notification API fallback
- `checkForUpdate()` in `src/updateCheck.ts`: Supabase config query + OS detection
- `LatexText` component: katex rendering with inline/block parsing
- `seed.ts`: mock data generation

## Recommendations for Test Setup

### Tooling (add to `devDependencies`)
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Scripts (add to `package.json`)
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### Vitest Config (`vitest.config.ts`)
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

### Test Setup File (`src/test/setup.ts`)
```typescript
import "@testing-library/jest-dom";
```

### Priority Order for Test Creation

1. **Unit tests (highest impact, lowest effort):**
   - `spaced-repetition.ts` -- pure functions, no dependencies, easy to test
   - `formatTime()` in `Dashboard.tsx` -- simple string formatting
   - `computeRemaining()` in `Dashboard.tsx` -- elapsed calculation
   - `loadData()` / `saveData()` in `storage/index.ts` -- localStorage round-trips
   - `createEmptyData()` in `storage/types.ts` -- factory output
   - `isDue()` in `spaced-repetition.ts` -- date comparison

2. **Component tests (medium effort):**
   - `LatexText.tsx` -- text parsing with inline/block LaTeX
   - `UpdateOverlay.tsx` -- conditional rendering based on props
   - Page components with mock DataContext

3. **Integration tests (higher effort):**
   - Timer flow: start -> tick -> complete -> session recorded
   - DataContext persistence chain: setData -> saveData -> loadData
   - Sync push/pull with mocked Supabase client

4. **Mock strategy:**
   - Mock `localStorage` for storage/sync tests using `vi.stubGlobal`
   - Mock `@supabase/supabase-js` client for sync tests
   - Mock `@tauri-apps/plugin-notification` and `@tauri-apps/plugin-dialog` for platform-specific code
   - Wrap `AppRoot` with a test `DataProvider` for component tests

---

*Testing analysis: 2026-05-03*
