import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, typography } from "../../theme/colors";

export default function SplashScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.logoIcon}>🎓</Text>
        </View>
        <Text style={styles.title}>ExamEase</Text>
        <Text style={styles.subtitle}>Automated Exam Seating Arrangement System</Text>
        <Text style={styles.tagline}>Smart seat allocation, zero overlap, instant USN search</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate("PublicFindSeat")}
        >
          <Text style={styles.secondaryButtonText}>Quick Seat Search (No Login)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: "space-between", padding: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255, 255, 255, 0.15)", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  logoIcon: { fontSize: 48 },
  title: { fontSize: 32, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: "500", color: "#cbd5e1", textAlign: "center", marginBottom: 12 },
  tagline: { fontSize: 13, color: "#94a3b8", textAlign: "center", paddingHorizontal: 20 },
  buttonContainer: { gap: 12, marginBottom: 20 },
  button: { height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  primaryButton: { backgroundColor: "#ffffff" },
  primaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  secondaryButton: { backgroundColor: "rgba(255, 255, 255, 0.1)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" },
  secondaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
});
