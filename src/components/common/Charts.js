import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { colors, radii, textStyles, motion } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * Animated BarChart built from Views + Animated
 * data: [{ label, value, color }]
 */
export const BarChart = ({
  data = [],
  height = 140,
  barColor = colors.primary,
  maxValue,
  style,
}) => {
  const computedMax = maxValue || Math.max(1, ...data.map((d) => d.value || 0));
  const anim = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      anim.setValue(1);
    } else {
      Animated.timing(anim, {
        toValue: 1,
        duration: motion.slow,
        useNativeDriver: false,
      }).start();
    }
  }, [data]);

  return (
    <View style={[styles.chartContainer, { height }, style]}>
      <View style={styles.barArea}>
        {data.map((item, index) => {
          const ratio = Math.min(1, Math.max(0, (item.value || 0) / computedMax));
          const barHeight = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, ratio * (height - 30)],
          });

          return (
            <View key={item.label || index} style={styles.barCol}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.color || barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Animated Horizontal Bar List (HBarList)
 * data: [{ label, value, max, sublabel, color }]
 */
export const HBarList = ({
  data = [],
  defaultColor = colors.primary,
  style,
}) => {
  const anim = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      anim.setValue(1);
    } else {
      Animated.timing(anim, {
        toValue: 1,
        duration: motion.slow,
        useNativeDriver: false,
      }).start();
    }
  }, [data]);

  return (
    <View style={[styles.hbarContainer, style]}>
      {data.map((item, index) => {
        const itemMax = item.max || 100;
        const pct = Math.min(100, Math.round(((item.value || 0) / itemMax) * 100));

        const widthPercent = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", `${pct}%`],
        });

        return (
          <View key={item.label || index} style={styles.hbarItem}>
            <View style={styles.hbarTextRow}>
              <Text style={styles.hbarLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.hbarValue}>
                {item.value} / {itemMax} ({pct}%)
              </Text>
            </View>
            <View style={styles.hbarTrack}>
              <Animated.View
                style={[
                  styles.hbarFill,
                  {
                    width: widthPercent,
                    backgroundColor: item.color || defaultColor,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

/**
 * Animated StackedBar
 * segments: [{ label, value, color }]
 */
export const StackedBar = ({
  segments = [],
  height = 14,
  showLegend = true,
  style,
}) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1;
  const anim = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      anim.setValue(1);
    } else {
      Animated.timing(anim, {
        toValue: 1,
        duration: motion.slow,
        useNativeDriver: false,
      }).start();
    }
  }, [segments]);

  return (
    <View style={style}>
      <View style={[styles.stackedTrack, { height }]}>
        {segments.map((seg, idx) => {
          const ratio = Math.min(100, Math.round(((seg.value || 0) / total) * 100));
          if (ratio <= 0) return null;

          const widthPercent = anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", `${ratio}%`],
          });

          return (
            <Animated.View
              key={seg.label || idx}
              style={[
                styles.stackedSegment,
                {
                  width: widthPercent,
                  backgroundColor: seg.color || colors.primary,
                },
              ]}
            />
          );
        })}
      </View>

      {showLegend && (
        <View style={styles.legendRow}>
          {segments.map((seg, idx) => (
            <View key={seg.label || idx} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: seg.color || colors.primary },
                ]}
              />
              <Text style={styles.legendLabel}>
                {seg.label}: <Text style={styles.legendVal}>{seg.value}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Animated Meter Component (Gauge / Progress meter)
 * percent: 0..100
 */
export const Meter = ({
  percent = 0,
  height = 8,
  color = colors.primary,
  bgColor = colors.surfaceAlt,
  style,
}) => {
  const cleanPct = Math.min(100, Math.max(0, percent));
  const anim = useRef(new Animated.Value(prefersReducedMotion() ? cleanPct : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      anim.setValue(cleanPct);
    } else {
      Animated.timing(anim, {
        toValue: cleanPct,
        duration: motion.base,
        useNativeDriver: false,
      }).start();
    }
  }, [cleanPct]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.meterTrack, { height, backgroundColor: bgColor }, style]}>
      <Animated.View
        style={[
          styles.meterFill,
          {
            width,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    width: "100%",
  },
  barArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 4,
  },
  barTrack: {
    width: "100%",
    maxWidth: 28,
    height: "100%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: radii.xs,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
    fontVariant: ["tabular-nums"],
  },
  barLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  hbarContainer: {
    width: "100%",
    gap: 12,
  },
  hbarItem: {
    width: "100%",
  },
  hbarTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hbarLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  hbarValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  hbarTrack: {
    height: 7,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    overflow: "hidden",
  },
  hbarFill: {
    height: "100%",
    borderRadius: radii.xs,
  },
  stackedTrack: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xs,
    overflow: "hidden",
  },
  stackedSegment: {
    height: "100%",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  legendVal: {
    fontWeight: "600",
    color: colors.text,
  },
  meterTrack: {
    width: "100%",
    borderRadius: radii.full,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: radii.full,
  },
});
