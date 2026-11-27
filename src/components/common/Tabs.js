import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { colors, radii, motion, transition } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * Tabs Component
 * Sliding underline indicator measured with onLayout.
 */
export const Tabs = ({
  tabs = [], // [{ key, label, count, icon }]
  activeKey,
  onChange,
  style,
}) => {
  const [layouts, setLayouts] = useState({});
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;

  const handleLayout = (key, event) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({ ...prev, [key]: { x, width } }));
  };

  useEffect(() => {
    const target = layouts[activeKey];
    if (target) {
      if (prefersReducedMotion()) {
        indicatorAnim.setValue(target.x);
        widthAnim.setValue(target.width);
      } else {
        Animated.parallel([
          Animated.timing(indicatorAnim, {
            toValue: target.x,
            duration: motion.base,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(widthAnim, {
            toValue: target.width,
            duration: motion.base,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]).start();
      }
    }
  }, [activeKey, layouts]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onLayout={(e) => handleLayout(tab.key, e)}
              onPress={() => onChange && onChange(tab.key)}
              style={styles.tabItem}
            >
              {tab.icon && <View style={styles.icon}>{tab.icon}</View>}
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View
                  style={[
                    styles.countChip,
                    isActive ? styles.countChipActive : styles.countChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive ? styles.countTextActive : styles.countTextInactive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Animated Underline Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              left: indicatorAnim,
              width: widthAnim,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabRow: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    cursor: "pointer",
  },
  icon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: "700",
    color: colors.primary,
  },
  tabLabelInactive: {
    fontWeight: "500",
    color: colors.textSecondary,
  },
  countChip: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  countChipActive: {
    backgroundColor: colors.primaryLight,
  },
  countChipInactive: {
    backgroundColor: colors.surfaceAlt,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  countTextActive: {
    color: colors.primaryDark,
  },
  countTextInactive: {
    color: colors.textMuted,
  },
  indicator: {
    position: "absolute",
    bottom: -1,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
