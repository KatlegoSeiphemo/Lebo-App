import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/src/theme";
import { usesNativeTabs } from "@/src/navigation";
import { Icon } from "@/src/components/icon";

const TABS: { name: string; label: string; phosphor: string; sf: string }[] = [
  { name: "index", label: "Home", phosphor: "House", sf: "house.fill" },
  { name: "safety", label: "Safety", phosphor: "ShieldStar", sf: "shield.lefthalf.filled" },
  { name: "help", label: "Find Help", phosphor: "MapPin", sf: "mappin.and.ellipse" },
  { name: "journal", label: "Journal", phosphor: "NotePencil", sf: "book.closed.fill" },
  { name: "profile", label: "Profile", phosphor: "User", sf: "person.fill" },
];

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
            <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ color, focused }) => (
              <Icon name={t.phosphor} size={24} color={color} weight={focused ? "fill" : "regular"} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
