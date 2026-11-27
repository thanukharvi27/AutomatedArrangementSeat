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
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { KpiCard } from "../../components/common/KpiCard";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { HBarList, StackedBar, BarChart, Meter } from "../../components/common/Charts";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, textStyles, radii, shadows } from "../../theme/tokens";
import api, { reportApi, examApi, hallApi, departmentApi } from "../../services/api";

export default function AdminDashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    total_students: 0,
    total_faculty: 0,
    total_departments: 0,
    total_exams: 0,
    total_halls: 0,
    allocated_seats: 0,
    total_seats: 0,
    published_plans: 0,
    draft_plans: 0,
  });

  const [occupancyList, setOccupancyList] = useState([]);
  const [deptDistribution, setDeptDistribution] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [activities, setActivities] = useState([]);

  const todayDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const fetchDashboardData = async () => {
    try {
      const [dashRes, occRes, plansRes, deptsRes, examsRes] = await Promise.allSettled([
        reportApi.getDashboard(),
        reportApi.getOccupancy(),
        api.get("/seating-plans"),
        departmentApi.getAll(),
        examApi.getAll({ upcoming: true }),
      ]);

      let statsObj = { ...stats };

      // 1. Dashboard summary
      if (dashRes.status === "fulfilled") {
        const d = dashRes.value.data || dashRes.value;
        if (d.statistics) {
          statsObj = { ...statsObj, ...d.statistics };
        }
        if (d.recent_activities) {
          setActivities(d.recent_activities.slice(0, 5));
        }
      }

      // 2. Hall occupancy
      if (occRes.status === "fulfilled") {
        const occData = occRes.value.data || occRes.value;
        const list = occData.occupancy || [];
        setOccupancyList(
          list.map((h) => ({
            label: h.hall_name || `Hall ${h.hall_id}`,
            value: h.occupied_seats || 0,
            max: h.total_seats || 1,
            color: h.occupancy_percentage > 80 ? colors.warning : colors.primary,
          }))
        );
      }

      // 3. Seating Plans breakdown
      if (plansRes.status === "fulfilled") {
        const pData = plansRes.value.data || plansRes.value;
        const plans = pData.plans || [];
        statsObj.published_plans = plans.filter((p) => p.status === "PUBLISHED").length;
        statsObj.draft_plans = plans.filter((p) => p.status === "DRAFT").length;
      }

      // 4. Department student distribution
      if (deptsRes.status === "fulfilled") {
        const dData = deptsRes.value.data || deptsRes.value;
        const depts = dData.departments || [];
        statsObj.total_departments = depts.length;
        setDeptDistribution(
          depts.map((d) => ({
            label: d.code,
            value: d.student_count || 0,
            color: colors.primary,
          }))
        );
      }

      // 5. Upcoming exams
      if (examsRes.status === "fulfilled") {
        const eData = examsRes.value.data || examsRes.value;
        const exList = eData.exams || [];
        setUpcomingExams(exList.slice(0, 4));
      }

      setStats(statsObj);
    } catch (err) {
      console.log("Error loading dashboard metrics:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Real-time examination control center & campus operations"
      breadcrumb="Overview"
      currentRouteName="AdminDashboard"
      rightAction={
        <Button
          title="Generate Seating"
          size="sm"
          icon={<Ionicons name="sparkles" size={14} color="#FFFFFF" />}
          onPress={() => navigation.navigate("SeatingPlans")}
        />
      }
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
        {/* Welcome Greeting Row */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <Text style={styles.dateText}>{todayDateString}</Text>
            <Text style={styles.greetingTitle}>Welcome to ExamEase Command Center</Text>
            <Text style={styles.greetingSub}>
              Campus examination scheduling, anti-collision seat assignment and faculty invigilation monitor.
            </Text>
          </View>
        </View>

        {/* 6 KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Enrolled Students"
            value={stats.total_students}
            sublabel={`${stats.active_students || stats.total_students} active candidates`}
            icon={<Ionicons name="school-outline" size={20} color={colors.primaryDark} />}
            tone="blue"
            delay={0}
            onPress={() => navigation.navigate("StudentManagement")}
          />
          <KpiCard
            label="Faculty Members"
            value={stats.total_faculty}
            sublabel="Roster & invigilators"
            icon={<Ionicons name="briefcase-outline" size={20} color={colors.accent} />}
            tone="lavender"
            delay={40}
            onPress={() => navigation.navigate("FacultyManagement")}
          />
          <KpiCard
            label="Departments"
            value={stats.total_departments}
            sublabel="Academic branches"
            icon={<Ionicons name="business-outline" size={20} color={colors.warning} />}
            tone="peach"
            delay={80}
            onPress={() => navigation.navigate("DepartmentManagement")}
          />
          <KpiCard
            label="Scheduled Exams"
            value={stats.total_exams}
            sublabel="Semester sessions"
            icon={<Ionicons name="calendar-outline" size={20} color={colors.success} />}
            tone="mint"
            delay={120}
            onPress={() => navigation.navigate("ExamManagement")}
          />
          <KpiCard
            label="Exam Halls"
            value={stats.total_halls}
            sublabel={`${stats.total_available_seats ?? stats.total_seats ?? 0} capacity`}
            icon={<Ionicons name="easel-outline" size={20} color={colors.warningText} />}
            tone="yellow"
            delay={160}
            onPress={() => navigation.navigate("HallManagement")}
          />
          <KpiCard
            label="Allocated Seats"
            value={stats.total_allocated_seats ?? stats.allocated_seats ?? 0}
            sublabel={`${stats.published_plans} plans published`}
            icon={<Ionicons name="layers-outline" size={20} color={colors.primaryDark} />}
            tone="blue"
            delay={200}
            onPress={() => navigation.navigate("SeatingPlans")}
          />
        </View>

        {/* Middle Section: Hall Occupancy & Seat Allocation StackedBar */}
        <View style={[styles.gridRow, isDesktop && styles.gridRowDesktop]}>
          {/* Hall Utilisation Card */}
          <Card style={styles.flexCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Hall Capacity Utilisation</Text>
                <Text style={styles.cardSub}>Seats occupied per examination hall</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("AdminReports")}>
                <Text style={styles.linkText}>View Reports →</Text>
              </Pressable>
            </View>

            {loading ? (
              <LoadingSkeleton height={120} />
            ) : occupancyList.length > 0 ? (
              <HBarList data={occupancyList} />
            ) : (
              <Text style={styles.emptyText}>No hall occupancy data currently available.</Text>
            )}
          </Card>

          {/* Seat Allocation & Seating Plan Status */}
          <Card style={styles.flexCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Seat Allocation Breakdown</Text>
                <Text style={styles.cardSub}>Allocated vs available campus capacity</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("SeatingPlans")}>
                <Text style={styles.linkText}>Manage Plans →</Text>
              </Pressable>
            </View>

            <StackedBar
              segments={[
                { label: "Allocated", value: stats.total_allocated_seats || 0, color: colors.primary },
                { label: "Available", value: stats.total_available_seats || 0, color: colors.success },
              ]}
              height={16}
              style={{ marginVertical: 14 }}
            />

            <View style={styles.statBreakdown}>
              <View style={styles.planStatusBox}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.planCount}>{stats.published_plans}</Text>
                  <Text style={styles.planLabel}>Published Plans</Text>
                </View>
              </View>

              <View style={styles.planStatusDivider} />

              <View style={styles.planStatusBox}>
                <Ionicons name="document-text" size={20} color={colors.warning} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.planCount}>{stats.draft_plans}</Text>
                  <Text style={styles.planLabel}>Draft Plans</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Third Section: Students by Department BarChart */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Students Enrolled by Department</Text>
              <Text style={styles.cardSub}>Distribution across academic branches</Text>
            </View>
            <Pressable onPress={() => navigation.navigate("DepartmentManagement")}>
              <Text style={styles.linkText}>All Departments →</Text>
            </Pressable>
          </View>

          {loading ? (
            <LoadingSkeleton height={140} />
          ) : deptDistribution.length > 0 ? (
            <BarChart data={deptDistribution} height={140} />
          ) : (
            <Text style={styles.emptyText}>No departments registered.</Text>
          )}
        </Card>

        {/* Bottom Section: Upcoming Exams & Recent Activity */}
        <View style={[styles.gridRow, isDesktop && styles.gridRowDesktop]}>
          {/* Upcoming Examinations */}
          <Card style={styles.flexCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Upcoming Examinations</Text>
              <Pressable onPress={() => navigation.navigate("ExamManagement")}>
                <Text style={styles.linkText}>Schedule →</Text>
              </Pressable>
            </View>

            {upcomingExams.length > 0 ? (
              upcomingExams.map((exam, idx) => (
                <View key={exam.id || idx} style={styles.examItemRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.examCode}>{exam.course_code || exam.subject_code}</Text>
                    <Text style={styles.examName} numberOfLines={1}>
                      {exam.course_name || exam.name}
                    </Text>
                    <Text style={styles.examTime}>
                      📅 {exam.exam_date} • {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)}
                    </Text>
                  </View>
                  <View style={styles.examBadge}>
                    <Text style={styles.examBadgeText}>{exam.status || "SCHEDULED"}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No upcoming examinations found.</Text>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card style={styles.flexCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>System Activity Timeline</Text>
              <View style={styles.liveAuditPill}>
                <Text style={styles.liveAuditText}>LIVE</Text>
              </View>
            </View>

            {activities.length > 0 ? (
              activities.map((act, idx) => (
                <View key={act.id || idx} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityAction}>{act.action || "System Event"}</Text>
                    <Text style={styles.activityDetails} numberOfLines={2}>
                      {act.details || "Activity performed"}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {act.created_at ? act.created_at.slice(11, 16) : "Recent"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityAction}>Examination System Active</Text>
                  <Text style={styles.activityDetails}>All database entities verified and operational.</Text>
                </View>
                <Text style={styles.activityTime}>Online</Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  scrollDesktop: {
    maxWidth: 1160,
    width: "100%",
    alignSelf: "center",
  },
  greetingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows.card,
  },
  greetingLeft: {
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  greetingSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridRow: {
    gap: 16,
  },
  gridRowDesktop: {
    flexDirection: "row",
  },
  flexCard: {
    flex: 1,
  },
  sectionCard: {
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  statBreakdown: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 8,
  },
  planStatusBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  planCount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  planLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  planStatusDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  examItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  examCode: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  examName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  examTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  examBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  examBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  activityRow: {
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
    fontWeight: "600",
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
  liveAuditPill: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  liveAuditText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.successText,
    letterSpacing: 0.6,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 16,
    textAlign: "center",
  },
});
