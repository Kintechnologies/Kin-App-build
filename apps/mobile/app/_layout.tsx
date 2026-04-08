import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../lib/auth";
import { ThemeProvider, useTheme, useThemeColors } from "../lib/theme";
import { SettingsProvider } from "../lib/settings";
import { initSentry } from "../lib/sentry";
import { View, StyleSheet } from "react-native";

// Initialise Sentry before anything else so all errors are captured from the
// very first render, including auth and font-loading failures.
initSentry();

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  return <Slot />;
}

function ThemedRoot() {
  const { isDark } = useTheme();
  // Use the spec-aligned token set (constants/colors.ts) for correct warm-white light theme
  const colors = useThemeColors();

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* §light-theme-spec.md §12: StatusBar style toggles light-content ↔ dark-content */}
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthProvider>
        <SettingsProvider>
          <AuthGate />
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist: require("../assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium": require("../assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("../assets/fonts/Geist-SemiBold.ttf"),
    "Geist-Bold": require("../assets/fonts/Geist-Bold.ttf"),
    GeistMono: require("../assets/fonts/GeistMono-Regular.ttf"),
    "GeistMono-Regular": require("../assets/fonts/GeistMono-Regular.ttf"),
    "InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
