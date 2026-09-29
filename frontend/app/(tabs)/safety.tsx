import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { haptic } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { statusConfig } from "@/src/lib/status";

export default function Safety() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();

  const timers = useQuery({ queryKey: ["timers"], queryFn: () => api.get("/safety-timers") });
  const journeys = useQuery({ queryKey: ["journeys"], queryFn: () => api.get("/journeys") });
  const modes = useQuery({ queryKey: ["modes"], queryFn: () => api.get("/modes") });
  const shares = useQuery({ queryKey: ["shares"], queryFn: () => api.get("/location-shares") });

  const cfg = statusConfig(user?.safetyStatus || "none", colors);
  const timer = timers.data?.[0];
  const activeJourney = journeys.data?.find((j: any) => j.status === "active");

  const safeMut = useMutation({
    mutationFn: () => api.post("/checkins"),
    onSuccess: async () => { haptic("success"); await refreshUser(); qc.invalidateQueries({ queryKey: ["timers"] }); },
  });
  const stopTimer = useMutation({
    mutationFn: (id: string) => api.del(`/safety-timers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timers"] }),
  });
  const completeJourney = useMutation({
    mutationFn: (id: string) => api.post(`/journeys/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journeys"] }),
  });
  const activateMode = useMutation({
    mutationFn: (id: string) => api.post(`/modes/${id}/activate`),
    onSuccess: async () => { await refreshUser(); qc.invalidateQueries({ queryKey: ["modes"] }); },
  });
  const revokeShare = useMutation({
    mutationFn: (id: string) => api.del(`/location-shares/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
  });

  const START = [
    { label: "Safety Timer", icon: "Timer", route: "/timer-new" },
    { label: "Safe Journey", icon: "MapTrifold", route: "/journey-new" },
    { label: "Event Mode", icon: "Confetti", route: "/modes" },
    { label: "Share Location", icon: "ShareNetwork", route: "/location-share" },
  ];

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={s.h1}>Safety</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["2xl"] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={timers.isFetching} onRefresh={() => { refreshUser(); timers.refetch(); journeys.refetch(); modes.refetch(); shares.refetch(); }} tintColor={colors.brandPrimary} />}
      >
        <View style={[s.statusCard, { backgroundColor: cfg.color }]}>
          <Icon name={cfg.icon} size={26} color={cfg.on} weight="fill" />
          <Text style={[s.statusText, { color: cfg.on }]}>{cfg.label}</Text>
        </View>

        {/* Active timer */}
        {timer && (
          <View style={s.card} testID="active-timer-card">
            <View style={s.cardHead}>
              <Icon name="Timer" size={22} color={colors.brandPrimary} weight="fill" />
              <Text style={s.cardTitle}>Safety timer active</Text>
            </View>
            <Text style={s.cardValue}>Next check-in at {dayjs(timer.nextCheckin).format("HH:mm")}</Text>
            <View style={s.rowBtns}>
              <Pressable testID="timer-safe" style={[s.smallBtn, { backgroundColor: colors.success }]} onPress={() => safeMut.mutate()}>
                <Text style={[s.smallBtnText, { color: colors.onSuccess }]}>I'm safe</Text>
              </Pressable>
              <Pressable testID="timer-stop" style={[s.smallBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={() => stopTimer.mutate(timer.id)}>
                <Text style={[s.smallBtnText, { color: colors.onSurfaceTertiary }]}>Stop</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Active journey */}
        {activeJourney && (
          <View style={s.card} testID="active-journey-card">
            <View style={s.cardHead}>
              <Icon name="MapTrifold" size={22} color={colors.brandPrimary} weight="fill" />
              <Text style={s.cardTitle}>Safe Journey to {activeJourney.destination}</Text>
            </View>
            <Text style={s.cardValue}>Expected {dayjs(activeJourney.expectedArrival).format("HH:mm")}</Text>
            <Pressable testID="journey-arrived" style={[s.smallBtn, { backgroundColor: colors.success, alignSelf: "flex-start", marginTop: spacing.sm }]} onPress={() => completeJourney.mutate(activeJourney.id)}>
              <Text style={[s.smallBtnText, { color: colors.onSuccess }]}>I've arrived</Text>
            </Pressable>
          </View>
        )}

        {/* Start something */}
        <Text style={s.section}>Start a safety feature</Text>
        <View style={s.startGrid}>
          {START.map((item) => (
            <Pressable key={item.label} testID={`start-${item.label}`} style={s.startItem} onPress={() => { haptic("light"); router.push(item.route as any); }}>
              <Icon name={item.icon} size={24} color={colors.brandPrimary} weight="duotone" />
              <Text style={s.startLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Modes */}
        <View style={s.sectionRow}>
          <Text style={s.section}>Modes</Text>
          <Pressable testID="manage-modes" onPress={() => router.push("/modes")}><Text style={s.link}>Manage</Text></Pressable>
        </View>
        <View style={s.card}>
          {(modes.data || []).length === 0 ? (
            <Text style={s.empty}>No custom modes yet. Tap Manage to create Work or Event modes.</Text>
          ) : (
            modes.data.map((m: any, i: number) => (
              <Pressable key={m.id} testID={`mode-${m.id}`} onPress={() => activateMode.mutate(m.id)} style={[s.listRow, i > 0 && s.listBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listTitle}>{m.name}</Text>
                  <Text style={s.listSub}>{cap(m.type)} mode</Text>
                </View>
                {m.active ? (
                  <View style={s.activeTag}><Text style={s.activeTagText}>Active</Text></View>
                ) : (
                  <Text style={s.link}>Activate</Text>
                )}
              </Pressable>
            ))
          )}
        </View>

        {/* Who can see my location */}
        <Text style={s.section}>Who can see my location</Text>
        <View style={s.card}>
          {(shares.data || []).length === 0 ? (
            <Text style={s.empty}>You're not sharing your location with anyone right now.</Text>
          ) : (
            shares.data.map((sh: any, i: number) => (
              <View key={sh.id} style={[s.listRow, i > 0 && s.listBorder]}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Icon name="MapPin" size={20} color={colors.success} weight="fill" />
                  <View>
                    <Text style={s.listTitle}>{sh.contactName}</Text>
                    <Text style={s.listSub}>{shareLabel(sh)}</Text>
                  </View>
                </View>
                <Pressable testID={`revoke-${sh.id}`} onPress={() => revokeShare.mutate(sh.id)}>
                  <Text style={[s.link, { color: colors.error }]}>Stop</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function cap(v: string) { return v.charAt(0).toUpperCase() + v.slice(1); }
function shareLabel(sh: any) {
  if (sh.mode === "emergency") return "During emergencies";
  if (sh.expiresAt) return `Until ${dayjs(sh.expiresAt).format("HH:mm")}`;
  if (sh.mode === "once") return "Shared once";
  return "Sharing live";
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  h1: { fontSize: 28, fontWeight: "800", color: c.onSurface },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg },
  statusText: { fontSize: 16, fontWeight: "800" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.xs },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurfaceSecondary },
  cardValue: { fontSize: 14, color: c.muted, marginTop: 2 },
  rowBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  smallBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, minHeight: 44, justifyContent: "center" },
  smallBtnText: { fontSize: 14, fontWeight: "700" },
  section: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { color: c.brandPrimary, fontSize: 14, fontWeight: "700" },
  startGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  startItem: { width: "48%", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  startLabel: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary, flexShrink: 1 },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md },
  listBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  listTitle: { fontSize: 15, fontWeight: "700", color: c.onSurfaceSecondary },
  listSub: { fontSize: 13, color: c.muted, marginTop: 1 },
  activeTag: { backgroundColor: c.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  activeTagText: { color: c.onBrandTertiary, fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 14, color: c.muted, paddingVertical: spacing.sm },
}));
