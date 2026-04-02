import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  primary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderLight: string;
  amber: string;
  purple: string;
  blue: string;
  rose: string;
  inputBg: string;
  cardBg: string;
}

const darkColors: ThemeColors = {
  background: "#0C0F0A",
  surface: "#141810",
  surfaceRaised: "#1A1F15",
  primary: "#7CB87A",
  text: "#F0EDE6",
  textSecondary: "rgba(240, 237, 230, 0.5)",
  textMuted: "rgba(240, 237, 230, 0.3)",
  textFaint: "rgba(240, 237, 230, 0.15)",
  border: "rgba(240, 237, 230, 0.04)",
  borderLight: "rgba(240, 237, 230, 0.06)",
  amber: "#D4A843",
  purple: "#A07EC8",
  blue: "#7AADCE",
  rose: "#D4748A",
  inputBg: "#141810",
  cardBg: "#141810",
};

const lightColors: ThemeColors = {
  background: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceRaised: "#F5F4F0",
  primary: "#5A9A58",
  text: "#1A1D17",
  textSecondary: "rgba(26, 29, 23, 0.55)",
  textMuted: "rgba(26, 29, 23, 0.35)",
  textFaint: "rgba(26, 29, 23, 0.15)",
  border: "rgba(26, 29, 23, 0.08)",
  borderLight: "rgba(26, 29, 23, 0.05)",
  amber: "#B8922E",
  purple: "#8A64B0",
  blue: "#5A8FAE",
  rose: "#C05A72",
  inputBg: "#F5F4F0",
  cardBg: "#FFFFFF",
};

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
