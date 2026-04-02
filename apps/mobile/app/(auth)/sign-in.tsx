import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../lib/auth";
import FloatingOrbs from "../../components/ui/FloatingOrbs";

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FloatingOrbs />
      <View style={styles.inner}>
        {/* Logo */}
        <View>
          <Text style={styles.logo}>Kin</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
          <Text style={styles.description}>
            Sign in to your Kin account
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(240, 237, 230, 0.2)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="rgba(240, 237, 230, 0.2)"
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0C0F0A" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.links}>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={styles.linkText}>Create account</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0F0A",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 48,
    color: "#7CB87A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: "#F0EDE6",
    textAlign: "center",
    marginBottom: 4,
  },
  description: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    marginBottom: 40,
  },
  form: {
    backgroundColor: "#141810",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.05)",
  },
  errorBox: {
    backgroundColor: "rgba(212, 116, 138, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 116, 138, 0.2)",
  },
  errorText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#D4748A",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: "Geist-Medium",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.5)",
    marginBottom: 8,
  },
  input: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "#F0EDE6",
    backgroundColor: "#0C0F0A",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
  },
  button: {
    backgroundColor: "#7CB87A",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    color: "#0C0F0A",
  },
  links: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  linkText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "#7CB87A",
  },
});
