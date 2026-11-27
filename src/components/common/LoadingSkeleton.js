import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { colors, radii } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * LoadingSkeleton Component
 * Shimmer on web (CSS animation), Animated pulse on native.
 */
export const LoadingSkeleton = ({
  width = "100%",
  height = 20,
  borderRadius = radii.sm,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (Platform.OS === "web" || prefersReducedMotion()) {
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webSkeleton,
          { width, height, borderRadius },
          style,
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.nativeSkeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  webSkeleton: {
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  nativeSkeleton: {
    backgroundColor: colors.borderDark,
  },
});
