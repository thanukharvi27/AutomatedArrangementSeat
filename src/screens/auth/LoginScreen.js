import React, { useState, useContext } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import { getApiBaseUrl, setApiBaseUrl, pingBackend, PRESET_HOSTS, HOST_LAN_IP } from "../../services/api";
import { showAlert } from "../../utils/alerts";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);

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

  const handleTestConnection = async (targetUrl) => {
    const urlToTest = targetUrl || serverUrl;
    setTestingConnection(true);
    setServerStatusMessage("Checking server connectivity...");
    try {
      const res = await pingBackend(urlToTest);
      if (res.ok) {
        setServerStatusMessage("Server connected successfully! (Status 200 OK)");
        showAlert("Server Reachable", `Successfully connected to ExamEase API at:\n${res.url}`);
      } else {
        setServerStatusMessage(`Connection failed: ${res.error}`);
        showAlert(
          "Connection Failed",
          `Could not connect to ExamEase backend at:\n${res.url}\n\nError: ${res.error}\n\nMake sure Flask is running ('python run.py') on port 5000.`
        );
      }
    } catch (e) {
      setServerStatusMessage(`Error: ${e.message}`);
    } finally {
      setTestingConnection(false);
      setTimeout(() => setServerStatusMessage(""), 6000);
    }
  };

  const handleLogin = async () => {
    if (submitting) return;

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      const msg = "Please enter both your username/USN and password.";
      setErrorMessage(msg);
      showAlert("Validation Error", msg);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const result = await login(trimmedUser, trimmedPass);
      if (!result.success) {
        const errorText = result.message || "Invalid credentials. Please verify your details.";
        setErrorMessage(errorText);
        showAlert("Sign In Failed", errorText);
      }
    } catch (err) {
      const errorText = err.message || "Could not connect to backend API server. Ensure it is running.";
      setErrorMessage(errorText);
      showAlert("Connection Error", errorText);
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
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Mobile Top Navigation & Badge */}
            <View style={styles.cardHeaderTop}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressedOpacity]}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate("Splash");
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Back to Home"
              >
                <Ionicons name="arrow-back" size={18} color="#475569" />
                <Text style={styles.backBtnText}>Home</Text>
              </Pressable>

              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>EXAMEASE MOBILE</Text>
              </View>
            </View>

            {/* Institutional Title & Emblem */}
            <View style={styles.brandingHeader}>
              <View style={styles.iconEmblem}>
                <Ionicons name="school" size={28} color="#1d4ed8" />
              </View>
              <Text style={styles.heading}>Sign In</Text>
              <Text style={styles.subheading}>
                Access your exam seatings, hall plans & duties
              </Text>
            </View>

            {/* Find My Seat Instant Callout for Students */}
            <Pressable
              style={({ pressed }) => [
                styles.seatFinderBanner,
                pressed && styles.pressedScale,
              ]}
              android_ripple={{ color: "#dcfce7" }}
              onPress={() => navigation.navigate("PublicFindSeat")}
            >
              <View style={styles.seatFinderIconBox}>
                <Ionicons name="search" size={18} color="#059669" />
              </View>
              <View style={styles.seatFinderContent}>
                <Text style={styles.seatFinderTitle}>Student Seat Lookup</Text>
                <Text style={styles.seatFinderSubtitle}>
                  Find your hall & seat by USN without signing in
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
            </Pressable>

            {/* Inline Error Message Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Mobile Form */}
            <View style={styles.form}>
              {/* Username / USN */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="person-outline" size={14} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.label}>Username or Student USN</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. admin, student1, or 1MS22CS001"
                  placeholderTextColor="#94a3b8"
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

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="lock-closed-outline" size={14} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.label}>Password</Text>
                </View>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
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
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Toggle password visibility"
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748b"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  submitting && styles.submitBtnDisabled,
                  pressed && !submitting && styles.pressedScale,
                ]}
                android_ripple={{ color: "#1e40af" }}
                onPress={handleLogin}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={[styles.submitBtnText, { marginLeft: 10 }]}>Authenticating...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  </View>
                )}
              </Pressable>

              {/* Quick Demo Credentials */}
              <View style={styles.demoSection}>
                <View style={styles.demoHeaderRow}>
                  <Ionicons name="key-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.demoSectionTitle}>DEMO ACCOUNT SHORTCUTS</Text>
                </View>
                <Text style={styles.demoSectionDesc}>
                  Tap any card to autofill login credentials:
                </Text>

                <View style={styles.demoGrid}>
                  {/* Admin */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.demoCard,
                      styles.demoCardAdmin,
                      activeDemo === "admin" && styles.demoCardActiveAdmin,
                      pressed && styles.pressedOpacity,
                    ]}
                    android_ripple={{ color: "#dbeafe" }}
                    onPress={() => fillDemo("admin", "Admin@123", "admin")}
                  >
                    <View style={[styles.demoBadgeIcon, { backgroundColor: "#dbeafe" }]}>
                      <Ionicons name="shield-checkmark" size={14} color="#1d4ed8" />
                    </View>
                    <Text style={styles.demoRoleTitle}>Admin</Text>
                    <Text style={styles.demoRoleUser}>admin</Text>
                  </Pressable>

                  {/* Faculty */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.demoCard,
                      styles.demoCardFaculty,
                      activeDemo === "faculty" && styles.demoCardActiveFaculty,
                      pressed && styles.pressedOpacity,
                    ]}
                    android_ripple={{ color: "#ede9fe" }}
                    onPress={() => fillDemo("faculty1", "Faculty@123", "faculty")}
                  >
                    <View style={[styles.demoBadgeIcon, { backgroundColor: "#ede9fe" }]}>
                      <Ionicons name="briefcase" size={14} color="#7c3aed" />
                    </View>
                    <Text style={styles.demoRoleTitle}>Faculty</Text>
                    <Text style={styles.demoRoleUser}>faculty1</Text>
                  </Pressable>

                  {/* Student */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.demoCard,
                      styles.demoCardStudent,
                      activeDemo === "student" && styles.demoCardActiveStudent,
                      pressed && styles.pressedOpacity,
                    ]}
                    android_ripple={{ color: "#d1fae5" }}
                    onPress={() => fillDemo("student1", "Student@123", "student")}
                  >
                    <View style={[styles.demoBadgeIcon, { backgroundColor: "#d1fae5" }]}>
                      <Ionicons name="school" size={14} color="#059669" />
                    </View>
                    <Text style={styles.demoRoleTitle}>Student</Text>
                    <Text style={styles.demoRoleUser}>student1</Text>
                  </Pressable>
                </View>
              </View>

              {/* Server Endpoint Settings Pill */}
              <View style={styles.serverSection}>
                <Pressable
                  style={styles.serverStatusPill}
                  onPress={() => setShowServerConfig(!showServerConfig)}
                >
                  <View style={styles.serverStatusDot} />
                  <Text style={styles.serverStatusText} numberOfLines={1}>
                    API: {serverUrl}
                  </Text>
                  <Ionicons
                    name={showServerConfig ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#64748b"
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>

                {showServerConfig && (
                  <View style={styles.serverConfigCard}>
                    <Text style={styles.serverConfigTitle}>Backend API Host</Text>
                    <TextInput
                      style={styles.serverInput}
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="http://10.0.2.2:5000/api"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    {/* Quick Preset Buttons */}
                    <Text style={styles.presetsLabel}>Quick Switch Host:</Text>
                    <View style={styles.serverPresetsRow}>
                      {PRESET_HOSTS.map((preset, idx) => {
                        const isSelected = serverUrl === preset.url;
                        return (
                          <Pressable
                            key={idx}
                            style={[
                              styles.presetChip,
                              isSelected && styles.presetChipActive,
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
                                isSelected && styles.presetChipTextActive,
                              ]}
                            >
                              {preset.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={styles.serverConfigActions}>
                      <Pressable
                        style={styles.serverSaveBtn}
                        onPress={handleSaveServerUrl}
                      >
                        <Text style={styles.serverSaveBtnText}>Save</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.serverTestBtn, testingConnection && styles.btnDisabled]}
                        onPress={() => handleTestConnection()}
                        disabled={testingConnection}
                      >
                        {testingConnection ? (
                          <ActivityIndicator size="small" color="#1e3a8a" />
                        ) : (
                          <Text style={styles.serverTestBtnText}>Test Server</Text>
                        )}
                      </Pressable>

                      <Pressable
                        style={styles.serverResetBtn}
                        onPress={() => {
                          const defaultUrl = getApiBaseUrl();
                          setServerUrl(defaultUrl);
                          setApiBaseUrl(defaultUrl);
                          setServerStatusMessage("Reset to auto-detected URL");
                          setTimeout(() => setServerStatusMessage(""), 3000);
                        }}
                      >
                        <Text style={styles.serverResetBtnText}>Auto</Text>
                      </Pressable>
                    </View>

                    {serverStatusMessage ? (
                      <Text style={styles.serverSuccessMsg}>{serverStatusMessage}</Text>
                    ) : null}

                    <Text style={styles.serverHelpText}>
                      • Android Emulator: 10.0.2.2:5000/api{"\n"}
                      • Physical Android Phone: {HOST_LAN_IP}:5000/api (same Wi-Fi){"\n"}
                      • Web Preview: localhost:5000/api
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              ExamEase Mobile • Automated Exam Seating System
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    elevation: 4,
  },
  cardHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 4,
  },
  headerBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.6,
  },
  brandingHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconEmblem: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  seatFinderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  seatFinderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  seatFinderContent: {
    flex: 1,
  },
  seatFinderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  seatFinderSubtitle: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#b91c1c",
    lineHeight: 16,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0f172a",
  },
  passwordToggle: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtn: {
    height: 50,
    backgroundColor: "#1e3a8a",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  demoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.6,
  },
  demoSectionDesc: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 10,
  },
  demoGrid: {
    flexDirection: "row",
    gap: 8,
  },
  demoCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  demoCardAdmin: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  demoCardActiveAdmin: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  demoCardFaculty: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  demoCardActiveFaculty: {
    backgroundColor: "#f5f3ff",
    borderColor: "#8b5cf6",
  },
  demoCardStudent: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  demoCardActiveStudent: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  demoBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  demoRoleTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  demoRoleUser: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  serverSection: {
    marginTop: 16,
    alignItems: "center",
  },
  serverStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxWidth: "100%",
  },
  serverStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  serverStatusText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    flexShrink: 1,
  },
  serverConfigCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginTop: 10,
  },
  serverConfigTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  serverInput: {
    height: 38,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  presetsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 8,
    marginBottom: 4,
  },
  serverPresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  presetChipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  presetChipText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  serverConfigActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  serverSaveBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
  },
  serverSaveBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  serverTestBtn: {
    flex: 1.2,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#e0e7ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  serverTestBtnText: {
    color: "#1e3a8a",
    fontSize: 11,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  serverResetBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  serverResetBtnText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  serverSuccessMsg: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  serverHelpText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 14,
    textAlign: "center",
  },
  pageFooter: {
    marginTop: 16,
    alignItems: "center",
  },
  pageFooterText: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  pressedOpacity: {
    opacity: 0.7,
  },
});
