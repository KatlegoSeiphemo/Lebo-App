import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Platform } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { makeStyles, useTheme, spacing, radius } from "@/src/theme";
import { Icon } from "@/src/components/icon";
import { Field, haptic } from "@/src/components/ui";
import { ScreenHeader } from "@/src/components/screen-header";
import { api } from "@/src/lib/api";

const SUGGESTIONS = [
  "Help me make a safety plan",
  "What should I do if I feel followed?",
  "Find support for domestic violence",
];

export default function Chat() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const history = useQuery({ queryKey: ["chat-history"], queryFn: () => api.get("/chat/messages") });
  useEffect(() => {
    if (history.data?.length) {
      setMessages(history.data.map((m: any) => ({ role: m.role, content: m.content })));
      setSessionId(history.data[history.data.length - 1].sessionId);
    }
  }, [history.data]);

  const send = useMutation({
    mutationFn: (text: string) => api.post("/chat/message", { message: text, sessionId }),
    onSuccess: (res: any) => {
      setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    },
    onError: () => setMessages((m) => [...m, { role: "assistant", content: "I'm having trouble right now. If this is an emergency, use the red slider on Home or call 10111." }]),
  });

  const submit = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || send.isPending) return;
    haptic("light");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    send.mutate(msg);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="Ask Lebo" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={s.intro}>
                <View style={s.introIcon}><Icon name="ChatCircleDots" size={34} color={colors.brandPrimary} weight="duotone" /></View>
                <Text style={s.introTitle}>Hi, I'm Lebo</Text>
                <Text style={s.introBody}>I can help you understand safety features, build a plan and find support. I'm not a replacement for professional or emergency help.</Text>
                <View style={s.suggestions}>
                  {SUGGESTIONS.map((sug) => (
                    <Pressable key={sug} testID={`sug-${sug}`} style={s.sug} onPress={() => submit(sug)}>
                      <Text style={s.sugText}>{sug}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[s.bubble, item.role === "user" ? s.userBubble : s.botBubble]}>
              <Text style={[s.bubbleText, item.role === "user" ? { color: colors.onBrandPrimary } : { color: colors.onSurfaceSecondary }]}>{item.content}</Text>
            </View>
          )}
          ListFooterComponent={send.isPending ? <View style={[s.bubble, s.botBubble]}><ActivityIndicator color={colors.brandPrimary} /></View> : null}
        />
        <View style={[s.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Field testID="chat-input" placeholder="Type a message…" value={input} onChangeText={setInput} onSubmitEditing={() => submit()} returnKeyType="send" />
          </View>
          <Pressable testID="chat-send" style={s.sendBtn} onPress={() => submit()}>
            <Icon name="PaperPlaneRight" size={22} color={colors.onBrandPrimary} weight="fill" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  intro: { alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  introIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  introTitle: { fontSize: 22, fontWeight: "800", color: c.onSurface },
  introBody: { fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  suggestions: { gap: spacing.sm, marginTop: spacing.lg, width: "100%" },
  sug: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md },
  sugText: { fontSize: 14, fontWeight: "600", color: c.onSurfaceSecondary },
  bubble: { maxWidth: "82%", padding: spacing.md, borderRadius: radius.lg },
  userBubble: { alignSelf: "flex-end", backgroundColor: c.brandPrimary, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: "flex-start", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  sendBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
