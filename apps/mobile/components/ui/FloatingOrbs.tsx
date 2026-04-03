import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Orb {
  color: string;
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  opacity: number;
}

const ORBS: Orb[] = [
  {
    color: "#7CB87A",
    size: 280,
    startX: -60,
    startY: -40,
    driftX: 80,
    driftY: 60,
    duration: 12000,
    opacity: 0.06,
  },
  {
    color: "#D4A843",
    size: 220,
    startX: SCREEN_WIDTH - 120,
    startY: SCREEN_HEIGHT * 0.3,
    driftX: -70,
    driftY: -50,
    duration: 15000,
    opacity: 0.05,
  },
  {
    color: "#7AADCE",
    size: 200,
    startX: SCREEN_WIDTH * 0.3,
    startY: SCREEN_HEIGHT * 0.6,
    driftX: 60,
    driftY: -40,
    duration: 18000,
    opacity: 0.04,
  },
];

export default function FloatingOrbs() {
  const anims = useRef(ORBS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: ORBS[i].duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: ORBS[i].duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {ORBS.map((orb, i) => {
        const translateX = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, orb.driftX],
        });
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, orb.driftY],
        });
        const scale = anims[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.15, 1],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.orb,
              {
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size / 2,
                backgroundColor: orb.color,
                opacity: orb.opacity,
                left: orb.startX,
                top: orb.startY,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    // Blur effect via large shadow + low opacity
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 80,
    shadowOpacity: 1,
  },
});
