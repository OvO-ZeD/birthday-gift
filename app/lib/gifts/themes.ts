import type { CSSProperties } from "react";

/**
 * The single source of truth for gift themes.
 *
 * Shared by the studio picker (client) and the recipient page (server), so it must
 * NOT import "server-only".
 *
 * A theme is a set of values for the seven `--gift-*` custom properties that
 * `app/g/[slug]/gift.css` already consumes, plus the page backdrop gradient, a light/dark
 * tone, and an ambient decoration kind. Adding a theme means adding one object here — no
 * new CSS, no new branch in the picker.
 */

/** Ambient motion layered behind the letter. Keys the `[data-decor]` rules in gift.css. */
export type ThemeDecor =
  | "petals"
  | "particles"
  | "botanical"
  | "stars"
  | "bubbles"
  | "light-trails";

export type ThemeId =
  | "rosewater"
  | "cherry-blossom"
  | "romantic-sunset"
  | "lavender-dream"
  | "midnight-elegance"
  | "champagne-glow"
  | "sage-pearl"
  | "ocean-serenity"
  | "dreamy-pastels"
  | "custom";

export type ThemeTokens = {
  /** Body and letter text. */
  ink: string;
  /** Deep page tone; the base of the backdrop gradient. */
  paper: string;
  /** Primary accent: hearts, kickers, emphasis. */
  accent: string;
  /** Translucent accent wash. */
  accentSoft: string;
  /** Hairline borders. */
  line: string;
  /** Foreground panel surface — deliberately readable, not washed out. */
  surface: string;
  /** Secondary text. */
  muted: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  /** One-line mood, shown under the swatch in the studio. */
  mood: string;
  tokens: ThemeTokens;
  /** Full-page gradient, the layer beneath the photos and accent glow. */
  backdrop: string;
  tone: "dark" | "light";
  decor: ThemeDecor;
};

/** New projects with no stored choice start here. */
export const DEFAULT_THEME_ID: ThemeId = "rosewater";

/** The five colours the Custom theme exposes in the studio. */
export type CustomColors = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  highlight: string;
};

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  primary: "#e58aa8",
  secondary: "#8c6678",
  background: "#211321",
  text: "#fff1f7",
  highlight: "#f0a9c8",
};

/**
 * Normalizes #rgb / #rrggbb to {r,g,b}. Returns null for anything else, including the
 * `color-mix()`-style values the theme registry does not accept, so callers can fall back
 * rather than emit an invalid colour.
 */
