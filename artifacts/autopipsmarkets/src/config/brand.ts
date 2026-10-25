export const brandTokens = {
  platformName: "autopipsmarkets",
  themeMode: "Dark Terminal Base",
  backgroundBase: "#0B0E11",
  panelSurface: "#181A20",
  panelBorders: "#2B2F36",
  bullishAccent: "#00E676",
  bearishAccent: "#FF5252",
  primaryText: "#EAECSF",
  mutedText: "#848E9C",
  renderedPrimaryText: "#EAECEF",
} as const;

export const brandCss = {
  "--bg-base": brandTokens.backgroundBase,
  "--bg-surface": brandTokens.panelSurface,
  "--border-main": brandTokens.panelBorders,
  "--text-bull": brandTokens.bullishAccent,
  "--text-bear": brandTokens.bearishAccent,
  "--text-primary": brandTokens.renderedPrimaryText,
  "--text-muted": brandTokens.mutedText,
} as const;
