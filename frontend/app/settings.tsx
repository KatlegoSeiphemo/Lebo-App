import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Modal, Share, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

const TIMEOUTS = [
  { key: "immediate", label: "Immediately" },
  { key: "1min", label: "After 1 min" },
  { key: "5min", label: "After 5 min" },
];
const LOC_DEFAULTS = [
  { key: "emergency", label: "Emergency only" },
  { key: "always", label: "Always" },
  { key: "none", label: "Never" },
];

export default function Settings() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, signOut } = useAuth();

  const lock = user?.appLock || { enabled: false, method: "none", timeout: "immediate", hasPin: false };
  const [enabled, setEnabled] = useState(lock.enabled);
  const [method, setMethod] = useState(lock.method === "none" ? "biometric" : lock.method);
  const [timeout, setTimeoutVal] = useState(lock.timeout);
  const [pin, setPin] = useState("");
  const [savingLock, setSavingLock] = useState(false);
  const [lockMsg, setLockMsg] = useState("");

  const [analytics, setAnalytics] = useState(user?.analyticsOptIn || false);
  const [locDefault, setLocDefault] = useState(user?.locationSharingDefault || "emergency");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveLock = async () => {
    setSavingLock(true); setLockMsg("");
    try {
      const body: any = { enabled, method: enabled ? method : "none", timeout };
      if (enabled && method === "pin" && pin.length >= 4) body.pin = pin;
      await api.put("/me/app-lock", body);
      await refreshUser();
      setPin("");
      setLockMsg("Saved");
      haptic("success");
      setTimeout(() => setLockMsg(""), 2000);
    } catch (e: any) {
      setLockMsg(e.message || "Could not save");
    } finally {
      setSavingLock(false);
    }
  };

  const savePrivacy = async (patch: any) => {
    await api.put("/me", patch);
    await refreshUser();
  };

  const exportData = async () => {
    try {
      const data = await api.get("/account/export");
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {}
  };

  const doDelete = async () => {
    setDeleting(true);
    try { await api.del("/account"); } catch {}
    await signOut();
  };

  const needsPin = enabled && method === "pin" && !lock.hasPin;

  return (
    <View style={s.root}>
      <ScreenHeader title="Security & Privacy" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* App Lock */}
        <View style={{ gap: spacing.md }}>
          <Text style={s.section}>App Lock</Text>
          <View style={s.group}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Require authentication</Text>
                <Text style={s.rowSub}>Lock Lebo to protect your journal and plan</Text>
              </View>
              <Switch testID="lock-enabled" value={enabled} onValueChange={(v) => { haptic("light"); setEnabled(v); }} trackColor={{ true: colors.brandPrimary, false: colors.border }} thumbColor="#FFFFFF" />
            </View>
          </View>

          {enabled && (
            <>
              <Text style={s.subheading}>Method</Text>
              <View style={s.pillRow}>
                {["biometric", "pin"].map((m) => (
                  <Pressable key={m} testID={`method-${m}`} onPress={() => setMethod(m as any)} style={[s.pill, method === m && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                    <Icon name={m === "biometric" ? "Fingerprint" : "Password"} size={18} color={method === m ? colors.onBrandPrimary : colors.onSurfaceSecondary} />
                    <Text style={[s.pillText, method === m && { color: colors.onBrandPrimary }]}>{m === "biometric" ? "Biometric" : "PIN"}</Text>
                  </Pressable>
                ))}
              </View>
              {method === "biometric" && Platform.OS === "web" && <Text style={s.hint}>Biometrics work on your phone; here on web use a PIN.</Text>}

              {method === "pin" && (
                <Field label={lock.hasPin ? "Change PIN (leave blank to keep)" : "Set a 4-digit PIN"} testID="set-pin" value={pin} onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="••••" keyboardType="number-pad" secureTextEntry />
              )}

              <Text style={s.subheading}>Ask for it</Text>
              <View style={s.pillRow}>
                {TIMEOUTS.map((t) => (
                  <Pressable key={t.key} testID={`timeout-${t.key}`} onPress={() => setTimeoutVal(t.key as any)} style={[s.pill, timeout === t.key && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                    <Text style={[s.pillText, timeout === t.key && { color: colors.onBrandPrimary }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {lockMsg ? <Text style={s.msg}>{lockMsg}</Text> : null}
          <Button title="Save lock settings" testID="save-lock" onPress={saveLock} loading={savingLock} disabled={needsPin && pin.length < 4} />
        </View>

        {/* Privacy */}
        <View style={{ gap: spacing.md }}>
          <Text style={s.section}>Privacy</Text>
          <View style={s.group}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Share anonymous analytics</Text>
                <Text style={s.rowSub}>Helps improve Lebo. Never includes incident data.</Text>
              </View>
              <Switch testID="analytics" value={analytics} onValueChange={(v) => { setAnalytics(v); savePrivacy({ analyticsOptIn: v }); }} trackColor={{ true: colors.brandPrimary, false: colors.border }} thumbColor="#FFFFFF" />
            </View>
          </View>
          <Text style={s.subheading}>Default location sharing</Text>
          <View style={s.pillRow}>
            {LOC_DEFAULTS.map((l) => (
              <Pressable key={l.key} testID={`locdef-${l.key}`} onPress={() => { setLocDefault(l.key); savePrivacy({ locationSharingDefault: l.key }); }} style={[s.pill, locDefault === l.key && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}>
                <Text style={[s.pillText, locDefault === l.key && { color: colors.onBrandPrimary }]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* My Data */}
        <View style={{ gap: spacing.md }}>
          <Text style={s.section}>My Data</Text>
          <Pressable testID="export-data" style={s.actionRow} onPress={exportData}>
            <Icon name="DownloadSimple" size={22} color={colors.brandPrimary} />
            <Text style={s.rowLabel}>Export my data</Text>
            <Icon name="CaretRight" size={18} color={colors.muted} />
          </Pressable>
          <Pressable testID="delete-account" style={s.actionRow} onPress={() => setConfirmDelete(true)}>
            <Icon name="Trash" size={22} color={colors.error} />
            <Text style={[s.rowLabel, { color: colors.error }]}>Delete my account</Text>
            <Icon name="CaretRight" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={s.modalRoot}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>Delete account?</Text>
            <Text style={s.confirmBody}>This removes your access and data from Lebo. This can't be undone.</Text>
            <Button title="Delete permanently" testID="confirm-delete" variant="danger" onPress={doDelete} loading={deleting} />
            <Button title="Cancel" testID="cancel-delete" variant="tertiary" onPress={() => setConfirmDelete(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  section: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  subheading: { fontSize: 14, fontWeight: "700", color: c.onSurfaceTertiary },
  group: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  rowLabel: { fontSize: 16, fontWeight: "600", color: c.onSurfaceSecondary },
  rowSub: { fontSize: 13, color: c.muted, marginTop: 1 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 44 },
  pillText: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary },
  hint: { fontSize: 13, color: c.muted },
  msg: { fontSize: 14, color: c.success, fontWeight: "600" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  modalRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: spacing.xl },
  confirmCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, width: "100%" },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  confirmBody: { fontSize: 15, color: c.muted, lineHeight: 22, marginBottom: spacing.sm },
}));
