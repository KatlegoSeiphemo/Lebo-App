// Design tokens for Lebo. Light + Dark. Keys match design_guidelines.json.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F9F8F6",
  onSurface: "#1A1C19",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A1C19",
  surfaceTertiary: "#F0EFEA",
  onSurfaceTertiary: "#4A4D4A",
  surfaceInverse: "#1A1C19",
  onSurfaceInverse: "#F9F8F6",
  muted: "#73726E",

  brand: "#7E998A",
  onBrand: "#FFFFFF",
  brandPrimary: "#6A8576",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#B5C4BC",
  onBrandSecondary: "#1A1C19",
  brandTertiary: "#E2EAE5",
  onBrandTertiary: "#2C3A32",

  success: "#4D7C5E",
  onSuccess: "#FFFFFF",
  warning: "#F79009",
  onWarning: "#FFFFFF",
  error: "#D92D20",
  onError: "#FFFFFF",
  info: "#1A1C19",
  onInfo: "#FFFFFF",

  border: "#E5E4E0",
  borderStrong: "#CCCACA",
  divider: "#E5E4E0",
};

const dark: typeof light = {
  surface: "#121312",
  onSurface: "#EAE9E5",
  surfaceSecondary: "#1E201E",
  onSurfaceSecondary: "#EAE9E5",
  surfaceTertiary: "#2A2D2A",
  onSurfaceTertiary: "#B0AFAB",
  surfaceInverse: "#F9F8F6",
  onSurfaceInverse: "#121312",
  muted: "#9A9995",

  brand: "#8FAAA0",
  onBrand: "#121312",
  brandPrimary: "#A3C0B5",
  onBrandPrimary: "#121312",
  brandSecondary: "#52665D",
  onBrandSecondary: "#EAE9E5",
  brandTertiary: "#2C3A32",
  onBrandTertiary: "#D1E0D8",

  success: "#5E9E73",
  onSuccess: "#121312",
  warning: "#FFB020",
  onWarning: "#121312",
  error: "#F04438",
  onError: "#FFFFFF",
  info: "#F9F8F6",
  onInfo: "#121312",

  border: "#2E302E",
  borderStrong: "#4A4D4A",
  divider: "#2E302E",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 } as const;
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;
