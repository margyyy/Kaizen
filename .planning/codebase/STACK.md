# Technology Stack

**Analysis Date:** 2026-05-03

## Languages

**Primary:** TypeScript 5.5 (`.ts`, `.tsx`) - All frontend logic, page components, data access, and sync layer
**Secondary:** Rust (edition 2021) - Tauri desktop backend (`src-tauri/src/main.rs`)

## Runtime

**Environment:**
- Node.js (via Vite dev server on `http://localhost:5173`)
- Package Manager: npm
- Lockfile: `package-lock.json` present

## Frameworks

**Frontend:**
- React 18.3.1 with `react-dom` 18.3.0 - Component UI
- Vite 5.4.2 - Build tool and dev server

**Desktop (Tauri v2):**
- Tauri 2.x (Rust) - Desktop wrapper with native OS capabilities
- `@tauri-apps/api` ^2.0.0 - JS bindings to Tauri runtime
- Tauri plugins: notification (^2.3.3), shell (^2.3.5)

**Styling:**
- Tailwind CSS 3.4.10 - Utility-first CSS framework
- daisyUI 4.12.13 - Component library for Tailwind
- PostCSS 8.4.39 + autoprefixer 10.4.19 - CSS processing pipeline

**State/Data:**
- `react-router-dom` ^6.26.2 - Client-side routing (BrowserRouter)
- Custom `DataContext` (`src/DataContext.tsx`) - React context for app state
- `localStorage` - Primary persistence (serialized JSON)

**Cloud:**
- `@supabase/supabase-js` ^2.105.1 - Supabase client (Auth + Database)

**Visualization & Utilities:**
- `recharts` ^2.12.7 - Charts and statistics
- `react-big-calendar` ^1.13.2 - Calendar view for study sessions
- `katex` ^0.16.45 - LaTeX math rendering
- `date-fns` ^3.6.0 - Date manipulation

## Key Dependencies

**Critical:**
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `@supabase/supabase-js` | ^2.105.1 | Auth + Database client |
| `@tauri-apps/api` | ^2.0.0 | Desktop native API bridge |
| `react-router-dom` | ^6.26.2 | Client-side routing |

**Infrastructure:**
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^3.4.10 | CSS utility framework |
| `daisyui` | ^4.12.13 | Pre-built Tailwind components |
| `vite` | ^5.4.2 | Build tool and dev server |
| `@vitejs/plugin-react` | ^4.3.1 | Vite React integration |

**Dev Infrastructure:**
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

**TypeScript:** `tsconfig.json` - target ES2020, strict mode, `jsx: "react-jsx"`, `moduleResolution: "Bundler"`
**Vite:** `vite.config.ts` - React plugin, port 5173, env prefix `VITE_` and `TAURI_`, externalizes `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs`
**Tailwind:** `tailwind.config.js` - 11 accent colors x 2 themes (light/dark) = 22 daisyUI themes, content targets `./src/**/*.{ts,tsx}`
**Tauri:** `src-tauri/tauri.conf.json` - app identifier `com.studyflow.app`, 1200x800 window (min 430x932), frameless/decorations: false

## Platform Requirements

**Development:**
- Node.js (npm)
- Rust toolchain (for Tauri)
- Linux: typically `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, etc.

**Production builds (3 targets):**
- Linux: `npm run package:linux` -> `Kaizen-linux-x64.tar.gz`
- macOS: `npm run package:macos` -> `Kaizen-macos-arm64.zip`
- Windows: `npm run package:windows` -> `Kaizen-windows-x64.zip`

**App version:** 0.1.1 (`src-tauri/tauri.conf.json`) / 0.1.0 (`package.json`)

---

*Stack analysis: 2026-05-03*
