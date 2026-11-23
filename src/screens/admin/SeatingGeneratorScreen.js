import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, typography, shadows } from "../../theme/colors";
import { showAlert } from "../../utils/alerts";
import api, { examApi, hallApi, seatingApi } from "../../services/api";

export default function SeatingGeneratorScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [exams, setExams] = useState([]);
  const [halls, setHalls] = useState([]);
  const [plans, setPlans] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedHallIds, setSelectedHallIds] = useState([]);
  const [selectedExamRegCount, setSelectedExamRegCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const loadData = async () => {
    try {
      const [examsRes, hallsRes, plansRes] = await Promise.allSettled([
        examApi.getAll(),
        hallApi.getAll(),
        seatingApi.getPlans(),
      ]);

      let loadedExams = [];
      if (examsRes.status === "fulfilled") {
        const edata = examsRes.value.data || examsRes.value;
        loadedExams = edata.exams || [];
        setExams(loadedExams);
      }

      if (hallsRes.status === "fulfilled") {
        const hdata = hallsRes.value.data || hallsRes.value;
        const loadedHalls = hdata.halls || [];
        setHalls(loadedHalls);
        setSelectedHallIds(loadedHalls.map((h) => h.id));
      }

      if (plansRes.status === "fulfilled") {
        const pdata = plansRes.value.data || plansRes.value;
        setPlans(pdata.plans || []);
      }

      if (loadedExams.length > 0 && !selectedExamId) {
        handleSelectExam(loadedExams[0]);
      }
    } catch (err) {
      console.log("Error loading generator data:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectExam = async (exam) => {
    setSelectedExamId(exam.id);
    try {
      const res = await api.get(`/exams/${exam.id}/registrations`);
      const data = res.data || res;
      if (data.success) {
        setSelectedExamRegCount(data.registrations?.length || 0);
      }
    } catch {
      setSelectedExamRegCount(exam.registered_count || 0);
    }
  };

  const handleToggleHall = (hallId) => {
    if (selectedHallIds.includes(hallId)) {
      if (selectedHallIds.length === 1) {
        showAlert("Notice", "At least one examination hall must be selected.");
        return;
      }
      setSelectedHallIds(selectedHallIds.filter((id) => id !== hallId));
    } else {
      setSelectedHallIds([...selectedHallIds, hallId]);
    }
  };

  const handleSelectAllHalls = () => {
    setSelectedHallIds(halls.map((h) => h.id));
  };

  const handleRegisterEligible = async () => {
    if (!selectedExamId) return;
    setRegistering(true);
    try {
      const res = await examApi.registerStudents(selectedExamId);
      const data = res.data || res;
      if (data.success) {
        showAlert("Students Registered", data.message || "Eligible department students registered successfully!");
        const currentExam = exams.find((e) => e.id === selectedExamId);
        if (currentExam) handleSelectExam(currentExam);
      } else {
        showAlert("Registration Note", data.error || "Could not register students.");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.error || err.message || "Registration failed.");
    } finally {
      setRegistering(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedHallsList = halls.filter((h) => selectedHallIds.includes(h.id));
  const totalSelectedCapacity = selectedHallsList.reduce((acc, h) => acc + (h.capacity || 0), 0);
  const hasSufficientCapacity = totalSelectedCapacity >= selectedExamRegCount;

  const handleGenerate = async () => {
    if (!selectedExamId) {
      showAlert("Missing Selection", "Please select an examination to generate seating for.");
      return;
    }
    if (selectedHallIds.length === 0) {
      showAlert("Missing Selection", "Please select at least one examination hall.");
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        exam_id: selectedExamId,
        hall_ids: selectedHallIds,
        policy: "INTERLEAVE",
        force: true,
      };

      const res = await seatingApi.generate(payload);
      const data = res.data || res;

      if (data.success) {
        showAlert(
          "Seating Generated!",
          data.message || "Automated seating arrangement generated and saved successfully!"
        );
        loadData();

        const planId = data.plan?.id || (data.plans && data.plans[0]?.id);
        if (planId) {
          navigation.navigate("SeatingPlanDetail", { planId });
        }
      } else {
        showAlert("Allocation Note", data.error || "Could not complete seating allocation.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Could not generate seating.";
      showAlert("Generation Failed", msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading seating allocation engine..." />;

  return (
    <ResponsiveLayout
      title="Seating Allocation Generator"
      subtitle="Automated anti-collision exam seat allocation & hall assignment"
      currentRouteName="SeatingPlans"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Step 1: Select Examination */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Select Examination</Text>
              <Text style={styles.stepSub}>Choose scheduled exam for seating allocation</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examPickerScroll}>
            {exams.map((exam) => {
              const isSelected = selectedExamId === exam.id;
              return (
                <Pressable
                  key={exam.id}
                  style={[styles.examChip, isSelected && styles.examChipActive]}
                  onPress={() => handleSelectExam(exam)}
                >
                  <Text style={[styles.examChipCode, isSelected && styles.examChipCodeActive]}>
                    {exam.course_code || exam.subject_code}
                  </Text>
                  <Text style={[styles.examChipName, isSelected && styles.examChipNameActive]} numberOfLines={1}>
                    {exam.course_name || exam.name}
                  </Text>
                  <Text style={[styles.examChipDate, isSelected && styles.examChipDateActive]}>
                    📅 {exam.exam_date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected Exam Details Card */}
          {selectedExam ? (
            <View style={styles.selectedExamBox}>
              <View style={styles.selectedExamTop}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.selectedExamTitle}>
                    {selectedExam.course_name || selectedExam.name} ({selectedExam.course_code || selectedExam.subject_code})
                  </Text>
                  <Text style={styles.selectedExamMeta}>
                    📅 {selectedExam.exam_date} • {selectedExam.start_time?.slice(0, 5)} - {selectedExam.end_time?.slice(0, 5)} ({selectedExam.session})
                  </Text>
                  <Text style={styles.selectedExamDept}>
                    Department: {selectedExam.department_name || "Engineering"} • Semester {selectedExam.semester}
                  </Text>
                </View>
                <View style={styles.regCountPill}>
                  <Text style={styles.regCountNum}>{selectedExamRegCount}</Text>
                  <Text style={styles.regCountLabel}>Students</Text>
                </View>
              </View>

              {selectedExamRegCount === 0 && (
                <View style={styles.emptyRegWarning}>
                  <Ionicons name="alert-circle" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={styles.emptyRegWarningText}>
                    No registered students found for this exam yet.
                  </Text>
                  <Pressable
                    style={styles.autoRegisterBtn}
                    onPress={handleRegisterEligible}
                    disabled={registering}
                  >
                    <Text style={styles.autoRegisterBtnText}>
                      {registering ? "Registering..." : "Auto-Register"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noExamText}>No scheduled examinations available.</Text>
          )}
        </View>

        {/* Step 2: Select Examination Halls */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.stepBadgeText, { color: colors.successText }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Select Examination Halls</Text>
              <Text style={styles.stepSub}>Pick available rooms to allocate seats into</Text>
            </View>
            <Pressable onPress={handleSelectAllHalls} hitSlop={6}>
              <Text style={styles.selectAllLink}>Select All Halls</Text>
            </Pressable>
          </View>

          <View style={styles.hallsGrid}>
            {halls.map((hall) => {
              const isSelected = selectedHallIds.includes(hall.id);
              return (
                <Pressable
                  key={hall.id}
                  style={[styles.hallSelectCard, isSelected && styles.hallSelectCardActive]}
                  onPress={() => handleToggleHall(hall.id)}
                >
                  <View style={styles.hallSelectCardTop}>
                    <Text style={[styles.hallSelectCode, isSelected && styles.hallSelectCodeActive]}>
                      {hall.hall_code || hall.name}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={18}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <Text style={styles.hallSelectBuilding}>
                    {hall.building} (Floor {hall.floor})
                  </Text>
                  <Text style={[styles.hallSelectCap, isSelected && { color: colors.successText, fontWeight: "700" }]}>
                    Capacity: {hall.capacity} seats ({hall.num_rows || hall.rows_count} benches)
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Step 3: Capacity Verification & Run Engine */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.stepBadgeText, { color: colors.infoText }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Verify Capacity & Generate</Text>
              <Text style={styles.stepSub}>Confirm room capacity and run automated seating engine</Text>
            </View>
          </View>

          {/* Verification Metrics Bar */}
          <View style={[styles.capacitySummaryBox, hasSufficientCapacity ? styles.capacityOk : styles.capacityWarn]}>
            <View style={styles.capacityCol}>
              <Text style={styles.capacityLabel}>Students to Seat</Text>
              <Text style={styles.capacityVal}>{selectedExamRegCount}</Text>
            </View>
            <View style={styles.capacityDivider} />
            <View style={styles.capacityCol}>
              <Text style={styles.capacityLabel}>Selected Hall Seats</Text>
              <Text style={[styles.capacityVal, { color: hasSufficientCapacity ? colors.successText : colors.warningText }]}>
                {totalSelectedCapacity}
              </Text>
            </View>
            <View style={styles.capacityDivider} />
            <View style={styles.capacityCol}>
              <Text style={styles.capacityLabel}>Surplus / Deficit</Text>
              <Text style={[styles.capacityVal, { color: hasSufficientCapacity ? colors.successText : colors.errorText }]}>
                {totalSelectedCapacity - selectedExamRegCount >= 0
                  ? `+${totalSelectedCapacity - selectedExamRegCount}`
                  : `${totalSelectedCapacity - selectedExamRegCount}`}
              </Text>
            </View>
          </View>

          {/* Generate Button */}
          <Pressable
            style={[styles.generateBtn, generating && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[styles.generateBtnText, { marginLeft: 10 }]}>Running Auto-Allocation Engine...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.generateBtnText}>Generate Seating Arrangement</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Previously Saved Seating Plans */}
        <View style={styles.historySection}>
          <Text style={styles.historyHeading}>Saved Seating Arrangements</Text>
          <Text style={styles.historySub}>Inspect interactive hall visual grid & publish live arrangements</Text>

          {plans.length === 0 ? (
            <Text style={styles.noPlansText}>No seating arrangements generated yet.</Text>
          ) : (
            plans.map((p) => {
              const isPub = (p.status || "").toUpperCase() === "PUBLISHED";
              return (
                <Pressable
                  key={p.id}
                  style={styles.planCard}
                  onPress={() => navigation.navigate("SeatingPlanDetail", { planId: p.id })}
                >
                  <View style={styles.planCardTop}>
                    <Text style={styles.planExamName}>{p.plan_name || p.exam_name || "Seating Plan"}</Text>
                    <Badge
                      label={p.status || "DRAFT"}
                      variant={isPub ? "success" : "warning"}
                      size="sm"
                    />
                  </View>

                  <Text style={styles.planMeta}>
                    📅 {p.exam_date} • {p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)} • Version {p.version || 1}
                  </Text>
                  <Text style={styles.planAllocated}>
                    👥 Allocated: <Text style={{ fontWeight: "700", color: colors.text }}>{p.allocated_seats || p.total_allocated || 0} candidates</Text>
                  </Text>

                  <View style={styles.planActionRow}>
                    <Text style={styles.viewPlanLink}>View Visual Hall Grid & Allocations →</Text>
                  </View>
                </Pressable>
              );
            })
          )}
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
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...shadows.sm,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  stepSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  selectAllLink: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  examPickerScroll: {
    flexDirection: "row",
    marginBottom: 10,
  },
  examChip: {
    width: 170,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  examChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  examChipCode: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  examChipCodeActive: {
    color: colors.primaryDark,
  },
  examChipName: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  examChipNameActive: {
    color: colors.primaryDark,
  },
  examChipDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  examChipDateActive: {
    color: colors.primary,
  },
  selectedExamBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 4,
  },
  selectedExamTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedExamTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  selectedExamMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectedExamDept: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  regCountPill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  regCountNum: {
    fontSize: 16,
    fontWeight: typography.weights.extrabold,
    color: colors.primaryDark,
  },
  regCountLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  emptyRegWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  emptyRegWarningText: {
    flex: 1,
    fontSize: 11,
    color: colors.warningText,
    fontWeight: typography.weights.medium,
  },
  autoRegisterBtn: {
    backgroundColor: colors.warningText,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  autoRegisterBtnText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  noExamText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  hallsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hallSelectCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 10,
  },
  hallSelectCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  hallSelectCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hallSelectCode: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  hallSelectCodeActive: {
    color: colors.primaryDark,
  },
  hallSelectBuilding: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  hallSelectCap: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  capacitySummaryBox: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    marginBottom: 14,
  },
  capacityOk: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  capacityWarn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  capacityCol: {
    flex: 1,
    alignItems: "center",
  },
  capacityLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  capacityVal: {
    fontSize: 17,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  capacityDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: "center",
    height: "70%",
  },
  generateBtn: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  historySection: {
    marginTop: 8,
  },
  historyHeading: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  historySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  noPlansText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  planExamName: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  planMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  planAllocated: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  planActionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewPlanLink: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
