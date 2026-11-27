import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { FadeIn, Touchable, prefersReducedMotion } from "../../components/common/Motion";
import { colors, textStyles, spacing, radii, shadows, tones } from "../../theme/tokens";
import { showAlert } from "../../utils/alerts";
import api from "../../services/api";

export default function FindSeatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [usn, setUsn] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);
  const [lastQueryUsn, setLastQueryUsn] = useState("");
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [networkError, setNetworkError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);

  const handleSearch = async () => {
    const queryUsn = usn.trim().toUpperCase();
    if (!queryUsn) {
      showAlert("Input Required", "Please enter a valid Student USN.");
      return;
    }

    setLoading(true);
    setSearched(true);
    setLastQueryUsn(queryUsn);
    setNetworkError(null);
    setRateLimited(false);
    setStudentNotFound(false);
    setStudentName("");
    setStatusMessage("");

    try {
      const res = await api.get(`/student-portal/find-seat?usn=${encodeURIComponent(queryUsn)}`);
      const data = res.data || res;

      if (data.success) {
        const allocs = data.allocations || [];
        setResults(allocs);
        setStudentName(data.student_name || (allocs[0]?.student_name) || "");
        setStatusMessage(data.message || "");

        if (data.student_found === false || (data.message && data.message.toLowerCase().includes("no student found"))) {
          setStudentNotFound(true);
        } else {
          setStudentNotFound(false);
        }
      } else {
        setResults([]);
        setNetworkError(data.error || "Could not retrieve seating information.");
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        setRateLimited(true);
        setResults([]);
      } else {
        const errorMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Network connection failed. Could not reach server.";
        setNetworkError(errorMsg);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (user) {
      if ((user.role || "").toUpperCase() === "ADMIN") {
        navigation.navigate("AdminDashboard");
      } else if ((user.role || "").toUpperCase() === "FACULTY") {
        navigation.navigate("FacultyDuties");
      } else {
        navigation.navigate("StudentHome");
      }
    } else {
      navigation.navigate("Login");
    }
  };

  const goToStaffLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        {user ? (
          <Pressable
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Ionicons name="school" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.brandTitle}>ExamEase</Text>
              <Text style={styles.brandSub}>CAMPUS EXAM CELL</Text>
            </View>
          </View>
        )}

        <View style={styles.headerRight}>
          {!user ? (
            <Pressable
              style={styles.staffLoginHeaderBtn}
              onPress={goToStaffLogin}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Staff Sign In"
            >
              <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
              <Text style={styles.staffLoginHeaderText}>Staff Login</Text>
            </Pressable>
          ) : (
            <Text style={styles.headerTitle}>Seat Search</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Landing Hero Section */}
        <FadeIn delay={40} style={styles.heroWrap}>
          <View style={styles.heroPill}>
            <Ionicons name="search" size={12} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.heroPillText}>PUBLIC SEAT LOOKUP</Text>
          </View>
          <Text style={styles.heroHeading}>Find your exam seat</Text>
          <Text style={styles.heroSubtitle}>
            Enter your University Seat Number (USN) below to find your scheduled examination hall, floor, bench, and assigned seat.
          </Text>
        </FadeIn>

        {/* Large USN Search Card */}
        <FadeIn delay={80}>
          <Card style={styles.searchCard}>
            <Text style={styles.inputLabel}>University Seat Number (USN)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputLeadingIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 1MS22CS001"
                  placeholderTextColor={colors.textMuted}
                  value={usn}
                  onChangeText={(val) => {
                    setUsn(val);
                    if (networkError) setNetworkError(null);
                    if (rateLimited) setRateLimited(false);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  accessibilityLabel="University Seat Number input"
                />
                {usn ? (
                  <Pressable
                    onPress={() => setUsn("")}
                    hitSlop={8}
                    style={styles.clearBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Clear USN input"
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <Button
                title="Find Seat"
                variant="primary"
                size="md"
                onPress={handleSearch}
                loading={loading}
                icon={<Ionicons name="search" size={16} color={colors.textInverse} />}
                style={styles.findBtn}
                accessibilityLabel="Find seat allocation"
              />
            </View>
          </Card>
        </FadeIn>

        {/* State 1: Rate-limited (HTTP 429) */}
        {rateLimited && (
          <FadeIn delay={50}>
            <Card style={styles.warningBox}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="time" size={20} color={colors.warning} />
                <Text style={styles.warningTitle}>Search Limit Reached</Text>
              </View>
              <Text style={styles.warningBody}>
                Too many searches. Please wait a minute before searching again.
              </Text>
              <Button
                title="Try Again"
                variant="secondary"
                size="sm"
                onPress={handleSearch}
                style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                accessibilityLabel="Retry search"
              />
            </Card>
          </FadeIn>
        )}

        {/* State 2: Network / Server Error with Retry */}
        {!rateLimited && networkError && (
          <FadeIn delay={50}>
            <Card style={styles.errorBox}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={styles.errorTitle}>Connection Problem</Text>
              </View>
              <Text style={styles.errorBody}>{networkError}</Text>
              <Button
                title="Retry Search"
                variant="primary"
                size="sm"
                onPress={handleSearch}
                style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                icon={<Ionicons name="refresh" size={14} color={colors.textInverse} />}
                accessibilityLabel="Retry failed search"
              />
            </Card>
          </FadeIn>
        )}

        {/* State 3: Loading Skeleton */}
        {loading && (
          <View style={styles.skeletonWrap}>
            <LoadingSkeleton height={200} borderRadius={radii.lg} />
            <LoadingSkeleton height={140} borderRadius={radii.lg} />
          </View>
        )}

        {/* State 4 & 5: Searched Results */}
        {!loading && !networkError && !rateLimited && searched && results && (
          <View style={styles.resultsContainer}>
            {/* Student Not Found */}
            {studentNotFound ? (
              <FadeIn delay={50}>
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="person-remove-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>Student Not Found</Text>
                  <Text style={styles.emptyMessage}>
                    No student found with USN <Text style={{ fontWeight: "700" }}>{lastQueryUsn}</Text>.
                  </Text>
                  <Text style={styles.emptyHint}>
                    Please double-check your seat number or contact the examination management cell if your enrollment is missing.
                  </Text>
                </Card>
              </FadeIn>
            ) : results.length === 0 ? (
              /* Student Found, but no published seating */
              <FadeIn delay={50}>
                <Card style={styles.emptyCard}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="time-outline" size={32} color={colors.warning} />
                  </View>
                  <Text style={styles.emptyTitle}>Seating Not Published Yet</Text>
                  <Text style={styles.emptyMessage}>
                    {statusMessage ||
                      `No published seating yet for ${studentName || lastQueryUsn}. Check back closer to the exam.`}
                  </Text>
                  <Text style={styles.emptyHint}>
                    Seating arrangements are published 24–48 hours before examination commencement.
                  </Text>
                </Card>
              </FadeIn>
            ) : (
              /* Published Results as SeatCard Tickets */
              <FadeIn delay={50} style={{ gap: spacing.md }}>
                <View style={styles.resultsHeaderRow}>
                  <View>
                    <Text style={styles.foundCountText}>
                      Found {results.length} Published Exam Allocation{results.length > 1 ? "s" : ""}
                    </Text>
                    {studentName ? (
                      <Text style={styles.candidateNameText}>
                        Candidate: <Text style={{ fontWeight: "700", color: colors.text }}>{studentName}</Text> ({lastQueryUsn})
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.usnBadgePill}>
                    <Text style={styles.usnBadgeText}>{lastQueryUsn}</Text>
                  </View>
                </View>

                {results.map((item, idx) => (
                  <Card key={idx} style={styles.ticketCard}>
                    {/* Header Banner */}
                    <View style={styles.ticketHeader}>
                      <View style={styles.ticketBadgeRow}>
                        <View style={styles.examCodeBadge}>
                          <Text style={styles.examCodeBadgeText}>
                            {item.subject_code || item.course_code}
                          </Text>
                        </View>
                        <View style={styles.publishedStatusPill}>
                          <Text style={styles.publishedStatusText}>PUBLISHED ALLOCATION</Text>
                        </View>
                      </View>
                      <Text style={styles.ticketExamTitle}>
                        {item.exam_name || item.course_name}
                      </Text>
                      {item.department ? (
                        <Text style={styles.ticketDepartment}>
                          {item.department} {item.semester ? `• Semester ${item.semester}` : ""}
                        </Text>
                      ) : null}
                    </View>

                    {/* Date & Time Row */}
                    <View style={styles.ticketDateTimeRow}>
                      <View style={styles.ticketDateTimeItem}>
                        <Ionicons name="calendar" size={14} color={colors.primary} />
                        <View>
                          <Text style={styles.dtMetaLabel}>EXAM DATE</Text>
                          <Text style={styles.dtMetaValue}>{item.exam_date}</Text>
                        </View>
                      </View>
                      <View style={styles.ticketDtDivider} />
                      <View style={styles.ticketDateTimeItem}>
                        <Ionicons name="time" size={14} color={colors.accent} />
                        <View>
                          <Text style={styles.dtMetaLabel}>SESSION TIMING</Text>
                          <Text style={styles.dtMetaValue}>
                            {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Spotlight Hero Seat Box */}
                    <View style={styles.ticketSpotlightBox}>
                      <View style={styles.spotlightSeatCol}>
                        <Text style={styles.spotlightLabel}>ASSIGNED SEAT</Text>
                        <Text style={styles.spotlightSeatHero}>{item.seat_label}</Text>
                        {item.bench_label ? (
                          <Text style={styles.spotlightBench}>{item.bench_label}</Text>
                        ) : null}
                      </View>

                      <View style={styles.spotlightDivider} />

                      <View style={styles.spotlightHallCol}>
                        <Text style={styles.spotlightLabel}>EXAM LOCATION</Text>
                        <Text style={styles.spotlightHallTitle}>
                          {item.hall_name || `Hall ${item.hall_code}`}
                        </Text>
                        <Text style={styles.spotlightHallSub}>
                          {item.building || "Academic Complex"} • Floor {item.floor ?? 1}
                        </Text>
                        <View style={styles.arrivalNotice}>
                          <Ionicons name="information-circle" size={12} color={colors.successText} />
                          <Text style={styles.arrivalNoticeText}>
                            Report 15 minutes before exam start
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                ))}
              </FadeIn>
            )}
          </View>
        )}

        {/* State 6: Initial Idle Guide */}
        {!searched && !loading && (
          <FadeIn delay={120}>
            <Card style={styles.guideCard}>
              <View style={styles.guideTitleRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.guideTitle}>Instant Seat Lookup Guide</Text>
              </View>
              <Text style={styles.guideText}>
                • Type your complete University Seat Number (USN), e.g. <Text style={{ fontWeight: "700" }}>1MS22CS001</Text>.
              </Text>
              <Text style={styles.guideText}>
                • Instantly check your assigned examination hall, floor, building, and seat label.
              </Text>
              <Text style={styles.guideText}>
                • No login credentials or student account required.
              </Text>
              <Text style={styles.guideText}>
                • Seating allocations appear once officially published by the exam committee.
              </Text>
            </Card>
          </FadeIn>
        )}

        {/* Footer with Staff Login Link */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerBrand}>
            ExamEase Enterprise • Academic Year 2025–26
          </Text>
          <Text style={styles.footerNotice}>
            Campus Examination Cell & Seating Management
          </Text>
          {!user && (
            <Pressable
              style={styles.footerStaffBtn}
              onPress={goToStaffLogin}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Staff Sign In link in footer"
            >
              <Text style={styles.footerStaffBtnText}>
                Are you an administrator or faculty member? <Text style={styles.footerStaffBtnTextBold}>Staff sign in →</Text>
              </Text>
            </Pressable>
          )}
        </View>
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
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    ...textStyles.title,
    fontSize: 16,
    color: colors.text,
  },
  brandSub: {
    ...textStyles.overline,
    color: colors.primaryDark,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    ...textStyles.label,
    color: colors.text,
  },
  headerTitle: {
    ...textStyles.title,
    color: colors.text,
  },
  staffLoginHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  staffLoginHeaderText: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  scrollDesktop: {
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    padding: spacing.xl,
  },
  heroWrap: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    marginBottom: 4,
  },
  heroPillText: {
    ...textStyles.overline,
    fontSize: 10,
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  heroHeading: {
    ...textStyles.display,
    fontSize: 26,
    color: colors.text,
    textAlign: "center",
  },
  heroSubtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 580,
  },
  searchCard: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  inputLabel: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  inputWrapper: {
    flex: 1,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  inputLeadingIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...textStyles.body,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  findBtn: {
    minWidth: 110,
  },
  skeletonWrap: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  warningTitle: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.warningText,
  },
  warningBody: {
    ...textStyles.body,
    fontSize: 13,
    color: colors.warningText,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorTitle: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.dangerText,
  },
  errorBody: {
    ...textStyles.body,
    fontSize: 13,
    color: colors.dangerText,
    lineHeight: 18,
  },
  resultsContainer: {
    gap: spacing.md,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  foundCountText: {
    ...textStyles.title,
    fontSize: 15,
    color: colors.text,
  },
  candidateNameText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  usnBadgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.pastelBlue,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  usnBadgeText: {
    ...textStyles.overline,
    color: colors.primaryDark,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...textStyles.title,
    fontSize: 17,
    color: colors.text,
    textAlign: "center",
  },
  emptyMessage: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 480,
  },
  emptyHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginTop: spacing.xs,
    maxWidth: 440,
  },
  ticketCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticketHeader: {
    gap: 4,
  },
  ticketBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  examCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.pastelBlue,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  examCodeBadgeText: {
    ...textStyles.caption,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  publishedStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.pastelMint,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  publishedStatusText: {
    ...textStyles.overline,
    fontSize: 9,
    fontWeight: "700",
    color: colors.successText,
  },
  ticketExamTitle: {
    ...textStyles.title,
    fontSize: 17,
    color: colors.text,
  },
  ticketDepartment: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  ticketDateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  ticketDateTimeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ticketDtDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  dtMetaLabel: {
    ...textStyles.overline,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  dtMetaValue: {
    ...textStyles.body,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  ticketSpotlightBox: {
    flexDirection: "row",
    backgroundColor: colors.pastelMint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.md,
  },
  spotlightSeatCol: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  spotlightLabel: {
    ...textStyles.overline,
    fontSize: 9,
    color: colors.successText,
    letterSpacing: 0.8,
  },
  spotlightSeatHero: {
    ...textStyles.display,
    fontSize: 32,
    fontWeight: "800",
    color: colors.successText,
    marginVertical: 2,
  },
  spotlightBench: {
    ...textStyles.caption,
    fontSize: 11,
    fontWeight: "600",
    color: colors.successText,
  },
  spotlightDivider: {
    width: 1,
    height: "80%",
    backgroundColor: colors.successBorder,
  },
  spotlightHallCol: {
    flex: 1,
    gap: 2,
  },
  spotlightHallTitle: {
    ...textStyles.label,
    fontWeight: "700",
    fontSize: 15,
    color: colors.text,
  },
  spotlightHallSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  arrivalNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  arrivalNoticeText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.successText,
    fontWeight: "600",
  },
  guideCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  guideTitle: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.text,
  },
  guideText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footerWrap: {
    alignItems: "center",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  footerBrand: {
    ...textStyles.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  footerNotice: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  footerStaffBtn: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  footerStaffBtnText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  footerStaffBtnTextBold: {
    fontWeight: "700",
    color: colors.primary,
  },
});
