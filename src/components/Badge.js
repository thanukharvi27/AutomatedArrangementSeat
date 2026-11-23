import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/colors";

export const Badge = ({
  label,
  variant = "default", // "default" | "success" | "warning" | "error" | "info" | "neutral"
  size = "md", // "sm" | "md"
  dot = true,
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: colors.successLight,
          border: colors.successBorder,
          text: colors.successText,
          dotColor: colors.success,
        };
      case "warning":
        return {
          bg: colors.warningLight,
          border: colors.warningBorder,
          text: colors.warningText,
          dotColor: colors.warning,
        };
      case "error":
        return {
          bg: colors.errorLight,
          border: colors.errorBorder,
          text: colors.errorText,
          dotColor: colors.error,
        };
      case "info":
        return {
          bg: colors.infoLight,
          border: colors.infoBorder,
          text: colors.infoText,
          dotColor: colors.info,
        };
      case "neutral":
        return {
          bg: colors.surfaceAlt,
          border: colors.border,
          text: colors.textSecondary,
          dotColor: colors.textSecondary,
        };
      default:
        return {
          bg: colors.primaryLight,
          border: colors.primaryMuted,
          text: colors.primaryDark,
          dotColor: colors.primary,
        };
    }
  };

  const v = getVariantStyles();
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 8,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: v.dotColor,
              width: isSm ? 5 : 6,
              height: isSm ? 5 : 6,
              borderRadius: 3,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: v.text,
            fontSize: isSm ? typography.sizes.xs - 1 : typography.sizes.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    marginRight: 5,
  },
  text: {
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
