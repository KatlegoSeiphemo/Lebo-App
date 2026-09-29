import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";
import { SAFETY_PLAN_SECTIONS } from "@/src/lib/status";

export default function SafetyPlan() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [data, setData] = useState<Record<string, string>>({});

  const plan = useQuery({ queryKey: ["safety-plan"], queryFn: () => api.get("/safety-plan") });
  useEffect(() => { if (plan.data?.data) setData(plan.data.data); }, [plan.data]);

  const save = useMutation({
    mutationFn: () => api.put("/safety-plan", { data }),
    onSuccess: () => { haptic("success"); qc.invalidateQueries({ queryKey: ["safety-plan"] }); router.back(); },
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Safety Plan" />
      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Icon name="ClipboardText" size={34} color={colors.brandPrimary} weight="duotone" />
          <Text style={s.heroText}>A private plan for staying safe. Fill in what's useful — you can update it any time. Protected like the rest of your data.</Text>
        </View>
        {SAFETY_PLAN_SECTIONS.map((sec) => (
          <Field
            key={sec.key}
            label={sec.label}
            testID={`plan-${sec.key}`}
            value={data[sec.key] || ""}
            onChangeText={(v) => setData({ ...data, [sec.key]: v })}
            placeholder={sec.placeholder}
            multiline
            style={s.area}
          />
        ))}
        <Button title="Save safety plan" testID="save-plan" onPress={() => save.mutate()} loading={save.isPending} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg },
  heroText: { flex: 1, fontSize: 14, color: c.onBrandTertiary, lineHeight: 20 },
  area: { minHeight: 72, textAlignVertical: "top", paddingTop: spacing.md },
}));
