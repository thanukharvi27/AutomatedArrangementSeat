import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, shadows } from "../../theme/colors";
import { SeatCard } from "../../components/SeatCard";
import { EmptyState } from "../../components/EmptyState";
import { showAlert } from "../../utils/alerts";
import api from "../../services/api";

export default function FindSeatScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [usn, setUsn] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const queryUsn = usn.trim().toUpperCase();
    if (!queryUsn) {
      showAlert("Input Required", "Please enter a valid Student USN.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/student-portal/find-seat?usn=${encodeURIComponent(queryUsn)}`);
      const data = res.data || res;
      if (data.success) {
        setResults(data.allocations || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      showAlert("Search Error", err?.response?.data?.message || err?.message || "Could not retrieve seating information.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Splash");
          }}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Student Seat Finder</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input Box */}
        <View style={styles.searchBox}>
          <Text style={styles.searchLabel}>Enter University Seat Number (USN)</Text>
          <Text style={styles.searchSub}>Find your allocated examination hall, floor, bench & seat number</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1MS22CS001"
              placeholderTextColor={colors.textMuted}
              value={usn}
              onChangeText={setUsn}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />
            <Pressable
              style={[styles.searchBtn, loading && styles.btnDisabled]}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.searchBtnRow}>
                  <Ionicons name="search" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.searchBtnText}>Find Seat</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : searched && results ? (
          results.length === 0 ? (
            <EmptyState
              iconName="search-outline"
              title="No Seating Found"
              message={`No active published seat allocation was found for USN: ${usn.toUpperCase()}. Make sure the exam seating plan has been published.`}
            />
          ) : (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.foundHeader}>Found {results.length} Seat Allocation(s):</Text>
              {results.map((item, idx) => (
                <SeatCard key={idx} allocation={item} />
              ))}
            </View>
          )
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 Instant Seat Lookup Guide</Text>
            <Text style={styles.infoText}>• Type your full University Seat Number (USN), e.g. 1MS22CS001.</Text>
            <Text style={styles.infoText}>• View your scheduled examination hall, floor, and allocated seat label.</Text>
            <Text style={styles.infoText}>• No account sign-in required — instant public lookup for students.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    height: 54,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  searchBox: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.sm,
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  searchSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  searchBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontWeight: typography.weights.bold,
    fontSize: 13,
  },
  foundHeader: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
