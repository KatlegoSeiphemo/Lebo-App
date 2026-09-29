import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { SlideToConfirm } from "@/src/components/slide-to-confirm";
import { haptic } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { statusConfig } from "@/src/lib/status";

const QUICK = [
  { key: "timer", label: "Safety Timer", icon: "Timer", route: "/timer-new" },
  { key: "journey", label: "Safe Journey", icon: "MapTrifold", route: "/journey-new" },
  { key: "location", label: "Share Location", icon: "ShareNetwork", route: "/location-share" },
  { key: "help", label: "Find Help", icon: "Lifebuoy", route: "/(tabs)/help" },
  { key: "journal", label: "Journal", icon: "NotePencil", route: "/(tabs)/journal" },
  { key: "chat", label: "Ask Lebo", icon: "ChatCircleDots", route: "/chat" },
] as const;

export default function Home() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();

  const timers = useQuery({ queryKey: ["timers"], queryFn: () => api.get("/safety-timers") });
  const active = useQuery({ queryKey: ["emergency-active"], queryFn: () => api.get("/emergency/active") });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const status = user?.safetyStatus || "none";
  const cfg = statusConfig(status, colors);

  const nextTimer = timers.data?.[0];
  const nextCheckin = nextTimer ? dayjs(nextTimer.nextCheckin).format("HH:mm") : null;

  const safeMut = useMutation({
    mutationFn: () => api.post("/checkins"),
    onSuccess: async () => {
      haptic("success");
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["timers"] });
    },
  });

  const onRefresh = async () => {
    await Promise.all([refreshUser(), timers.refetch(), active.refetch()]);
  };

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing["2xl"], paddingHorizontal: spacing.lg, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={timers.isFetching} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text testID="home-name" style={s.name}>{user?.name || "there"}</Text>
          </View>
          <Pressable testID="home-profile" onPress={() => router.push("/(tabs)/profile")} style={s.avatar}>
            <Text style={s.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Status card */}
        <View testID="home-status" style={[s.statusCard, { backgroundColor: cfg.color }]}>
          <Icon name={cfg.icon} size={30} color={cfg.on} weight="fill" />
          <View style={{ flex: 1 }}>
            <Text style={[s.statusLabel, { color: cfg.on }]}>{cfg.label}</Text>
            <Text style={[s.statusMode, { color: cfg.on }]}>Mode: {user?.currentMode || "Personal"}</Text>
          </View>
        </View>

        {/* Emergency slider */}
        <View style={s.emergencyWrap}>
          <SlideToConfirm
            testID="home-emergency-slider"
            label="SLIDE FOR HELP"
            onConfirm={() => router.push("/emergency")}
          />
          <Text style={s.emergencyHint}>Slide the button to alert your emergency contacts</Text>
        </View>

        {/* I'm safe */}
        <Pressable
          testID="home-im-safe"
          onPress={() => safeMut.mutate()}
          style={({ pressed }) => [s.safeBtn, pressed && { opacity: 0.85 }]}
        >
          <Icon name="ShieldCheck" size={22} color={colors.onSuccess} weight="fill" />
          <Text style={s.safeText}>{safeMut.isPending ? "Confirming…" : "I'M SAFE"}</Text>
        </Pressable>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Quick actions</Text>
        <View style={s.grid}>
          {QUICK.map((q) => (
            <Pressable
              key={q.key}
              testID={`quick-${q.key}`}
              onPress={() => { haptic("light"); router.push(q.route as any); }}
              style={({ pressed }) => [s.gridItem, pressed && { opacity: 0.8 }]}
            >
              <View style={s.gridIcon}>
                <Icon name={q.icon} size={26} color={colors.brandPrimary} weight="duotone" />
              </View>
              <Text style={s.gridLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Info rows */}
        <Text style={s.sectionTitle}>Current safety</Text>
        <View style={s.infoCard}>
          <InfoRow icon="Clock" label="Next check-in" value={nextCheckin ? `Today at ${nextCheckin}` : "No timer active"} />
          <View style={s.divider} />
          <InfoRow icon="MapPin" label="Location sharing" value={cap(user?.locationSharingDefault || "emergency")} />
          <View style={s.divider} />
          <InfoRow icon="ShieldStar" label="Area safety" value="Alerts on when you enable location" />
        </View>
      </ScrollView>
    </View>
  );
}

function cap(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.infoRow}>
      <Icon name={icon} size={22} color={colors.brandPrimary} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  headerRow: { flexDirection: "row", alignItems: "center" },
  greeting: { fontSize: 16, color: c.muted },
  name: { fontSize: 28, fontWeight: "800", color: c.onSurface },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onBrandPrimary, fontSize: 20, fontWeight: "800" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  statusLabel: { fontSize: 18, fontWeight: "800" },
  statusMode: { fontSize: 14, fontWeight: "600", opacity: 0.9, marginTop: 2 },
  emergencyWrap: { gap: spacing.sm, marginTop: spacing.xs },
  emergencyHint: { fontSize: 13, color: c.muted, textAlign: "center" },
  safeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: c.success, minHeight: 56, borderRadius: radius.md,
  },
  safeText: { color: c.onSuccess, fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  gridItem: {
    width: "31.5%", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.lg,
    alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: c.border,
  },
  gridIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  gridLabel: { fontSize: 12, fontWeight: "600", color: c.onSurfaceSecondary, textAlign: "center" },
  infoCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  infoLabel: { fontSize: 13, color: c.muted },
  infoValue: { fontSize: 15, fontWeight: "600", color: c.onSurfaceSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: c.divider },
}));
