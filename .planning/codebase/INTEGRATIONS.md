# External Integrations

**Analysis Date:** 2026-05-03

## APIs & External Services

**Supabase (Cloud Backend):**
- Supabase project: `https://lpnjxkzeyiifzzycmftg.supabase.co`
- SDK: `@supabase/supabase-js` ^2.105.1
- Auth: Anonymous key stored in `src/supabase.ts` (client-side, RLS-protected)
- Configuration: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`

## Authentication & Identity

**Auth Provider:** Supabase Auth with Google OAuth
- Implementation: `src/sync/index.ts` (`signInWithGoogle`, `signInWithGoogleDesktop`)
- OAuth redirect: `<origin>/auth/callback` -> handled in `src/App.tsx` (AuthCallback component)
- Google OAuth param: `prompt: "select_account"` (forces account selection each time)
- Desktop: Uses Supabase's built-in OAuth flow (opens browser, redirects back)
- Session stored in localStorage under key `sb-lpnjxkzeyiifzzycmftg-auth-token`
- Sign out: `supabase.auth.signOut()` called from both desktop and web

**Session checks:**
- `getSession()` in `src/sync/index.ts` - used during splash screen to determine auth state
- `onAuthStateChange` listener in `AuthCallback` component handles post-sign-in redirect

## Data Storage

**Primary persistence:** Browser `localStorage` (desktop and web)
- Key: `studyflow.data` - serialized `AppData` JSON
- Data shape: `src/storage/types.ts` - contains username, theme, subjects, tasks, flashcardSets, flashcards, studySessions, roadmaps, roadmapMacros, roadmapMicros, achievements

**Cloud database:** Supabase PostgreSQL
- Table: `user_data`
  - `google_id` (PK, text) - maps to Supabase Auth user ID
  - `email` (text)
  - `data` (jsonb) - entire AppData blob
  - `updated_at` (timestamptz)
- Table: `app_config`
  - `key` (text) - config keys like `current_version`, `download_linux`, `download_macos`, `download_windows`
  - `value` (text) - config values
- Operations: upsert on conflict (`google_id`), select by `google_id` via `maybeSingle()`
- Sync mechanism: manual push/pull triggered from `src/App.tsx` (splash screen logic) and `src/sync/index.ts`

**Sync strategy:**
- Desktop-first: local data is authoritative, cloud data is synced opportunistically
- Web-only: cloud-first, always overwrites local with remote
- Conflict resolution: dialog in `src/App.tsx` when both local and remote data exist with subjects

**File export/import:**
- Tauri native file dialogs (`@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs`) for desktop JSON backup
- Browser fallback: Blob download / file input for web
- Functions: `exportDataToFile()`, `importDataFromFile()` in `src/storage/index.ts`
- Note: dialog and fs plugins are dynamically imported (externalized in Vite config)

## Tauri Native APIs

**Notifications** (`@tauri-apps/plugin-notification`):
- Imported in `src/notifications.ts`:
  - `isPermissionGranted()` - check macOS/Windows permission state
  - `requestPermission()` - request OS notification permission
  - `sendNotification({ title, body })` - send OS notification
- Plugin activated in Rust: `.plugin(tauri_plugin_notification::init())`

**Shell** (`@tauri-apps/plugin-shell`):
- Plugin activated in Rust: `.plugin(tauri_plugin_shell::init())`
- Available for opening URLs / files via OS default handler

**Window Management** (`@tauri-apps/api/webviewWindow`):
- `getCurrentWebviewWindow()` in `src/pages/Overlay.tsx`
- Used for: `setResizable()`, `hide()`, `show()`, `setFocus()`

**Overlay Window:**
- Launched via Tauri command `open_overlay` in `src-tauri/src/main.rs`
- Creates a second webview window named "overlay"
- Properties: `always_on_top: true`, `transparent: true`, `decorations: false`, `resizable: true`, `240x160` (min same)
- Route: `/overlay` -> `src/pages/Overlay.tsx`
- Displays timer state in compact form, allows pause/resume/skip-break
- Drag region: `data-tauri-drag-region` attribute on container elements
- Close button calls `win.hide()` (hides overlay, does not destroy)

**System Tray:**
- Rust-based tray icon with `"kaizen"` tooltip
- Icon loaded from `src-tauri/icons/icon.png` (decoded via `image` crate)
- Menu items: "Apri" (show), "Esci" (quit) - labels in Italian
- Tray icon click: shows and focuses the main window
- Main window `CloseRequested`: prevented, window is hidden instead of closed

**Single Instance Lock:**
- Lock file at OS temp dir (`kaizen.lock`) using atomic `create_new`
- Checks `/proc/{pid}` on Linux for stale lock detection
- Exits immediately if another instance is running

## Caching

**None.** No dedicated caching layer. Data is persisted in localStorage and re-read on each load.

## Monitoring & Observability

**Error Tracking:** None detected
**Logs:** Console-only (no structured logging)

## CI/CD & Deployment

**Hosting:** Not detected (distributed as native desktop binaries; web version is secondary)
**CI Pipeline:** Not detected
**Packaging scripts:** `npm run package:linux`, `npm run package:macos`, `npm run package:windows` in `package.json`

## Auto-Update Mechanism

- Custom, not Tauri built-in updater
- Checks Supabase `app_config` table for `current_version` key
- Compares against hardcoded `APP_VERSION` from `src/version.ts`
- Shows update overlay (`src/UpdateOverlay.tsx`) with OS-specific download link
- Detection: `src/updateCheck.ts` (`checkForUpdate()`)
- OS detection via `navigator.platform`

## Environment Configuration

**Required env vars:**
- None at runtime (Supabase URL and anon key are hardcoded in `src/supabase.ts`)
- Vite vars: `VITE_*` and `TAURI_*` prefixes supported (none detected in use)

**Secrets location:**
- Supabase anon key embedded in source (`src/supabase.ts`) - this is safe for client-side use
- No server-side secrets

## Webhooks & Callbacks

**Incoming:** `GET /auth/callback` - OAuth redirect handler in `src/App.tsx` (AuthCallback component)
**Outgoing:** None

---

*Integration audit: 2026-05-03*
