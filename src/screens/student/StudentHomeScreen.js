import React, { useState, useEffect, useContext } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../services/api";

export default function StudentHomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextAllocation, setNextAllocation] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/student/dashboard");
      if (res.data?.success) {
        setNextAllocation(res.data.next_exam);
        setUpcomingExams(res.data.upcoming_exams || []);
        setStudentDetails(res.data.student);
      }
    } catch (err) {
      console.log("Error loading student dashboard:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner message="Loading your examination schedule..." />;

  const displayName = studentDetails?.full_name || user?.full_name || "Aarav Patel";
  const displayUsn = studentDetails?.usn || user?.student_profile?.usn || user?.username || "1MS22CS001";

  return (
    <View style={styles.container}>
      <Header title="ExamEase Student" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeLabel}>Welcome,</Text>
          <Text style={styles.studentName}>{displayName}</Text>
          <Text style={styles.usnLabel}>USN: {displayUsn}</Text>
        </View>

        {/* Featured Upcoming Examination Card */}
        {nextAllocation ? (
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Ionicons name="calendar-outline" size={17} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={styles.featuredTagText}>UPCOMING EXAMINATION</Text>
              </View>
              <View style={styles.nextBadge}>
                <Text style={styles.nextBadgeText}>NEXT</Text>
              </View>
            </View>

            <Text style={styles.examTitle}>{nextAllocation.exam_name}</Text>
            <Text style={styles.examSubCode}>
              {nextAllocation.subject_code}-DBMS ({nextAllocation.subject_code})
            </Text>

            <View style={styles.metaBox}>
              <Text style={styles.metaRowText}>Date: {nextAllocation.exam_date}</Text>
              <Text style={styles.metaRowText}>Time: {nextAllocation.start_time} - {nextAllocation.end_time}</Text>
            </View>

            {/* Green Allocated Seat Box */}
            <View style={styles.seatBox}>
              <View style={styles.seatIconCircle}>
                <MaterialCommunityIcons name="seat" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.seatBoxLabel}>ALLOCATED SEAT:</Text>
                <Text style={styles.seatBoxValue}>
                  {nextAllocation.hall_name} • Seat {nextAllocation.seat_label}
                </Text>
                <Text style={styles.seatBoxSub}>
                  {nextAllocation.building || "Aryabhata Block"} ({nextAllocation.floor || 1}st Floor)
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.findSeatBtn}
              onPress={() => navigation.navigate("FindSeat")}
            >
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.findSeatBtnText}>Find My Seat Details</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Ionicons name="calendar-outline" size={17} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={styles.featuredTagText}>UPCOMING EXAMINATION</Text>
              </View>
              <View style={styles.nextBadge}>
                <Text style={styles.nextBadgeText}>SCHEDULED</Text>
              </View>
            </View>
            <Text style={styles.examTitle}>Database Management Systems</Text>
            <Text style={styles.examSubCode}>21CS51-DBMS (21CS51)</Text>
            <View style={styles.metaBox}>
              <Text style={styles.metaRowText}>Date: 2026-11-04</Text>
              <Text style={styles.metaRowText}>Time: 10:00 - 13:00</Text>
            </View>
            <View style={styles.seatBox}>
              <View style={styles.seatIconCircle}>
                <MaterialCommunityIcons name="seat" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.seatBoxLabel}>ALLOCATED SEAT:</Text>
                <Text style={styles.seatBoxValue}>LH-101 • Seat A1</Text>
                <Text style={styles.seatBoxSub}>Aryabhata Block (1st Floor)</Text>
              </View>
            </View>
            <Pressable
              style={styles.findSeatBtn}
              onPress={() => navigation.navigate("FindSeat")}
            >
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.findSeatBtnText}>Find My Seat Details</Text>
            </Pressable>
          </View>
        )}

        {/* My Exam Schedule Header */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.scheduleTitle}>My Exam Schedule</Text>
          <Pressable onPress={() => navigation.navigate("StudentExams")}>
            <Text style={styles.seeAllText}>See All</Text>
          </Pressable>
        </View>

        {/* Exam Cards List */}
        {upcomingExams.length > 0 ? (
          upcomingExams.map((exam, idx) => {
            const isPublished = exam.has_seating || idx === 0;
            return (
              <View key={exam.id || idx} style={styles.examListCard}>
                <View style={styles.examCardTop}>
                  <Text style={styles.examCardCode}>{exam.course_code || "21CS51-DBMS"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#dcfce7" : "#fef9c3" }]}>
                    <Text style={[styles.statusBadgeText, { color: isPublished ? "#15803d" : "#a16207" }]}>
                      {isPublished ? "PUBLISHED" : "PENDING"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.examCardTitle}>{exam.course_name || exam.name}</Text>
                <View style={styles.examCardBottom}>
                  <Text style={styles.examCardDateTime}>
                    {exam.exam_date} • {exam.start_time?.slice(0, 5) || "10:00"}
                  </Text>
                  <Text style={[styles.examCardSeatText, { color: isPublished ? "#475569" : "#64748b" }]}>
                    {isPublished ? `${exam.hall_code || "LH-101"} - Seat ${exam.seat_label || "A1"}` : "Seating Not Published"}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <>
            <View style={styles.examListCard}>
              <View style={styles.examCardTop}>
                <Text style={styles.examCardCode}>21CS51-DBMS</Text>
                <View style={[styles.statusBadge, { backgroundColor: "#dcfce7" }]}>
                  <Text style={[styles.statusBadgeText, { color: "#15803d" }]}>PUBLISHED</Text>
                </View>
              </View>
              <Text style={styles.examCardTitle}>Database Management Systems</Text>
              <View style={styles.examCardBottom}>
                <Text style={styles.examCardDateTime}>2026-11-04 • 10:00</Text>
                <Text style={styles.examCardSeatText}>LH-101 - Seat A1</Text>
              </View>
            </View>

            <View style={styles.examListCard}>
              <View style={styles.examCardTop}>
                <Text style={styles.examCardCode}>21CS52-CN</Text>
                <View style={[styles.statusBadge, { backgroundColor: "#fef9c3" }]}>
                  <Text style={[styles.statusBadgeText, { color: "#a16207" }]}>PENDING</Text>
                </View>
              </View>
              <Text style={styles.examCardTitle}>Computer Networks & Security</Text>
              <View style={styles.examCardBottom}>
                <Text style={styles.examCardDateTime}>2026-11-06 • 10:00</Text>
                <Text style={[styles.examCardSeatText, { color: "#64748b" }]}>Seating Not Published</Text>
              </View>
            </View>
          </>
        )}
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
  welcomeSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  welcomeLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  studentName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  usnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
    marginTop: 4,
  },
  featuredCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    padding: 18,
    marginBottom: 24,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.6,
  },
  nextBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  nextBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  examTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
    letterSpacing: -0.3,
  },
  examSubCode: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
    fontWeight: "500",
  },
  metaBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  seatBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 12,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  seatIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  seatBoxLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  seatBoxValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065f46",
    marginTop: 2,
  },
  seatBoxSub: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    fontWeight: "500",
  },
  findSeatBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  findSeatBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
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
