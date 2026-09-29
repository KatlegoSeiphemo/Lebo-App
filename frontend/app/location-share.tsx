import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";

const MODES = [
  { key: "once", label: "Share current location once", icon: "MapPin" },
  { key: "live", label: "Share live location temporarily", icon: "Broadcast" },
  { key: "emergency", label: "Share during emergencies only", icon: "Siren" },
];
const DURATIONS = [30, 60, 120];

export default function LocationShare() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [contactId, setContactId] = useState<string | null>(null);
  const [mode, setMode] = useState("live");
  const [duration, setDuration] = useState(30);

  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => api.get("/emergency-contacts") });

  const create = useMutation({
    mutationFn: async () => {
      let lat: number | undefined, lng: number | undefined;
      try {
        const perm = Platform.OS === "web" ? { granted: true } : await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        }
      } catch {}
      return api.post("/location-shares", { contactId, mode, durationMinutes: duration, lat, lng });
    },
    onSuccess: () => { haptic("success"); qc.invalidateQueries({ queryKey: ["shares"] }); router.back(); },
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Share Location" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Icon name="ShareNetwork" size={34} color={colors.brandPrimary} weight="duotone" />
          <Text style={s.heroText}>Your location is never shared silently. You choose who, how and for how long.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Share with</Text>
          {(contacts.data || []).length === 0 ? (
            <Text style={s.sub}>Add a contact first.</Text>
          ) : contacts.data.map((c: any) => (
            <Pressable key={c.id} testID={`lc-${c.id}`} onPress={() => setContactId(c.id)} style={[s.contactRow, contactId === c.id && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
              <Text style={s.contactName}>{c.name}</Text>
              {contactId === c.id && <Icon name="CheckCircle" size={22} color={colors.brandPrimary} weight="fill" />}
            </Pressable>
          ))}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>How to share</Text>
          {MODES.map((m) => (
            <Pressable key={m.key} testID={`mode-${m.key}`} onPress={() => setMode(m.key)} style={[s.modeRow, mode === m.key && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
              <Icon name={m.icon} size={22} color={colors.brandPrimary} />
              <Text style={s.contactName}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "live" && (
          <View style={{ gap: spacing.md }}>
            <Text style={s.label}>For how long</Text>
            <View style={s.durRow}>
              {DURATIONS.map((d) => (
                <Pressable key={d} testID={`dur-${d}`} onPress={() => { haptic("light"); setDuration(d); }} style={[s.option, duration === d && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                  <Text style={[s.optionText, duration === d && { color: colors.onBrandPrimary }]}>{d} min</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Button title="Start sharing" testID="start-share-btn" onPress={() => create.mutate()} loading={create.isPending} disabled={!contactId} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg },
  heroText: { flex: 1, fontSize: 14, color: c.onBrandTertiary, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 14, color: c.muted },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  contactName: { fontSize: 15, fontWeight: "600", color: c.onSurfaceSecondary, flex: 1 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  durRow: { flexDirection: "row", gap: spacing.sm },
  option: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 48, justifyContent: "center" },
  optionText: { fontSize: 15, fontWeight: "700", color: c.onSurfaceSecondary },
}));
