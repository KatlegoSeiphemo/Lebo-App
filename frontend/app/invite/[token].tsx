import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { haptic } from "@/src/components/ui";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export default function InviteLanding() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "invalid" | "ready">("loading");
  const [inviter, setInviter] = useState("A friend");
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/invitations/${token}`);
        if (!res.ok) return setState("invalid");
        const data = await res.json();
        setInviter(data.inviterName || "A friend");
        setStatus(data.status || "pending");
        setState("ready");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const respond = async (response: "accepted" | "declined") => {
    setBusy(true);
    haptic(response === "accepted" ? "success" : "light");
    try {
      const res = await fetch(`${BASE}/invitations/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) setStatus(response);
    } catch {}
    setBusy(false);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={s.logoWrap}>
          <View style={s.logoBadge}><Icon name="ShieldStar" size={40} color={colors.onBrandPrimary} weight="fill" /></View>
          <Text style={s.brand}>Lebo</Text>
          <Text style={s.acronym}>Life & Emergency Backup Operator</Text>
        </View>

        {state === "loading" && <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />}

        {state === "invalid" && (
          <View style={s.card}>
            <Icon name="WarningCircle" size={40} color={colors.warning} weight="fill" />
            <Text style={s.cardTitle}>Invitation not found</Text>
            <Text style={s.cardBody}>This invitation link is invalid or has expired. Ask the person to send you a new one.</Text>
          </View>
        )}

        {state === "ready" && status === "pending" && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>{inviter} has added you as an emergency contact</Text>
              <Text style={s.cardBody}>
                If {inviter} ever needs help, Lebo can alert you so you can check on them and confirm they're safe. You choose what you're notified about.
              </Text>
              <View style={s.actions}>
                <Pressable testID="invite-accept" style={[s.btn, { backgroundColor: colors.brandPrimary }]} onPress={() => respond("accepted")} disabled={busy}>
                  <Text style={[s.btnText, { color: colors.onBrandPrimary }]}>Accept</Text>
                </Pressable>
                <Pressable testID="invite-decline" style={[s.btn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => respond("declined")} disabled={busy}>
                  <Text style={[s.btnText, { color: colors.onSurfaceTertiary }]}>Decline</Text>
                </Pressable>
              </View>
            </View>
            <DownloadCard />
          </>
        )}

        {state === "ready" && status === "accepted" && (
          <>
            <View style={s.card}>
              <Icon name="CheckCircle" size={44} color={colors.success} weight="fill" />
              <Text style={s.cardTitle}>You're now {inviter}'s emergency contact</Text>
              <Text style={s.cardBody}>Download Lebo and sign in to manage your alerts and be ready to help.</Text>
            </View>
            <DownloadCard />
          </>
        )}

        {state === "ready" && status === "declined" && (
          <View style={s.card}>
            <Icon name="XCircle" size={44} color={colors.muted} weight="fill" />
            <Text style={s.cardTitle}>Invitation declined</Text>
            <Text style={s.cardBody}>No problem. You can change your mind by opening the link again.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DownloadCard() {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Get the Lebo app</Text>
      <Text style={s.cardBody}>Lebo is a free personal safety app. Download it to accept and manage your emergency-contact role.</Text>
      <Pressable testID="dl-ios" style={s.store} onPress={() => Linking.openURL("https://apps.apple.com/search?term=lebo%20safety")}>
        <Icon name="AppleLogo" size={24} color={colors.onSurface} weight="fill" />
        <View>
          <Text style={s.storeSmall}>Download on the</Text>
          <Text style={s.storeBig}>App Store</Text>
        </View>
      </Pressable>
      <Pressable testID="dl-android" style={s.store} onPress={() => Linking.openURL("https://play.google.com/store/search?q=lebo%20safety&c=apps")}>
        <Icon name="GooglePlayLogo" size={24} color={colors.onSurface} weight="fill" />
        <View>
          <Text style={s.storeSmall}>Get it on</Text>
          <Text style={s.storeBig}>Google Play</Text>
        </View>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.xl, gap: spacing.lg },
  logoWrap: { alignItems: "center", gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
  logoBadge: { width: 80, height: 80, borderRadius: 24, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  brand: { fontSize: 32, fontWeight: "800", color: c.onSurface },
  acronym: { fontSize: 14, fontWeight: "600", color: c.muted },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md, alignItems: "flex-start" },
  cardTitle: { fontSize: 20, fontWeight: "800", color: c.onSurfaceSecondary },
  cardBody: { fontSize: 15, color: c.muted, lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, alignSelf: "stretch" },
  btn: { flex: 1, minHeight: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "800" },
  store: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignSelf: "stretch" },
  storeSmall: { fontSize: 11, color: c.muted },
  storeBig: { fontSize: 16, fontWeight: "800", color: c.onSurface },
}));
