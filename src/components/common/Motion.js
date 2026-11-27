import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  AccessibilityInfo,
  Pressable,
} from "react-native";
import { motion, transition } from "../../theme/tokens";

let isReducedMotionCached = false;
if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
  try {
    isReducedMotionCached = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      isReducedMotionCached = e.matches;
    });
  } catch {}
} else if (AccessibilityInfo && AccessibilityInfo.isReduceMotionEnabled) {
  AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    isReducedMotionCached = enabled;
  }).catch(() => {});
}

export const prefersReducedMotion = () => isReducedMotionCached;

/**
 * FadeIn Component
 * Fade + 10px rise with delay prop for staggering.
 */
export const FadeIn = ({
  children,
  delay = 0,
  duration = motion.base,
  distance = 10,
  style,
  ...props
}) => {
  const animValue = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      animValue.setValue(1);
      return;
    }

    const timer = setTimeout(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: animValue,
          transform: [{ translateY }],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Animated number count-up hook
 */
export const useCountUp = (target, duration = 700) => {
  const [displayValue, setDisplayValue] = useState(target);
  const targetNum = typeof target === "number" ? target : parseInt(target, 10) || 0;

  useEffect(() => {
    if (prefersReducedMotion() || typeof targetNum !== "number" || isNaN(targetNum)) {
      setDisplayValue(targetNum);
      return;
    }

    let start = 0;
    const startTime = Date.now();
    let animationFrame;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (targetNum - start) * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetNum, duration]);

  return displayValue;
};

/**
 * usePulse hook
 */
export const usePulse = (min = 0.4, max = 1, duration = 1000) => {
  const pulseAnim = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      pulseAnim.setValue(max);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: max,
          duration: duration / 2,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulseAnim, {
          toValue: min,
          duration: duration / 2,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [min, max, duration]);

  return pulseAnim;
};

/**
 * Touchable: Drop-in for TouchableOpacity with web hover lift and press scale 0.98.
 */
export const Touchable = ({
  children,
  style,
  onPress,
  disabled = false,
  lift = -2,
  ...props
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        transition("all", motion.fast),
        hovered && !disabled && Platform.OS === "web" && {
          transform: [{ translateY: lift }],
        },
        pressed && !disabled && {
          transform: [{ scale: 0.98 }],
          opacity: 0.9,
        },
        disabled && { opacity: 0.5 },
        typeof style === "function" ? style({ pressed, hovered }) : style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
};
