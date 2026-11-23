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
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { colors, typography, shadows } from "../../theme/colors";
import { confirmSignOut } from "../../utils/alerts";
import api from "../../services/api";

export default function FacultyDutiesScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [duties, setDuties] = useState([]);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDuties = async () => {
    try {
      const res = await api.get("/faculty/me/duties");
      if (res.data?.success) {
        setDuties(res.data.duties || []);
        setFacultyInfo(res.data.faculty);
      }
    } catch (err) {
      console.log("Error loading duties:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDuties();
  }, []);

  const handleLogout = () => {
    confirmSignOut(logout);
  };

  if (loading) return <LoadingSpinner message="Loading your invigilation assignments..." />;

  const facultyName = facultyInfo?.full_name || user?.faculty_profile?.full_name || user?.username || "Faculty Member";
  const empId = facultyInfo?.employee_id || user?.faculty_profile?.employee_id || user?.username || "";
  const deptCode = facultyInfo?.department_code || user?.faculty_profile?.department_code || "Faculty";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="school" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>ExamEase Faculty</Text>
            <Text style={styles.headerSub}>Invigilation & Exam Hall Portal</Text>
          </View>
        </View>

        <Pressable style={styles.logoutHeaderBtn} onPress={handleLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={styles.logoutHeaderText}>Sign Out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDuties(); }} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarLetter}>
              {facultyName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.facultyName}>{facultyName}</Text>
          <Text style={styles.facultyMeta}>
            Faculty ID: <Text style={{ fontWeight: "700", color: colors.text }}>{empId}</Text> • Dept: {deptCode}
          </Text>
          <Badge label="VERIFIED INVIGILATOR" variant="info" size="sm" style={{ marginTop: 8 }} />
        </View>

        {/* Assigned Duties Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Assigned Invigilation Duties</Text>
          <Badge
            label={`${duties.length} DUTIES`}
            variant={duties.length > 0 ? "success" : "neutral"}
          />
        </View>

        {duties.length > 0 ? (
          duties.map((item, idx) => (
            <View key={item.id || idx} style={styles.dutyCard}>
              <View style={styles.dutyTopRow}>
                <View style={styles.dutyCodeBadge}>
                  <Text style={styles.dutyCodeText}>{item.subject_code || "EXAM"}</Text>
                </View>
                <Badge label={item.status || "ASSIGNED"} variant="success" size="sm" />
              </View>

              <Text style={styles.dutyExamName}>{item.exam_name || "Examination"}</Text>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.metaText}>
                  Date: <Text style={{ fontWeight: "700", color: colors.text }}>{item.duty_date}</Text>
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.metaText}>
                  Timing: {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                </Text>
              </View>

              {/* Supervising Hall Box */}
              <View style={styles.supervisingBox}>
                <Ionicons name="business-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supervisingLabel}>Assigned Examination Hall</Text>
                  <Text style={styles.supervisingHallName}>{item.hall_name || "TBA"}</Text>
                  {item.building ? (
                    <Text style={styles.supervisingHallSub}>
                      {item.building} • Floor {item.floor || 1}
                    </Text>
                  ) : null}
                  {item.hall_capacity ? (
                    <Text style={styles.supervisingHallSub}>
                      Capacity: {item.hall_capacity} seats {item.allocated_students_count ? `• ${item.allocated_students_count} Students Allocated` : ""}
                    </Text>
                  ) : null}
                </View>
              </View>

              {item.seating_plan_id ? (
                <Pressable
                  style={styles.viewSeatingBtn}
                  onPress={() => navigation.navigate("SeatingPlanDetail", { planId: item.seating_plan_id })}
                >
                  <Ionicons name="layers-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.viewSeatingBtnText}>View Hall Seating Arrangement →</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState
            iconName="clipboard-outline"
            title="No Duties Assigned"
            message="You currently have no invigilation duties scheduled. Any exam duties assigned by the Exam Cell will appear here."
          />
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
    height: 58,
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
  logoutHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorLight,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  logoutHeaderText: {
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    ...shadows.sm,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  facultyName: {
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  facultyMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dutyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadows.sm,
  },
  dutyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dutyCodeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dutyCodeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  dutyExamName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  supervisingBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  supervisingLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    textTransform: "uppercase",
  },
  supervisingHallName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 1,
  },
  supervisingHallSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  viewSeatingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 12,
  },
  viewSeatingBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
});
