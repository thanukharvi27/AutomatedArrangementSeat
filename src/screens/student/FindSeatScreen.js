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
import { getWebInputPropsStyle, getContainerFocusStyle } from "../../components/common/Input";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { FadeIn } from "../../components/common/Motion";
import { colors, textStyles, spacing, radii, shadows, transition, motion } from "../../theme/tokens";
import { showAlert } from "../../utils/alerts";
import { studentPortalApi, facultyApi } from "../../services/api";

const MODE_STUDENT = "student";
const MODE_FACULTY = "faculty";

export default function FindSeatScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [lookupMode, setLookupMode] = useState(MODE_STUDENT);
  const [inputFocused, setInputFocused] = useState(false);

  // Student Seat Lookup state
  const [usn, setUsn] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [seatResults, setSeatResults] = useState(null);
  const [studentSearched, setStudentSearched] = useState(false);
  const [lastQueryUsn, setLastQueryUsn] = useState("");
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentStatusMessage, setStudentStatusMessage] = useState("");
  const [studentError, setStudentError] = useState(null);
  const [studentRateLimited, setStudentRateLimited] = useState(false);

  // Faculty Duty Lookup state
  const [employeeId, setEmployeeId] = useState("");
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [dutyResults, setDutyResults] = useState(null);
  const [facultySearched, setFacultySearched] = useState(false);
  const [lastQueryEmpId, setLastQueryEmpId] = useState("");
  const [facultyNotFound, setFacultyNotFound] = useState(false);
  const [facultyMeta, setFacultyMeta] = useState(null);
  const [facultyStatusMessage, setFacultyStatusMessage] = useState("");
  const [facultyError, setFacultyError] = useState(null);
  const [facultyRateLimited, setFacultyRateLimited] = useState(false);

  const isFacultyMode = lookupMode === MODE_FACULTY;

  const handleSearchStudent = async () => {
    const queryUsn = usn.trim().toUpperCase();
    if (!queryUsn) {
      showAlert("Input Required", "Please enter a valid Student USN.");
      return;
    }

    setStudentLoading(true);
    setStudentSearched(true);
    setLastQueryUsn(queryUsn);
    setStudentError(null);
    setStudentRateLimited(false);
    setStudentNotFound(false);
    setStudentName("");
    setStudentStatusMessage("");

    try {
      const res = await studentPortalApi.publicFindSeat(queryUsn);
      const data = res?.data || res;

      if (data?.success) {
        const allocs = data.allocations || [];
        setSeatResults(allocs);
        setStudentName(data.student_name || allocs[0]?.student_name || "");
        setStudentStatusMessage(data.message || "");

        if (
          data.student_found === false ||
          (data.message && data.message.toLowerCase().includes("no student found"))
        ) {
          setStudentNotFound(true);
        } else {
          setStudentNotFound(false);
        }
      } else {
        setSeatResults([]);
        setStudentError(data?.error || "Could not retrieve seating information.");
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 429) {
        setStudentRateLimited(true);
        setSeatResults([]);
      } else {
        const errorMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Network connection failed. Could not reach server.";
        setStudentError(errorMsg);
        setSeatResults([]);
      }
    } finally {
      setStudentLoading(false);
    }
  };

  const handleSearchFaculty = async () => {
    const queryEmpId = employeeId.trim().toUpperCase();
    if (!queryEmpId) {
      showAlert("Input Required", "Please enter a valid Faculty Employee ID.");
      return;
    }

    setFacultyLoading(true);
    setFacultySearched(true);
    setLastQueryEmpId(queryEmpId);
    setFacultyError(null);
    setFacultyRateLimited(false);
    setFacultyNotFound(false);
    setFacultyMeta(null);
    setFacultyStatusMessage("");

    try {
      const res = await facultyApi.publicFindDuties(queryEmpId);
      const data = res?.data || res;

      if (data?.success) {
        const duties = data.duties || [];
        setDutyResults(duties);
        setFacultyStatusMessage(data.message || "");

        if (data.faculty_found === false) {
          setFacultyNotFound(true);
        } else {
          setFacultyNotFound(false);
          setFacultyMeta({
            name: data.faculty_name || "",
            employeeId: data.employee_id || queryEmpId,
            departmentCode: data.department_code || "",
            departmentName: data.department_name || "",
          });
        }
      } else {
        setDutyResults([]);
        setFacultyError(data?.error || "Could not retrieve invigilation duties.");
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 429) {
        setFacultyRateLimited(true);
        setDutyResults([]);
      } else {
        const errorMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Network connection failed. Could not reach server.";
        setFacultyError(errorMsg);
        setDutyResults([]);
      }
    } finally {
      setFacultyLoading(false);
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

  const goToAdminLogin = () => {
    navigation.navigate("Login");
  };

  const activeLoading = isFacultyMode ? facultyLoading : studentLoading;
  const activeError = isFacultyMode ? facultyError : studentError;
  const activeRateLimited = isFacultyMode ? facultyRateLimited : studentRateLimited;
  const activeSearched = isFacultyMode ? facultySearched : studentSearched;
  const activeRetry = isFacultyMode ? handleSearchFaculty : handleSearchStudent;

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
              style={styles.adminLoginHeaderBtn}
              onPress={goToAdminLogin}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Admin Sign In"
            >
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.adminLoginHeaderText}>Admin Sign In</Text>
            </Pressable>
          ) : (
            <Text style={styles.headerTitle}>Seat & Duty Lookup</Text>
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
            <Text style={styles.heroPillText}>
              {isFacultyMode ? "PUBLIC FACULTY DUTY LOOKUP" : "PUBLIC SEAT LOOKUP"}
            </Text>
          </View>
          <Text style={styles.heroHeading}>
            {isFacultyMode ? "Find your invigilation duties" : "Find your exam seat"}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isFacultyMode
              ? "Enter your Faculty Employee ID below to check your upcoming invigilation assignments, examination halls, and session timings."
              : "Enter your University Seat Number (USN) below to find your scheduled examination hall, floor, bench, and assigned seat."}
          </Text>
        </FadeIn>

        {/* Mode Switcher + Search Card */}
        <FadeIn delay={80}>
          <Card style={styles.searchCard}>
            {/* Segmented Mode Toggle */}
            <View style={styles.modeSwitchWrap} accessibilityRole="tablist">
              <Pressable
                style={[styles.modeTab, !isFacultyMode && styles.modeTabActive]}
                onPress={() => {
                  setLookupMode(MODE_STUDENT);
                  setInputFocused(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: !isFacultyMode }}
                accessibilityLabel="Find Exam Seat"
              >
                <Ionicons
                  name="school-outline"
                  size={15}
                  color={!isFacultyMode ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, !isFacultyMode && styles.modeTabTextActive]}>
                  Student Seat (USN)
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modeTab, isFacultyMode && styles.modeTabActive]}
                onPress={() => {
                  setLookupMode(MODE_FACULTY);
                  setInputFocused(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFacultyMode }}
                accessibilityLabel="Find Faculty Duties"
              >
                <Ionicons
                  name="briefcase-outline"
                  size={15}
                  color={isFacultyMode ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, isFacultyMode && styles.modeTabTextActive]}>
                  Faculty Duties (ID)
                </Text>
              </Pressable>
            </View>

            {!isFacultyMode ? (
              <>
                <Text style={styles.inputLabel}>University Seat Number (USN)</Text>
                <View style={styles.inputRow}>
                  <View
                    style={[
                      styles.inputWrapper,
                      transition("all", motion.fast),
                      inputFocused && getContainerFocusStyle(),
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={inputFocused ? colors.primary : colors.textMuted}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.textInput, getWebInputPropsStyle(colors.surfaceAlt)]}
                      placeholder="e.g. 1MS22CS001"
                      placeholderTextColor={colors.textMuted}
                      value={usn}
                      onChangeText={(val) => {
                        setUsn(val);
                        if (studentError) setStudentError(null);
                        if (studentRateLimited) setStudentRateLimited(false);
                      }}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={handleSearchStudent}
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
                    onPress={handleSearchStudent}
                    loading={studentLoading}
                    icon={<Ionicons name="search" size={16} color={colors.textInverse} />}
                    style={styles.findBtn}
                    accessibilityLabel="Find seat allocation"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Faculty Employee ID</Text>
                <View style={styles.inputRow}>
                  <View
                    style={[
                      styles.inputWrapper,
                      transition("all", motion.fast),
                      inputFocused && getContainerFocusStyle(),
                    ]}
                  >
                    <Ionicons
                      name="id-card-outline"
                      size={18}
                      color={inputFocused ? colors.primary : colors.textMuted}
                      style={styles.inputLeadingIcon}
                    />
                    <TextInput
                      style={[styles.textInput, getWebInputPropsStyle(colors.surfaceAlt)]}
                      placeholder="e.g. FAC-001"
                      placeholderTextColor={colors.textMuted}
                      value={employeeId}
                      onChangeText={(val) => {
                        setEmployeeId(val);
                        if (facultyError) setFacultyError(null);
                        if (facultyRateLimited) setFacultyRateLimited(false);
                      }}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={handleSearchFaculty}
                      accessibilityLabel="Faculty Employee ID input"
                    />
                    {employeeId ? (
                      <Pressable
                        onPress={() => setEmployeeId("")}
                        hitSlop={8}
                        style={styles.clearBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Clear Employee ID input"
                      >
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Button
                    title="Find Duties"
                    variant="primary"
                    size="md"
                    onPress={handleSearchFaculty}
                    loading={facultyLoading}
                    icon={<Ionicons name="search" size={16} color={colors.textInverse} />}
                    style={styles.findBtn}
                    accessibilityLabel="Find faculty duties"
                  />
                </View>
              </>
            )}
          </Card>
        </FadeIn>

        {/* State 1: Rate-limited (HTTP 429) */}
        {activeRateLimited && (
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
                onPress={activeRetry}
                style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                accessibilityLabel="Retry search"
              />
            </Card>
          </FadeIn>
        )}

        {/* State 2: Network / Server Error with Retry */}
        {!activeRateLimited && activeError && (
          <FadeIn delay={50}>
            <Card style={styles.errorBox}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={styles.errorTitle}>Connection Problem</Text>
              </View>
              <Text style={styles.errorBody}>{activeError}</Text>
              <Button
                title="Retry Search"
                variant="primary"
                size="sm"
                onPress={activeRetry}
                style={{ alignSelf: "flex-start", marginTop: spacing.sm }}
                icon={<Ionicons name="refresh" size={14} color={colors.textInverse} />}
                accessibilityLabel="Retry failed search"
              />
            </Card>
          </FadeIn>
        )}

        {/* State 3: Loading Skeleton */}
        {activeLoading && (
          <View style={styles.skeletonWrap}>
            <LoadingSkeleton height={200} borderRadius={radii.lg} />
            <LoadingSkeleton height={140} borderRadius={radii.lg} />
          </View>
        )}

        {/* State 4A: Student Seat Results */}
        {!isFacultyMode && !studentLoading && !studentError && !studentRateLimited && studentSearched && seatResults && (
          <View style={styles.resultsContainer}>
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
            ) : seatResults.length === 0 ? (
              <FadeIn delay={50}>
                <Card style={styles.emptyCard}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name="time-outline" size={32} color={colors.warning} />
                  </View>
                  <Text style={styles.emptyTitle}>Seating Not Published Yet</Text>
                  <Text style={styles.emptyMessage}>
                    {studentStatusMessage ||
                      `No published seating yet for ${studentName || lastQueryUsn}. Check back closer to the exam.`}
                  </Text>
                  <Text style={styles.emptyHint}>
                    Seating arrangements are published 24–48 hours before examination commencement.
                  </Text>
                </Card>
              </FadeIn>
            ) : (
              <FadeIn delay={50} style={{ gap: spacing.md }}>
                <View style={styles.resultsHeaderRow}>
                  <View>
                    <Text style={styles.foundCountText}>
                      Found {seatResults.length} Published Exam Allocation{seatResults.length > 1 ? "s" : ""}
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

                {seatResults.map((item, idx) => (
                  <Card key={idx} style={styles.ticketCard}>
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

        {/* State 4B: Faculty Duty Results */}
        {isFacultyMode && !facultyLoading && !facultyError && !facultyRateLimited && facultySearched && dutyResults && (
          <View style={styles.resultsContainer}>
            {facultyNotFound ? (
              <FadeIn delay={50}>
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="person-remove-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>Faculty Record Not Found</Text>
                  <Text style={styles.emptyMessage}>
                    No faculty found with employee ID <Text style={{ fontWeight: "700" }}>{lastQueryEmpId}</Text>.
                  </Text>
                  <Text style={styles.emptyHint}>
                    Verify your employee ID (e.g. FAC-001) or contact the examination cell administrator.
                  </Text>
                </Card>
              </FadeIn>
            ) : dutyResults.length === 0 ? (
              <FadeIn delay={50}>
                <Card style={styles.emptyCard}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.pastelBlue }]}>
                    <Ionicons name="calendar-clear-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No Upcoming Duties</Text>
                  <Text style={styles.emptyMessage}>
                    {facultyStatusMessage ||
                      `No upcoming invigilation duties scheduled for ${facultyMeta?.name || lastQueryEmpId}.`}
                  </Text>
                  <Text style={styles.emptyHint}>
                    Check back closer to examination dates or contact the exam coordinator for updates.
                  </Text>
                </Card>
              </FadeIn>
            ) : (
              <FadeIn delay={50} style={{ gap: spacing.md }}>
                <View style={styles.resultsHeaderRow}>
                  <View>
                    <Text style={styles.foundCountText}>
                      {dutyResults.length} Upcoming Invigilation {dutyResults.length === 1 ? "Duty" : "Duties"}
                    </Text>
                    {facultyMeta?.name ? (
                      <Text style={styles.candidateNameText}>
                        Invigilator: <Text style={{ fontWeight: "700", color: colors.text }}>{facultyMeta.name}</Text>
                        {facultyMeta.departmentCode ? ` • ${facultyMeta.departmentCode}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.usnBadgePill}>
                    <Text style={styles.usnBadgeText}>{facultyMeta?.employeeId || lastQueryEmpId}</Text>
                  </View>
                </View>

                {dutyResults.map((duty, idx) => (
                  <Card key={duty.id || idx} style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <View style={styles.ticketBadgeRow}>
                        <View style={styles.examCodeBadge}>
                          <Text style={styles.examCodeBadgeText}>
                            {duty.subject_code || "EXAM"}
                          </Text>
                        </View>
                        <View style={styles.dutyStatusPill}>
                          <Text style={styles.dutyStatusText}>{duty.status || "ASSIGNED"}</Text>
                        </View>
                      </View>
                      <Text style={styles.ticketExamTitle}>
                        {duty.exam_name || "Examination Duty"}
                      </Text>
                    </View>

                    <View style={styles.ticketDateTimeRow}>
                      <View style={styles.ticketDateTimeItem}>
                        <Ionicons name="calendar" size={14} color={colors.primary} />
                        <View>
                          <Text style={styles.dtMetaLabel}>DUTY DATE</Text>
                          <Text style={styles.dtMetaValue}>{duty.duty_date}</Text>
                        </View>
                      </View>
                      <View style={styles.ticketDtDivider} />
                      <View style={styles.ticketDateTimeItem}>
                        <Ionicons name="time" size={14} color={colors.accent} />
                        <View>
                          <Text style={styles.dtMetaLabel}>REPORTING TIME</Text>
                          <Text style={styles.dtMetaValue}>
                            {duty.start_time?.slice(0, 5)} - {duty.end_time?.slice(0, 5)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.dutyHallBox}>
                      <View style={styles.dutyHallIconCircle}>
                        <Ionicons name="business" size={20} color={colors.primaryDark} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.dutyHallLabel}>SUPERVISING HALL</Text>
                        <Text style={styles.spotlightHallTitle}>{duty.hall_name || "TBA"}</Text>
                        <Text style={styles.spotlightHallSub}>
                          {duty.building || "Academic Complex"} • Floor {duty.floor ?? 1}
                          {duty.hall_capacity ? ` • Capacity ${duty.hall_capacity}` : ""}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </FadeIn>
            )}
          </View>
        )}

        {/* State 5: Initial Idle Guide */}
        {!activeSearched && !activeLoading && (
          <FadeIn delay={120}>
            <Card style={styles.guideCard}>
              <View style={styles.guideTitleRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.guideTitle}>
                  {isFacultyMode ? "Faculty Duty Lookup Guide" : "Instant Seat Lookup Guide"}
                </Text>
              </View>
              {isFacultyMode ? (
                <>
                  <Text style={styles.guideText}>
                    • Enter your Faculty Employee ID, e.g. <Text style={{ fontWeight: "700" }}>FAC-001</Text>.
                  </Text>
                  <Text style={styles.guideText}>
                    • View all upcoming, active invigilation hall assignments and reporting times.
                  </Text>
                  <Text style={styles.guideText}>
                    • No faculty login account or password is required.
                  </Text>
                </>
              ) : (
                <>
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
                </>
              )}
            </Card>
          </FadeIn>
        )}

        {/* Footer with Admin Sign In Link */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerBrand}>
            ExamEase Enterprise • Academic Year 2025–26
          </Text>
          <Text style={styles.footerNotice}>
            Campus Examination Cell & Seating Management
          </Text>
          {!user && (
            <Pressable
              style={styles.footerAdminBtn}
              onPress={goToAdminLogin}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Admin Sign In link in footer"
            >
              <Text style={styles.footerAdminBtnText}>
                Examination administrator? <Text style={styles.footerAdminBtnTextBold}>Admin Sign In →</Text>
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
    fontSize: 11,
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
  adminLoginHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  adminLoginHeaderText: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
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
    fontSize: 11,
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
    gap: spacing.sm,
  },
  modeSwitchWrap: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
    marginBottom: spacing.xs,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    ...transition("all", motion.fast),
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    ...shadows.subtle,
  },
  modeTabText: {
    ...textStyles.label,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
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
    overflow: "hidden",
  },
  inputLeadingIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    ...textStyles.body,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    height: "100%",
    backgroundColor: "transparent",
    borderWidth: 0,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 4,
    marginLeft: spacing.xs,
    backgroundColor: "transparent",
    borderRadius: radii.sm,
  },
  findBtn: {
    minWidth: 120,
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
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: "700",
    color: colors.successText,
  },
  dutyStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.pastelLavender,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  dutyStatusText: {
    ...textStyles.overline,
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
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
    fontSize: 11,
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
    fontSize: 11,
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
  dutyHallBox: {
    flexDirection: "row",
    backgroundColor: colors.pastelBlue,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.md,
  },
  dutyHallIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  dutyHallLabel: {
    ...textStyles.overline,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: 0.8,
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
  footerAdminBtn: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  footerAdminBtnText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  footerAdminBtnTextBold: {
    fontWeight: "700",
    color: colors.primary,
  },
});
