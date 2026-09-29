import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

const TYPES = [
  { key: "work", label: "Work", icon: "Briefcase" },
  { key: "event", label: "Event", icon: "Confetti" },
  { key: "custom", label: "Custom", icon: "Faders" },
];
const LOC = [
  { key: "emergency", label: "Emergency only" },
  { key: "always", label: "Always share" },
  { key: "none", label: "Never share" },
];

export default function Modes() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("event");
  const [checkin, setCheckin] = useState(60);
  const [loc, setLoc] = useState("emergency");

  const modes = useQuery({ queryKey: ["modes"], queryFn: () => api.get("/modes") });

  const create = useMutation({
    mutationFn: () => api.post("/modes", { name, type, checkinMinutes: checkin, locationSharing: loc, gracePeriodMinutes: 15 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modes"] }); setModal(false); setName(""); },
  });
  const activate = useMutation({
    mutationFn: (id: string) => api.post(`/modes/${id}/activate`),
    onSuccess: async () => { haptic("success"); await refreshUser(); qc.invalidateQueries({ queryKey: ["modes"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/modes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modes"] }),
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Modes" right={<Pressable testID="add-mode" onPress={() => setModal(true)} hitSlop={10}><Icon name="Plus" size={24} color={colors.brandPrimary} weight="bold" /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Modes tune your check-ins, location sharing and contacts for different situations — like Work hours or a night out.</Text>
        {(modes.data || []).map((m: any) => (
          <View key={m.id} style={[s.card, m.active && { borderColor: colors.brandPrimary, borderWidth: 2 }]} testID={`modecard-${m.id}`}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.meta}>{cap(m.type)} · check-in {m.checkinMinutes || "—"} min · {locLabel(m.locationSharing)}</Text>
              </View>
              <Pressable testID={`del-mode-${m.id}`} onPress={() => del.mutate(m.id)} hitSlop={8}><Icon name="Trash" size={20} color={colors.muted} /></Pressable>
            </View>
            <Pressable testID={`activate-mode-${m.id}`} disabled={m.active} onPress={() => activate.mutate(m.id)} style={[s.activateBtn, { backgroundColor: m.active ? colors.brandTertiary : colors.brandPrimary }]}>
              <Text style={[s.activateText, { color: m.active ? colors.onBrandTertiary : colors.onBrandPrimary }]}>{m.active ? "Active" : "Activate"}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={() => setModal(false)} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>New mode</Text>
            <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ gap: spacing.lg }} showsVerticalScrollIndicator={false}>
              <Field label="Name" testID="m-name" value={name} onChangeText={setName} placeholder="e.g. Night out" />
              <View style={{ gap: spacing.sm }}>
                <Text style={s.fieldLabel}>Type</Text>
                <View style={s.row}>
                  {TYPES.map((t) => (
                    <Pressable key={t.key} testID={`mtype-${t.key}`} onPress={() => setType(t.key)} style={[s.pill, type === t.key && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                      <Text style={[s.pillText, type === t.key && { color: colors.onBrandPrimary }]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text style={s.fieldLabel}>Check-in interval</Text>
                <View style={s.row}>
                  {[30, 60, 120].map((v) => (
                    <Pressable key={v} testID={`mci-${v}`} onPress={() => setCheckin(v)} style={[s.pill, checkin === v && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                      <Text style={[s.pillText, checkin === v && { color: colors.onBrandPrimary }]}>{v} min</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text style={s.fieldLabel}>Location sharing</Text>
                <View style={s.row}>
                  {LOC.map((l) => (
                    <Pressable key={l.key} testID={`mloc-${l.key}`} onPress={() => setLoc(l.key)} style={[s.pill, loc === l.key && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                      <Text style={[s.pillText, loc === l.key && { color: colors.onBrandPrimary }]}>{l.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Button title="Create mode" testID="save-mode" onPress={() => create.mutate()} loading={create.isPending} disabled={!name} />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function cap(v: string) { return v.charAt(0).toUpperCase() + v.slice(1); }
function locLabel(v: string) { return v === "always" ? "always share" : v === "none" ? "no sharing" : "emergency only"; }

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  intro: { fontSize: 14, color: c.muted, lineHeight: 20 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { fontSize: 17, fontWeight: "800", color: c.onSurfaceSecondary },
  meta: { fontSize: 13, color: c.muted, marginTop: 2 },
  activateBtn: { minHeight: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  activateText: { fontSize: 14, fontWeight: "700" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: spacing.md },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface, marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.onSurfaceTertiary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 44, justifyContent: "center" },
  pillText: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary },
}));
