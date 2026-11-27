import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, tones, radii } from "../../theme/tokens";
import { Button } from "./Button";

/**
 * EmptyState Component
 * Icon chip + action button.
 */
export const EmptyState = ({
  iconName = "albums-outline",
  title = "No items found",
  message = "No records match the current filters or query.",
  actionLabel,
  onAction,
  actionIcon,
  tone = "neutral",
  style,
}) => {
  const toneStyle = tones[tone] || tones.neutral;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconChip, { backgroundColor: toneStyle.bg }]}>
        <Ionicons name={iconName} size={28} color={toneStyle.fg} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="sm"
          icon={actionIcon}
          style={styles.actionBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    marginVertical: 12,
  },
  iconChip: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
    textAlign: "center",
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 380,
    marginBottom: 16,
  },
  actionBtn: {
    minWidth: 120,
  },
});
