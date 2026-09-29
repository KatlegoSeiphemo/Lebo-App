import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/lib/auth";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user, loading, locked } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.onboarded) return <Redirect href="/onboarding" />;
  if (locked) return <Redirect href="/lock" />;
  return <Redirect href="/(tabs)" />;
}
