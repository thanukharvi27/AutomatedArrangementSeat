import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { StatCard } from "../../components/StatCard";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, typography, shadows } from "../../theme/colors";
import api, { reportApi } from "../../services/api";

export default function AdminDashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_students: 36,
    active_students: 36,
    total_exams: 3,
    upcoming_exams: 3,
    total_halls: 4,
    total_faculty: 5,
    total_seats: 126,
    allocated_seats: 36,
    published_plans: 1,
    draft_plans: 0,
  });
  const [recentExams, setRecentExams] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [reportRes, plansRes, hallsRes] = await Promise.allSettled([
        reportApi.getDashboard(),
        api.get("/seating-plans"),
        api.get("/halls"),
      ]);

      let statsObj = { ...stats };

      if (reportRes.status === "fulfilled") {
        const rData = reportRes.value.data || reportRes.value;
        if (rData.statistics) {
          statsObj = {
            ...statsObj,
            ...rData.statistics,
          };
        }
        if (rData.recent_exams) {
          setRecentExams(rData.recent_exams.slice(0, 4));
        }
        if (rData.recent_activities) {
          setRecentActivities(rData.recent_activities.slice(0, 5));
        }
      }

      if (plansRes.status === "fulfilled") {
        const pData = plansRes.value.data || plansRes.value;
        const plans = pData.plans || [];
        statsObj.published_plans = plans.filter((p) => p.status === "PUBLISHED").length;
        statsObj.draft_plans = plans.filter((p) => p.status === "DRAFT").length;
      }

      if (hallsRes.status === "fulfilled") {
        const hData = hallsRes.value.data || hallsRes.value;
        const halls = hData.halls || [];
        const totalCap = halls.reduce((acc, h) => acc + (h.capacity || 0), 0);
        if (totalCap > 0) statsObj.total_seats = totalCap;
      }

      setStats(statsObj);
    } catch (err) {
      console.log("Error loading admin dashboard:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading ExamEase Control Center..." />;

  const occupancyRate = stats.total_seats > 0
    ? Math.min(100, Math.round((stats.allocated_seats / stats.total_seats) * 100))
    : 0;

  return (
    <ResponsiveLayout
      title="Control Center"
      subtitle="Campus exam operations & seat allocation monitor"
      currentRouteName="AdminDashboard"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
          />
        }
      >
        {/* Top Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Examination Command Center</Text>
            <Text style={styles.heroSub}>
              Real-time monitoring of seating arrangements, hall capacities, and invigilation duties.
            </Text>
          </View>
          <Pressable
            style={styles.heroActionBtn}
            onPress={() => navigation.navigate("SeatingPlans")}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.heroActionBtnText}>Generate Seating</Text>
          </Pressable>
        </View>

        {/* KPI Stat Cards Grid */}
        <View style={styles.kpiGrid}>
          <Pressable
            style={styles.kpiCardWrap}
            onPress={() => navigation.navigate("StudentManagement")}
          >
            <StatCard
              title="Students"
              value={stats.total_students}
              subtitle={`${stats.active_students || stats.total_students} enrolled candidates`}
              iconName="people-outline"
              iconColor={colors.primary}
              badgeText="Active"
              badgeVariant="info"
            />
          </Pressable>

          <Pressable
            style={styles.kpiCardWrap}
            onPress={() => navigation.navigate("ExamManagement")}
          >
            <StatCard
              title="Exams Scheduled"
              value={stats.total_exams}
              subtitle={`${stats.upcoming_exams || stats.total_exams} upcoming sessions`}
              iconName="calendar-outline"
              iconColor={colors.success}
              badgeText="Scheduled"
              badgeVariant="success"
            />
          </Pressable>

          <Pressable
            style={styles.kpiCardWrap}
            onPress={() => navigation.navigate("HallManagement")}
          >
            <StatCard
              title="Exam Halls"
              value={stats.total_halls}
              subtitle={`${stats.total_seats} total seat capacity`}
              iconName="business-outline"
              iconColor="#EA580C"
              badgeText="Rooms"
              badgeVariant="warning"
            />
          </Pressable>

          <Pressable
            style={styles.kpiCardWrap}
            onPress={() => navigation.navigate("FacultyManagement")}
          >
            <StatCard
              title="Invigilators"
              value={stats.total_faculty || 5}
              subtitle="Registered faculty roster"
              iconName="briefcase-outline"
              iconColor="#7C3AED"
              badgeText="Faculty"
              badgeVariant="info"
            />
          </Pressable>
        </View>

        {/* Middle Section: Capacity Bar & Seating Plans Status */}
        <View style={[styles.middleRow, isDesktop && styles.middleRowDesktop]}>
          {/* Capacity Utilization Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View>
                <Text style={styles.cardHeaderTitle}>Hall Capacity Utilization</Text>
                <Text style={styles.cardHeaderSub}>Overall seats filled vs available</Text>
              </View>
              <Badge
                label={`${occupancyRate}% Occupied`}
                variant={occupancyRate > 80 ? "warning" : "success"}
              />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${occupancyRate}%` }]} />
            </View>

            <View style={styles.statBreakdownRow}>
              <View style={styles.statMiniCol}>
                <Text style={styles.statMiniVal}>{stats.allocated_seats}</Text>
                <Text style={styles.statMiniLabel}>Allocated</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statMiniCol}>
                <Text style={styles.statMiniVal}>{Math.max(0, stats.total_seats - stats.allocated_seats)}</Text>
                <Text style={styles.statMiniLabel}>Available</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statMiniCol}>
                <Text style={styles.statMiniVal}>{stats.total_seats}</Text>
                <Text style={styles.statMiniLabel}>Total Capacity</Text>
              </View>
            </View>
          </View>

          {/* Seating Plans Status Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View>
                <Text style={styles.cardHeaderTitle}>Seating Plans Status</Text>
                <Text style={styles.cardHeaderSub}>Drafts vs Published arrangements</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("SeatingPlans")}>
                <Text style={styles.linkText}>View Plans →</Text>
              </Pressable>
            </View>

            <View style={styles.plansStatusRow}>
              <View style={styles.planStatusBox}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.planStatusCount}>{stats.published_plans}</Text>
                  <Text style={styles.planStatusLabel}>Published Live</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.planStatusBox}>
                <Ionicons name="document-text-outline" size={24} color={colors.warning} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.planStatusCount}>{stats.draft_plans}</Text>
                  <Text style={styles.planStatusLabel}>Drafts Pending</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Strip */}
        <Text style={styles.sectionHeading}>Quick Management Actions</Text>
        <View style={styles.quickActionsGrid}>
          <Pressable
            style={styles.actionTile}
            onPress={() => navigation.navigate("SeatingPlans")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="layers" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionTileTitle}>Auto Seating</Text>
            <Text style={styles.actionTileSub}>Generate allocation</Text>
          </Pressable>

          <Pressable
            style={styles.actionTile}
            onPress={() => navigation.navigate("FacultyManagement")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="briefcase" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.actionTileTitle}>Invigilation</Text>
            <Text style={styles.actionTileSub}>Faculty & duties</Text>
          </Pressable>

          <Pressable
            style={styles.actionTile}
            onPress={() => navigation.navigate("ExamManagement")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.successLight }]}>
              <Ionicons name="calendar" size={20} color={colors.success} />
            </View>
            <Text style={styles.actionTileTitle}>Exams</Text>
            <Text style={styles.actionTileSub}>Timetable & dates</Text>
          </Pressable>

          <Pressable
            style={styles.actionTile}
            onPress={() => navigation.navigate("HallManagement")}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="business" size={20} color="#EA580C" />
            </View>
            <Text style={styles.actionTileTitle}>Rooms & Halls</Text>
            <Text style={styles.actionTileSub}>Benches & seats</Text>
          </Pressable>
        </View>

        {/* Bottom Section: Upcoming Examinations & Recent Activity */}
        <View style={[styles.middleRow, isDesktop && styles.middleRowDesktop]}>
          {/* Upcoming Exams List */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.cardHeaderTitle}>Upcoming Examinations</Text>
              <Pressable onPress={() => navigation.navigate("ExamManagement")}>
                <Text style={styles.linkText}>View All →</Text>
              </Pressable>
            </View>

            {recentExams.length > 0 ? (
              recentExams.map((exam, idx) => (
                <View key={exam.id || idx} style={styles.examItemRow}>
                  <View style={styles.examItemLeft}>
                    <Text style={styles.examCodeText}>{exam.course_code || exam.subject_code}</Text>
                    <Text style={styles.examNameText} numberOfLines={1}>
                      {exam.course_name || exam.name}
                    </Text>
                    <Text style={styles.examDateText}>
                      📅 {exam.exam_date} • {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)} ({exam.session})
                    </Text>
                  </View>
                  <Badge label={exam.status || "SCHEDULED"} variant="info" size="sm" />
                </View>
              ))
            ) : (
              <View style={styles.examItemRow}>
                <View style={styles.examItemLeft}>
                  <Text style={styles.examCodeText}>21CS51-DBMS</Text>
                  <Text style={styles.examNameText}>Database Management Systems</Text>
                  <Text style={styles.examDateText}>📅 2026-11-04 • 10:00 - 13:00 (Morning)</Text>
                </View>
                <Badge label="SCHEDULED" variant="info" size="sm" />
              </View>
            )}
          </View>

          {/* Recent System Activity */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.cardHeaderTitle}>Recent System Activity</Text>
              <Badge label="Live Audit" variant="neutral" size="sm" />
            </View>

            {recentActivities.length > 0 ? (
              recentActivities.map((log, idx) => (
                <View key={log.id || idx} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityAction}>{log.action || "System Event"}</Text>
                    <Text style={styles.activityDetails} numberOfLines={2}>
                      {log.details || "Activity performed"}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {log.created_at ? log.created_at.slice(11, 16) : "Just now"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityAction}>System Initialized</Text>
                  <Text style={styles.activityDetails}>ExamEase database models ready</Text>
                </View>
                <Text style={styles.activityTime}>Active</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  heroBanner: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    ...shadows.sm,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 260,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  heroActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  heroActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  kpiCardWrap: {
    flex: 1,
    minWidth: 150,
  },
  middleRow: {
    gap: 14,
    marginBottom: 20,
  },
  middleRowDesktop: {
    flexDirection: "row",
  },
  sectionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.sm,
  },
  sectionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  linkText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  statBreakdownRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  statMiniCol: {
    flex: 1,
    alignItems: "center",
  },
  statMiniVal: {
    fontSize: 16,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  statMiniLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  plansStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  planStatusBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  planStatusCount: {
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  planStatusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  actionTile: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
    ...shadows.sm,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: "center",
  },
  actionTileSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  examItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  examItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  examCodeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  examNameText: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
  },
  examDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  activityAction: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  activityDetails: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  activityTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 8,
  },
});
