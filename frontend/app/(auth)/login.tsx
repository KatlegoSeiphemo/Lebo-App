import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, spacing } from "@/src/theme";
import { Button, Field } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { useAuth } from "@/src/lib/auth";

export default function Login() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Could not sign in");
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
        <View style={s.logoWrap}>
          <View style={s.logoBadge}>
            <Icon name="ShieldStar" size={40} color={colors.onBrandPrimary} weight="fill" />
          </View>
          <Text style={s.brand}>Lebo</Text>
          <Text style={s.tagline}>Life & Emergency Backup Operator</Text>
        </View>

        <View style={s.form}>
          <Field label="Email" testID="login-email" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" testID="login-password" value={password} onChangeText={setPassword}
            placeholder="Your password" secureTextEntry />
          {error ? <Text testID="login-error" style={s.error}>{error}</Text> : null}
          <Button title="Sign in" testID="login-submit" onPress={submit} loading={loading} />
        </View>

        <Pressable testID="go-register" style={s.switchRow} onPress={() => router.push("/(auth)/register")}>
          <Text style={s.switchText}>New here? </Text>
          <Text style={s.switchLink}>Create an account</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing["2xl"] },
  logoWrap: { alignItems: "center", gap: spacing.sm },
  logoBadge: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: c.brandPrimary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  brand: { fontSize: 34, fontWeight: "800", color: c.onSurface },
  tagline: { fontSize: 15, color: c.muted },
  form: { gap: spacing.lg },
  error: { color: c.error, fontSize: 14, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { color: c.muted, fontSize: 15 },
  switchLink: { color: c.brandPrimary, fontSize: 15, fontWeight: "700" },
}));
