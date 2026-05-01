/** @type {import('tailwindcss').Config} */

const BASE_LIGHT = {
  "base-100": "#f5f2ee",
  "base-200": "#eeebe5",
  "base-300": "#e3dfd8",
  "base-content": "#3f3f46",
  neutral: "#3f3f46",
  "neutral-content": "#fafafa",
  success: "#16a34a",
  "success-content": "#ffffff",
  warning: "#d97706",
  "warning-content": "#ffffff",
  error: "#dc2626",
  "error-content": "#ffffff",
  info: "#6b7280",
  "info-content": "#ffffff",
};

const BASE_DARK = {
  "base-100": "#1c1c1f",
  "base-200": "#252528",
  "base-300": "#2e2e32",
  "base-content": "#d4d4d8",
  neutral: "#52525b",
  "neutral-content": "#fafafa",
  success: "#22c55e",
  "success-content": "#052e16",
  warning: "#eab308",
  "warning-content": "#1c1400",
  error: "#ef4444",
  "error-content": "#ffffff",
  info: "#94a3b8",
  "info-content": "#0f172a",
};

const ACCENTS = {
  ancient: { p: "#8b7355", pc: "#ffffff", s: "#a07850", sc: "#ffffff", a: "#caa22a", ac: "#1c1400" },
  gold:    { p: "#c9a227", pc: "#1c1400", s: "#a07c1a", sc: "#1c1400", a: "#c9a227", ac: "#1c1400" },
  red:     { p: "#e05d5d", pc: "#ffffff", s: "#c94444", sc: "#ffffff", a: "#e05d5d", ac: "#ffffff" },
  orange:  { p: "#e07b39", pc: "#ffffff", s: "#c96228", sc: "#ffffff", a: "#e07b39", ac: "#ffffff" },
  yellow:  { p: "#d4b82a", pc: "#1c1400", s: "#b89a20", sc: "#1c1400", a: "#d4b82a", ac: "#1c1400" },
  green:   { p: "#3b9e77", pc: "#ffffff", s: "#2d7a5c", sc: "#ffffff", a: "#3b9e77", ac: "#ffffff" },
  teal:    { p: "#2a9db5", pc: "#ffffff", s: "#1f7d91", sc: "#ffffff", a: "#2a9db5", ac: "#ffffff" },
  blue:    { p: "#5b8dd9", pc: "#ffffff", s: "#4070c0", sc: "#ffffff", a: "#5b8dd9", ac: "#ffffff" },
  purple:  { p: "#7c6fcd", pc: "#ffffff", s: "#6258b0", sc: "#ffffff", a: "#7c6fcd", ac: "#ffffff" },
  pink:    { p: "#c46db0", pc: "#ffffff", s: "#a8559a", sc: "#ffffff", a: "#c46db0", ac: "#ffffff" },
  slate:   { p: "#64748b", pc: "#ffffff", s: "#4b5563", sc: "#ffffff", a: "#64748b", ac: "#ffffff" },
};

function makeTheme(base, accent) {
  return {
    ...base,
    primary: accent.p,
    "primary-content": accent.pc,
    secondary: accent.s,
    "secondary-content": accent.sc,
    accent: accent.a,
    "accent-content": accent.ac,
  };
}

const themes = [];
for (const [name, accent] of Object.entries(ACCENTS)) {
  themes.push({ [`${name}-light`]: makeTheme(BASE_LIGHT, accent) });
  themes.push({ [`${name}-dark`]: makeTheme(BASE_DARK, accent) });
}
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("daisyui")],
  daisyui: {
    themes,
    darkTheme: "slate-dark",
  },
};
