import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, typography } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { confirmSignOut } from "../utils/alerts";

export const AppHeader = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  onOpenMobileDrawer,
  isDesktop = false,
}) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleBack = onBack || (showBack ? () => navigation.goBack() : null);

  const handleLogout = () => {
    setShowProfileMenu(false);
    confirmSignOut(logout);
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {/* Mobile Hamburger Drawer Button if not desktop */}
        {!isDesktop && onOpenMobileDrawer && !handleBack && (
          <Pressable
            style={styles.iconBtn}
            onPress={onOpenMobileDrawer}
            hitSlop={8}
            accessibilityLabel="Open Navigation Menu"
          >
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
        )}

        {handleBack && (
          <Pressable
            style={styles.iconBtn}
            onPress={handleBack}
            hitSlop={8}
            accessibilityLabel="Go Back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        )}

        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {/* Right custom action if provided */}
        {rightAction}

        {/* Live System Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Online</Text>
        </View>

        {/* User Avatar Menu Button */}
        <Pressable
          style={styles.avatarBtn}
          onPress={() => setShowProfileMenu(true)}
          hitSlop={6}
          accessibilityLabel="User Profile Menu"
        >
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || "A"}
          </Text>
        </Pressable>
      </View>

      {/* User Profile Popover Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenuCard}>
            <View style={styles.profileMenuHeader}>
              <Text style={styles.profileMenuName}>
                {user?.full_name || user?.username || "Admin"}
              </Text>
              <Text style={styles.profileMenuEmail}>
                {user?.email || "admin@college.edu"}
              </Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{user?.role || "ADMIN"}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate("AdminProfile");
              }}
            >
              <Ionicons name="person-outline" size={17} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Account Profile</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate("PublicFindSeat");
              }}
            >
              <Ionicons name="search-outline" size={17} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={styles.menuItemText}>Student Seat Lookup</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={17} color={colors.error} style={{ marginRight: 10 }} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 58,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBtn: {
    padding: 6,
    marginRight: 8,
    borderRadius: 6,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.successText,
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  profileMenuCard: {
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  profileMenuHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  profileMenuName: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profileMenuEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
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
    paddingVertical: 9,
  },
  logoutItem: {
    backgroundColor: colors.errorLight,
    marginHorizontal: 8,
    borderRadius: 6,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
});
