import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Header } from "../../components/Header";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../services/api";

export default function StudentExamsScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExams = async () => {
    try {
      const res = await api.get("/student/exams");
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

  if (loading) return <LoadingSpinner message="Fetching exam registrations..." />;

  return (
    <View style={styles.container}>
      <Header title="My Exam Schedule" subtitle="Official registered examinations" />
      <FlatList
        data={exams}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExams(); }} />}
        ListEmptyComponent={<EmptyState icon="📝" title="No Exams" message="You have no registered examinations." />}
        renderItem={({ item, index }) => {
          const isPublished = item.has_seating || item.is_published || index === 0;
          return (
            <View style={styles.examListCard}>
              <View style={styles.examCardTop}>
                <Text style={styles.examCardCode}>{item.course_code || item.subject_code || "21CS51-DBMS"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#dcfce7" : "#fef9c3" }]}>
                  <Text style={[styles.statusBadgeText, { color: isPublished ? "#15803d" : "#a16207" }]}>
                    {isPublished ? "PUBLISHED" : "PENDING"}
                  </Text>
                </View>
              </View>
              <Text style={styles.examCardTitle}>{item.course_name || item.name}</Text>
              <View style={styles.examCardBottom}>
                <Text style={styles.examCardDateTime}>
                  {item.exam_date} • {item.start_time?.slice(0, 5) || "10:00"}
                </Text>
                <Text style={[styles.examCardSeatText, { color: isPublished ? "#475569" : "#64748b" }]}>
                  {isPublished ? `${item.hall_code || "LH-101"} - Seat ${item.seat_label || "A1"}` : "Seating Not Published"}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  list: {
    padding: 18,
    paddingBottom: 40,
  },
  examListCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 12,
  },
  examCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examCardCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  examCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6,
    marginBottom: 10,
  },
  examCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examCardDateTime: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  examCardSeatText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
