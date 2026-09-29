import React, { useRef, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, spacing } from "@/src/theme";
import { Button } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

const SLIDES = [
  { icon: "ShieldStar", title: "Welcome to Lebo", body: "A calm, private safety companion for everyday life — and a fast, clear command centre when you need help." },
  { icon: "HandTap", title: "Help in one move", body: "Slide the red button on your home screen to alert your trusted contacts instantly. Voice, manual and timers all trigger the same response." },
  { icon: "Clock", title: "Safety check-ins", body: "Ask Lebo to check on you. If you don't confirm you're safe, your contacts are gently notified." },
  { icon: "Lock", title: "Private by design", body: "Your journal, plan and conversations stay yours. Add an app lock and share location only when you choose." },
];

export default function Onboarding() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const finish = async () => {
    try { await api.post("/me/onboarded"); } catch {}
    await refreshUser();
    router.replace("/");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      const to = index + 1;
      scrollRef.current?.scrollTo({ x: to * width, animated: true });
      setIndex(to);
    } else {
      finish();
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Pressable testID="skip-onboarding" style={s.skip} onPress={finish} hitSlop={12}>
        <Text style={s.skipText}>Skip</Text>
      </Pressable>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((sl) => (
          <View key={sl.title} style={[s.slide, { width }]}>
            <View style={s.iconWrap}>
              <Icon name={sl.icon} size={64} color={colors.brandPrimary} weight="duotone" />
            </View>
            <Text style={s.title}>{sl.title}</Text>
            <Text style={s.body}>{sl.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, { backgroundColor: i === index ? colors.brandPrimary : colors.border, width: i === index ? 22 : 8 }]} />
          ))}
        </View>
        <Button testID="onboarding-next" title={index === SLIDES.length - 1 ? "Get started" : "Next"} onPress={next} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  skip: { alignSelf: "flex-end", padding: spacing.lg },
  skipText: { color: c.muted, fontSize: 15, fontWeight: "600" },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.lg },
  iconWrap: {
    width: 140, height: 140, borderRadius: 40, backgroundColor: c.brandTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  body: { fontSize: 16, color: c.muted, textAlign: "center", lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginBottom: spacing.sm },
  dot: { height: 8, borderRadius: 4 },
}));
