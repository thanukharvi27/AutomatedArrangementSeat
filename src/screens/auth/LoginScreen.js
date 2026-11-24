import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { colors, typography, shadows } from "../../theme/colors";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  pingBackend,
  PRESET_HOSTS,
  HOST_LAN_IP,
} from "../../services/api";
import { showAlert } from "../../utils/alerts";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [serverStatusMessage, setServerStatusMessage] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [serverOnline, setServerOnline] = useState(null); // null = checking, true = online, false = offline

  const checkHealth = useCallback(async (silent = false) => {
    try {
      const res = await pingBackend();
      if (res.ok) {
        setServerOnline(true);
        setErrorMessage((prev) => (prev && prev.includes("Cannot connect") ? "" : prev));
        if (!silent) setServerStatusMessage("Server connected (200 OK)");
      } else {
        setServerOnline(false);
        if (!silent) setServerStatusMessage(`Connection failed: ${res.error}`);
      }
    } catch (e) {
      setServerOnline(false);
      if (!silent) setServerStatusMessage(`Error: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    checkHealth(true);
    const interval = setInterval(() => checkHealth(true), 8000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleTestConnection = async (targetUrl) => {
    const urlToTest = targetUrl || serverUrl;
    setTestingConnection(true);
    setServerStatusMessage("Checking server connectivity...");
    try {
      const res = await pingBackend(urlToTest);
      if (res.ok) {
        setServerOnline(true);
        setErrorMessage("");
        setServerStatusMessage("Server connected successfully! (Status 200 OK)");
        showAlert("Server Reachable", `Successfully connected to ExamEase API at:\n${res.url}`);
      } else {
        setServerOnline(false);
        setServerStatusMessage(`Connection failed: ${res.error}`);
        showAlert(
          "Connection Failed",
          `Could not connect to ExamEase backend at:\n${res.url}\n\nMake sure Flask is running ('python run.py' or RUN_EXAMEASE.bat) on port 5000.`
        );
      }
    } catch (e) {
      setServerOnline(false);
      setServerStatusMessage(`Error: ${e.message}`);
    } finally {
      setTestingConnection(false);
      setTimeout(() => setServerStatusMessage(""), 5000);
    }
  };

  const handleLogin = async () => {
    if (submitting) return;

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      const msg = "Please enter both your username/USN and password.";
      setErrorMessage(msg);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const result = await login(trimmedUser, trimmedPass);
      if (!result.success) {
        const errorText = result.message || "Invalid credentials. Please verify your details.";
        setErrorMessage(errorText);
      }
    } catch (err) {
      const errorText = err.message || "Could not connect to backend API server. Ensure it is running.";
      setErrorMessage(errorText);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (u, p, roleKey) => {
    setUsername(u);
    setPassword(p);
    setActiveDemo(roleKey);
    setErrorMessage("");
  };

  const handleSaveServerUrl = () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      showAlert("Invalid URL", "Please enter a valid backend API URL.");
      return;
    }
    setApiBaseUrl(trimmed);
    setServerStatusMessage("API URL updated successfully");
    setTimeout(() => setServerStatusMessage(""), 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isDesktop && styles.scrollContainerDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isDesktop && styles.cardDesktop]}>
            {/* Header Nav Row */}
            <View style={styles.headerNavRow}>
              <Pressable
                style={styles.backBtn}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate("Splash");
                  }
                }}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                <Text style={styles.backBtnText}>Home</Text>
              </Pressable>

              <View style={styles.systemTag}>
                <Text style={styles.systemTagText}>EXAMEASE</Text>
              </View>
            </View>

            {/* Logo & Heading */}
            <View style={styles.brandBlock}>
              <View style={styles.iconCircle}>
                <Ionicons name="school" size={26} color={colors.primary} />
              </View>
              <Text style={styles.heading}>Sign In</Text>
              <Text style={styles.subheading}>
                Access your exam seatings, hall plans & duties
              </Text>
            </View>

            {/* Find Seat Callout */}
            <Pressable
              style={styles.seatFinderCallout}
              onPress={() => navigation.navigate("PublicFindSeat")}
            >
              <View style={styles.seatFinderIcon}>
                <Ionicons name="search" size={16} color={colors.success} />
              </View>
              <View style={styles.seatFinderInfo}>
                <Text style={styles.seatFinderTitle}>Student Seat Lookup</Text>
                <Text style={styles.seatFinderSub}>Find your hall & seat by USN without signing in</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  {errorMessage.includes("Cannot connect") && (
                    <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.primary,
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          borderRadius: 6,
                          alignSelf: "flex-start",
                        }}
                        onPress={() => handleTestConnection()}
                        disabled={testingConnection}
                      >
                        {testingConnection ? (
                          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
                        ) : (
                          <Ionicons name="refresh" size={13} color="#fff" style={{ marginRight: 4 }} />
                        )}
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                          {testingConnection ? "Checking..." : "Retry Connection"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          borderRadius: 6,
                          alignSelf: "flex-start",
                        }}
                        onPress={() => setShowServerConfig(true)}
                      >
                        <Ionicons name="settings-outline" size={13} color={colors.text} style={{ marginRight: 4 }} />
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "600" }}>
                          Change Host
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username or Student USN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. admin, faculty1, or student1"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      setActiveDemo(null);
                      if (errorMessage) setErrorMessage("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      setActiveDemo(null);
                      if (errorMessage) setErrorMessage("");
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>Signing In...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  </View>
                )}
              </Pressable>

              {/* Demo Account Shortcuts */}
              <View style={styles.demoSection}>
                <Text style={styles.demoTitle}>QUICK DEMO SHORTCUTS</Text>
                <Text style={styles.demoSub}>Tap a role to autofill login credentials:</Text>

                <View style={styles.demoGrid}>
                  <Pressable
                    style={[
                      styles.demoPill,
                      activeDemo === "admin" && styles.demoPillActive,
                    ]}
                    onPress={() => fillDemo("admin", "Admin@123", "admin")}
                  >
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                    <Text style={styles.demoRole}>Admin</Text>
                    <Text style={styles.demoUser}>admin</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.demoPill,
                      activeDemo === "faculty" && styles.demoPillActive,
                    ]}
                    onPress={() => fillDemo("faculty1", "Faculty@123", "faculty")}
                  >
                    <Ionicons name="briefcase" size={13} color="#7C3AED" />
                    <Text style={styles.demoRole}>Faculty</Text>
                    <Text style={styles.demoUser}>faculty1</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.demoPill,
                      activeDemo === "student" && styles.demoPillActive,
                    ]}
                    onPress={() => fillDemo("student1", "Student@123", "student")}
                  >
                    <Ionicons name="school" size={13} color={colors.success} />
                    <Text style={styles.demoRole}>Student</Text>
                    <Text style={styles.demoUser}>student1</Text>
                  </Pressable>
                </View>
              </View>

              {/* Server Host Pill */}
              <View style={styles.serverSection}>
                <Pressable
                  style={styles.serverPill}
                  onPress={() => setShowServerConfig(!showServerConfig)}
                >
                  <View
                    style={[
                      styles.serverDot,
                      {
                        backgroundColor:
                          serverOnline === true
                            ? colors.success
                            : serverOnline === false
                            ? colors.error
                            : colors.warning,
                      },
                    ]}
                  />
                  <Text style={styles.serverPillText} numberOfLines={1}>
                    {serverOnline === true
                      ? `API Online: ${serverUrl}`
                      : serverOnline === false
                      ? `API Offline: ${serverUrl}`
                      : `API Checking: ${serverUrl}`}
                  </Text>
                  <Ionicons
                    name={showServerConfig ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={colors.textSecondary}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>

                {showServerConfig && (
                  <View style={styles.serverDrawer}>
                    <Text style={styles.drawerTitle}>Backend API Host Configuration</Text>
                    <TextInput
                      style={styles.serverInput}
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="http://localhost:5000/api"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />

                    <Text style={styles.drawerSub}>Quick Presets:</Text>
                    <View style={styles.presetRow}>
                      {PRESET_HOSTS.map((preset, idx) => (
                        <Pressable
                          key={idx}
                          style={[
                            styles.presetChip,
                            serverUrl === preset.url && styles.presetChipActive,
                          ]}
                          onPress={() => {
                            setServerUrl(preset.url);
                            setApiBaseUrl(preset.url);
                            setServerStatusMessage(`Switched to ${preset.label}`);
                            setTimeout(() => setServerStatusMessage(""), 2500);
                          }}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              serverUrl === preset.url && styles.presetChipTextActive,
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.drawerActions}>
                      <Pressable style={styles.saveHostBtn} onPress={handleSaveServerUrl}>
                        <Text style={styles.saveHostBtnText}>Save</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.testHostBtn, testingConnection && styles.btnDisabled]}
                        onPress={() => handleTestConnection()}
                        disabled={testingConnection}
                      >
                        {testingConnection ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={styles.testHostBtnText}>Test Server</Text>
                        )}
                      </Pressable>
                    </View>

                    {serverStatusMessage ? (
                      <Text style={styles.serverStatusNote}>{serverStatusMessage}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scrollContainerDesktop: {
    paddingVertical: 36,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    ...shadows.md,
  },
  cardDesktop: {
    padding: 30,
  },
  headerNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  systemTag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  systemTagText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heading: {
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
  seatFinderCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  seatFinderIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  seatFinderInfo: {
    flex: 1,
  },
  seatFinderTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.successText,
  },
  seatFinderSub: {
    fontSize: 10,
    color: colors.success,
    marginTop: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.errorText,
    lineHeight: 16,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    ...shadows.sm,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  demoSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  demoGrid: {
    flexDirection: "row",
    gap: 8,
  },
  demoPill: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  demoPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  demoRole: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 3,
  },
  demoUser: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  serverSection: {
    marginTop: 14,
    alignItems: "center",
  },
  serverPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  serverPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  serverDrawer: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 8,
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  serverInput: {
    height: 38,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
  },
  drawerSub: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  drawerActions: {
    flexDirection: "row",
    gap: 8,
  },
  saveHostBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  saveHostBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  testHostBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  testHostBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  serverStatusNote: {
    fontSize: 11,
    color: colors.success,
    marginTop: 6,
    textAlign: "center",
  },
});
