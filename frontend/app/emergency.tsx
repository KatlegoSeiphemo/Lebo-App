import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { makeStyles, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { SlideToConfirm } from "@/src/components/slide-to-confirm";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

export default function Emergency() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const params = useLocalSearchParams<{ trigger?: string }>();
  const [event, setEvent] = useState<any>(null);
  const [phase, setPhase] = useState<"activating" | "active" | "error">("activating");
  const [locOn, setLocOn] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const activate = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    let lat: number | undefined;
    let lng: number | undefined;
    let shareLocation = false;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.granted;
      }
      if (granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        shareLocation = true;
        setLocOn(true);
      }
    } catch {}
    try {
      const ev = await api.post("/emergency/activate", {
        trigger: params.trigger || "manual",
        lat, lng, shareLocation,
      });
      setEvent(ev);
      setPhase("active");
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["emergency-active"] });
    } catch {
      setPhase("error");
    }
  }, [params.trigger, refreshUser, qc]);

  useEffect(() => {
    activate();
  }, [activate]);

  const callServices = () => Linking.openURL("tel:10111");

  const doCancel = async () => {
    if (event?.id) {
      try { await api.post(`/emergency/${event.id}/cancel`); } catch {}
    }
    await refreshUser();
    qc.invalidateQueries({ queryKey: ["emergency-active"] });
    router.back();
  };

  const notifications = event?.notifications || [];

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.xl, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Icon name="Siren" size={44} color="#FFFFFF" weight="fill" />
          <Text style={s.title}>EMERGENCY MODE</Text>
          <Text style={s.subtitle}>
            {phase === "activating" ? "Activating emergency protocol…"
              : phase === "error" ? "Couldn't send alerts — try calling for help"
              : "Help has been requested"}
          </Text>
        </View>

        <View style={s.locBadge}>
          <Icon name={locOn ? "MapPin" : "MapPinSlash"} size={20} color="#FFFFFF" weight="fill" />
          <Text style={s.locText}>Location sharing: {locOn ? "ON" : "OFF"}</Text>
        </View>

        <View style={s.contactsBox}>
          <Text style={s.contactsTitle}>Notifying your contacts</Text>
          {phase === "activating" ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginVertical: spacing.lg }} />
          ) : notifications.length === 0 ? (
            <Text style={s.noContacts}>No emergency contacts yet. Please call for help directly.</Text>
          ) : (
            notifications.map((n: any) => (
              <View key={n.contactId} style={s.contactRow} testID={`emergency-contact-${n.contactId}`}>
                <Text style={s.contactName}>{n.contactName}</Text>
                <View style={s.notifiedTag}>
                  <Icon name="Check" size={16} color="#FFFFFF" weight="bold" />
                  <Text style={s.notifiedText}>Notified</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ flex: 1 }} />

        <View style={s.actions}>
          <Pressable testID="emergency-call" style={s.callBtn} onPress={callServices}>
            <Icon name="Phone" size={22} color="#D92D20" weight="fill" />
            <Text style={s.callText}>CALL EMERGENCY SERVICES</Text>
          </Pressable>

          <SlideToConfirm
            testID="emergency-cancel-slider"
            label="SLIDE TO CANCEL"
            color="#FFFFFF"
            onColor="#D92D20"
            onConfirm={() => setConfirmCancel(true)}
          />
        </View>
      </ScrollView>

      {confirmCancel && (
        <View style={s.overlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>Cancel emergency?</Text>
            <Text style={s.confirmBody}>Your contacts will be told the alert is cancelled. Only cancel if you are safe.</Text>
            <View style={s.confirmRow}>
              <Pressable testID="confirm-keep" style={[s.confirmBtn, s.keepBtn]} onPress={() => setConfirmCancel(false)}>
                <Text style={s.keepText}>Keep active</Text>
              </Pressable>
              <Pressable testID="confirm-cancel" style={[s.confirmBtn, s.cancelBtn]} onPress={doCancel}>
                <Text style={s.cancelText}>Yes, cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: "#D92D20" },
  header: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  title: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  subtitle: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", textAlign: "center", opacity: 0.95 },
  locBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "rgba(0,0,0,0.18)", paddingVertical: spacing.md, borderRadius: radius.md },
  locText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  contactsBox: { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  contactsTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginBottom: spacing.xs },
  noContacts: { color: "#FFFFFF", fontSize: 14, opacity: 0.9 },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  contactName: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  notifiedTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  notifiedText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  actions: { gap: spacing.md },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#FFFFFF", minHeight: 60, borderRadius: radius.md },
  callText: { color: "#D92D20", fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  confirmCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, width: "100%" },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  confirmBody: { fontSize: 15, color: c.muted, lineHeight: 22 },
  confirmRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  confirmBtn: { flex: 1, minHeight: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  keepBtn: { backgroundColor: c.surfaceTertiary },
  keepText: { color: c.onSurface, fontSize: 16, fontWeight: "700" },
  cancelBtn: { backgroundColor: c.error },
  cancelText: { color: c.onError, fontSize: 16, fontWeight: "700" },
}));
