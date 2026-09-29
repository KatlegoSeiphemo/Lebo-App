import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, Switch, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";

const empty = {
  name: "", phone: "", relationship: "", email: "",
  canReceiveEmergency: true, canReceiveMissedCheckin: true, canReceiveLocation: true,
};

export default function Contacts() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => api.get("/emergency-contacts") });

  const save = useMutation({
    mutationFn: () => editing ? api.put(`/emergency-contacts/${editing.id}`, form) : api.post("/emergency-contacts", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); close(); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/emergency-contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const open = (c?: any) => { setEditing(c || null); setForm(c ? { ...c } : empty); setModal(true); };
  const close = () => { setModal(false); setEditing(null); setForm(empty); };

  const invite = async (c: any) => {
    try {
      const res = await api.post("/emergency-contacts/invitations", { name: c.name, phone: c.phone });
      const link = `${process.env.EXPO_PUBLIC_BACKEND_URL}/invite/${res.invitationId}`;
      await Share.share({
        message: `${res.message}\n\nTap to accept and download Lebo:\n${link}`,
      });
    } catch {}
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="Emergency Contacts" right={
        <Pressable testID="add-contact" onPress={() => open()} hitSlop={10}><Icon name="Plus" size={24} color={colors.brandPrimary} weight="bold" /></Pressable>
      } />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        {(contacts.data || []).length === 0 ? (
          <View style={s.empty}>
            <Icon name="AddressBook" size={48} color={colors.muted} weight="duotone" />
            <Text style={s.emptyText}>Add people who should be alerted if you need help.</Text>
            <Button title="Add a contact" testID="empty-add" onPress={() => open()} />
          </View>
        ) : (
          contacts.data.map((c: any, idx: number) => (
            <View key={c.id} style={s.card} testID={`contact-${c.id}`}>
              <View style={s.cardTop}>
                <View style={s.priority}><Text style={s.priorityText}>{idx + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.meta}>{c.phone}{c.relationship ? ` · ${c.relationship}` : ""}</Text>
                </View>
                <Pressable testID={`edit-${c.id}`} onPress={() => open(c)} hitSlop={8}><Icon name="PencilSimple" size={20} color={colors.muted} /></Pressable>
              </View>
              <View style={s.perms}>
                {c.canReceiveEmergency && <Perm label="Emergency alerts" />}
                {c.canReceiveMissedCheckin && <Perm label="Missed check-ins" />}
                {c.canReceiveLocation && <Perm label="Location" />}
              </View>
              <View style={s.cardActions}>
                <Pressable testID={`invite-${c.id}`} style={s.ghostBtn} onPress={() => invite(c)}>
                  <Icon name="PaperPlaneTilt" size={16} color={colors.brandPrimary} />
                  <Text style={s.ghostText}>Invite to Lebo</Text>
                </Pressable>
                <Pressable testID={`delete-${c.id}`} onPress={() => del.mutate(c.id)}>
                  <Text style={[s.ghostText, { color: colors.error }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={close}>
        <View style={s.modalRoot}>
          <Pressable style={s.backdrop} onPress={close} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{editing ? "Edit contact" : "New contact"}</Text>
            <KeyboardAwareScrollView bottomOffset={20} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              <Field label="Name" testID="c-name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Mom" />
              <Field label="Phone number" testID="c-phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="082 000 0000" keyboardType="phone-pad" />
              <Field label="Relationship" testID="c-rel" value={form.relationship} onChangeText={(v) => setForm({ ...form, relationship: v })} placeholder="e.g. Sister" />
              <Field label="Email (optional)" testID="c-email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} placeholder="optional@email.com" keyboardType="email-address" autoCapitalize="none" />
              <PermToggle label="Emergency alerts" value={form.canReceiveEmergency} onChange={(v) => setForm({ ...form, canReceiveEmergency: v })} />
              <PermToggle label="Missed check-in alerts" value={form.canReceiveMissedCheckin} onChange={(v) => setForm({ ...form, canReceiveMissedCheckin: v })} />
              <PermToggle label="Can receive my location" value={form.canReceiveLocation} onChange={(v) => setForm({ ...form, canReceiveLocation: v })} />
              <Button title={editing ? "Save changes" : "Add contact"} testID="save-contact" onPress={() => save.mutate()} loading={save.isPending} disabled={!form.name || !form.phone} />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Perm({ label }: { label: string }) {
  const s = useStyles();
  return <View style={s.permTag}><Text style={s.permText}>{label}</Text></View>;
}
function PermToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={(v) => { haptic("light"); onChange(v); }} trackColor={{ true: colors.brandPrimary, false: colors.border }} thumbColor="#FFFFFF" />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  empty: { alignItems: "center", gap: spacing.md, paddingVertical: spacing["3xl"] },
  emptyText: { fontSize: 15, color: c.muted, textAlign: "center", paddingHorizontal: spacing.xl },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  priority: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  priorityText: { color: c.onBrandTertiary, fontWeight: "800" },
  name: { fontSize: 17, fontWeight: "800", color: c.onSurfaceSecondary },
  meta: { fontSize: 14, color: c.muted, marginTop: 1 },
  perms: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  permTag: { backgroundColor: c.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  permText: { fontSize: 11, fontWeight: "600", color: c.onSurfaceTertiary },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.divider, paddingTop: spacing.md },
  ghostBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ghostText: { fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }), backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: spacing.md },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface, marginBottom: spacing.md },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: c.onSurfaceSecondary, flex: 1 },
}));
