import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  View,
} from "react-native";
import { colors, textStyles, radii, shadows, motion, transition } from "../../theme/tokens";

export const Button = ({
  title,
  children,
  onPress,
  variant = "primary", // primary | secondary | danger | ghost | outline
  size = "md", // sm | md | lg
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  ...props
}) => {
  const [hovered, setHovered] = useState(false);

  const getVariantStyles = (pressed, isHover) => {
    switch (variant) {
      case "secondary":
        return {
          container: {
            backgroundColor: isHover ? colors.surfaceActive : colors.surfaceAlt,
            borderColor: isHover ? colors.borderDark : colors.border,
            borderWidth: 1,
          },
          text: { color: colors.text },
          spinner: colors.text,
        };
      case "danger":
        return {
          container: {
            backgroundColor: isHover ? "#C94B50" : colors.danger,
            borderColor: "transparent",
            borderWidth: 0,
            ...(isHover ? shadows.card : shadows.subtle),
          },
          text: { color: colors.textInverse },
          spinner: colors.textInverse,
        };
      case "ghost":
        return {
          container: {
            backgroundColor: isHover ? colors.surfaceHover : "transparent",
            borderColor: "transparent",
            borderWidth: 0,
          },
          text: { color: colors.textSecondary },
          spinner: colors.primary,
        };
      case "outline":
        return {
          container: {
            backgroundColor: isHover ? colors.primaryLight : "transparent",
            borderColor: colors.primary,
            borderWidth: 1,
          },
          text: { color: colors.primary },
          spinner: colors.primary,
        };
      case "primary":
      default:
        return {
          container: {
            backgroundColor: isHover ? colors.primaryHover : colors.primary,
            borderColor: "transparent",
            borderWidth: 0,
            ...(isHover ? shadows.card : shadows.subtle),
          },
          text: { color: colors.textInverse },
          spinner: colors.textInverse,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: radii.sm,
          minHeight: 32,
          fontSize: 12,
        };
      case "lg":
        return {
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: radii.lg,
          minHeight: 48,
          fontSize: 15,
        };
      case "md":
      default:
        return {
          paddingVertical: 9,
          paddingHorizontal: 16,
          borderRadius: radii.md,
          minHeight: 40,
          fontSize: 13,
        };
    }
  };

  const sizeStyle = getSizeStyles();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => {
        const v = getVariantStyles(pressed, hovered && !isDisabled);
        const shouldLift = (variant === "primary" || variant === "danger") && hovered && !isDisabled;

        return [
          styles.base,
          sizeStyle,
          v.container,
          transition("all", motion.fast),
          shouldLift && Platform.OS === "web" && {
            transform: [{ translateY: -2 }],
          },
          pressed && !isDisabled && {
            transform: [{ scale: 0.97 }],
            opacity: 0.92,
          },
          isDisabled && styles.disabled,
          style,
        ];
      }}
      {...props}
    >
      {({ pressed }) => {
        const v = getVariantStyles(pressed, hovered && !isDisabled);
        return (
          <View style={styles.contentRow}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={v.spinner}
                style={{ marginRight: (title || children) ? 8 : 0 }}
              />
            ) : icon && iconPosition === "left" ? (
              <View style={styles.iconLeft}>{icon}</View>
            ) : null}

            {children ? (
              typeof children === "string" ? (
                <Text style={[styles.text, { fontSize: sizeStyle.fontSize }, v.text, textStyle]}>
                  {children}
                </Text>
              ) : (
                children
              )
            ) : title ? (
              <Text style={[styles.text, { fontSize: sizeStyle.fontSize }, v.text, textStyle]}>
                {title}
              </Text>
            ) : null}

            {!loading && icon && iconPosition === "right" ? (
              <View style={styles.iconRight}>{icon}</View>
            ) : null}
          </View>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
  disabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
});
