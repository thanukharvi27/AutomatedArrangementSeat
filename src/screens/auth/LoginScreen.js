import React, { useState, useContext } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { colors, typography } from "../../theme/colors";
import { getApiBaseUrl, setApiBaseUrl } from "../../services/api";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter both username and password.");
      return;
    }
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      Alert.alert("Sign In Failed", result.message || "Invalid credentials.");
    }
  };

  const fillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.logo}>🎓 ExamEase</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your exam seatings and schedules</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username or USN</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. admin, student1, or USN"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable style={styles.submitBtn} onPress={handleLogin} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Quick Demo Credentials:</Text>
            <View style={styles.demoRow}>
              <Pressable style={styles.demoChip} onPress={() => fillDemo("admin", "Admin@123")}>
                <Text style={styles.demoChipText}>👑 Admin</Text>
              </Pressable>
              <Pressable style={styles.demoChip} onPress={() => fillDemo("student1", "Student@123")}>
                <Text style={styles.demoChipText}>🎓 Student</Text>
              </Pressable>
              <Pressable style={styles.demoChip} onPress={() => fillDemo("faculty1", "Faculty@123")}>
                <Text style={styles.demoChipText}>👨‍🏫 Faculty</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.altBtn} onPress={() => navigation.navigate("PublicFindSeat")}>
            <Text style={styles.altBtnText}>🔍 Find My Seat by USN without Login</Text>
          </Pressable>

          <View style={styles.serverSection}>
            <Pressable onPress={() => setShowServerConfig(!showServerConfig)}>
              <Text style={styles.serverText}>
                🌐 Server: <Text style={{ color: colors.primary }}>{serverUrl}</Text> {showServerConfig ? "▲" : "▼"}
              </Text>
            </Pressable>

            {showServerConfig && (
              <View style={styles.serverConfigBox}>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrl}
                  onChangeText={(val) => {
                    setServerUrl(val);
                    setApiBaseUrl(val);
                  }}
                  placeholder="http://192.168.x.x:5000/api"
                  autoCapitalize="none"
                />
                <Text style={styles.serverHint}>
                  Using real phone? Enter your PC's Wi-Fi IP (e.g. http://172.17.5.20:5000/api). For Emulator use 10.0.2.2.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 24, fontWeight: "700", color: colors.primary, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, elevation: 3 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6, marginTop: 12 },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  submitBtn: { height: 50, backgroundColor: colors.primary, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  demoSection: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  demoTitle: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginBottom: 8 },
  demoRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  demoChip: { flex: 1, paddingVertical: 8, backgroundColor: colors.surfaceAlt, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  demoChipText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  altBtn: { marginTop: 18, alignItems: "center" },
  altBtnText: { fontSize: 13, color: colors.primaryLight, fontWeight: "600" },
  serverSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  serverText: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  serverConfigBox: { width: "100%", marginTop: 8 },
  serverInput: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.surfaceAlt },
  serverHint: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: "center" },
});
