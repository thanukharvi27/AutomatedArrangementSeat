import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, textStyles, spacing, radii, shadows } from "../../theme/tokens";
import { Button } from "../../components/common/Button";
import { FadeIn } from "../../components/common/Motion";

export default function SplashScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  React.useEffect(() => {
    navigation.replace("PublicFindSeat");
  }, [navigation]);

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
        <FadeIn delay={60} style={[styles.mainCard, isDesktop && styles.mainCardDesktop]}>
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
              <Ionicons name="school" size={36} color={colors.textInverse} />
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
              <Ionicons name="search-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featurePillText}>Instant USN Search</Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              title="Sign In to Portal"
              variant="primary"
              size="lg"
              onPress={() => navigation.navigate("Login")}
              icon={<Ionicons name="log-in-outline" size={18} color={colors.textInverse} />}
              style={{ width: "100%" }}
            />

            <Button
              title="Quick Seat Search (No Login)"
              variant="outline"
              size="md"
              onPress={() => navigation.navigate("PublicFindSeat")}
              icon={<Ionicons name="search-outline" size={16} color={colors.text} />}
              style={{ width: "100%", marginTop: spacing.sm }}
            />
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            ExamEase Enterprise • Academic Year 2025–26
          </Text>
        </FadeIn>
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
    padding: spacing.lg,
  },
  scrollContentDesktop: {
    paddingVertical: spacing["3xl"],
  },
  mainCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  mainCardDesktop: {
    padding: spacing["2xl"],
  },
  institutionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    marginBottom: spacing.lg,
  },
  institutionBadgeText: {
    ...textStyles.overline,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    ...textStyles.display,
    color: colors.text,
    marginBottom: 4,
  },
  brandSubtitle: {
    ...textStyles.title,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  brandTagline: {
    ...textStyles.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  featurePillText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actionsContainer: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  footerText: {
    ...textStyles.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});