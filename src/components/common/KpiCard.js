import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { colors, tones, radii, shadows, motion, transition } from "../../theme/tokens";
import { useCountUp, FadeIn } from "./Motion";

/**
 * KpiCard Component
 * Pastel icon chip, label, large count-up number, hover lift -3px, staggered entrance.
 */
export const KpiCard = ({
  label,
  value,
  sublabel,
  icon,
  tone = "blue", // blue | lavender | mint | peach | yellow | neutral
  delay = 0,
  onPress,
  badgeText,
  badgeTone = "mint",
  style,
}) => {
  const [hovered, setHovered] = useState(false);
  const countValue = useCountUp(value);
  const toneStyle = tones[tone] || tones.blue;
  const badgeToneStyle = tones[badgeTone] || tones.mint;

  const content = (
    <View
      style={[
        styles.card,
        transition("all", motion.fast),
        hovered && Platform.OS === "web" && styles.cardHover,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: toneStyle.bg }]}>
          {icon}
        </View>
        {badgeText ? (
          <View style={[styles.badge, { backgroundColor: badgeToneStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeToneStyle.fg }]}>
              {badgeText}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.valueText}>
        {typeof value === "number" ? countValue : value}
      </Text>

      <Text style={styles.labelText} numberOfLines={1}>
        {label}
      </Text>

      {sublabel ? (
        <Text style={styles.sublabelText} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );

  return (
    <FadeIn delay={delay} style={styles.fadeWrap}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          style={({ pressed }) => [
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View
          onPointerEnter={Platform.OS === "web" ? () => setHovered(true) : undefined}
          onPointerLeave={Platform.OS === "web" ? () => setHovered(false) : undefined}
        >
          {content}
        </View>
      )}
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  fadeWrap: {
    flex: 1,
    minWidth: 150,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  cardHover: {
    transform: [{ translateY: -3 }],
    borderColor: colors.borderDark,
    ...shadows.popover,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  valueText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  sublabelText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
