import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { SeatCard } from "../../components/SeatCard";
import { showAlert } from "../../utils/alerts";
import api from "../../services/api";

export default function FindSeatScreen({ navigation }) {
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
    <View style={styles.container}>
      <Header title="Find My Exam Seat" subtitle="Instant lookup by Student USN" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.searchBox}>
          <Text style={styles.inputLabel}>Enter Student USN</Text>
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
            <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </Pressable>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : searched && results ? (
          results.length === 0 ? (
            <View style={styles.noResultCard}>
              <Text style={styles.noResultIcon}>🔍</Text>
              <Text style={styles.noResultTitle}>No Seating Found</Text>
              <Text style={styles.noResultMsg}>
                No active published seat allocation was found for USN: {usn.toUpperCase()}. Make sure the exam seating plan has been published by an administrator.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.foundHeader}>Found {results.length} Seat Allocation(s):</Text>
              {results.map((item, idx) => (
                <SeatCard key={idx} allocation={item} />
              ))}
            </View>
          )
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 How it works</Text>
            <Text style={styles.infoText}>• Type your full University Seat Number (USN), e.g. 1MS22CS001.</Text>
            <Text style={styles.infoText}>• Get immediate details on Exam Hall, Floor, Row, and Seat Number.</Text>
            <Text style={styles.infoText}>• Direct instructions on building location and invigilator.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  searchBox: { backgroundColor: colors.surface, padding: 16, borderRadius: 14, elevation: 2, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceAlt },
  searchBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  searchBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  foundHeader: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  noResultCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: "center", marginTop: 20 },
  noResultIcon: { fontSize: 40, marginBottom: 10 },
  noResultTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  noResultMsg: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 18 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 18, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  infoTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  infoText: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
});
