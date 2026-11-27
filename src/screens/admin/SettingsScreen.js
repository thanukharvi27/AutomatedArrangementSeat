import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Appearance,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { colors, textStyles, radii, shadows } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { pingBackend } from "../../services/api";
import { showAlert } from "../../utils/alerts";

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { user, apiUrl, updateApiUrl } = useAuth();
  const [customUrl, setCustomUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestBackend = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await pingBackend(customUrl);
      if (res.ok) {
        setTestResult({ ok: true, message: `Connected successfully (200 OK): ${res.data?.service || "ExamEase API"}` });
        updateApiUrl(customUrl);
      } else {
        setTestResult({ ok: false, message: `Connection failed: ${res.error}` });
      }
    } catch (err) {
      setTestResult({ ok: false, message: `Error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const colorScheme = Appearance.getColorScheme() || "light";

  return (
    <AppLayout
      title="System Settings"
      subtitle="Backend network connection, account profile, and environment diagnostics"
      breadcrumb="System / Settings"
      currentRouteName="Settings"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Backend Connection */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="server-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Backend Connection</Text>
              <Text style={styles.sectionSub}>REST API URL and health ping diagnostics</Text>
            </View>
          </View>

          <Input
            label="API Base URL"
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="http://localhost:5000/api"
            style={{ marginBottom: 12 }}
          />

          <View style={styles.btnRow}>
            <Button
              title="Test Connection"
              size="sm"
              loading={testing}
              onPress={handleTestBackend}
              variant="primary"
            />
            <Button
              title="Reset to Default"
              size="sm"
              variant="secondary"
              onPress={() => {
                setCustomUrl("http://localhost:5000/api");
                updateApiUrl("http://localhost:5000/api");
                showAlert("Reset", "API URL reset to default localhost:5000/api");
              }}
            />
          </View>

          {testResult && (
            <View
              style={[
                styles.resultBox,
                testResult.ok ? styles.resultBoxSuccess : styles.resultBoxError,
              ]}
            >
              <Ionicons
                name={testResult.ok ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={testResult.ok ? colors.success : colors.danger}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.ok ? colors.successText : colors.dangerText },
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}
        </Card>

        {/* Section 2: Account Overview */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Account Profile</Text>
              <Text style={styles.sectionSub}>Current authenticated session details</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoVal}>{user?.username || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoVal}>{user?.email || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role Authority</Text>
            <Text style={[styles.infoVal, { color: colors.primaryDark }]}>
              {user?.role || "STUDENT"}
            </Text>
          </View>
        </Card>

        {/* Section 3: Appearance (Read-only) */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="color-palette-outline" size={18} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Appearance & Theme</Text>
              <Text style={styles.sectionSub}>System color scheme detection</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Theme Mode</Text>
            <Text style={styles.infoVal}>
              {colorScheme === "dark" ? "Dark Theme" : "Light Theme"} (Auto-detected from OS)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Typography</Text>
            <Text style={styles.infoVal}>Inter (Google Fonts) / System Sans</Text>
          </View>
        </Card>

        {/* Section 4: About ExamEase */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="information-circle-outline" size={18} color={colors.success} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>About ExamEase</Text>
              <Text style={styles.sectionSub}>Application build & license information</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoVal}>ExamEase v2.0 (Premium SaaS)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frontend Engine</Text>
            <Text style={styles.infoVal}>React Native 0.76 • Expo SDK 52</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backend REST API</Text>
            <Text style={styles.infoVal}>Python Flask 3.0 • SQLite / SQLAlchemy</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Academic Year</Text>
            <Text style={styles.infoVal}>2025–2026</Text>
          </View>
        </Card>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  scrollDesktop: {
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 6,
  },
  resultBoxSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  resultBoxError: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  resultText: {
    fontSize: 12,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
