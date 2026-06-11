export const theme = {
  brand: {
    name: "BASE6",
    short: "B6",
    tagline: "Your passport to Leonida",
  },
  colors: {
    bg: "#0f0f12",
    panel: "#1b1b21",
    panel2: "#22222a",
    border: "rgba(255,255,255,0.09)",
    borderStrong: "rgba(179,92,255,0.48)",
    text: "#f7f3ff",
    textMuted: "rgba(247,243,255,0.72)",
    textFaint: "rgba(247,243,255,0.52)",
    accent: "#b35cff",
    accent2: "#e064ff",
    accentSoft: "rgba(179,92,255,0.14)",
    success: "#86efac",
    warning: "#fde68a",
    danger: "#fb7185",
  },
  radii: {
    card: 24,
    input: 14,
    pill: 999,
  },
} as const;

export const site = {
  name: "base6",
  title: "BASE6 | GTA 6 Community Passport",
  description:
    "BASE6 is an unofficial GTA 6 community hub for passports, crews, LFG sessions, events, and player reputation.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
