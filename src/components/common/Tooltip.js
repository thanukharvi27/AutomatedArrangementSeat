import React, { useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { colors, radii, shadows, motion, transition } from "../../theme/tokens";

/**
 * Tooltip Component (Web Hover only)
 * On native, silently renders children.
 */
export const Tooltip = ({
  content,
  children,
  position = "top", // top | bottom
}) => {
  if (Platform.OS !== "web" || !content) {
    return <>{children}</>;
  }

  const [visible, setVisible] = useState(false);

  return (
    <View
      style={styles.wrapper}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <View
          style={[
            styles.tooltip,
            position === "bottom" ? styles.tooltipBottom : styles.tooltipTop,
            transition("all", motion.fast),
          ]}
        >
          <Text style={styles.text}>{content}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    display: "inline-flex",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    zIndex: 9999,
    alignSelf: "center",
    pointerEvents: "none",
    ...shadows.subtle,
  },
  tooltipTop: {
    bottom: "100%",
    marginBottom: 6,
  },
  tooltipBottom: {
    top: "100%",
    marginTop: 6,
  },
  text: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
});
