import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors, typography } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { confirmSignOut } from "../utils/alerts";

export const SIDEBAR_ITEMS = [
  {
    section: "OVERVIEW",
    items: [
      { name: "AdminDashboard", label: "Dashboard", icon: "grid-outline", activeIcon: "grid" },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      { name: "StudentManagement", label: "Students", icon: "people-outline", activeIcon: "people" },
      { name: "FacultyManagement", label: "Faculty", icon: "briefcase-outline", activeIcon: "briefcase" },
      { name: "DepartmentManagement", label: "Departments", icon: "business-outline", activeIcon: "business" },
      { name: "ExamManagement", label: "Exams", icon: "calendar-outline", activeIcon: "calendar" },
      { name: "HallManagement", label: "Halls & Rooms", icon: "cube-outline", activeIcon: "cube" },
    ],
  },
  {
    section: "EXAM OPERATIONS",
    items: [
      { name: "SeatingPlans", label: "Seating Plans", icon: "layers-outline", activeIcon: "layers" },
      { name: "FacultyManagement", params: { initialTab: "duties" }, label: "Invigilation", icon: "shield-checkmark-outline", activeIcon: "shield-checkmark" },
    ],
  },
  {
    section: "ANALYTICS",
    items: [
      { name: "AdminReports", label: "Reports & Charts", icon: "bar-chart-outline", activeIcon: "bar-chart" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { name: "PublicFindSeat", label: "Student Seat Search", icon: "search-outline", activeIcon: "search" },
      { name: "AdminProfile", label: "Profile", icon: "person-outline", activeIcon: "person" },
    ],
  },
];

export const AppSidebar = ({ currentRouteName, onCloseMobileDrawer }) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const handleNavigate = (item) => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
    navigation.navigate(item.name, item.params);
  };

  const handleLogout = () => {
    confirmSignOut(logout);
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="school" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.brandTextContainer}>
          <Text style={styles.brandTitle}>ExamEase</Text>
          <Text style={styles.brandSub}>EXAM MANAGEMENT</Text>
        </View>
      </View>

      {/* Navigation Sections */}
      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navScrollContent}
      >
        {SIDEBAR_ITEMS.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item, iIdx) => {
              const isActive = currentRouteName === item.name;
              return (
                <Pressable
                  key={iIdx}
                  style={({ pressed }) => [
                    styles.navItem,
                    isActive && styles.navItemActive,
                    pressed && styles.navItemPressed,
                  ]}
                  onPress={() => handleNavigate(item)}
                >
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={18}
                    color={isActive ? colors.primary : colors.textSecondary}
                    style={styles.navItemIcon}
                  />
                  <Text
                    style={[
                      styles.navItemText,
                      isActive && styles.navItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activePill} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* User Footer Profile & Sign Out */}
      <View style={styles.footer}>
        <View style={styles.userInfoRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.full_name || user?.username || "Administrator"}
            </Text>
            <Text style={styles.userRole}>
              {user?.role || "ADMIN"}
            </Text>
          </View>
          <Pressable
            style={styles.logoutBtn}
            onPress={handleLogout}
            hitSlop={8}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  navScroll: {
    flex: 1,
  },
  navScrollContent: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navItemPressed: {
    backgroundColor: colors.surfaceHover,
  },
  navItemIcon: {
    marginRight: 10,
  },
  navItemText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  navItemTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  activePill: {
    position: "absolute",
    right: 0,
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.deepNavy,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  userRole: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
