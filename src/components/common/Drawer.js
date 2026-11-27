import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, motion } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * Drawer Component
 * Right-side sheet that slides in and out; full width under 600px.
 */
export const Drawer = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  width = 440,
  showClose = true,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 600;
  const drawerWidth = isSmallScreen ? windowWidth : Math.min(width, windowWidth);

  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(1)).current; // 1 = off-screen, 0 = visible

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (prefersReducedMotion()) {
        slideAnim.setValue(0);
      } else {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: motion.base,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    } else if (mounted) {
      if (prefersReducedMotion()) {
        slideAnim.setValue(1);
        setMounted(false);
      } else {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: motion.fast,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          setMounted(false);
        });
      }
    }
  }, [visible]);

  if (!mounted) return null;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, drawerWidth],
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
          accessibilityLabel="Close drawer"
        />

        <Animated.View
          style={[
            styles.sheet,
            { width: drawerWidth },
            {
              transform: [{ translateX }],
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

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "100%",
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    ...shadows.popover,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 10,
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
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  scrollContent: {
    padding: 20,
  },
});
