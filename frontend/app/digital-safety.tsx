import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { DIGITAL_SAFETY } from "@/src/lib/status";

export default function DigitalSafety() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={s.root}>
      <ScreenHeader title="Digital Safety" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Simple steps to protect your accounts, devices and privacy from unwanted tracking and harassment.</Text>
        {DIGITAL_SAFETY.map((item, i) => {
          const expanded = open === i;
          return (
            <Pressable key={item.title} testID={`ds-${i}`} style={s.card} onPress={() => { haptic("light"); setOpen(expanded ? null : i); }}>
              <View style={s.cardHead}>
                <View style={s.iconWrap}><Icon name={item.icon} size={22} color={colors.brandPrimary} weight="duotone" /></View>
                <Text style={s.title}>{item.title}</Text>
                <Icon name={expanded ? "CaretUp" : "CaretDown"} size={18} color={colors.muted} />
              </View>
              {expanded && <Text style={s.body}>{item.body}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  intro: { fontSize: 15, color: c.muted, lineHeight: 22 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: c.onSurfaceSecondary },
  body: { fontSize: 15, color: c.onSurfaceTertiary, lineHeight: 22 },
}));
