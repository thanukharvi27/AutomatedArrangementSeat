import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl, Alert } from "react-native";
import { colors, typography } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import api from "../../services/api";

export default function StudentManagementScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/students?search=${encodeURIComponent(search)}&per_page=50`);
      if (res.data?.success) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.log("Error loading students:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  return (
    <View style={styles.container}>
      <Header title="Student Directory" subtitle="All registered exam candidates" showBack />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by USN or Name..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? (
        <LoadingSpinner message="Loading students..." />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} />}
          ListEmptyComponent={<EmptyState icon="🎓" title="No Students Found" message="Try searching for another USN or Name." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.usn}>{item.usn}</Text>
                <Text style={styles.dept}>{item.department_code || "DEPT"}</Text>
              </View>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.sub}>Sem {item.semester} • Section {item.section || "A"} • {item.email}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.surfaceAlt, fontSize: 14, color: colors.text },
  list: { padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  usn: { fontSize: 13, fontWeight: "700", color: colors.primary },
  dept: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  name: { fontSize: 15, fontWeight: "600", color: colors.text, marginVertical: 4 },
  sub: { fontSize: 12, color: colors.textMuted },
});
