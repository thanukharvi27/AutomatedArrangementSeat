import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { FadeIn, Touchable } from "../../components/common/Motion";
import { colors, textStyles, spacing, radii, shadows, tones } from "../../theme/tokens";
import api from "../../services/api";

export default function StudentHomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextAllocation, setNextAllocation] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/student/dashboard");
      const data = res.data || res;
      if (data.success) {
        setNextAllocation(data.next_exam || null);
        setUpcomingExams(data.upcoming_exams || []);
        setStudentDetails(data.student || null);
      }
    } catch (err) {
      console.log("Error loading student dashboard:", err?.message);
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const displayName =
    studentDetails?.full_name ||
    user?.student_profile?.full_name ||
    user?.full_name ||
    user?.username ||
    "Student";

  const displayUsn =
    studentDetails?.usn ||
    user?.student_profile?.usn ||
    user?.username ||
    "";

  const deptName =
    studentDetails?.department_name ||
    user?.student_profile?.department_name ||
    "Engineering";

  const semVal =
    studentDetails?.semester ||
    user?.student_profile?.semester ||
    "";

  // Check if seat is actually allocated (not just placeholder "TBA")
  const hasSeat = Boolean(
    nextAllocation?.seat_label && nextAllocation.seat_label !== "TBA"
  );

  return (
    <AppLayout
      title="Student Portal"
      subtitle={`Welcome, ${displayName}`}
      currentRouteName="StudentHome"
      actions={
        <Button
          title="Find Seat"
          variant="secondary"
          size="sm"
          onPress={() => navigation.navigate("PublicFindSeat")}
          icon={<Ionicons name="search-outline" size={14} color={colors.text} />}
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
              fetchDashboard();
            }}
          />
        }
      >
        {error && !loading && (
          <Card style={{ marginBottom: 16, backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dangerText, fontWeight: "600", fontSize: 13 }}>Failed to load student dashboard</Text>
                <Text style={{ color: colors.dangerText, fontSize: 12, marginTop: 2 }}>{error}</Text>
              </View>
              <Button
                title="Retry"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setLoading(true);
                  fetchDashboard();
                }}
              />
            </View>
          </Card>
        )}

        {/* Student Profile Quick Banner */}
        <FadeIn delay={50}>
          <Card style={styles.profileBanner}>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.studentName}>{displayName}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.usnChip}>
                    <Text style={styles.usnChipText}>USN: {displayUsn}</Text>
                  </View>
                  <View style={styles.deptChip}>
                    <Text style={styles.deptChipText}>{deptName}</Text>
                  </View>
                  {semVal ? (
                    <View style={styles.semChip}>
                      <Text style={styles.semChipText}>Sem {semVal}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </Card>
        </FadeIn>

        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <LoadingSkeleton height={180} />
            <LoadingSkeleton height={120} />
          </View>
        ) : (
          <>
            {/* Featured Next Examination Hero Card */}
            <FadeIn delay={100}>
              <Card style={styles.nextExamCard}>
                <View style={styles.nextExamHeader}>
                  <View style={styles.tagGroup}>
                    <View style={styles.calIconChip}>
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.nextExamTag}>NEXT UPCOMING EXAMINATION</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: hasSeat ? colors.pastelMint : colors.pastelBlue,
                        borderColor: hasSeat ? colors.successBorder : colors.primaryMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: hasSeat ? colors.successText : colors.primaryDark },
                      ]}
                    >
                      {hasSeat ? "SEAT ASSIGNED" : "SCHEDULED"}
                    </Text>
                  </View>
                </View>

                {nextAllocation ? (
                  <View style={styles.examDetails}>
                    <Text style={styles.examTitle}>
                      {nextAllocation.exam_name || nextAllocation.name}
                    </Text>
                    <Text style={styles.examSubtitle}>
                      {nextAllocation.subject_code || nextAllocation.course_code} • {nextAllocation.department_name || deptName}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaLabel}>Date:</Text>
                        <Text style={styles.metaValue}>{nextAllocation.exam_date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.metaLabel}>Time:</Text>
                        <Text style={styles.metaValue}>
                          {nextAllocation.start_time?.slice(0, 5)} - {nextAllocation.end_time?.slice(0, 5)}
                        </Text>
                      </View>
                    </View>

                    {/* Seat allocation hero box */}
                    {hasSeat ? (
                      <View style={styles.seatBox}>
                        <View style={styles.seatBadgeCol}>
                          <Text style={styles.seatBadgeLabel}>YOUR SEAT</Text>
                          <Text style={styles.seatBadgeNumber}>{nextAllocation.seat_label}</Text>
                        </View>
                        <View style={styles.seatDivider} />
                        <View style={styles.seatInfoCol}>
                          <Text style={styles.hallName}>{nextAllocation.hall_name}</Text>
                          <Text style={styles.hallLocation}>
                            {nextAllocation.building || "Examination Block"} • Floor {nextAllocation.floor ?? 1}
                          </Text>
                          <Text style={styles.hallNotice}>
                            Report to examination hall 15 minutes prior to scheduled start time.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.pendingSeatBox}>
                        <Ionicons name="time" size={18} color={colors.warning} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pendingSeatTitle}>Seating Allocation Pending</Text>
                          <Text style={styles.pendingSeatSub}>
                            The seating plan for this examination has not been published yet. Check back soon.
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyExamBox}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
                    <Text style={styles.emptyExamTitle}>No Pending Examinations</Text>
                    <Text style={styles.emptyExamSub}>
                      You currently have no scheduled or unassigned examinations in this academic term.
                    </Text>
                  </View>
                )}
              </Card>
            </FadeIn>

            {/* Upcoming Registered Exams Roster */}
            <FadeIn delay={150}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Registered Exams</Text>
                <Button
                  title="View All"
                  variant="ghost"
                  size="sm"
                  onPress={() => navigation.navigate("StudentExams")}
                />
              </View>

              {upcomingExams.length === 0 ? (
                <EmptyState
                  iconName="calendar-outline"
                  title="No Registered Exams"
                  message="No upcoming examination schedule was found for your registration record."
                />
              ) : (
                <View style={styles.examList}>
                  {upcomingExams.map((exam, idx) => {
                    const examHasSeat = Boolean(
                      exam.has_seating && exam.seat_label && exam.seat_label !== "TBA"
                    );
                    return (
                      <Touchable
                        key={exam.id || idx}
                        style={styles.examItemCard}
                        onPress={() => navigation.navigate("StudentExams")}
                      >
                        <View style={styles.examItemTop}>
                          <Text style={styles.examCode}>
                            {exam.subject_code || exam.course_code}
                          </Text>
                          <View
                            style={[
                              styles.examMiniPill,
                              {
                                backgroundColor: examHasSeat ? colors.pastelMint : colors.surfaceAlt,
                                borderColor: examHasSeat ? colors.successBorder : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.examMiniPillText,
                                { color: examHasSeat ? colors.successText : colors.textSecondary },
                              ]}
                            >
                              {examHasSeat ? `Seat ${exam.seat_label}` : "Seating Pending"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.examName} numberOfLines={1}>
                          {exam.exam_name || exam.name}
                        </Text>
                        <View style={styles.examItemBottom}>
                          <Text style={styles.examDateText}>
                            📅 {exam.exam_date} • {exam.start_time?.slice(0, 5)}
                          </Text>
                          {examHasSeat && (
                            <Text style={styles.examHallText}>
                              {exam.hall_name || `Hall ${exam.hall_code}`}
                            </Text>
                          )}
                        </View>
                      </Touchable>
                    );
                  })}
                </View>
              )}
            </FadeIn>
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  scrollDesktop: {
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    padding: spacing.xl,
  },
  profileBanner: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...textStyles.heading,
    color: colors.primaryDark,
  },
  profileInfo: {
    flex: 1,
  },
  studentName: {
    ...textStyles.title,
    color: colors.text,
    fontSize: 18,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  usnChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usnChipText: {
    ...textStyles.caption,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  deptChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptChipText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  semChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.pastelLavender,
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
  semChipText: {
    ...textStyles.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  nextExamCard: {
    padding: spacing.xl,
  },
  nextExamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  tagGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  calIconChip: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  nextExamTag: {
    ...textStyles.overline,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusPillText: {
    ...textStyles.overline,
    fontSize: 10,
    fontWeight: "700",
  },
  examDetails: {
    gap: spacing.sm,
  },
  examTitle: {
    ...textStyles.heading,
    fontSize: 20,
    color: colors.text,
  },
  examSubtitle: {
    ...textStyles.subtitle,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  metaValue: {
    ...textStyles.body,
    fontWeight: "600",
    color: colors.text,
  },
  seatBox: {
    flexDirection: "row",
    backgroundColor: colors.pastelMint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.lg,
    marginTop: spacing.sm,
    alignItems: "center",
    gap: spacing.lg,
  },
  seatBadgeCol: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  seatBadgeLabel: {
    ...textStyles.overline,
    color: colors.successText,
    letterSpacing: 0.8,
  },
  seatBadgeNumber: {
    ...textStyles.display,
    fontSize: 32,
    color: colors.successText,
    fontWeight: "800",
  },
  seatDivider: {
    width: 1,
    height: "80%",
    backgroundColor: colors.successBorder,
  },
  seatInfoCol: {
    flex: 1,
    gap: 3,
  },
  hallName: {
    ...textStyles.title,
    color: colors.text,
  },
  hallLocation: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  hallNotice: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.successText,
    marginTop: 4,
  },
  pendingSeatBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pendingSeatTitle: {
    ...textStyles.label,
    color: colors.warningText,
    fontWeight: "700",
  },
  pendingSeatSub: {
    ...textStyles.caption,
    color: colors.warningText,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyExamBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyExamTitle: {
    ...textStyles.title,
    color: colors.text,
  },
  emptyExamSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...textStyles.title,
    color: colors.text,
  },
  examList: {
    gap: spacing.sm,
  },
  examItemCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  examItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examCode: {
    ...textStyles.caption,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  examMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  examMiniPillText: {
    ...textStyles.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  examName: {
    ...textStyles.body,
    fontWeight: "600",
    color: colors.text,
  },
  examItemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  examDateText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  examHallText: {
    ...textStyles.caption,
    fontWeight: "600",
    color: colors.text,
  },
});