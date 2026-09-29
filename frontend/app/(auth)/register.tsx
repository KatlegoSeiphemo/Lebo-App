import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, spacing } from "@/src/theme";
import { Button, Field } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { useAuth } from "@/src/lib/auth";

export default function Register() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]}
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        <Pressable testID="back-btn" onPress={() => router.back()} style={s.back} hitSlop={12}>
          <Icon name="ArrowLeft" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={s.header}>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Set up Lebo to stay safe and supported.</Text>
        </View>

        <View style={s.form}>
          <Field label="Full name" testID="register-name" value={name} onChangeText={setName} placeholder="Katlego M" />
          <Field label="Email" testID="register-email" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" testID="register-password" value={password} onChangeText={setPassword}
            placeholder="At least 6 characters" secureTextEntry />
          {error ? <Text testID="register-error" style={s.error}>{error}</Text> : null}
          <Button title="Create account" testID="register-submit" onPress={submit} loading={loading} />
        </View>

        <Pressable testID="go-login" style={s.switchRow} onPress={() => router.replace("/(auth)/login")}>
          <Text style={s.switchText}>Already have an account? </Text>
          <Text style={s.switchLink}>Sign in</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.xl },
  back: { position: "absolute", top: spacing.md, left: spacing.lg },
  header: { gap: spacing.xs },
  title: { fontSize: 28, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 15, color: c.muted },
  form: { gap: spacing.lg },
  error: { color: c.error, fontSize: 14, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { color: c.muted, fontSize: 15 },
  switchLink: { color: c.brandPrimary, fontSize: 15, fontWeight: "700" },
}));
