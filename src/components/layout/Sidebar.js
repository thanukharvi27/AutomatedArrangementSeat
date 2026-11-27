import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, radii, shadows, textStyles, motion, transition } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { confirmSignOut } from "../../utils/alerts";
import { prefersReducedMotion } from "../common/Motion";

// Module-level variable to remember the last active item position across screen mounts
let lastActivePillY = 56;
let hasRecordedFirstPill = false;

const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    roles: ["ADMIN"],
    items: [
      { name: "Dashboard", route: "AdminDashboard", icon: "grid-outline", activeIcon: "grid" },
    ],
  },
  {
    title: "MANAGEMENT",
    roles: ["ADMIN"],
    items: [
      { name: "Students", route: "StudentManagement", icon: "people-outline", activeIcon: "people" },
      { name: "Faculty", route: "FacultyManagement", icon: "briefcase-outline", activeIcon: "briefcase" },
      { name: "Departments", route: "DepartmentManagement", icon: "business-outline", activeIcon: "business" },
      { name: "Exams", route: "ExamManagement", icon: "calendar-outline", activeIcon: "calendar" },
      { name: "Halls", route: "HallManagement", icon: "easel-outline", activeIcon: "easel" },
    ],
  },
  {
    title: "EXAM OPERATIONS",
    roles: ["ADMIN", "FACULTY"],
    items: [
      { name: "Seating Plans", route: "SeatingPlans", icon: "layers-outline", activeIcon: "layers", roles: ["ADMIN"] },
      { name: "Invigilation", route: "FacultyDuties", icon: "shield-checkmark-outline", activeIcon: "shield-checkmark", roles: ["ADMIN", "FACULTY"] },
    ],
  },
  {
    title: "STUDENT PORTAL",
    roles: ["STUDENT"],
    items: [
      { name: "My Schedule", route: "StudentHome", icon: "home-outline", activeIcon: "home" },
      { name: "Exams", route: "StudentExams", icon: "calendar-outline", activeIcon: "calendar" },
      { name: "Find Seat", route: "PublicFindSeat", icon: "search-outline", activeIcon: "search" },
    ],
  },
  {
    title: "ANALYTICS",
    roles: ["ADMIN"],
    items: [
      { name: "Reports", route: "AdminReports", icon: "bar-chart-outline", activeIcon: "bar-chart" },
    ],
  },
  {
    title: "SYSTEM",
    roles: ["ADMIN", "FACULTY", "STUDENT"],
    items: [
      { name: "Settings", route: "Settings", icon: "settings-outline", activeIcon: "settings" },
      { name: "Profile", route: "AdminProfile", icon: "person-outline", activeIcon: "person" },
    ],
  },
];

export const Sidebar = ({
  currentRouteName,
  collapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer,
}) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const role = (user?.role || "STUDENT").toUpperCase();

  const [itemLayouts, setItemLayouts] = useState({});
  const pillYAnim = useRef(new Animated.Value(hasRecordedFirstPill ? lastActivePillY : 0)).current;

  // Filter sections by role
  const filteredSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => {
      const allowedRoles = item.roles || sec.roles;
      return allowedRoles.includes(role);
    }),
  })).filter((sec) => sec.items.length > 0);

  const handleItemLayout = (route, event) => {
    const { y } = event.nativeEvent.layout;
    setItemLayouts((prev) => {
      const updated = { ...prev, [route]: y };
      return updated;
    });
  };

  useEffect(() => {
    const targetY = itemLayouts[currentRouteName];
    if (typeof targetY === "number") {
      lastActivePillY = targetY;
      hasRecordedFirstPill = true;
      if (prefersReducedMotion()) {
        pillYAnim.setValue(targetY);
      } else {
        Animated.timing(pillYAnim, {
          toValue: targetY,
          duration: motion.base,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    }
  }, [currentRouteName, itemLayouts]);

  const handleNavigate = (route) => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
    navigation.navigate(route);
  };

  return (
    <View style={[styles.container, collapsed && styles.containerCollapsed]}>
      {/* Top Brand Block */}
      <View style={styles.brandRow}>
        <View style={styles.brandIconCircle}>
          <Ionicons name="school" size={20} color={colors.primary} />
        </View>
        {!collapsed && (
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>ExamEase</Text>
            <Text style={styles.brandSub}>EXAM MANAGEMENT</Text>
          </View>
        )}
      </View>

      {/* Navigation Links */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navScroll}
        style={styles.navScrollWrap}
      >
        {filteredSections.map((sec, secIdx) => (
          <View key={sec.title} style={styles.sectionBlock}>
            {!collapsed && (
              <Text style={styles.sectionHeader}>{sec.title}</Text>
            )}

            <View style={styles.sectionItems}>
              {sec.items.map((item) => {
                const isActive = item.route === currentRouteName;
                return (
                  <SidebarItem
                    key={item.route}
                    item={item}
                    isActive={isActive}
                    collapsed={collapsed}
                    onPress={() => handleNavigate(item.route)}
                    onLayout={(e) => handleItemLayout(item.route, e)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* User / Sign Out Footer */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => confirmSignOut(logout)}
          style={[styles.userRow, collapsed && styles.userRowCollapsed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>

          {!collapsed && (
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.student_profile?.full_name || user?.faculty_profile?.full_name || user?.full_name || user?.username}
              </Text>
              <Text style={styles.userRole}>{role}</Text>
            </View>
          )}

          {!collapsed && (
            <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const SidebarItem = ({
  item,
  isActive,
  collapsed,
  onPress,
  onLayout,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.navItem,
        transition("all", motion.fast),
        isActive && styles.navItemActive,
        hovered && !isActive && Platform.OS === "web" && styles.navItemHover,
        collapsed && styles.navItemCollapsed,
      ]}
    >
      <Ionicons
        name={isActive ? item.activeIcon : item.icon}
        size={18}
        color={isActive ? colors.primary : colors.textSecondary}
        style={styles.navIcon}
      />
      {!collapsed && (
        <Text
          style={[
            styles.navText,
            isActive ? styles.navTextActive : styles.navTextInactive,
          ]}
        >
          {item.name}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: "100%",
    flexDirection: "column",
  },
  containerCollapsed: {
    width: 68,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTextCol: {
    marginLeft: 12,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  navScrollWrap: {
    flex: 1,
  },
  navScroll: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 16,
  },
  sectionBlock: {
    gap: 4,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  sectionItems: {
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    cursor: "pointer",
  },
  navItemCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navItemHover: {
    backgroundColor: colors.surfaceHover,
    transform: [{ translateX: 2 }],
  },
  navIcon: {
    marginRight: 10,
  },
  navText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  navTextActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  navTextInactive: {
    color: colors.text,
    fontWeight: "500",
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    cursor: "pointer",
  },
  userRowCollapsed: {
    justifyContent: "center",
    padding: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textInverse,
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  userName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  userRole: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
