import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import api from "../../services/api";

export default function ExamManagementScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExams = async () => {
    try {
      const res = await api.get("/exams");
      if (res.data?.success) {
        setExams(res.data.exams || []);
      }
    } catch (err) {
      console.log("Error loading exams:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Examination Schedules" subtitle="Upcoming scheduled test dates" showBack />
      {loading ? (
        <LoadingSpinner message="Loading exams..." />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExams(); }} />}
          ListEmptyComponent={<EmptyState icon="📝" title="No Exams" message="No examinations are currently scheduled." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.code}>{item.course_code}</Text>
                <Text style={styles.date}>{item.exam_date}</Text>
              </View>
              <Text style={styles.title}>{item.course_name}</Text>
              <Text style={styles.meta}>Session: {item.session} ({item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)})</Text>
              <Text style={styles.meta}>Department: {item.department_name || "General"}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  code: { fontSize: 14, fontWeight: "700", color: colors.primary },
  date: { fontSize: 13, color: colors.textSecondary },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, marginVertical: 6 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
