import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  TextInput,
  ViewStyle,
  StyleProp,
  TextInputProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";

function haptic(kind: "light" | "medium" | "heavy" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(
    kind === "heavy" ? Haptics.ImpactFeedbackStyle.Heavy :
    kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
  ).catch(() => {});
}

// ---------------------------------------------------------------- Button
type BtnProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "ghost";
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  haptics?: "light" | "medium" | "heavy" | "success";
};

export function Button({
  title, onPress, variant = "primary", icon, loading, disabled, testID, style, haptics = "medium",
}: BtnProps) {
  const { colors } = useTheme();
  const s = useBtnStyles();
  const map = {
    primary: { bg: colors.brandPrimary, fg: colors.onBrandPrimary },
    secondary: { bg: colors.brandSecondary, fg: colors.onBrandSecondary },
    tertiary: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
    danger: { bg: colors.error, fg: colors.onError },
    ghost: { bg: "transparent", fg: colors.brandPrimary },
  }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => { haptic(haptics); onPress(); }}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: map.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 0 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <View style={s.row}>
          {icon ? <Icon name={icon} size={20} color={map.fg} weight="bold" /> : null}
          <Text style={[s.label, { color: map.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useBtnStyles = makeStyles((c) => ({
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontSize: 16, fontWeight: "700" },
}));

// ---------------------------------------------------------------- Card
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useCardStyles();
  return <View style={[s.card, style]}>{children}</View>;
}
const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
}));

// ---------------------------------------------------------------- TextField
type FieldProps = TextInputProps & { label?: string; testID?: string };
export function Field({ label, style, testID, ...rest }: FieldProps) {
  const { colors } = useTheme();
  const s = useFieldStyles();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        testID={testID}
        placeholderTextColor={colors.muted}
        style={[s.input, style]}
        {...rest}
      />
    </View>
  );
}
const useFieldStyles = makeStyles((c) => ({
  label: { color: c.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: c.onSurface,
    minHeight: 52,
    borderWidth: 1,
    borderColor: c.border,
  },
}));

// ---------------------------------------------------------------- Chip
export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  const s = useChipStyles();
  return (
    <Pressable
      testID={testID}
      onPress={() => { haptic("light"); onPress(); }}
      style={[s.chip, { backgroundColor: active ? colors.brandPrimary : colors.surfaceTertiary, borderColor: active ? colors.brandPrimary : colors.border }]}
    >
      <Text style={[s.text, { color: active ? colors.onBrandPrimary : colors.onSurfaceTertiary }]}>{label}</Text>
    </Pressable>
  );
}
const useChipStyles = makeStyles((c) => ({
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: "600" },
}));

// ---------------------------------------------------------------- Section title
export function SectionTitle({ children }: { children: React.ReactNode }) {
  const s = useSectionStyles();
  return <Text style={s.t}>{children}</Text>;
}
const useSectionStyles = makeStyles((c) => ({
  t: { fontSize: 13, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 },
}));

export { haptic };
