import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import dayjs from "dayjs";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Chip, haptic } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { INCIDENT_CATEGORIES } from "@/src/lib/status";
import { usesNativeTabs } from "@/src/navigation";

export default function Journal() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState("All");

  const incidents = useQuery({ queryKey: ["incidents"], queryFn: () => api.get("/incidents") });

  useFocusEffect(React.useCallback(() => { incidents.refetch(); }, []));

  const data = (incidents.data || []).filter((i: any) => filter === "All" || i.category === filter);
  const cats = ["All", ...INCIDENT_CATEGORIES];

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={s.titleRow}>
          <Text style={s.h1}>Incident Journal</Text>
          <View style={s.privateTag}>
            <Icon name="LockSimple" size={13} color={colors.onBrandTertiary} weight="fill" />
            <Text style={s.privateText}>Private</Text>
          </View>
        </View>
        <FlatList
          horizontal
          data={cats}
          keyExtractor={(x) => x}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => <Chip testID={`jfilter-${item}`} label={item} active={filter === item} onPress={() => setFilter(item)} />}
        />
      </View>

      {data.length === 0 ? (
        <View style={s.emptyWrap}>
          <Image source={{ uri: "https://images.unsplash.com/photo-1568819297129-80fd50360f8e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600" }} style={s.emptyImg} contentFit="cover" />
          <Text style={s.emptyTitle}>Your private space</Text>
          <Text style={s.emptyBody}>Record incidents securely with a timestamp. Nobody else can see this unless you choose to share it.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable testID={`incident-${item.id}`} style={s.card} onPress={() => router.push(`/incident-new?id=${item.id}`)}>
              <View style={s.cardHead}>
                <View style={s.catBadge}><Text style={s.catText}>{item.category}</Text></View>
                <Text style={s.date}>{dayjs(item.occurredAt || item.createdAt).format("D MMM YYYY, HH:mm")}</Text>
              </View>
              <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
              {item.location ? <Text style={s.loc}><Icon name="MapPin" size={12} color={colors.muted} /> {item.location}</Text> : null}
              {item.media?.length ? (
                <View style={s.attach}><Icon name="Paperclip" size={14} color={colors.muted} /><Text style={s.attachText}>{item.media.length} attachment(s)</Text></View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <Pressable
        testID="new-incident-fab"
        style={[s.fab, { bottom: (usesNativeTabs ? insets.bottom : 0) + spacing.lg }]}
        onPress={() => { haptic("medium"); router.push("/incident-new"); }}
      >
        <Icon name="Plus" size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  h1: { fontSize: 26, fontWeight: "800", color: c.onSurface },
  privateTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  privateText: { fontSize: 11, fontWeight: "700", color: c.onBrandTertiary },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md },
  emptyImg: { width: 160, height: 160, borderRadius: radius.lg, marginBottom: spacing.md },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  emptyBody: { fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catBadge: { backgroundColor: c.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  catText: { fontSize: 12, fontWeight: "700", color: c.onSurfaceTertiary },
  date: { fontSize: 12, color: c.muted },
  desc: { fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 21 },
  loc: { fontSize: 13, color: c.muted },
  attach: { flexDirection: "row", alignItems: "center", gap: 4 },
  attachText: { fontSize: 12, color: c.muted },
  fab: { position: "absolute", right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
}));
