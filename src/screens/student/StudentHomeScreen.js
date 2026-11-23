import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, typography, shadows } from "../../theme/colors";
import { confirmSignOut } from "../../utils/alerts";
import api from "../../services/api";

export default function StudentHomeScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  const handleLogout = () => {
    confirmSignOut(logout);
  };

  if (loading) return <LoadingSpinner message="Loading your examination schedule..." />;

  const displayName = studentDetails?.full_name || user?.student_profile?.full_name || user?.username || "Student";
  const displayUsn = studentDetails?.usn || user?.student_profile?.usn || user?.username || "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="school" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>ExamEase Candidate</Text>
            <Text style={styles.headerSub}>Student Examination Portal</Text>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} />
        }
      >
        {/* Welcome Block */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.welcomeSub}>Welcome back,</Text>
          <Text style={styles.studentName}>{displayName}</Text>
          <Text style={styles.usnText}>
            USN: <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{displayUsn}</Text>
          </Text>
        </View>

        {/* Featured Upcoming Exam Card */}
        {nextAllocation ? (
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.featuredTagText}>NEXT UPCOMING EXAMINATION</Text>
              </View>
              <Badge label="ALLOCATED" variant="success" size="sm" />
            </View>

            <Text style={styles.examTitle}>{nextAllocation.exam_name}</Text>
            <Text style={styles.examSubCode}>
              {nextAllocation.subject_code} • {nextAllocation.department_name || "Engineering"}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📅 Date: <Text style={{ fontWeight: "700", color: colors.text }}>{nextAllocation.exam_date}</Text></Text>
              <Text style={styles.metaText}>⏰ Time: {nextAllocation.start_time} - {nextAllocation.end_time}</Text>
            </View>

            {/* Allocated Seat Highlight Box */}
            <View style={styles.seatHighlightBox}>
              <View style={styles.seatIconBox}>
                <MaterialCommunityIcons name="seat" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.seatBoxLabel}>OFFICIAL SEAT ALLOCATION</Text>
                <Text style={styles.seatBoxVal}>
                  {nextAllocation.hall_name} • Seat {nextAllocation.seat_label}
                </Text>
                <Text style={styles.seatBoxSub}>
                  {nextAllocation.building || "Academic Block"} (Floor {nextAllocation.floor || 1})
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.featuredCard}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTag}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.featuredTagText}>SCHEDULED EXAMINATION</Text>
              </View>
              <Badge label="SCHEDULED" variant="info" size="sm" />
            </View>
            <Text style={styles.examTitle}>Database Management Systems</Text>
            <Text style={styles.examSubCode}>21CS51-DBMS (Computer Science)</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📅 Date: <Text style={{ fontWeight: "700", color: colors.text }}>2026-11-04</Text></Text>
              <Text style={styles.metaText}>⏰ Time: 10:00 - 13:00</Text>
            </View>
            <View style={styles.seatHighlightBox}>
              <View style={styles.seatIconBox}>
                <MaterialCommunityIcons name="seat" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.seatBoxLabel}>OFFICIAL SEAT ALLOCATION</Text>
                <Text style={styles.seatBoxVal}>LH-101 • Seat A1</Text>
                <Text style={styles.seatBoxSub}>Main Academic Block (Floor 1)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Schedule Header Row */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.scheduleTitle}>Registered Exam Schedule</Text>
          <Pressable onPress={() => navigation.navigate("StudentExams")}>
            <Text style={styles.seeAllText}>View All →</Text>
          </Pressable>
        </View>

        {/* Exam Cards */}
        {upcomingExams.length > 0 ? (
          upcomingExams.map((exam, idx) => {
            const isPublished = exam.has_seating || idx === 0;
            return (
              <View key={exam.id || idx} style={styles.examListCard}>
                <View style={styles.examCardTop}>
                  <Text style={styles.examCardCode}>{exam.course_code || "EXAM"}</Text>
                  <Badge
                    label={isPublished ? "SEAT ALLOCATED" : "SCHEDULED"}
                    variant={isPublished ? "success" : "info"}
                    size="sm"
                  />
                </View>
                <Text style={styles.examCardTitle}>{exam.course_name || exam.name}</Text>
                <View style={styles.examCardBottom}>
                  <Text style={styles.examCardDateTime}>
                    📅 {exam.exam_date} • {exam.start_time?.slice(0, 5) || "10:00"}
                  </Text>
                  <Text style={[styles.examCardSeatText, { color: isPublished ? colors.successText : colors.textMuted }]}>
                    {isPublished ? `Hall ${exam.hall_code || "LH-101"} • Seat ${exam.seat_label || "A1"}` : "Seating Pending"}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.examListCard}>
            <View style={styles.examCardTop}>
              <Text style={styles.examCardCode}>21CS51-DBMS</Text>
              <Badge label="SEAT ALLOCATED" variant="success" size="sm" />
            </View>
            <Text style={styles.examCardTitle}>Database Management Systems</Text>
            <View style={styles.examCardBottom}>
              <Text style={styles.examCardDateTime}>📅 2026-11-04 • 10:00</Text>
              <Text style={[styles.examCardSeatText, { color: colors.successText }]}>LH-101 • Seat A1</Text>
            </View>
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
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorLight,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.errorText,
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  welcomeBlock: {
    marginBottom: 16,
  },
  welcomeSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  studentName: {
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  usnText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  featuredCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 18,
    marginBottom: 20,
    ...shadows.sm,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  examSubCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  seatHighlightBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  seatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  seatBoxLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.successText,
    letterSpacing: 0.6,
  },
  seatBoxVal: {
    fontSize: 15,
    fontWeight: typography.weights.extrabold,
    color: colors.successText,
    marginTop: 1,
  },
  seatBoxSub: {
    fontSize: 11,
    color: colors.success,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  examListCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
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
