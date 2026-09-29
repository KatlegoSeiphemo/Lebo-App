import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Chip, Field, haptic } from "@/src/components/ui";
import { api } from "@/src/lib/api";

const CATS = [
  { key: "all", label: "All", icon: "SquaresFour" },
  { key: "police", label: "Police", icon: "ShieldStar" },
  { key: "medical", label: "Medical", icon: "FirstAid" },
  { key: "shelter", label: "Shelters", icon: "House" },
  { key: "psychological", label: "Support", icon: "Brain" },
  { key: "legal", label: "Legal", icon: "Scales" },
  { key: "social", label: "GBV / Social", icon: "UsersThree" },
];

export default function Help() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"idle" | "loading" | "denied">("idle");

  const enableLocation = useCallback(async () => {
    setLocState("loading");
    if (Platform.OS === "web") {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("idle");
        return;
      } catch { setLocState("denied"); return; }
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) { setLocState("denied"); return; }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocState("idle");
    } catch { setLocState("denied"); }
  }, []);

  const list = useQuery({
    queryKey: ["support", cat, q, coords?.lat, coords?.lng],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cat !== "all") params.set("category", cat);
      if (q) params.set("q", q);
      if (coords) { params.set("lat", String(coords.lat)); params.set("lng", String(coords.lng)); }
      return api.get(`/support?${params.toString()}`);
    },
  });

  const openMap = (o: any) => {
    const query = o.lat ? `${o.lat},${o.lng}` : encodeURIComponent(`${o.name} ${o.address}`);
    Linking.openURL(Platform.select({ ios: `maps://?q=${query}`, default: `https://maps.google.com/?q=${query}` })!);
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={s.h1}>Find Help Nearby</Text>
        <Field testID="help-search" placeholder="Search by name or city" value={q} onChangeText={setQ} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {CATS.map((cnf) => (
            <Chip key={cnf.key} testID={`cat-${cnf.key}`} label={cnf.label} active={cat === cnf.key} onPress={() => setCat(cnf.key)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] }} showsVerticalScrollIndicator={false}>
        {!coords && (
          <Pressable testID="enable-location" style={s.locBanner} onPress={enableLocation}>
            <Icon name="MapPin" size={22} color={colors.brandPrimary} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={s.locTitle}>{locState === "denied" ? "Location unavailable" : "See distances to help"}</Text>
              <Text style={s.locSub}>{locState === "denied" ? "Enable location in Settings to sort by distance" : "Lebo uses your location only to sort nearby support"}</Text>
            </View>
            {locState === "loading" ? <ActivityIndicator color={colors.brandPrimary} /> : (
              <Text style={s.link}>{locState === "denied" ? "Settings" : "Enable"}</Text>
            )}
          </Pressable>
        )}

        {list.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
        ) : (list.data || []).length === 0 ? (
          <Text style={s.empty}>No resources found. Try another category.</Text>
        ) : (
          list.data.map((o: any) => (
            <View key={o.id} style={s.card} testID={`org-${o.id}`}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.orgName}>{o.name}</Text>
                  <Text style={s.orgMeta}>{o.address}{o.hours ? ` • ${o.hours}` : ""}</Text>
                </View>
                {o.distanceKm != null && <Text style={s.dist}>{o.distanceKm} km</Text>}
              </View>
              <View style={s.tagRow}>
                {o.emergency && <View style={[s.tag, { backgroundColor: colors.error }]}><Text style={s.tagText}>24/7 Emergency</Text></View>}
                {o.verified && <View style={[s.tag, { backgroundColor: colors.brandTertiary }]}><Text style={[s.tagText, { color: colors.onBrandTertiary }]}>Verified · {o.source}</Text></View>}
              </View>
              <View style={s.actions}>
                <Pressable testID={`call-${o.id}`} style={[s.actionBtn, { backgroundColor: colors.brandPrimary }]} onPress={() => { haptic("medium"); Linking.openURL(`tel:${o.phone}`); }}>
                  <Icon name="Phone" size={18} color={colors.onBrandPrimary} weight="fill" />
                  <Text style={[s.actionText, { color: colors.onBrandPrimary }]}>Call {o.phone}</Text>
                </Pressable>
                <Pressable testID={`nav-${o.id}`} style={[s.actionBtn, s.actionGhost, { borderColor: colors.border }]} onPress={() => openMap(o)}>
                  <Icon name="NavigationArrow" size={18} color={colors.onSurface} weight="fill" />
                  <Text style={[s.actionText, { color: colors.onSurface }]}>Directions</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, gap: spacing.md },
  h1: { fontSize: 26, fontWeight: "800", color: c.onSurface },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  locBanner: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.lg },
  locTitle: { fontSize: 15, fontWeight: "700", color: c.onBrandTertiary },
  locSub: { fontSize: 13, color: c.onBrandTertiary, opacity: 0.8, marginTop: 1 },
  link: { color: c.brandPrimary, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  orgName: { fontSize: 16, fontWeight: "800", color: c.onSurfaceSecondary },
  orgMeta: { fontSize: 13, color: c.muted, marginTop: 2 },
  dist: { fontSize: 13, fontWeight: "700", color: c.brandPrimary },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, minHeight: 46, borderRadius: radius.md },
  actionGhost: { backgroundColor: "transparent", borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: "700" },
  empty: { fontSize: 15, color: c.muted, textAlign: "center", marginTop: spacing.xl },
}));
