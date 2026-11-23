import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, typography, shadows } from "../../theme/colors";
import api from "../../services/api";

export default function StudentExamsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>My Examination Schedule</Text>
        <Badge label={`${exams.length} EXAMS`} variant="info" size="sm" />
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={[
          styles.list,
          isDesktop && styles.listDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExams(); }} />}
        ListEmptyComponent={
          <EmptyState
            iconName="calendar-outline"
            title="No Exams Found"
            message="You have no registered examinations for this academic semester."
          />
        }
        renderItem={({ item }) => {
          const hasSeat = Boolean(item.has_seating && item.seat_label && item.seat_label !== "TBA");
          const isPublished = Boolean(item.is_published);
          return (
            <View style={styles.examListCard}>
              <View style={styles.examCardTop}>
                <Text style={styles.examCardCode}>{item.course_code || item.subject_code}</Text>
                <Badge
                  label={hasSeat ? "SEAT ALLOCATED" : isPublished ? "PUBLISHED" : "SCHEDULED"}
                  variant={hasSeat ? "success" : "info"}
                  size="sm"
                />
              </View>
              <Text style={styles.examCardTitle}>{item.course_name || item.name}</Text>
              <View style={styles.examCardBottom}>
                <Text style={styles.examCardDateTime}>
                  📅 {item.exam_date} • {item.start_time?.slice(0, 5) || "10:00"}
                </Text>
                <Text style={[styles.examCardSeatText, { color: hasSeat ? colors.successText : colors.textMuted }]}>
                  {hasSeat ? `Hall ${item.hall_code} • Seat ${item.seat_label}` : "Seating Pending"}
                </Text>
              </View>
            </View>
          );
        }}
      />
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
  headerTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  listDesktop: {
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  examListCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.sm,
  },
  examCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examCardCode: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  examCardTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 4,
    marginBottom: 8,
  },
  examCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examCardDateTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  examCardSeatText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
});
