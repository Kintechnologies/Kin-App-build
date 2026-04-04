import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors } from "../constants/colors";
export type { ThemeColors } from "../constants/colors";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  resolved: "dark",
  colors: darkColors,
  setMode: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem("kin_theme_mode").then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
  }, []);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    AsyncStorage.setItem("kin_theme_mode", newMode);
  }

  const resolved: ResolvedTheme =
    mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;
  const colors = resolved === "light" ? lightColors : darkColors;
  const isDark = resolved === "dark";

  return (
    <ThemeContext.Provider value={{ mode, resolved, colors, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Returns the full Kin color token set for the active theme.
 * Uses the user-selected theme mode (from ThemeContext) when available,
 * otherwise falls back to the system color scheme.
 *
 * This is the primary hook for all screens.
 * Spec: docs/specs/light-theme-spec.md §1
 */
export function useThemeColors() {
  const ctx = useContext(ThemeContext);
  // If ThemeProvider is mounted, use its resolved mode; otherwise read system scheme directly
  const systemScheme = useColorScheme();
  const resolved = ctx.resolved ?? (systemScheme === "light" ? "light" : "dark");
  return resolved === "light" ? lightColors : darkColors;
}
