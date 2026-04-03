import { Tabs } from "expo-router";
import TabBar from "../../components/layout/TabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="meals" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="family" />
      <Tabs.Screen name="fitness" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
