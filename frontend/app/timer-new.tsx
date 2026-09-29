import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";
import { TIMER_INTERVALS } from "@/src/lib/status";
import { useAuth } from "@/src/lib/auth";

const GRACE = [5, 15, 30];

export default function TimerNew() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const [interval, setIntervalMin] = useState(120);
  const [grace, setGrace] = useState(15);

  const create = useMutation({
    mutationFn: () => api.post("/safety-timers", { intervalMinutes: interval, gracePeriodMinutes: grace }),
    onSuccess: async () => { haptic("success"); await refreshUser(); qc.invalidateQueries({ queryKey: ["timers"] }); router.back(); },
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Safety Timer" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Icon name="Timer" size={40} color={colors.brandPrimary} weight="duotone" />
          <Text style={s.heroText}>Lebo will check on you regularly. If you don't confirm you're safe, your contacts get notified.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Check on me every</Text>
          <View style={s.optionsGrid}>
            {TIMER_INTERVALS.map((o) => (
              <Pressable key={o.minutes} testID={`interval-${o.minutes}`} onPress={() => { haptic("light"); setIntervalMin(o.minutes); }}
                style={[s.option, interval === o.minutes && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                <Text style={[s.optionText, interval === o.minutes && { color: colors.onBrandPrimary }]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Grace period</Text>
          <Text style={s.sub}>Extra time to respond before your contacts are alerted.</Text>
          <View style={s.optionsGrid}>
            {GRACE.map((g) => (
              <Pressable key={g} testID={`grace-${g}`} onPress={() => { haptic("light"); setGrace(g); }}
                style={[s.option, grace === g && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                <Text style={[s.optionText, grace === g && { color: colors.onBrandPrimary }]}>{g} min</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button title="Start safety timer" testID="start-timer-btn" onPress={() => create.mutate()} loading={create.isPending} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg },
  heroText: { flex: 1, fontSize: 14, color: c.onBrandTertiary, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 14, color: c.muted, marginTop: -spacing.xs },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 48, justifyContent: "center" },
  optionText: { fontSize: 15, fontWeight: "700", color: c.onSurfaceSecondary },
}));
