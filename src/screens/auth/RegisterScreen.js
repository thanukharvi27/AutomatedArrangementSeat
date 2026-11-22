import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { colors, typography } from "../../theme/colors";

export default function RegisterScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Student Registration</Text>
      <Text style={styles.subtitle}>Student and Faculty accounts are provisioned by the Exam Cell Administrator.</Text>
      <Pressable style={styles.btn} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.btnText}>Back to Sign In</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginVertical: 16, textAlign: "center", paddingHorizontal: 20 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10 },
  btnText: { color: "#ffffff", fontWeight: "700" },
});
