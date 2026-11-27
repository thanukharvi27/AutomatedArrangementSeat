import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { FadeIn } from "../../components/common/Motion";
import { colors, textStyles, spacing, radii, shadows, tones } from "../../theme/tokens";
import { confirmSignOut } from "../../utils/alerts";
import { getApiBaseUrl } from "../../services/api";

export default function StudentProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const role = (user?.role || "STUDENT").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isFaculty = role === "FACULTY";

  const handleLogout = () => {
    confirmSignOut(logout);
  };

  const displayName = user?.full_name || user?.username || "ExamEase User";
  const displayUsername = user?.username || "N/A";
  const displayEmail = user?.email || "N/A";
  const displayPhone = user?.phone || user?.student_profile?.phone || "N/A";

  const departmentName =
    user?.student_profile?.department_name ||
    user?.faculty_profile?.department_name ||
    (isAdmin ? "Examination Management Cell" : "Engineering");

  const identifier =
    user?.student_profile?.usn ||
    user?.faculty_profile?.faculty_id ||
    (isAdmin ? "SYSTEM-ADMIN" : displayUsername);

  const semester = user?.student_profile?.semester;
  const academicYear = user?.student_profile?.academic_year || "2025-2026";

  const roleTone = isAdmin ? tones.blue : isFaculty ? tones.lavender : tones.mint;

  return (
    <AppLayout
      title="Account Profile"
      subtitle="Personal information & active credentials"
      currentRouteName="AdminProfile"
      actions={
        <Button
          title="Sign Out"
          variant="danger"
          size="sm"
          onPress={handleLogout}
          icon={<Ionicons name="log-out-outline" size={14} color={colors.textInverse} />}
        />
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <FadeIn delay={50}>
          <Card style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarCircle, { backgroundColor: roleTone.bg }]}>
                <Text style={[styles.avatarText, { color: roleTone.fg }]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: roleTone.bg, borderColor: roleTone.fg },
                ]}
              >
                <Text style={[styles.roleBadgeText, { color: roleTone.fg }]}>
                  {role}
                </Text>
              </View>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.identifierText}>{identifier}</Text>

            {/* Info Grid */}
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoVal}>{displayUsername}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoVal}>{displayEmail}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Contact</Text>
                <Text style={styles.infoVal}>{displayPhone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoVal}>{departmentName}</Text>
              </View>

              {semester ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Semester</Text>
                  <Text style={styles.infoVal}>Semester {semester}</Text>
                </View>
              ) : null}

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Academic Year</Text>
                <Text style={styles.infoVal}>{academicYear}</Text>
              </View>
            </View>
          </Card>
        </FadeIn>

        {/* System & Session Card */}
        <FadeIn delay={100}>
          <Card style={styles.systemCard}>
            <Text style={styles.systemHeading}>SYSTEM & SESSION INFORMATION</Text>

            <View style={styles.systemRow}>
              <View style={styles.systemIconBg}>
                <Ionicons name="server-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.systemLabel}>Backend API Endpoint</Text>
                <Text style={styles.systemValue}>{getApiBaseUrl()}</Text>
              </View>
            </View>

            <View style={styles.systemRow}>
              <View style={styles.systemIconBg}>
                <Ionicons name="hardware-chip-outline" size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.systemLabel}>Active Client Platform</Text>
                <Text style={styles.systemValue}>
                  {Platform.OS.toUpperCase()} {Platform.isPad ? "(Tablet)" : ""} • React Native
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Application Settings"
                variant="secondary"
                size="md"
                onPress={() => navigation.navigate("Settings")}
                icon={<Ionicons name="settings-outline" size={16} color={colors.text} />}
                style={{ flex: 1 }}
              />
              <Button
                title="Sign Out"
                variant="danger"
                size="md"
                onPress={handleLogout}
                icon={<Ionicons name="log-out-outline" size={16} color={colors.textInverse} />}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  scrollDesktop: {
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    padding: spacing.xl,
  },
  profileCard: {
    padding: spacing.xl,
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...textStyles.display,
    fontSize: 32,
    fontWeight: "800",
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  roleBadgeText: {
    ...textStyles.overline,
    fontSize: 9,
    fontWeight: "700",
  },
  name: {
    ...textStyles.heading,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
  },
  identifierText: {
    ...textStyles.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  infoList: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    ...textStyles.label,
    color: colors.textSecondary,
  },
  infoVal: {
    ...textStyles.body,
    fontWeight: "600",
    color: colors.text,
  },
  systemCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  systemHeading: {
    ...textStyles.overline,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  systemIconBg: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  systemLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  systemValue: {
    ...textStyles.body,
    fontWeight: "600",
    color: colors.text,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});