import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, motion } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * ModalDialog Component
 * Scale 0.96→1 + fade on enter AND exit.
 * Stays mounted until exit animation finishes, and freezes content while closing.
 */
export const ModalDialog = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 480,
  showClose = true,
}) => {
  const [mounted, setMounted] = useState(visible);
  const [frozenChildren, setFrozenChildren] = useState(children);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setFrozenChildren(children);

      if (prefersReducedMotion()) {
        anim.setValue(1);
      } else {
        Animated.timing(anim, {
          toValue: 1,
          duration: motion.base,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    } else if (mounted) {
      // Exit animation
      if (prefersReducedMotion()) {
        anim.setValue(0);
        setMounted(false);
      } else {
        Animated.timing(anim, {
          toValue: 0,
          duration: motion.fast,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          setMounted(false);
        });
      }
    }
  }, [visible]);

  // Keep frozen children updated when open
  useEffect(() => {
    if (visible) {
      setFrozenChildren(children);
    }
  }, [children, visible]);

  if (!mounted) return null;

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Modal
      transparent
      visible={mounted}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close dialog"
        />

        <Animated.View
          style={[
            styles.card,
            { maxWidth },
            {
              opacity: anim,
              transform: [{ scale }],
            },
          ]}
        >
          {(title || showClose) && (
            <View style={styles.header}>
              <View style={styles.headerTextCol}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {showClose && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.body}>{frozenChildren}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    ...shadows.popover,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  body: {
    width: "100%",
  },
});
