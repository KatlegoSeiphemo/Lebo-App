import React from "react";
import { Text } from "react-native";
import * as Phosphor from "phosphor-react-native";
import { useTheme } from "@/src/theme";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
};

export function Icon({ name, size = 24, color, weight = "regular" }: IconProps) {
  const { colors } = useTheme();
  const Cmp = (Phosphor as any)[name] || Phosphor.Circle;
  return <Cmp size={size} color={color || colors.onSurface} weight={weight} />;
}

export function IconFallback() {
  return <Text>?</Text>;
}
