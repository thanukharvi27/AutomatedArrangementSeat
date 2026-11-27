import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Tabs } from "../../components/common/Tabs";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { ModalDialog } from "../../components/common/ModalDialog";
import { SearchInput } from "../../components/common/Input";
import { Touchable } from "../../components/common/Motion";
import { colors, textStyles, spacing, radii, shadows, tones } from "../../theme/tokens";
import api from "../../services/api";

const TAB_ITEMS = [
  { key: "all", label: "All Exams" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Past / Completed" },
];

export default function StudentExamsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketModalExam, setTicketModalExam] = useState(null);

  const fetchExams = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/student/exams");
      const data = res.data || res;
      if (data.success) {
        setExams(data.exams || []);
      }
    } catch (err) {
      console.log("Error loading student exams:", err?.message);
      setError(err?.message || "Failed to load examination schedule.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const filteredExams = exams.filter((exam) => {
    // Tab filter
    if (selectedTab === "upcoming" && exam.exam_date < todayStr) return false;
    if (selectedTab === "completed" && exam.exam_date >= todayStr) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (exam.course_code || exam.subject_code || "").toLowerCase();
      const name = (exam.course_name || exam.name || "").toLowerCase();
      const hall = (exam.hall_code || exam.hall_name || "").toLowerCase();
      if (!code.includes(q) && !name.includes(q) && !hall.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppLayout
      title="Examination Schedule"
      subtitle={`${exams.length} examinations registered`}
      currentRouteName="StudentExams"
      actions={
        <Button
          title="Refresh"
          variant="secondary"
          size="sm"
          onPress={() => {
            setLoading(true);
            fetchExams();
          }}
          icon={<Ionicons name="refresh" size={14} color={colors.text} />}
        />
      }
    >
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <View style={styles.controlsRow}>
          <SearchInput
            placeholder="Search exam code, course, or hall..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Tabs
          tabs={TAB_ITEMS}
          activeKey={selectedTab}
          onChange={setSelectedTab}
          style={{ marginBottom: spacing.md }}
        />

        {error && !loading && (
          <Card style={{ marginBottom: 16, backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.dangerText, fontWeight: "600", fontSize: 13 }}>Failed to load examinations</Text>
                <Text style={{ color: colors.dangerText, fontSize: 12, marginTop: 2 }}>{error}</Text>
              </View>
              <Button
                title="Retry"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setLoading(true);
                  fetchExams();
                }}
              />
            </View>
          </Card>
        )}

        {loading ? (
          <View style={{ gap: spacing.md }}>
            <LoadingSkeleton height={90} />
            <LoadingSkeleton height={90} />
            <LoadingSkeleton height={90} />
          </View>
        ) : (
          <FlatList
            data={filteredExams}
            keyExtractor={(item, index) => String(item.id || index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchExams();
                }}
              />
            }
            ListEmptyComponent={
              <EmptyState
                iconName="calendar-outline"
                title="No Examinations Found"
                message={
                  searchQuery
                    ? `No examinations matching "${searchQuery}".`
                    : "There are no examinations matching the selected filter."
                }
              />
            }
            renderItem={({ item }) => {
              const hasSeat = Boolean(
                item.has_seating && item.seat_label && item.seat_label !== "TBA"
              );
              const isPast = item.exam_date < todayStr;

              return (
                <Touchable
                  style={styles.examCard}
                  onPress={() => setTicketModalExam(item)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codeGroup}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>
                          {item.course_code || item.subject_code}
                        </Text>
                      </View>
                      <Text style={styles.examDate}>
                        📅 {item.exam_date}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: hasSeat
                            ? colors.pastelMint
                            : isPast
                            ? colors.surfaceAlt
                            : colors.pastelBlue,
                          borderColor: hasSeat
                            ? colors.successBorder
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: hasSeat
                              ? colors.successText
                              : isPast
                              ? colors.textMuted
                              : colors.primaryDark,
                          },
                        ]}
                      >
                        {hasSeat ? "SEAT ASSIGNED" : isPast ? "COMPLETED" : "SCHEDULED"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.courseName}>{item.course_name || item.name}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.timeInfo}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.timeText}>
                        {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5) || "13:00"}
                      </Text>
                    </View>

                    {hasSeat ? (
                      <View style={styles.seatBadge}>
                        <Ionicons name="business-outline" size={13} color={colors.successText} />
                        <Text style={styles.seatBadgeText}>
                          {item.hall_code || item.hall_name} • Seat {item.seat_label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.pendingText}>Seating Pending</Text>
                    )}
                  </View>
                </Touchable>
              );
            }}
          />
        )}
      </View>

      {/* Hall Ticket / Pass Detail Modal */}
      <ModalDialog
        visible={Boolean(ticketModalExam)}
        onClose={() => setTicketModalExam(null)}
        title="Examination Pass Details"
      >
        {ticketModalExam && (
          <View style={styles.modalContent}>
            <View style={styles.passHeader}>
              <View style={styles.passLogoCircle}>
                <Ionicons name="school" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passInstitution}>EXAMINATION MANAGEMENT CELL</Text>
                <Text style={styles.passCourse}>
                  {ticketModalExam.course_name || ticketModalExam.name}
                </Text>
                <Text style={styles.passCode}>
                  Course Code: {ticketModalExam.course_code || ticketModalExam.subject_code}
                </Text>
              </View>
            </View>

            <View style={styles.passDetailsGrid}>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Exam Date</Text>
                  <Text style={styles.gridVal}>{ticketModalExam.exam_date}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Session Timing</Text>
                  <Text style={styles.gridVal}>
                    {ticketModalExam.start_time?.slice(0, 5)} - {ticketModalExam.end_time?.slice(0, 5) || "13:00"}
                  </Text>
                </View>
              </View>

              <View style={styles.passSeatBox}>
                <Text style={styles.passSeatLabel}>OFFICIAL SEATING ALLOCATION</Text>
                {ticketModalExam.has_seating && ticketModalExam.seat_label && ticketModalExam.seat_label !== "TBA" ? (
                  <View style={styles.passSeatContent}>
                    <Text style={styles.passSeatHero}>{ticketModalExam.seat_label}</Text>
                    <View>
                      <Text style={styles.passHallTitle}>
                        {ticketModalExam.hall_name || `Hall ${ticketModalExam.hall_code}`}
                      </Text>
                      <Text style={styles.passHallSub}>
                        {ticketModalExam.building || "Academic Complex"} (Floor {ticketModalExam.floor ?? 1})
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.passPendingText}>
                    Seating arrangement is currently being processed by the examination committee.
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.guidelinesBox}>
              <Text style={styles.guidelinesTitle}>Examination Guidelines:</Text>
              <Text style={styles.guidelineItem}>• Candidates must arrive 15 minutes before exam commencement.</Text>
              <Text style={styles.guidelineItem}>• College ID card and Hall Pass must be produced on demand.</Text>
              <Text style={styles.guidelineItem}>• Electronic gadgets, mobile phones, and smart watches are strictly prohibited.</Text>
            </View>

            <Button
              title="Close"
              variant="secondary"
              size="md"
              onPress={() => setTicketModalExam(null)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}
      </ModalDialog>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  containerDesktop: {
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    padding: spacing.xl,
  },
  controlsRow: {
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing["3xl"],
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.pastelBlue,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  codeText: {
    ...textStyles.caption,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  examDate: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusPillText: {
    ...textStyles.overline,
    fontSize: 10,
    fontWeight: "700",
  },
  courseName: {
    ...textStyles.title,
    fontSize: 15,
    color: colors.text,
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  seatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.pastelMint,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  seatBadgeText: {
    ...textStyles.caption,
    fontWeight: "700",
    color: colors.successText,
  },
  pendingText: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  modalContent: {
    gap: spacing.md,
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  passInstitution: {
    ...textStyles.overline,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  passCourse: {
    ...textStyles.title,
    color: colors.text,
  },
  passCode: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  passDetailsGrid: {
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  gridVal: {
    ...textStyles.body,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  passSeatBox: {
    backgroundColor: colors.pastelMint,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  passSeatLabel: {
    ...textStyles.overline,
    color: colors.successText,
    letterSpacing: 0.8,
  },
  passSeatContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  passSeatHero: {
    ...textStyles.display,
    fontSize: 28,
    fontWeight: "800",
    color: colors.successText,
  },
  passHallTitle: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.text,
  },
  passHallSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  passPendingText: {
    ...textStyles.body,
    color: colors.warningText,
    marginTop: 4,
  },
  guidelinesBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  guidelinesTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  guidelineItem: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});