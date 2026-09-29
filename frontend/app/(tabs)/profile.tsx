import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { haptic } from "@/src/components/ui";
import { useAuth } from "@/src/lib/auth";

type Row = { label: string; icon: string; route?: string; danger?: boolean; onPress?: () => void };

export default function Profile() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "Safety setup",
      rows: [
        { label: "Emergency Contacts", icon: "AddressBook", route: "/contacts" },
        { label: "Safety Plan", icon: "ClipboardText", route: "/safety-plan" },
        { label: "Modes", icon: "Faders", route: "/modes" },
      ],
    },
    {
      title: "Security & privacy",
      rows: [
        { label: "App Lock & Security", icon: "LockKey", route: "/settings" },
        { label: "Privacy & My Data", icon: "ShieldCheck", route: "/settings" },
      ],
    },
    {
      title: "Learn",
      rows: [
        { label: "Digital Safety", icon: "GraduationCap", route: "/digital-safety" },
      ],
    },
    {
      title: "Account",
      rows: [
        { label: "Sign out", icon: "SignOut", danger: true, onPress: signOut },
      ],
    },
  ];

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing["2xl"], gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View style={s.profileRow}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text testID="profile-name" style={s.name}>{user?.name}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Chatbot hero */}
        <Pressable testID="open-chat" style={s.hero} onPress={() => { haptic("light"); router.push("/chat"); }}>
          <Image source={{ uri: "https://images.unsplash.com/photo-1640017955477-75b58521007d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800" }} style={s.heroImg} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(26,28,25,0.2)", "rgba(26,28,25,0.85)"]} style={s.scrim} />
          <View style={s.heroContent}>
            <View style={s.heroIcon}><Icon name="ChatCircleDots" size={22} color={colors.onBrandPrimary} weight="fill" /></View>
            <Text style={s.heroTitle}>Ask Lebo</Text>
            <Text style={s.heroSub}>Safety guidance, planning help and support — any time.</Text>
          </View>
        </Pressable>

        {groups.map((g) => (
          <View key={g.title} style={{ gap: spacing.sm }}>
            <Text style={s.section}>{g.title}</Text>
            <View style={s.group}>
              {g.rows.map((r, i) => (
                <Pressable
                  key={r.label}
                  testID={`row-${r.label}`}
                  style={[s.row, i > 0 && s.rowBorder]}
                  onPress={() => { haptic("light"); r.onPress ? r.onPress() : r.route && router.push(r.route as any); }}
                >
                  <Icon name={r.icon} size={22} color={r.danger ? colors.error : colors.brandPrimary} weight="regular" />
                  <Text style={[s.rowLabel, r.danger && { color: colors.error }]}>{r.label}</Text>
                  {!r.danger && <Icon name="CaretRight" size={18} color={colors.muted} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={s.version}>Lebo · Personal Safety · South Africa</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onBrandPrimary, fontSize: 26, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: c.onSurface },
  email: { fontSize: 14, color: c.muted },
  hero: { height: 150, borderRadius: radius.lg, overflow: "hidden" },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: 2 },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  heroSub: { fontSize: 13, color: "#FFFFFF", opacity: 0.9 },
  section: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  group: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, minHeight: 52 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: c.onSurfaceSecondary },
  version: { textAlign: "center", fontSize: 12, color: c.muted, marginTop: spacing.md },
}));
