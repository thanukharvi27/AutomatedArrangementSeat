import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1528" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          {/* Institutional Badge */}
          <View style={styles.institutionBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#93c5fd" style={{ marginRight: 6 }} />
            <Text style={styles.institutionBadgeText}>
              CAMPUS EXAMINATION CELL
            </Text>
          </View>

          {/* Logo & Emblem */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoInnerCircle}>
                <Ionicons name="school" size={44} color="#60a5fa" />
              </View>
            </View>
          </View>

          {/* Brand Titles */}
          <View style={styles.titleGroup}>
            <View style={styles.brandRow}>
              <Text style={styles.brandTitle}>ExamEase</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>MOBILE</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>
              Automated Exam Seating Arrangement System
            </Text>
            <Text style={styles.brandTagline}>
              Smart seat allocation, zero department collision & instant mobile USN search.
            </Text>
          </View>

          {/* Feature Highlights */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                <Ionicons name="flash" size={16} color="#60a5fa" />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Auto Allocation Engine</Text>
                <Text style={styles.featureDesc}>Anti-cheating interleaved seating</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34d399" />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Zero Branch Overlap</Text>
                <Text style={styles.featureDesc}>Automatic room & bench balancing</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                <Ionicons name="search" size={16} color="#c084fc" />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Instant USN Seat Finder</Text>
                <Text style={styles.featureDesc}>Quick hall & bench lookup without login</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
              android_ripple={{ color: "#e2e8f0" }}
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons name="log-in-outline" size={20} color="#1e3a8a" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Sign In to Account</Text>
              <Ionicons name="arrow-forward" size={18} color="#1e3a8a" style={{ marginLeft: 6 }} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressedSecondary,
              ]}
              android_ripple={{ color: "rgba(255, 255, 255, 0.15)" }}
              onPress={() => navigation.navigate("PublicFindSeat")}
            >
              <Ionicons name="search-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>Quick Seat Search (No Login)</Text>
            </Pressable>
          </View>

          {/* Mobile Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              College Examination Portal • Academic Year 2025–26
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1528",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  mainContainer: {
    width: "100%",
    alignItems: "center",
  },
  institutionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.25)",
    marginBottom: 20,
  },
  institutionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bfdbfe",
    letterSpacing: 0.8,
  },
  logoWrapper: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(96, 165, 250, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoInnerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  titleGroup: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  versionBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#2563eb",
  },
  versionText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#93c5fd",
    textAlign: "center",
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  featuresContainer: {
    width: "100%",
    backgroundColor: "rgba(30, 41, 59, 0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  featureIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  featureDesc: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  actionsContainer: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnPressedSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ scale: 0.98 }],
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
});
