import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { haptic } from "@/src/components/ui";
import { getToken } from "@/src/lib/api";
import { uploadFile, fileUrl, Attachment } from "@/src/lib/upload";

export function Attachments({ value, onChange }: { value: Attachment[]; onChange: (a: Attachment[]) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [token, setTokenState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [recording, setRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => { getToken().then(setTokenState); }, []);

  const add = async (file: { uri: string; name: string; type: string }) => {
    setBusy(true); setMsg("");
    try {
      const att = await uploadFile(file);
      onChange([...value, att]);
      haptic("success");
    } catch (e: any) {
      setMsg(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = (path: string) => onChange(value.filter((a) => a.path !== path));

  const pickImage = async (fromCamera: boolean) => {
    setMsg("");
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) setMsg("Permission denied. Enable it in Settings.");
      else setMsg(fromCamera ? "Camera permission needed to take a photo." : "Photo permission needed to add an image.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (res.canceled) return;
    const a = res.assets[0];
    await add({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.mimeType || "image/jpeg" });
  };

  const pickDocument = async () => {
    setMsg("");
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    await add({ uri: a.uri, name: a.name || `document-${Date.now()}`, type: a.mimeType || "application/octet-stream" });
  };

  const startRecording = async () => {
    setMsg("");
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMsg(perm.canAskAgain ? "Microphone permission needed to record." : "Permission denied. Enable it in Settings.");
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      haptic("medium");
    } catch {
      setMsg("Couldn't start recording.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setRecording(false);
      if (recorder.uri) {
        await add({ uri: recorder.uri, name: `recording-${Date.now()}.m4a`, type: "audio/m4a" });
      }
    } catch {
      setRecording(false);
      setMsg("Couldn't save recording.");
    }
  };

  const showSettings = msg.includes("Settings");

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={s.label}>Evidence (private)</Text>
      <View style={s.btnRow}>
        <ActionBtn icon="Camera" label="Photo" onPress={() => pickImage(true)} />
        <ActionBtn icon="ImageSquare" label="Gallery" onPress={() => pickImage(false)} />
        <ActionBtn icon={recording ? "StopCircle" : "Microphone"} label={recording ? "Stop" : "Audio"} active={recording} onPress={() => (recording ? stopRecording() : startRecording())} />
        <ActionBtn icon="Paperclip" label="File" onPress={pickDocument} />
      </View>

      {busy && (
        <View style={s.busy}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={s.busyText}>Encrypting & uploading…</Text>
        </View>
      )}
      {msg ? (
        <View style={s.msgRow}>
          <Text style={s.msg}>{msg}</Text>
          {showSettings && <Pressable onPress={() => Linking.openSettings()}><Text style={s.settingsLink}>Open Settings</Text></Pressable>}
        </View>
      ) : null}

      {value.length > 0 && (
        <View style={s.list}>
          {value.map((a) => (
            <View key={a.path} style={s.item} testID={`attach-${a.kind}`}>
              {a.kind === "image" ? (
                <Image source={{ uri: fileUrl(a.path, token) }} style={s.thumb} contentFit="cover" />
              ) : a.kind === "audio" ? (
                <AudioItem url={fileUrl(a.path, token)} />
              ) : (
                <View style={s.docIcon}><Icon name="FileText" size={24} color={colors.brandPrimary} weight="duotone" /></View>
              )}
              <Text style={s.itemName} numberOfLines={1}>{a.name}</Text>
              <Pressable testID={`remove-${a.path}`} onPress={() => remove(a.path)} hitSlop={8} style={s.removeBtn}>
                <Icon name="X" size={16} color={colors.onError} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, onPress, active }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={`add-${label}`} onPress={() => { haptic("light"); onPress(); }} style={[s.actionBtn, active && { backgroundColor: colors.error, borderColor: colors.error }]}>
      <Icon name={icon} size={22} color={active ? colors.onError : colors.brandPrimary} weight="duotone" />
      <Text style={[s.actionLabel, active && { color: colors.onError }]}>{label}</Text>
    </Pressable>
  );
}

function AudioItem({ url }: { url: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); }
    else {
      try { player.seekTo(0); } catch {}
      player.play();
      setPlaying(true);
    }
  };
  return (
    <Pressable testID="audio-play" onPress={toggle} style={s.audioBtn}>
      <Icon name={playing ? "Pause" : "Play"} size={22} color={colors.onBrandPrimary} weight="fill" />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  btnRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, alignItems: "center", gap: 4, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  actionLabel: { fontSize: 12, fontWeight: "700", color: c.onSurfaceSecondary },
  busy: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  busyText: { fontSize: 14, color: c.muted },
  msgRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  msg: { fontSize: 13, color: c.error, fontWeight: "600" },
  settingsLink: { fontSize: 13, color: c.brandPrimary, fontWeight: "700" },
  list: { gap: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.surfaceTertiary },
  docIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  audioBtn: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  itemName: { flex: 1, fontSize: 14, color: c.onSurfaceSecondary },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.error, alignItems: "center", justifyContent: "center" },
}));
