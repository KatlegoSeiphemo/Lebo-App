import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Button, Field, Chip, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";
import { INCIDENT_CATEGORIES } from "@/src/lib/status";

export default function IncidentNew() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [category, setCategory] = useState("Harassment");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [people, setPeople] = useState("");

  const existing = useQuery({ queryKey: ["incident", id], queryFn: () => api.get(`/incidents/${id}`), enabled: editing });
  useEffect(() => {
    if (existing.data) {
      setCategory(existing.data.category);
      setDescription(existing.data.description);
      setLocation(existing.data.location || "");
      setPeople(existing.data.peopleInvolved || "");
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = { category, description, location, peopleInvolved: people, media: existing.data?.media || [] };
      return editing ? api.put(`/incidents/${id}`, body) : api.post("/incidents", body);
    },
    onSuccess: () => { haptic("success"); qc.invalidateQueries({ queryKey: ["incidents"] }); router.back(); },
  });
  const del = useMutation({
    mutationFn: () => api.del(`/incidents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["incidents"] }); router.back(); },
  });

  return (
    <View style={s.root}>
      <ScreenHeader title={editing ? "Edit entry" : "New incident"} right={
        editing ? <Pressable testID="delete-incident" onPress={() => del.mutate()} hitSlop={10}><Icon name="Trash" size={22} color={colors.error} /></Pressable> : undefined
      } />
      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={s.privateNote}>
          <Icon name="LockSimple" size={18} color={colors.onBrandTertiary} weight="fill" />
          <Text style={s.privateText}>This entry is private and timestamped automatically.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.label}>Category</Text>
          <View style={s.chips}>
            {INCIDENT_CATEGORIES.map((cat) => (
              <Chip key={cat} testID={`icat-${cat}`} label={cat} active={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </View>
        </View>

        <Field label="What happened?" testID="i-desc" value={description} onChangeText={setDescription} placeholder="Describe the incident in your own words…" multiline style={s.textArea} />
        <Field label="Location (optional)" testID="i-loc" value={location} onChangeText={setLocation} placeholder="Where did this happen?" />
        <Field label="People involved (optional)" testID="i-people" value={people} onChangeText={setPeople} placeholder="Names or descriptions" />

        <Button title={editing ? "Save changes" : "Save entry"} testID="save-incident" onPress={() => save.mutate()} loading={save.isPending} disabled={!description.trim()} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  privateNote: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.brandTertiary, borderRadius: radius.md, padding: spacing.md },
  privateText: { fontSize: 13, color: c.onBrandTertiary, flex: 1 },
  label: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  textArea: { minHeight: 120, textAlignVertical: "top", paddingTop: spacing.md },
}));
