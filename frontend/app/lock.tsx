import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

const PAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function Lock() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, unlock, signOut } = useAuth();
  const method = user?.appLock?.method || "pin";
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(method === "pin");

  const done = useCallback(() => {
    unlock();
    router.replace("/(tabs)");
  }, [unlock, router]);

  const tryBiometric = useCallback(async () => {
    if (Platform.OS === "web") {
      setShowPin(true);
      return;
    }
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) {
      setShowPin(true);
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Lebo",
      fallbackLabel: user?.appLock?.hasPin ? "Use PIN" : undefined,
    });
    if (res.success) done();
    else if (user?.appLock?.hasPin) setShowPin(true);
  }, [done, user]);

  useEffect(() => {
    if (method === "biometric") tryBiometric();
  }, [method, tryBiometric]);

  const verifyPin = async (value: string) => {
    try {
      await api.post("/me/app-lock/verify", { pin: value });
      done();
    } catch {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  const onKey = (k: string) => {
    setError("");
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (k === "") return;
    const nv = (pin + k).slice(0, 6);
    setPin(nv);
    if (nv.length === 4 || nv.length === 6) {
      // verify at 4 first, then allow up to 6
      if (nv.length === 4) verifyPin(nv);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={s.top}>
        <View style={s.badge}>
          <Icon name="LockKey" size={40} color={colors.onBrandPrimary} weight="fill" />
        </View>
        <Text style={s.title}>Lebo is locked</Text>
        <Text style={s.subtitle}>
          {showPin ? "Enter your PIN to continue" : "Authenticate to continue"}
        </Text>
      </View>

      {showPin ? (
        <>
          <View style={s.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.pinDot, { backgroundColor: i < pin.length ? colors.brandPrimary : "transparent", borderColor: colors.borderStrong }]} />
            ))}
          </View>
          {error ? <Text testID="lock-error" style={s.error}>{error}</Text> : <View style={{ height: 20 }} />}
          <View style={s.pad}>
            {PAD.map((k, i) => (
              <Pressable
                key={i}
                testID={k ? `pad-${k}` : undefined}
                disabled={k === ""}
                onPress={() => onKey(k)}
                style={({ pressed }) => [s.key, k === "" && { opacity: 0 }, pressed && k !== "" && { backgroundColor: colors.surfaceTertiary }]}
              >
                {k === "del" ? <Icon name="Backspace" size={26} color={colors.onSurface} /> : <Text style={s.keyText}>{k}</Text>}
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Pressable testID="unlock-biometric" style={s.bioBtn} onPress={tryBiometric}>
          <Icon name="Fingerprint" size={32} color={colors.brandPrimary} weight="bold" />
          <Text style={s.bioText}>Unlock</Text>
        </Pressable>
      )}

      <Pressable testID="lock-signout" style={s.signout} onPress={signOut}>
        <Text style={s.signoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "space-between" },
  top: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl },
  badge: { width: 84, height: 84, borderRadius: 24, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: c.onSurface },
  subtitle: { fontSize: 15, color: c.muted },
  dots: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xl },
  pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  error: { color: c.error, fontWeight: "600", height: 20 },
  pad: { width: 300, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  key: { width: 88, height: 76, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 30, fontWeight: "600", color: c.onSurface },
  bioBtn: { alignItems: "center", gap: spacing.sm },
  bioText: { fontSize: 16, fontWeight: "700", color: c.brandPrimary },
  signout: { padding: spacing.md },
  signoutText: { color: c.muted, fontSize: 15, fontWeight: "600" },
}));
