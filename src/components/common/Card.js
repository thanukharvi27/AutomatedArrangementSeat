import React, { useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { colors, radii, shadows, motion, transition } from "../../theme/tokens";

/**
 * Card Component
 * Surface container. On web, hover darkens border and raises shadow.
 */
export const Card = ({
  children,
  style,
  hoverable = true,
  onPress,
  ...props
}) => {
  const [hovered, setHovered] = useState(false);

  const cardStyle = [
    styles.card,
    transition("all", motion.fast),
    hovered && hoverable && Platform.OS === "web" && styles.cardHover,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
        ]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      onPointerEnter={hoverable && Platform.OS === "web" ? () => setHovered(true) : undefined}
      onPointerLeave={hoverable && Platform.OS === "web" ? () => setHovered(false) : undefined}
      style={cardStyle}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  cardHover: {
    borderColor: colors.borderDark,
    ...shadows.popover,
  },
});
