import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, spacing } from "@/src/theme";
import { Icon } from "@/src/components/icon";

export function ScreenHeader({
  title,
  right,
  onBack,
  testID,
}: {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.wrap, { paddingTop: insets.top + spacing.sm }]} testID={testID}>
      <Pressable testID="header-back" hitSlop={12} onPress={() => (onBack ? onBack() : router.back())} style={s.back}>
        <Icon name="ArrowLeft" size={26} color={colors.onSurface} />
      </Pressable>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={s.right}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: spacing.md,
  },
  back: { width: 30 },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: c.onSurface },
  right: { minWidth: 30, alignItems: "flex-end" },
}));
