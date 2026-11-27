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
import { colors, textStyles, spacing, radii, shadows, motion, transition } from "../../theme/tokens";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  pingBackend,
  PRESET_HOSTS,
} from "../../services/api";
import { showAlert } from "../../utils/alerts";
import { Button } from "../../components/common/Button";
import { FadeIn, Touchable } from "../../components/common/Motion";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

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
          <View style={[styles.mainWrapper, isDesktop && styles.mainWrapperDesktop]}>
            {/* Desktop Brand Panel */}
            {isDesktop && (
              <FadeIn delay={50} style={styles.brandPanel}>
                <View style={styles.brandHeader}>
                  <View style={styles.brandLogoCircle}>
                    <Ionicons name="school" size={28} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.brandTitle}>ExamEase</Text>
                    <Text style={styles.brandSubtitle}>EXAMINATION PLATFORM</Text>
                  </View>
                </View>

                <View style={styles.brandPitch}>
                  <Text style={styles.pitchHeading}>
                    Modern Examination Management & Seating Automation
                  </Text>
                  <Text style={styles.pitchBody}>
                    Enterprise-grade seating allocation with zero-collision branch interleaving, automated faculty invigilation assignments, and real-time student hall tickets.
                  </Text>
                </View>

                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureTitle}>Zero-Collision Engine</Text>
                      <Text style={styles.featureDesc}>Adjacent bench separation across disciplines</Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="easel-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureTitle}>Hall Optimization</Text>
                      <Text style={styles.featureDesc}>Matrix layout support with capacity indicators</Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="search-outline" size={16} color={colors.accent} />
                    </View>
                    <View style={styles.featureTextCol}>
                      <Text style={styles.featureTitle}>Instant USN Lookup</Text>
                      <Text style={styles.featureDesc}>Public search without requiring login credentials</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.brandFooter}>
                  <Text style={styles.brandFooterText}>
                    Academic Year 2025–26 • Powered by Examination Cell
                  </Text>
                </View>
              </FadeIn>
            )}

            {/* Right Card / Mobile Card */}
            <FadeIn delay={100} style={[styles.card, isDesktop && styles.cardDesktop]}>
              {/* Header Navigation Row */}
              <View style={styles.headerNavRow}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => {
                    navigation.navigate("PublicFindSeat");
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Back to seat search"
                >
                  <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                  <Text style={styles.backBtnText}>Back to seat search</Text>
                </Pressable>

                <View style={styles.systemTag}>
                  <Text style={styles.systemTagText}>STAFF ACCESS</Text>
                </View>
              </View>

              {/* Logo & Heading */}
              <View style={styles.brandBlock}>
                {!isDesktop && (
                  <View style={styles.iconCircle}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.heading}>Staff sign in</Text>
                <Text style={styles.subheading}>
                  For administrators and faculty
                </Text>
              </View>

              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    {errorMessage.includes("Cannot connect") && (
                      <View style={{ flexDirection: "row", marginTop: spacing.sm, gap: spacing.sm }}>
                        <Button
                          title={testingConnection ? "Checking..." : "Retry"}
                          variant="primary"
                          size="sm"
                          onPress={() => handleTestConnection()}
                          loading={testingConnection}
                          icon={<Ionicons name="refresh" size={13} color={colors.textInverse} />}
                        />
                        <Button
                          title="Change Host"
                          variant="secondary"
                          size="sm"
                          onPress={() => setShowServerConfig(true)}
                          icon={<Ionicons name="settings-outline" size={13} color={colors.text} />}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Staff Username</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. admin or faculty1"
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
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      accessibilityRole="button"
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
                <Button
                  title="Sign In"
                  variant="primary"
                  size="lg"
                  onPress={handleLogin}
                  loading={submitting}
                  icon={<Ionicons name="log-in-outline" size={18} color={colors.textInverse} />}
                  style={{ marginTop: spacing.xs }}
                />

                {/* Demo Account Shortcuts (Staff Only) */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoTitle}>QUICK DEMO SHORTCUTS</Text>
                  <Text style={styles.demoSub}>Tap a role to autofill staff credentials:</Text>

                  <View style={styles.demoGrid}>
                    <Pressable
                      style={[
                        styles.demoPill,
                        activeDemo === "admin" && styles.demoPillActive,
                      ]}
                      onPress={() => fillDemo("admin", "Admin@123", "admin")}
                    >
                      <View style={[styles.demoIconBg, { backgroundColor: colors.pastelBlue }]}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                      </View>
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
                      <View style={[styles.demoIconBg, { backgroundColor: colors.pastelLavender }]}>
                        <Ionicons name="briefcase" size={14} color={colors.accent} />
                      </View>
                      <Text style={styles.demoRole}>Faculty</Text>
                      <Text style={styles.demoUser}>faculty1</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Back to Seat Search Link */}
                <Pressable
                  style={styles.backToSearchCardLink}
                  onPress={() => navigation.navigate("PublicFindSeat")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Back to exam seat search"
                >
                  <Ionicons name="search-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.backToSearchCardText}>
                    Looking for student seat allocation?{" "}
                    <Text style={styles.backToSearchCardBold}>Back to seat search →</Text>
                  </Text>
                </Pressable>

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
                              ? colors.danger
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
                        <Button
                          title="Save URL"
                          variant="secondary"
                          size="sm"
                          onPress={handleSaveServerUrl}
                        />
                        <Button
                          title="Test Server"
                          variant="outline"
                          size="sm"
                          onPress={() => handleTestConnection()}
                          loading={testingConnection}
                        />
                      </View>

                      {serverStatusMessage ? (
                        <Text style={styles.serverStatusNote}>{serverStatusMessage}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            </FadeIn>
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
    padding: spacing.md,
  },
  scrollContainerDesktop: {
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
  },
  mainWrapper: {
    width: "100%",
    maxWidth: 480,
  },
  mainWrapperDesktop: {
    maxWidth: 960,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.lg,
  },
  brandPanel: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing["2xl"],
    justifyContent: "space-between",
    ...shadows.sm,
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  brandLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    ...textStyles.heading,
    color: colors.text,
  },
  brandSubtitle: {
    ...textStyles.overline,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  brandPitch: {
    marginVertical: spacing.xl,
  },
  pitchHeading: {
    ...textStyles.title,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 26,
  },
  pitchBody: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featureList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: colors.text,
  },
  featureDesc: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  brandFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  brandFooterText: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.md,
  },
  cardDesktop: {
    flex: 1.1,
    padding: spacing["2xl"],
  },
  headerNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  backBtnText: {
    ...textStyles.label,
    color: colors.textSecondary,
  },
  systemTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.pastelBlue,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  systemTagText: {
    ...textStyles.overline,
    color: colors.primaryDark,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  heading: {
    ...textStyles.heading,
    color: colors.text,
  },
  subheading: {
    ...textStyles.subtitle,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  seatFinderCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.pastelMint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  seatFinderIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  seatFinderInfo: {
    flex: 1,
  },
  seatFinderTitle: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.successText,
  },
  seatFinderSub: {
    ...textStyles.caption,
    color: colors.successText,
    opacity: 0.85,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...textStyles.body,
    fontSize: 13,
    color: colors.dangerText,
    lineHeight: 18,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...textStyles.body,
    color: colors.text,
    height: "100%",
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  demoSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoTitle: {
    ...textStyles.overline,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  demoSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  demoGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  demoPill: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: "center",
    ...(Platform.OS === "web"
      ? {
          transitionProperty: "border-color, background-color, transform",
          transitionDuration: "150ms",
        }
      : {}),
  },
  demoPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  demoIconBg: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  demoRole: {
    ...textStyles.label,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  demoUser: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  backToSearchCardLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  backToSearchCardText: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  backToSearchCardBold: {
    fontWeight: "700",
    color: colors.primary,
  },
  serverSection: {
    marginTop: spacing.xs,
  },
  serverPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  serverDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  serverPillText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 240,
  },
  serverDrawer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  drawerTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serverInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...textStyles.body,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  drawerSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetChipText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  drawerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 4,
  },
  serverStatusNote: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
});