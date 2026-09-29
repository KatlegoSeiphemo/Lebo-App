import React, { useState } from "react";
import { Text, View, LayoutChangeEvent, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme, radius, spacing } from "@/src/theme";
import { Icon } from "@/src/components/icon";

const THUMB = 62;

type Props = {
  label: string;
  onConfirm: () => void;
  color?: string;
  onColor?: string;
  testID?: string;
};

export function SlideToConfirm({ label, onConfirm, color, onColor, testID }: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  const bg = color || colors.error;
  const fg = onColor || colors.onError;
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const [done, setDone] = useState(false);

  const maxX = Math.max(0, width - THUMB - 8);

  const fire = () => {
    setDone(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirm();
    setTimeout(() => {
      x.value = withSpring(0);
      setDone(false);
    }, 600);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.value = Math.min(Math.max(0, e.translationX), maxX);
    })
    .onEnd(() => {
      if (x.value > maxX * 0.75) {
        x.value = withSpring(maxX);
        runOnJS(fire)();
      } else {
        x.value = withSpring(0);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View testID={testID} style={[s.track, { backgroundColor: bg }]} onLayout={onLayout}>
      <Animated.View style={[s.fill, { backgroundColor: "rgba(255,255,255,0.22)" }, fillStyle]} />
      <Text style={[s.label, { color: fg }]} numberOfLines={1}>
        {done ? "Activating…" : label}
      </Text>
      <GestureDetector gesture={pan}>
        <Animated.View testID={`${testID}-thumb`} style={[s.thumb, thumbStyle]}>
          <Icon name="CaretDoubleRight" size={28} color={bg} weight="bold" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: {
    height: THUMB + 8,
    borderRadius: radius.pill,
    justifyContent: "center",
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  label: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    paddingLeft: THUMB / 2,
  },
  thumb: {
    position: "absolute",
    left: 4,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
}));
