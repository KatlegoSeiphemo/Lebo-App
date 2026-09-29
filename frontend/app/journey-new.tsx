import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";

const ARRIVE = [{ label: "In 30 min", m: 30 }, { label: "In 1 hour", m: 60 }, { label: "In 2 hours", m: 120 }];

export default function JourneyNew() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [destination, setDestination] = useState("");
  const [arriveM, setArriveM] = useState(60);
  const [contactId, setContactId] = useState<string | null>(null);

  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => api.get("/emergency-contacts") });

  const create = useMutation({
    mutationFn: () => api.post("/journeys", {
      destination, expectedArrival: dayjs().add(arriveM, "minute").toISOString(),
      contactId, checkinMinutes: 30, shareLocation: true,
    }),
    onSuccess: () => { haptic("success"); qc.invalidateQueries({ queryKey: ["journeys"] }); router.back(); },
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Safe Journey" />
      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Icon name="MapTrifold" size={36} color={colors.brandPrimary} weight="duotone" />
          <Text style={s.heroText}>Share your trip with someone you trust. They're notified when you start, arrive, or run late.</Text>
        </View>

        <Field label="Where are you going?" testID="j-destination" value={destination} onChangeText={setDestination} placeholder="e.g. Home, Sandton" />

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Expected arrival</Text>
          <View style={s.row}>
            {ARRIVE.map((a) => (
              <Pressable key={a.m} testID={`arrive-${a.m}`} onPress={() => { haptic("light"); setArriveM(a.m); }}
                style={[s.option, arriveM === a.m && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                <Text style={[s.optionText, arriveM === a.m && { color: colors.onBrandPrimary }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.sub}>Arriving around {dayjs().add(arriveM, "minute").format("HH:mm")}</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Notify a contact</Text>
          {(contacts.data || []).length === 0 ? (
            <Text style={s.sub}>Add an emergency contact first to share your journey.</Text>
          ) : (
            contacts.data.map((c: any) => (
              <Pressable key={c.id} testID={`jc-${c.id}`} onPress={() => setContactId(c.id)} style={[s.contactRow, contactId === c.id && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
                <Text style={s.contactName}>{c.name}</Text>
                {contactId === c.id && <Icon name="CheckCircle" size={22} color={colors.brandPrimary} weight="fill" />}
              </Pressable>
            ))
          )}
        </View>

        <Button title="Start Safe Journey" testID="start-journey-btn" onPress={() => create.mutate()} loading={create.isPending} disabled={!destination} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg },
  heroText: { flex: 1, fontSize: 14, color: c.onBrandTertiary, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 14, color: c.muted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 48, justifyContent: "center" },
  optionText: { fontSize: 15, fontWeight: "700", color: c.onSurfaceSecondary },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  contactName: { fontSize: 16, fontWeight: "600", color: c.onSurfaceSecondary },
}));
