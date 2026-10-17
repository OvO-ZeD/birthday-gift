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
  primary: "#c1808a",
  secondary: "#776965",
  background: "#f7efe8",
  text: "#332c2a",
  highlight: "#d9a7ae",
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
 * The palette, retuned to a warm, natural family: ivory, champagne, warm beige, dusty rose,
 * a restrained coral, soft neutral grey, and charcoal rather than black.
 *
 * The previous tokens leaned hard on violet — plum grounds, lavender accents, near-black
 * purple-blacks — which is what made every dark theme read as the same purple glow. The theme
 * *system* is untouched: still seven `--gift-*` tokens per theme, still one object per theme,
 * still no CSS per theme. Only the colours changed, so nothing here overrides a creator's
 * choice — these are the choices.
 *
 * Note for anyone comparing against an older screenshot: existing gifts do render differently,
 * because the tokens themselves were redesigned. That is the intended effect of the pass.
 * `rose`, `midnight` and `ivory` still resolve to the same three themes they always did.
 */
export const THEMES: ThemeDefinition[] = [
  {
    id: "rosewater",
    name: "Rosewater",
    mood: "Warm ivory and dusty rose, soft daylight",
    tokens: {
      ink: "#332c2a",
      paper: "#f7efe8",
      accent: "#c1808a",
      accentSoft: "#c1808a24",
      line: "#c1808a3d",
      surface: "#fffdfaeb",
      muted: "#776965",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #f0dcd2 0%, #f7efe8 46%, #efe4da 100%)",
    tone: "light",
    decor: "petals",
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    mood: "Blush and champagne, airy",
    tokens: {
      ink: "#3b2d2c",
      paper: "#fbf1ee",
      accent: "#d08b93",
      accentSoft: "#d08b9322",
      line: "#d08b9338",
      surface: "#fffdfcf0",
      muted: "#7d6967",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #f6dcd6 0%, #fbf1ee 48%, #f3e4de 100%)",
    tone: "light",
    decor: "petals",
  },
  {
    id: "romantic-sunset",
    name: "Romantic Sunset",
    mood: "Coral and warm beige in fading light",
    tokens: {
      ink: "#fbeee6",
      paper: "#241d1a",
      accent: "#e79a76",
      accentSoft: "#e79a7626",
      line: "#e79a763d",
      surface: "#332824e8",
      muted: "#dcc0b2",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #6b4130 0%, #2c211c 46%, #17120f 100%)",
    tone: "dark",
    decor: "light-trails",
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    mood: "Muted mauve and pearl, restful",
    tokens: {
      ink: "#3a3238",
      paper: "#f5f1f2",
      accent: "#a58b9e",
      accentSoft: "#a58b9e22",
      line: "#a58b9e3a",
      surface: "#fffdfdec",
      muted: "#77696d",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #e8dee2 0%, #f5f1f2 48%, #ebe1e4 100%)",
    tone: "light",
    decor: "particles",
  },
  {
    id: "midnight-elegance",
    name: "Midnight Elegance",
    mood: "Champagne gold on warm charcoal",
    tokens: {
      ink: "#f6f0e8",
      paper: "#1b1815",
      accent: "#cdb08a",
      accentSoft: "#cdb08a26",
      line: "#cdb08a3d",
      surface: "#2a2622e0",
      muted: "#cec2b3",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #4c3f2f 0%, #221e1a 48%, #131110 100%)",
    tone: "dark",
    decor: "stars",
  },
  {
    id: "champagne-glow",
    name: "Champagne Glow",
    mood: "Ivory and warm beige, softly glowing",
    tokens: {
      ink: "#413430",
      paper: "#f9f2e7",
      accent: "#b07d6a",
      accentSoft: "#b07d6a1f",
      line: "#b07d6a40",
      surface: "#fffdf7ee",
      muted: "#7c6862",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #ecd8c6 0%, #f9f2e7 48%, #f0e6d7 100%)",
    tone: "light",
    decor: "light-trails",
  },
  {
    id: "sage-pearl",
    name: "Sage & Pearl",
    mood: "Sage green and warm ivory, botanical",
    tokens: {
      ink: "#33453c",
      paper: "#f3f5ef",
      accent: "#7a9070",
      accentSoft: "#7a907022",
      line: "#7a907040",
      surface: "#fffefcf0",
      muted: "#647167",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #dde5d5 0%, #f3f5ef 48%, #e8eee2 100%)",
    tone: "light",
    decor: "botanical",
  },
  {
    id: "ocean-serenity",
    name: "Ocean Serenity",
    mood: "Soft blue and sea glass over ivory",
    tokens: {
      ink: "#22404d",
      paper: "#eff4f5",
      accent: "#5b8fa0",
      accentSoft: "#5b8fa022",
      line: "#5b8fa03e",
      surface: "#fdfefef0",
      muted: "#58717b",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #d3e4e8 0%, #eff4f5 48%, #e1ecef 100%)",
    tone: "light",
    decor: "bubbles",
  },
  {
    id: "dreamy-pastels",
    name: "Dreamy Pastels",
    mood: "Peach, blush and cream over ivory",
    tokens: {
      ink: "#46352f",
      paper: "#fdf5f0",
      accent: "#d79a86",
      accentSoft: "#d79a8622",
      line: "#d79a863c",
      surface: "#fffdfbf0",
      muted: "#7d6c65",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #f6e0d4 0%, #fdf5f0 46%, #f7e9e0 100%)",
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
      ink: "#332c2a",
      paper: "#f7efe8",
      accent: "#c1808a",
      accentSoft: "#c1808a24",
      line: "#c1808a3d",
      surface: "#fffdfaeb",
      muted: "#776965",
    },
    backdrop: "radial-gradient(ellipse at 50% -8%, #f0dcd2 0%, #f7efe8 46%, #efe4da 100%)",
    tone: "light",
    decor: "petals",
  },
];

const THEME_BY_ID = new Map<string, ThemeDefinition>(THEMES.map((theme) => [theme.id, theme]));

/**
 * Stored values from before this registry existed. Kept so a gift published under the old
 * three-option picker still resolves to the theme its creator actually chose instead of
 * dropping to the default — the palette behind those ids was redesigned, but the choice is
 * still theirs and must survive.
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
