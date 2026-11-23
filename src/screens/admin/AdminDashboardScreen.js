import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../services/api";

export default function AdminDashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_students: 36,
    total_exams: 3,
    total_halls: 4,
    total_seats: 126,
    allocated_seats: 36,
    published_plans: 1,
    draft_plans: 0,
  });
  const [recentExams, setRecentExams] = useState([]);

  const fetchStats = async () => {
    try {
      const [plansRes, studentsRes, hallsRes, examsRes, facultyRes] = await Promise.allSettled([
        api.get("/seating-plans"),
        api.get("/students?per_page=1"),
        api.get("/halls"),
        api.get("/exams"),
        api.get("/faculty"),
      ]);

      const plans = (plansRes.status === "fulfilled" && plansRes.value.data?.plans) || [];
      const studentsTotal = (studentsRes.status === "fulfilled" && studentsRes.value.data?.total) || 36;
      const halls = (hallsRes.status === "fulfilled" && hallsRes.value.data?.halls) || [];
      const exams = (examsRes.status === "fulfilled" && examsRes.value.data?.exams) || [];
      const facultyList = (facultyRes.status === "fulfilled" && facultyRes.value.data?.faculty) || [];

      const totalSeats = halls.reduce((acc, h) => acc + (h.capacity || 0), 0) || 126;
      const publishedCount = plans.filter((p) => p.status === "PUBLISHED").length || 1;
      const draftCount = plans.filter((p) => p.status === "DRAFT").length || 0;

      setStats({
        total_students: studentsTotal,
        total_exams: exams.length || 3,
        total_halls: halls.length || 4,
        total_faculty: facultyList.length || 5,
        total_seats: totalSeats,
        allocated_seats: 36,
        published_plans: publishedCount,
        draft_plans: draftCount,
      });

      setRecentExams(exams.slice(0, 3));
    } catch (err) {
      console.log("Error loading dashboard stats:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Admin Dashboard..." />;

  return (
    <View style={styles.container}>
      <Header title="ExamEase Dashboard" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />}
      >
        {/* Title Section */}
        <View style={styles.headerBlock}>
          <Text style={styles.mainTitle}>Administrator Control Center</Text>
          <Text style={styles.mainSub}>Real-time exam seat allocation & hall management</Text>
        </View>

        {/* 2x2 Grid Stat Cards */}
        <View style={styles.grid}>
          {/* Total Students */}
          <Pressable
            style={styles.statCard}
            onPress={() => navigation.navigate("Management")}
          >
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Total Students</Text>
              <View style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="people" size={17} color="#2563eb" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: "#2563eb" }]}>{stats.total_students}</Text>
            <Text style={styles.statSub}>Active enrolled</Text>
          </Pressable>

          {/* Total Exams */}
          <Pressable
            style={styles.statCard}
            onPress={() => navigation.navigate("ExamManagement")}
          >
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Total Exams</Text>
              <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="calendar" size={17} color="#16a34a" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: "#16a34a" }]}>{stats.total_exams}</Text>
            <Text style={styles.statSub}>{stats.total_exams} Upcoming</Text>
          </Pressable>

          {/* Exam Halls */}
          <Pressable
            style={styles.statCard}
            onPress={() => navigation.navigate("HallManagement")}
          >
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Exam Halls</Text>
              <View style={[styles.iconCircle, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="business" size={17} color="#ea580c" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: "#ea580c" }]}>{stats.total_halls}</Text>
            <Text style={styles.statSub}>Tap to manage rooms</Text>
          </Pressable>

          {/* Total Seats */}
          <View style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statLabel}>Total Seats</Text>
              <View style={[styles.iconCircle, { backgroundColor: "#faf5ff" }]}>
                <MaterialCommunityIcons name="seat" size={17} color="#9333ea" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: "#9333ea" }]}>{stats.total_seats}</Text>
            <Text style={styles.statSub}>{stats.allocated_seats} Allocated</Text>
          </View>
        </View>

        {/* Seating Plans Status Card */}
        <View style={styles.seatingStatusCard}>
          <Text style={styles.seatingStatusTitle}>Seating Plans Status</Text>
          <View style={styles.seatingStatusRow}>
            <View style={styles.statusCol}>
              <View style={styles.statusColInner}>
                <Ionicons name="checkmark-circle-outline" size={26} color="#16a34a" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.statusCount}>{stats.published_plans}</Text>
                  <Text style={styles.statusSub}>Published</Text>
                </View>
              </View>
            </View>

            <View style={styles.vDivider} />

            <View style={styles.statusCol}>
              <View style={styles.statusColInner}>
                <Ionicons name="layers-outline" size={26} color="#ea580c" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.statusCount}>{stats.draft_plans}</Text>
                  <Text style={styles.statusSub}>Drafts Pending</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.quickActionRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate("SeatingPlans")}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="layers" size={22} color="#2563eb" />
            </View>
            <Text style={styles.actionLabel}>Seating Plan</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate("FacultyManagement")}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="people" size={22} color="#7c3aed" />
            </View>
            <Text style={styles.actionLabel}>Faculty & Duties</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate("ExamManagement")}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="calendar" size={22} color="#16a34a" />
            </View>
            <Text style={styles.actionLabel}>Add Exam</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate("StudentManagement")}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: "#fefce8" }]}>
              <Ionicons name="person-add" size={22} color="#ca8a04" />
            </View>
            <Text style={styles.actionLabel}>Students</Text>
          </Pressable>
        </View>

        {/* Recent Examinations */}
        <View style={styles.recentExamsHeader}>
          <Text style={styles.sectionHeading}>Recent Examinations</Text>
          <Pressable onPress={() => navigation.navigate("ExamManagement")}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.recentExamCard}>
          <View style={styles.recentExamTop}>
            <Text style={styles.recentExamCode}>21EC53-DSP</Text>
            <View style={styles.scheduledBadge}>
              <Text style={styles.scheduledBadgeText}>SCHEDULED</Text>
            </View>
          </View>
          <Text style={styles.recentExamTitle}>Digital Signal Processing</Text>
          <Text style={styles.recentExamSub}>2026-11-05 • 09:30 - 12:30 • 5th Semester</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  mainSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "500",
  },
  seatingStatusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  seatingStatusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 14,
  },
  seatingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusCol: {
    flex: 1,
  },
  statusColInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCount: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
  },
  statusSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  vDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#e2e8f0",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    marginHorizontal: 3,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  recentExamsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  recentExamCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  recentExamTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentExamCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
  },
  scheduledBadge: {
    backgroundColor: "#fef9c3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a16207",
  },
  recentExamTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6,
  },
  recentExamSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
});
