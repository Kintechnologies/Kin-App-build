import { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  Home,
  MessageCircle,
  UtensilsCrossed,
  Wallet,
  Users,
  Dumbbell,
  Settings,
} from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TABS = [
  { name: "index", label: "Home", Icon: Home },
  { name: "chat", label: "Chat", Icon: MessageCircle },
  { name: "meals", label: "Meals", Icon: UtensilsCrossed },
  { name: "budget", label: "Budget", Icon: Wallet },
  { name: "family", label: "Family", Icon: Users },
  { name: "fitness", label: "Fitness", Icon: Dumbbell },
  { name: "settings", label: "Settings", Icon: Settings },
];

function TabBarItem({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0.35)).current;
  const dotScale = useRef(new Animated.Value(active ? 1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: active ? 1 : 0.35,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(dotScale, {
        toValue: active ? 1 : 0,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dotOpacity, {
        toValue: active ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.9,
        damping: 15,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 15,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }

  return (
    <Pressable onPress={handlePress} style={styles.tabItem}>
      <Animated.View style={[styles.tabItemInner, { transform: [{ scale }] }]}>
        <Animated.View style={{ opacity }}>
          <Icon
            size={22}
            color={active ? "#7CB87A" : "#F0EDE6"}
            strokeWidth={active ? 2 : 1.5}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.activeDot,
            { opacity: dotOpacity, transform: [{ scale: dotScale }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.inner}>
          {TABS.map((tab, index) => (
            <TabBarItem
              key={tab.name}
              icon={tab.Icon}
              label={tab.label}
              active={state.index === index}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: state.routes[index].key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate(state.routes[index].name);
                }
              }}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  blur: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  inner: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(20, 24, 16, 0.85)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabItemInner: {
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7CB87A",
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
