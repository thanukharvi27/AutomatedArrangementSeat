import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, radii, shadows, motion, transition } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { confirmSignOut } from "../../utils/alerts";
import { prefersReducedMotion } from "../common/Motion";

/**
 * TopHeader Component
 * Breadcrumb, title, actions, notifications, and profile menu that animates in.
 */
export const TopHeader = ({
  title,
  subtitle,
  breadcrumb,
  showBack = false,
  onBack,
  rightAction,
  onOpenMobileDrawer,
  isDesktop = true,
}) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const role = (user?.role || "STUDENT").toUpperCase();

  const [profileOpen, setProfileOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const toggleProfile = () => {
    if (profileOpen) {
      if (prefersReducedMotion()) {
        menuAnim.setValue(0);
        setProfileOpen(false);
      } else {
        Animated.timing(menuAnim, {
          toValue: 0,
          duration: motion.fast,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => setProfileOpen(false));
      }
    } else {
      setProfileOpen(true);
      if (prefersReducedMotion()) {
        menuAnim.setValue(1);
      } else {
        Animated.timing(menuAnim, {
          toValue: 1,
          duration: motion.fast,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    }
  };

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <View style={styles.header}>
      {/* Left Area: Hamburger / Back / Title */}
      <View style={styles.leftRow}>
        {!isDesktop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={onOpenMobileDrawer}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="menu" size={20} color={colors.text} />
          </Pressable>
        )}

        {showBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack || (() => navigation.goBack())}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
        )}

        <View style={styles.titleCol}>
          {breadcrumb ? (
            <Text style={styles.breadcrumbText}>{breadcrumb}</Text>
          ) : null}
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && isDesktop ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right Area: Actions + Profile Menu */}
      <View style={styles.rightRow}>
        {rightAction}

        {/* Profile Avatar Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          onPress={toggleProfile}
          style={styles.avatarBtn}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
        </Pressable>

        {/* Profile Dropdown Menu */}
        {profileOpen && (
          <Animated.View
            style={[
              styles.profileMenu,
              {
                opacity: menuAnim,
                transform: [{ scale: menuScale }],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuName}>
                {user?.student_profile?.full_name || user?.faculty_profile?.full_name || user?.full_name || user?.username}
              </Text>
              <Text style={styles.menuEmail}>{user?.email || `${user?.username}@college.edu`}</Text>
              <View style={styles.menuRoleBadge}>
                <Text style={styles.menuRoleText}>{role}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setProfileOpen(false);
                navigation.navigate("AdminProfile");
              }}
            >
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Account Profile</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setProfileOpen(false);
                navigation.navigate("Settings");
              }}
            >
              <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setProfileOpen(false);
                confirmSignOut(logout);
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Sign Out</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    zIndex: 100,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
  },
  breadcrumbText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    position: "relative",
  },
  avatarBtn: {
    padding: 2,
    borderRadius: radii.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textInverse,
  },
  profileMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    ...shadows.popover,
  },
  menuHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  menuEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  menuRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginTop: 6,
  },
  menuRoleText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    cursor: "pointer",
  },
  menuItemDanger: {
    backgroundColor: colors.dangerLight,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    marginLeft: 8,
  },
});
