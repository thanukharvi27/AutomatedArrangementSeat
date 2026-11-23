import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, shadows } from "../../theme/colors";

export default function SplashScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCard, isDesktop && styles.mainCardDesktop]}>
          {/* Top Institutional Badge */}
          <View style={styles.institutionBadge}>
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.institutionBadgeText}>
              CAMPUS EXAMINATION CELL
            </Text>
          </View>

          {/* Logo & Emblem */}
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Ionicons name="school" size={36} color="#FFFFFF" />
            </View>
          </View>

          {/* Title & Tagline */}
          <Text style={styles.brandTitle}>ExamEase</Text>
          <Text style={styles.brandSubtitle}>
            Automated Exam Seating Arrangement System
          </Text>
          <Text style={styles.brandTagline}>
            Intelligent anti-collision seating allocation, hall utilization optimization & instant USN lookup.
          </Text>

          {/* Features Grid */}
          <View style={styles.featuresRow}>
            <View style={styles.featurePill}>
              <Ionicons name="flash-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.featurePillText}>Auto Allocation Engine</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="shield-outline" size={14} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.featurePillText}>Zero Branch Overlap</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="search-outline" size={14} color={colors.info} style={{ marginRight: 6 }} />
              <Text style={styles.featurePillText}>Instant USN Search</Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Sign In to Portal</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressedSecondary,
              ]}
              onPress={() => navigation.navigate("PublicFindSeat")}
            >
              <Ionicons name="search-outline" size={17} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>Quick Seat Search (No Login)</Text>
            </Pressable>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            ExamEase Enterprise • Academic Year 2025–26
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContentDesktop: {
    paddingVertical: 48,
  },
  mainCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: "center",
    ...shadows.md,
  },
  mainCardDesktop: {
    padding: 40,
  },
  institutionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    marginBottom: 20,
  },
  institutionBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  logoRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  logoInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.base,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  featuresRow: {
    width: "100%",
    gap: 8,
    marginBottom: 26,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
    marginBottom: 20,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    height: 46,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  btnPressed: {
    backgroundColor: colors.primaryDark,
  },
  btnPressedSecondary: {
    backgroundColor: colors.border,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
});