function parseHex(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim().replace(/^#/, "");
  const expanded = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

/** `#rrggbb` + alpha → `#rrggbbaa`, the same hex-alpha form the existing tokens use. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseHex(color);
  const clamped = Math.max(0, Math.min(1, alpha));
  if (!rgb) return color;
  const byte = Math.round(clamped * 255).toString(16).padStart(2, "0");
  return `#${[rgb.r, rgb.g, rgb.b].map((c) => c.toString(16).padStart(2, "0")).join("")}${byte}`;
}

/** Perceived brightness, used to decide a Custom theme's tone. */
function isLight(color: string): boolean {
  const rgb = parseHex(color);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 150;
}

/**
 * The three original themes keep their exact published values so every already-published
 * gift renders pixel-identical after this registry lands. Rosewater, Midnight Elegance and
 * Champagne Glow are therefore seeded from them rather than invented alongside them.
 */
export const THEMES: ThemeDefinition[] = [
  {
    id: "rosewater",
    name: "Rosewater",
    mood: "Blush pink and rose on deep plum",
    tokens: {
      ink: "#fff1f7",
      paper: "#211321",
      accent: "#f0a9c8",
      accentSoft: "#f0a9c82b",
      line: "#f0a9c84d",
      surface: "#321c30d9",
      muted: "#e3cbd9",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #59334e 0%, #261629 43%, #140e19 100%)",
    tone: "dark",
    decor: "petals",
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    mood: "Pastel pink and pearl white, airy",
    tokens: {
      ink: "#4a2b3c",
      paper: "#fdf4f7",
      accent: "#d9748f",
      accentSoft: "#d9748f24",
      line: "#d9748f40",
      surface: "#ffffffe0",
      muted: "#8c6678",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #f7d8e4 0%, #fdf4f7 48%, #f2e4ec 100%)",
    tone: "light",
    decor: "petals",
  },
  {
    id: "romantic-sunset",
    name: "Romantic Sunset",
    mood: "Peach and coral in golden-hour light",
    tokens: {
      ink: "#fff0e6",
      paper: "#241318",
      accent: "#ff9d76",
      accentSoft: "#ff9d7626",
      line: "#ff9d7645",
      surface: "#3a1e24e0",
      muted: "#e8c4b4",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #7a3a34 0%, #3a1d22 44%, #1b0f14 100%)",
    tone: "dark",
    decor: "light-trails",
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    mood: "Lilac and soft violet, restful",
    tokens: {
      ink: "#f6f0ff",
      paper: "#1c1630",
      accent: "#b9a5ff",
      accentSoft: "#b9a5ff26",
      line: "#b9a5ff45",
      surface: "#2a2246dc",
      muted: "#cfc3ea",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #4b3a7d 0%, #241c3f 46%, #120e1e 100%)",
    tone: "dark",
    decor: "particles",
  },
  {
    id: "midnight-elegance",
    name: "Midnight Elegance",
    mood: "Muted violet and champagne on near-black",
    tokens: {
      ink: "#f7efff",
      paper: "#12111c",
      accent: "#c8b5ff",
      accentSoft: "#c8b5ff26",
      line: "#c8b5ff45",
      surface: "#211d34db",
      muted: "#d4cde7",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #352a57 0%, #191522 48%, #0f0d16 100%)",
    tone: "dark",
    decor: "stars",
  },
  {
    id: "champagne-glow",
    name: "Champagne Glow",
    mood: "Ivory and warm beige, softly glowing",
    tokens: {
      ink: "#44302b",
      paper: "#f8f0e4",
      accent: "#a96f68",
      accentSoft: "#a96f681f",
      line: "#a96f6844",
      surface: "#fffaf1e8",
      muted: "#78615b",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #e8d0c2 0%, #f8f0e4 48%, #eee2d5 100%)",
    tone: "light",
    decor: "light-trails",
  },
  {
    id: "sage-pearl",
    name: "Sage & Pearl",
    mood: "Sage green and ivory, botanical",
    tokens: {
      ink: "#33453c",
      paper: "#f4f6f0",
      accent: "#6d8f6a",
      accentSoft: "#6d8f6a22",
      line: "#6d8f6a42",
      surface: "#ffffffe0",
      muted: "#6d7d70",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #dbe6d5 0%, #f4f6f0 48%, #e7eee1 100%)",
    tone: "light",
    decor: "botanical",
  },
  {
    id: "ocean-serenity",
    name: "Ocean Serenity",
    mood: "Soft blue and aqua over pearl",
    tokens: {
      ink: "#22404d",
      paper: "#eef6f8",
      accent: "#4a97ad",
      accentSoft: "#4a97ad22",
      line: "#4a97ad42",
      surface: "#ffffffe0",
      muted: "#5a7d88",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #cfe6ee 0%, #eef6f8 48%, #deeef2 100%)",
    tone: "light",
    decor: "bubbles",
  },
  {
    id: "dreamy-pastels",
    name: "Dreamy Pastels",
    mood: "Pink, blue and lavender over cream",
    tokens: {
      ink: "#463a52",
      paper: "#f7f2fb",
      accent: "#b483cf",
      accentSoft: "#b483cf24",
      line: "#b483cf45",
      surface: "#fffdfee8",
      muted: "#82748f",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #e8dcf2 0%, #f7f2fb 46%, #efe6f4 100%)",
    tone: "light",
    decor: "particles",
  },
  {
    id: "custom",
    name: "Custom",
    mood: "Your own five colours",
    // Always replaced by resolveTheme from the creator's own colours. Seeded from Rosewater
    // so an unset or half-filled Custom theme still renders something coherent.
    tokens: {
      ink: "#fff1f7",
      paper: "#211321",
      accent: "#f0a9c8",
      accentSoft: "#f0a9c82b",
      line: "#f0a9c84d",
      surface: "#321c30d9",
      muted: "#e3cbd9",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #59334e 0%, #261629 43%, #140e19 100%)",
    tone: "dark",
    decor: "petals",
  },
];

const THEME_BY_ID = new Map<string, ThemeDefinition>(THEMES.map((theme) => [theme.id, theme]));

/**
 * Stored values from before this registry existed. Kept so an already-published gift is not
 * silently restyled; `rose`/`midnight`/`ivory` now resolve to the themes seeded from them.
 */
const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  rose: "rosewater",
  midnight: "midnight-elegance",
  ivory: "champagne-glow",
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_BY_ID.has(value);
}

/** Anything unrecognised — empty, null, or a value retired from the registry — becomes the default. */
export function normalizeThemeId(value: unknown): ThemeId {
  if (typeof value !== "string") return DEFAULT_THEME_ID;
  const trimmed = value.trim();
  if (isThemeId(trimmed)) return trimmed;
  return LEGACY_THEME_MAP[trimmed] ?? DEFAULT_THEME_ID;
}

/**
 * Builds the Custom theme's tokens from the creator's colours. Every derived value comes
 * from a real relationship to their choices (panel surface from their background, washes
 * from their highlight) rather than being a fixed palette wearing their primary.
 */
function customTokens(colors: CustomColors, fallback: ThemeTokens): ThemeTokens {
  const primary = parseHex(colors.primary) ? colors.primary : fallback.accent;
  const background = parseHex(colors.background) ? colors.background : fallback.paper;
  const text = parseHex(colors.text) ? colors.text : fallback.ink;
  const secondary = parseHex(colors.secondary) ? colors.secondary : fallback.muted;
  const highlight = parseHex(colors.highlight) ? colors.highlight : primary;

  return {
    ink: text,
    paper: background,
    accent: primary,
    accentSoft: withAlpha(highlight, 0.16),
    line: withAlpha(highlight, 0.3),
    surface: withAlpha(background, 0.88),
    muted: secondary,
  };
}

function customBackdrop(colors: CustomColors, fallback: string): string {
  const background = parseHex(colors.background) ? colors.background : null;
  const primary = parseHex(colors.primary) ? colors.primary : null;
  if (!background || !primary) return fallback;
  return `radial-gradient(ellipse at 50% -8%, ${withAlpha(primary, 0.34)} 0%, ${background} 46%, ${background} 100%)`;
}

/**
 * Custom themes carry five creator-chosen colours, and Stage 1 deliberately adds no database
 * column, so they travel inside the existing free-form `gifts.theme` text column as
 * `custom:<primary>,<secondary>,<background>,<text>,<highlight>`.
 *
 * Additive and reversible: an ordinary id is still stored as a bare id, and anything that does
 * not parse as a complete, valid custom value falls back to the default theme rather than
 * rendering a half-applied palette. When a dedicated column is added later, only these two
 * functions change.
 */
const CUSTOM_PREFIX = "custom:";
const CUSTOM_FIELDS: (keyof CustomColors)[] = [
  "primary",
  "secondary",
  "background",
  "text",
  "highlight",
];

export function encodeThemeValue(id: ThemeId, custom?: Partial<CustomColors> | null): string {
  if (id !== "custom") return id;

  const colors: CustomColors = { ...DEFAULT_CUSTOM_COLORS, ...(custom ?? {}) };
  const values = CUSTOM_FIELDS.map((field) => colors[field]);
  // Never persist a value that cannot be read back — fall back to a bare id instead.
  if (!values.every((color) => parseHex(color))) return "custom";
  return `${CUSTOM_PREFIX}${values.join(",")}`;
}

export function parseThemeValue(stored: unknown): {
  id: ThemeId;
  custom: CustomColors | null;
} {
  if (typeof stored === "string" && stored.startsWith(CUSTOM_PREFIX)) {
    const parts = stored.slice(CUSTOM_PREFIX.length).split(",");
    if (parts.length === CUSTOM_FIELDS.length && parts.every((color) => parseHex(color))) {
      const custom = Object.fromEntries(
        CUSTOM_FIELDS.map((field, index) => [field, parts[index]]),
      ) as CustomColors;
      return { id: "custom", custom };
    }
    return { id: DEFAULT_THEME_ID, custom: null };
  }

  return { id: normalizeThemeId(stored), custom: null };
}

/**
 * The one resolver both the studio and the recipient page use, so a theme can never render
 * one way to its creator and another to its recipient. Takes the raw stored value, so callers
 * do not need to know how a custom theme is encoded.
 */
export function resolveTheme(value: unknown): ThemeDefinition {
  const { id, custom } = parseThemeValue(value);
  return resolveThemeParts(id, custom);
}

/** Resolves from already-separated parts — what the studio uses for unsaved preview state. */
export function resolveThemeParts(
  id: ThemeId,
  custom?: Partial<CustomColors> | null,
): ThemeDefinition {
  const definition = THEME_BY_ID.get(id) ?? THEME_BY_ID.get(DEFAULT_THEME_ID)!;

  if (id !== "custom") {
    return { ...definition, tokens: { ...definition.tokens } };
  }

  const colors: CustomColors = { ...DEFAULT_CUSTOM_COLORS, ...(custom ?? {}) };
  const seed = THEME_BY_ID.get(DEFAULT_THEME_ID)!;
  return {
    ...definition,
    tokens: customTokens(colors, seed.tokens),
    backdrop: customBackdrop(colors, seed.backdrop),
    tone: isLight(colors.background) ? "light" : "dark",
  };
}

/**
 * Turns tokens into inline custom properties. Setting them on the element rather than
 * emitting one CSS class per theme is what lets a new theme work without new CSS.
 */
export function themeStyle(theme: ThemeDefinition): CSSProperties {
  return {
    "--gift-ink": theme.tokens.ink,
    "--gift-paper": theme.tokens.paper,
    "--gift-accent": theme.tokens.accent,
    "--gift-accent-soft": theme.tokens.accentSoft,
    "--gift-line": theme.tokens.line,
    "--gift-surface": theme.tokens.surface,
    "--gift-muted": theme.tokens.muted,
    "--gift-backdrop": theme.backdrop,
  } as CSSProperties;
}
