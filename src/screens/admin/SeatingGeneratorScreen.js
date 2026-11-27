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
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Meter } from "../../components/common/Charts";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert, confirmAction } from "../../utils/alerts";
import api, { examApi, hallApi, seatingApi } from "../../services/api";

export default function SeatingGeneratorScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Wizard state: 1 (Exam) -> 2 (Strategy) -> 3 (Halls) -> 4 (Review) -> 5 (Generate)
  const [currentStep, setCurrentStep] = useState(1);

  const [exams, setExams] = useState([]);
  const [halls, setHalls] = useState([]);
  const [plans, setPlans] = useState([]);

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState("INTERLEAVE"); // INTERLEAVE | CONSECUTIVE
  const [selectedHallIds, setSelectedHallIds] = useState([]);
  const [selectedExamRegCount, setSelectedExamRegCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        setSelectedHallIds((prev) => {
          if (prev && prev.length > 0) return prev;
          return loadedHalls.filter((h) => h.status === "ACTIVE").map((h) => h.id);
        });
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
      setSelectedExamRegCount(exam.registered_students_count ?? exam.registered_count ?? 0);
    }
  };

  const handleToggleHall = (hallId) => {
    if (selectedHallIds.includes(hallId)) {
      if (selectedHallIds.length === 1) {
        showAlert("Validation", "At least one examination hall must remain selected.");
        return;
      }
      setSelectedHallIds(selectedHallIds.filter((id) => id !== hallId));
    } else {
      setSelectedHallIds([...selectedHallIds, hallId]);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedHalls = halls.filter((h) => selectedHallIds.includes(h.id));
  const totalCapacity = selectedHalls.reduce((sum, h) => sum + (h.capacity || 0), 0);
  const hasEnoughSeats = totalCapacity >= selectedExamRegCount;
  const occupancyPct = totalCapacity > 0 ? Math.min(100, Math.round((selectedExamRegCount / totalCapacity) * 100)) : 0;

  const executeGenerate = async (force = false) => {
    setGenerating(true);
    try {
      const payload = {
        exam_id: selectedExamId,
        hall_ids: selectedHallIds,
        policy: selectedStrategy, // INTERLEAVE or CONSECUTIVE
        force,
      };

      const res = await seatingApi.generate(payload);
      const data = res.data || res;
      if (data.success) {
        showAlert(
          "Seating Generated!",
          data.message || "Anti-collision seating arrangement generated successfully!"
        );
        loadData();
        const planId = data.plan?.id || (data.plans && data.plans[0]?.id);
        if (planId) {
          navigation.navigate("SeatingPlanDetail", { planId });
        }
      } else {
        showAlert("Allocation Note", data.error || "Could not generate seating plan.");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "";
      if (errMsg.toLowerCase().includes("published") && !force) {
        confirmAction({
          title: "Overwrite Published Plan?",
          message: "A published seating plan already exists for this exam. Do you want to overwrite it?",
          confirmText: "Overwrite",
          destructive: true,
          onConfirm: () => executeGenerate(true),
        });
      } else {
        showAlert("Generation Failed", errMsg || "Allocation failed.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedExamId) {
      showAlert("Missing Selection", "Please select an examination in Step 1.");
      return;
    }
    if (selectedHallIds.length === 0) {
      showAlert("Missing Selection", "Please select at least one examination hall in Step 3.");
      return;
    }
    executeGenerate(false);
  };

  const STEPS = [
    { num: 1, title: "Exam" },
    { num: 2, title: "Strategy" },
    { num: 3, title: "Halls" },
    { num: 4, title: "Review" },
    { num: 5, title: "Generate" },
  ];

  return (
    <AppLayout
      title="Seating Plan Generator"
      subtitle="Anti-collision automated seating allocation & hall capacity engine"
      breadcrumb="Exam Operations / Seating Generator"
      currentRouteName="SeatingPlans"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Step Indicator Bar */}
        <Card style={styles.wizardNavCard}>
          <View style={styles.wizardStepsRow}>
            {STEPS.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <Pressable
                  key={s.num}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setCurrentStep(s.num)}
                  style={styles.wizardStepBtn}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isPast && styles.stepCirclePast,
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNumText, isActive && styles.stepNumTextActive]}>
                        {s.num}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                    {s.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* STEP 1: SELECT EXAM */}
        {currentStep === 1 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 1: Choose Examination Session</Text>
              <Text style={styles.stepSub}>Select the scheduled university exam to seat candidates for</Text>
            </View>

            <View style={styles.examGrid}>
              {exams.map((ex) => {
                const isSelected = selectedExamId === ex.id;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => handleSelectExam(ex)}
                    style={[styles.examChoice, isSelected && styles.examChoiceActive]}
                  >
                    <View style={styles.examChoiceTop}>
                      <Text style={[styles.examChoiceCode, isSelected && styles.examChoiceCodeActive]}>
                        {ex.course_code || ex.subject_code}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.examChoiceName} numberOfLines={2}>
                      {ex.course_name || ex.name}
                    </Text>
                    <Text style={styles.examChoiceDate}>
                      📅 {ex.exam_date} • {ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <View />
              <Button
                title="Next: Choose Strategy →"
                onPress={() => setCurrentStep(2)}
              />
            </View>
          </Card>
        )}

        {/* STEP 2: STRATEGY POLICY */}
        {currentStep === 2 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 2: Choose Seating Arrangement Strategy</Text>
              <Text style={styles.stepSub}>Select the anti-collision algorithm policy</Text>
            </View>

            <View style={styles.strategyRow}>
              {/* Strategy 1: INTERLEAVE */}
              <Pressable
                onPress={() => setSelectedStrategy("INTERLEAVE")}
                style={[
                  styles.strategyCard,
                  selectedStrategy === "INTERLEAVE" && styles.strategyCardActive,
                ]}
              >
                <View style={styles.strategyTop}>
                  <View style={styles.strategyIconBox}>
                    <Ionicons name="shuffle-outline" size={22} color={colors.primary} />
                  </View>
                  {selectedStrategy === "INTERLEAVE" && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.strategyTitle}>INTERLEAVE Strategy (Recommended)</Text>
                <Text style={styles.strategyDesc}>
                  Seats candidates from different branches and departments alternately on adjacent benches to prevent academic collusion.
                </Text>
              </Pressable>

              {/* Strategy 2: CONSECUTIVE */}
              <Pressable
                onPress={() => setSelectedStrategy("CONSECUTIVE")}
                style={[
                  styles.strategyCard,
                  selectedStrategy === "CONSECUTIVE" && styles.strategyCardActive,
                ]}
              >
                <View style={styles.strategyTop}>
                  <View style={styles.strategyIconBox}>
                    <Ionicons name="reorder-four-outline" size={22} color={colors.textSecondary} />
                  </View>
                  {selectedStrategy === "CONSECUTIVE" && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.strategyTitle}>CONSECUTIVE Strategy</Text>
                <Text style={styles.strategyDesc}>
                  Allocates candidate seats strictly sequentially by registered USN roll order within assigned examination halls.
                </Text>
              </Pressable>
            </View>

            <View style={styles.navRow}>
              <Button
                title="← Back: Exam"
                variant="secondary"
                onPress={() => setCurrentStep(1)}
              />
              <Button
                title="Next: Select Halls →"
                onPress={() => setCurrentStep(3)}
              />
            </View>
          </Card>
        )}

        {/* STEP 3: HALLS & CAPACITY VALIDATION */}
        {currentStep === 3 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 3: Examination Halls & Capacity</Text>
              <Text style={styles.stepSub}>Toggle rooms to include in this allocation</Text>
            </View>

            {/* Capacity Meter Bar */}
            <View style={styles.capacityCard}>
              <View style={styles.capacityTop}>
                <Text style={styles.capacityLabel}>
                  Required Seats: <Text style={{ fontWeight: "700" }}>{selectedExamRegCount}</Text> • Total Selected: <Text style={{ fontWeight: "700" }}>{totalCapacity}</Text>
                </Text>
                <Text style={[styles.capacityPct, { color: hasEnoughSeats ? colors.successText : colors.dangerText }]}>
                  {hasEnoughSeats ? "SUFFICIENT CAPACITY" : "INSUFFICIENT CAPACITY"}
                </Text>
              </View>
              <Meter percent={occupancyPct} color={hasEnoughSeats ? colors.success : colors.danger} />
            </View>

            <View style={styles.hallsList}>
              {halls.map((h) => {
                const isSelected = selectedHallIds.includes(h.id);
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => handleToggleHall(h.id)}
                    style={[styles.hallItem, isSelected && styles.hallItemActive]}
                  >
                    <View style={styles.hallItemLeft}>
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={18}
                        color={isSelected ? colors.primary : colors.textMuted}
                        style={{ marginRight: 10 }}
                      />
                      <View>
                        <Text style={styles.hallName}>{h.hall_code || h.name}</Text>
                        <Text style={styles.hallSub}>{h.building} (Floor {h.floor})</Text>
                      </View>
                    </View>
                    <Text style={styles.hallCap}>{h.capacity} seats</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <Button
                title="← Back: Strategy"
                variant="secondary"
                onPress={() => setCurrentStep(2)}
              />
              <Button
                title="Next: Review →"
                onPress={() => setCurrentStep(4)}
              />
            </View>
          </Card>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {currentStep === 4 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 4: Review Allocation Parameters</Text>
              <Text style={styles.stepSub}>Confirm configuration before generating seating arrangement</Text>
            </View>

            <View style={styles.reviewBox}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Selected Exam</Text>
                <Text style={styles.reviewVal}>{selectedExam?.course_name || selectedExam?.name} ({selectedExam?.course_code || selectedExam?.subject_code})</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Registered Candidates</Text>
                <Text style={styles.reviewVal}>{selectedExamRegCount} Candidates</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Seating Strategy</Text>
                <Text style={[styles.reviewVal, { color: colors.primaryDark }]}>{selectedStrategy}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Included Halls</Text>
                <Text style={styles.reviewVal}>{selectedHalls.map((h) => h.hall_code || h.name).join(", ")} ({totalCapacity} seats)</Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <Button
                title="← Back: Halls"
                variant="secondary"
                onPress={() => setCurrentStep(3)}
              />
              <Button
                title="Proceed to Generate →"
                onPress={() => setCurrentStep(5)}
              />
            </View>
          </Card>
        )}

        {/* STEP 5: RUN GENERATOR */}
        {currentStep === 5 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 5: Run Automated Engine</Text>
              <Text style={styles.stepSub}>Execute allocation algorithm and generate hall seating chart</Text>
            </View>

            <View style={styles.generateCtaBox}>
              <View style={styles.sparkleIcon}>
                <Ionicons name="sparkles" size={32} color={colors.primary} />
              </View>
              <Text style={styles.generateCtaTitle}>Ready to Allocate Seats</Text>
              <Text style={styles.generateCtaSub}>
                The allocation engine will interleave candidate branches, optimize bench assignments, and generate official visual seating plans.
              </Text>

              <Button
                title={generating ? "Running Allocation Engine..." : "Generate Seating Plan Now"}
                loading={generating}
                onPress={handleGenerate}
                style={{ width: "100%", maxWidth: 360, marginTop: 14 }}
              />
            </View>

            <View style={styles.navRow}>
              <Button
                title="← Back: Review"
                variant="secondary"
                onPress={() => setCurrentStep(4)}
              />
            </View>
          </Card>
        )}

        {/* Saved Seating Plans Table */}
        <Text style={styles.sectionHeading}>Generated Seating Arrangements</Text>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          {plans.length === 0 ? (
            <View style={{ padding: 20 }}>
              <Text style={styles.emptyText}>No seating plans currently generated.</Text>
            </View>
          ) : (
            plans.map((p) => {
              const isPub = (p.status || "").toUpperCase() === "PUBLISHED";
              // Plan table rows must NOT be pressable if they contain a button (nested buttons are invalid HTML on web)
              return (
                <View key={p.id} style={styles.planTableRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.planName}>{p.plan_name || p.exam_name || "Seating Plan"}</Text>
                    <Text style={styles.planSub}>
                      📅 {p.exam_date} • Allocated: {p.allocated_seats || p.total_allocated || 0} candidates • Version {p.version || 1}
                    </Text>
                  </View>

                  <View style={styles.planActionCol}>
                    <View style={[styles.statusBadge, isPub ? styles.statusPub : styles.statusDraft]}>
                      <Text style={[styles.statusBadgeText, isPub ? styles.statusTextPub : styles.statusTextDraft]}>
                        {p.status || "DRAFT"}
                      </Text>
                    </View>

                    <Button
                      title="Inspect Grid →"
                      size="sm"
                      variant="outline"
                      onPress={() => navigation.navigate("SeatingPlanDetail", { planId: p.id })}
                    />
                  </View>
                </View>
              );
            })
          )}
        </Card>
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
  wizardNavCard: {
    padding: 12,
  },
  wizardStepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wizardStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCirclePast: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  stepNumTextActive: {
    color: colors.textInverse,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  stepLabelActive: {
    fontWeight: "700",
    color: colors.primary,
  },
  stepCard: {
    gap: 16,
  },
  stepHeader: {
    gap: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  stepSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  examGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  examChoice: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
    cursor: "pointer",
  },
  examChoiceActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  examChoiceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  examChoiceCode: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  examChoiceCodeActive: {
    color: colors.primaryDark,
  },
  examChoiceName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  examChoiceDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  strategyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  strategyCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    cursor: "pointer",
  },
  strategyCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  strategyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  strategyIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  strategyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  capacityCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
  },
  capacityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  capacityLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  capacityPct: {
    fontSize: 11,
    fontWeight: "700",
  },
  hallsList: {
    gap: 8,
  },
  hallItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    cursor: "pointer",
  },
  hallItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  hallItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  hallName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  hallSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  hallCap: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  reviewBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
  },
  reviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewVal: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  generateCtaBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  sparkleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  generateCtaTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  generateCtaSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 420,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: 6,
  },
  planTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  planName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  planSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planActionCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  statusPub: {
    backgroundColor: colors.successLight,
  },
  statusDraft: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  statusTextPub: {
    color: colors.successText,
  },
  statusTextDraft: {
    color: colors.warningText,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
});
