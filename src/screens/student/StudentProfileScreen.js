import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Badge } from "../../components/Badge";
import { colors, typography, shadows } from "../../theme/colors";
import { confirmSignOut } from "../../utils/alerts";

export default function StudentProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const confirmLogout = () => {
    confirmSignOut(logout);
  };

  const role = (user?.role || "STUDENT").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isFaculty = role === "FACULTY";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topHeader}>
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {isAdmin ? "Administrator Account" : isFaculty ? "Faculty Account" : "Candidate Profile"}
        </Text>
        <Badge label={role} variant={isAdmin ? "info" : isFaculty ? "warning" : "success"} size="sm" />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || "U"}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name || user?.username}</Text>
          <Text style={styles.roleSub}>
            {role} • {user?.student_profile?.usn || user?.username}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoVal}>{user?.username || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoVal}>{user?.email || "N/A"}</Text>
          </View>

          {!isAdmin && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoVal}>
                {user?.student_profile?.department_name ||
                  user?.faculty_profile?.department_name ||
                  "Computer Science & Engineering"}
              </Text>
            </View>
          )}

          {user?.student_profile?.semester ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Semester</Text>
              <Text style={styles.infoVal}>Semester {user?.student_profile?.semester}</Text>
            </View>
          ) : null}

          <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.logoutBtnText}>Sign Out of ExamEase</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    height: 54,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
    maxWidth: 580,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    ...shadows.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: typography.weights.bold,
  },
  name: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  roleSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 20,
  },
  infoRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  logoutBtn: {
    marginTop: 24,
    width: "100%",
    height: 46,
    backgroundColor: colors.error,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#FFFFFF",
    fontWeight: typography.weights.bold,
    fontSize: 13,
  },
});
