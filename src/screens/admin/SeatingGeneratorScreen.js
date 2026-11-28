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
import { SeatGrid } from "../../components/SeatGrid";
import { colors, radii, textStyles, shadows, transition } from "../../theme/tokens";
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

  // Classroom bench selection (step 3)
  const [layout, setLayout] = useState({ halls: [], total_eligible: 0, eligible_by_branch: {} });
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutError, setLayoutError] = useState("");
  const [sideMode, setSideMode] = useState("BOTH"); // BOTH | LEFT | RIGHT | CUSTOM
  const [branchSeparation, setBranchSeparation] = useState(true);
  const [customSeatIds, setCustomSeatIds] = useState({}); // seat_id -> true (CUSTOM mode)
  const [previewHallId, setPreviewHallId] = useState(null);
  const [preview, setPreview] = useState(null); // backend dry-run summary
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState(null); // { summary, planId } after generation

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

  useEffect(() => {
    let cancelled = false;
    setLayoutLoading(true);
    setLayoutError("");
    seatingApi
      .getLayout(selectedExamId)
      .then((res) => {
        if (cancelled) return;
        const d = res.data || res;
        setLayout({ halls: d.halls || [], total_eligible: d.total_eligible || 0, eligible_by_branch: d.eligible_by_branch || {} });
      })
      .catch((err) => {
        if (!cancelled) setLayoutError(err.response?.data?.error || err.message || "Could not load classroom layout.");
      })
      .finally(() => {
        if (!cancelled) setLayoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExamId]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const layoutHalls = layout.halls;
  const selectedLayoutHalls = layoutHalls.filter((h) => selectedHallIds.includes(h.id));
  const previewHall = layoutHalls.find((h) => h.id === previewHallId) || selectedLayoutHalls[0] || layoutHalls[0];

  // Free = active and not used by an overlapping exam
  const isAvailable = (seat) => seat.is_active && !seat.taken_by;
  const modeEnabled = (seat, mode = sideMode) => {
    if (mode === "LEFT") return seat.position === "LEFT";
    if (mode === "RIGHT") return seat.position === "RIGHT";
    if (mode === "CUSTOM") return !!customSeatIds[seat.seat_id];
    return true;
  };
  const enabledSeats = selectedLayoutHalls.flatMap((h) =>
    h.seats.filter((seat) => isAvailable(seat) && modeEnabled(seat)).map((seat) => ({ ...seat, hall_id: h.id }))
  );
  const selectedBenchCount = new Set(enabledSeats.map((seat) => `${seat.hall_id}-${seat.row_num}-${seat.bench_in_row}`)).size;
  const leftSelected = enabledSeats.filter((seat) => seat.position === "LEFT").length;
  const rightSelected = enabledSeats.length - leftSelected;
  const requiredStudents = selectedExamId ? layout.total_eligible || selectedExamRegCount : 0;
  const expectedAllocated = preview ? preview.total_allocated : null;
  const expectedUnallocated = preview ? preview.total_unallocated : null;
  const hasEnoughSeats = preview ? preview.total_unallocated === 0 : false;
  const occupancyPct = requiredStudents > 0 && preview ? Math.min(100, Math.round((preview.total_allocated / requiredStudents) * 100)) : 0;

  const buildPayload = (extra = {}) => ({
    exam_id: selectedExamId,
    hall_ids: selectedHallIds,
    policy: selectedStrategy,
    side_mode: sideMode,
    branch_separation: branchSeparation,
    ...(sideMode === "CUSTOM" ? { seat_ids: enabledSeats.map((seat) => seat.seat_id) } : {}),
    ...extra,
  });
  const payloadKey = JSON.stringify(buildPayload());

  // Backend dry run: the real allocation engine decides how many students fit
  useEffect(() => {
    if (!selectedExamId || selectedHallIds.length === 0) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await seatingApi.preview(JSON.parse(payloadKey));
        const d = res.data || res;
        if (!cancelled) {
          setPreview(d.summary || null);
          setPreviewError(d.success ? "" : d.error || "Preview failed.");
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err.response?.data?.error || err.message || "Preview failed.");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payloadKey]);

  const currentSelectionMap = () => {
    const map = {};
    layoutHalls.forEach((h) =>
      h.seats.forEach((seat) => {
        if (isAvailable(seat) && modeEnabled(seat)) map[seat.seat_id] = true;
      })
    );
    return map;
  };

  const changeSideMode = (mode) => {
    // Custom starts from what the current mode enables, so the admin only adjusts it
    if (mode === "CUSTOM" && sideMode !== "CUSTOM") setCustomSeatIds(currentSelectionMap());
    setSideMode(mode);
  };

  const toggleSeats = (seats, hallId) => {
    const free = seats.filter(isAvailable);
    if (free.length === 0) return;
    const next = sideMode === "CUSTOM" ? { ...customSeatIds } : currentSelectionMap();
    const turnOn = !(selectedHallIds.includes(hallId) && free.every((seat) => next[seat.seat_id]));
    free.forEach((seat) => {
      if (turnOn) next[seat.seat_id] = true;
      else delete next[seat.seat_id];
    });
    if (turnOn && !selectedHallIds.includes(hallId)) setSelectedHallIds([...selectedHallIds, hallId]);
    setCustomSeatIds(next);
    setSideMode("CUSTOM");
  };

  const selectionSeatState = (hallId) => (seat) => {
    if (!seat.is_active) return "unavailable";
    if (seat.taken_by) return "occupied";
    return selectedHallIds.includes(hallId) && modeEnabled(seat) ? "selected" : "disabled";
  };

  const executeGenerate = async (force = false, allowPartial = false) => {
    setGenerating(true);
    try {
      const res = await seatingApi.generate(buildPayload({ force, allow_partial: allowPartial }));
      const data = res.data || res;
      if (data.success) {
        const planId = data.plan?.id || (data.plans && data.plans[0]?.id);
        setResult({ summary: data.summary || null, planId });
        showAlert("Seating Generated!", data.message || "Bench seating arrangement generated successfully!");
        loadData();
      } else {
        showAlert("Allocation Note", data.error || "Could not generate seating plan.");
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "";
      const report = err.response?.data?.capacity_report;
      if (errMsg.toLowerCase().includes("published") && !force) {
        confirmAction({
          title: "Overwrite Published Plan?",
          message: "A published seating plan already exists for this exam. Regenerating archives it and creates a new draft version. Continue?",
          confirmText: "Overwrite",
          destructive: true,
          onConfirm: () => executeGenerate(true, allowPartial),
        });
      } else if (report?.total_unallocated && !allowPartial) {
        confirmPartial(report.total_unallocated, force);
      } else {
        showAlert("Generation Failed", errMsg || "Allocation failed.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const confirmPartial = (count, force = false) => {
    confirmAction({
      title: "Generate Partial Allocation?",
      message: `${count} student(s) cannot be seated in the selected positions${branchSeparation ? " without two students of the same branch sharing a bench" : ""}. They will be listed as unallocated. Continue?`,
      confirmText: "Generate Partial Plan",
      destructive: true,
      onConfirm: () => executeGenerate(force, true),
    });
  };

  const handleGenerate = () => {
    if (!selectedExamId) {
      showAlert("Missing Selection", "Please select an examination in Step 1.");
      return;
    }
    if (selectedHallIds.length === 0 || enabledSeats.length === 0) {
      showAlert("Missing Selection", "Please select at least one hall and seat position in Step 3.");
      return;
    }
    setResult(null);
    if (preview?.total_unallocated > 0) {
      confirmPartial(preview.total_unallocated);
      return;
    }
    executeGenerate(false, false);
  };

  const SIDE_MODES = [
    { key: "BOTH", label: "Both Sides", icon: "people-outline", desc: "Up to two students per bench, different branches" },
    { key: "LEFT", label: "Left Side Only", icon: "arrow-back-outline", desc: "One student per bench, left position" },
    { key: "RIGHT", label: "Right Side Only", icon: "arrow-forward-outline", desc: "One student per bench, right position" },
    { key: "CUSTOM", label: "Custom", icon: "construct-outline", desc: "Tap benches or positions to switch them on or off" },
  ];
  const sideModeLabel = SIDE_MODES.find((m) => m.key === sideMode)?.label;
  const branchText = (map) =>
    Object.entries(map || {})
      .map(([code, n]) => `${code} ${n}`)
      .join(" • ") || "—";

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
                  Mixes branches: each bench pairs the largest remaining branch with a different one, so bench partners never share a branch.
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
                  Seats candidates in branch and USN roll order (e.g. CSE-001 | ECE-001), still never placing two of one branch on a bench.
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

        {/* STEP 3: HALLS, BENCHES & POSITIONS */}
        {currentStep === 3 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Step 3: Examination Halls & Classroom Benches</Text>
              <Text style={styles.stepSub}>Choose halls, then which bench positions candidates may use</Text>
            </View>

            {/* Capacity panel */}
            <View style={styles.capacityCard}>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{selectedBenchCount}</Text>
                  <Text style={styles.statLabel}>Benches selected</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{enabledSeats.length}</Text>
                  <Text style={styles.statLabel}>Positions (L {leftSelected} / R {rightSelected})</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{requiredStudents}</Text>
                  <Text style={styles.statLabel}>Required students</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{previewLoading ? "…" : expectedAllocated ?? "—"}</Text>
                  <Text style={styles.statLabel}>Allocatable (branch rule)</Text>
                </View>
              </View>
              <View style={styles.capacityTop}>
                <Text style={styles.capacityLabel}>
                  {previewError
                    ? previewError
                    : preview
                    ? `${preview.total_allocated} of ${preview.total_eligible} students can be seated${preview.total_unallocated ? ` • ${preview.total_unallocated} unallocated` : ""}`
                    : "Select an exam and at least one hall"}
                </Text>
                <Text style={[styles.capacityPct, { color: hasEnoughSeats ? colors.successText : colors.dangerText }]}>
                  {hasEnoughSeats ? "SUFFICIENT CAPACITY" : "INSUFFICIENT CAPACITY"}
                </Text>
              </View>
              <Meter percent={occupancyPct} color={hasEnoughSeats ? colors.success : colors.danger} />
            </View>

            {/* Side mode */}
            <Text style={styles.subHeading}>Seat positions</Text>
            <View style={styles.modeRow} accessibilityRole="radiogroup">
              {SIDE_MODES.map((m) => {
                const active = sideMode === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => changeSideMode(m.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${m.label}: ${m.desc}`}
                    style={({ hovered }) => [styles.modeCard, hovered && styles.modeCardHover, active && styles.modeCardActive]}
                  >
                    <Ionicons name={m.icon} size={18} color={active ? colors.primary : colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modeTitle, active && { color: colors.primaryDark }]}>{m.label}</Text>
                      <Text style={styles.modeDesc}>{m.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setBranchSeparation(!branchSeparation)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: branchSeparation }}
              style={styles.toggleRow}
            >
              <Ionicons
                name={branchSeparation ? "checkbox" : "square-outline"}
                size={18}
                color={branchSeparation ? colors.primary : colors.textMuted}
              />
              <Text style={styles.toggleText}>
                Branch separation: never seat two students of the same branch on one bench (recommended)
              </Text>
            </Pressable>

            {/* Halls */}
            <Text style={styles.subHeading}>Examination halls</Text>
            {layoutLoading ? (
              <LoadingSkeleton height={120} />
            ) : layoutError ? (
              <Text style={styles.errorText}>{layoutError}</Text>
            ) : layoutHalls.length === 0 ? (
              <Text style={styles.emptyText}>No active halls. Add halls in Hall Management first.</Text>
            ) : (
              <View style={styles.hallsList}>
                {layoutHalls.map((h) => {
                  const isSelected = selectedHallIds.includes(h.id);
                  const isPreviewed = previewHall?.id === h.id;
                  const hallEnabled = enabledSeats.filter((seat) => seat.hall_id === h.id).length;
                  return (
                    <View key={h.id} style={[styles.hallItem, isSelected && styles.hallItemActive]}>
                      <Pressable
                        onPress={() => handleToggleHall(h.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Include hall ${h.name}`}
                        style={styles.hallItemLeft}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                          style={{ marginRight: 10 }}
                        />
                        <View>
                          <Text style={styles.hallName}>{h.hall_code || h.name}</Text>
                          <Text style={styles.hallSub}>
                            {h.building} (Floor {h.floor}) • {h.num_rows} rows • {h.total_benches} benches
                          </Text>
                        </View>
                      </Pressable>
                      <View style={styles.hallRight}>
                        <Text style={styles.hallCap}>{isSelected ? `${hallEnabled} positions` : `${h.capacity} seats`}</Text>
                        <Button
                          title={isPreviewed ? "Previewing" : "Preview"}
                          size="sm"
                          variant={isPreviewed ? "primary" : "outline"}
                          onPress={() => setPreviewHallId(h.id)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Classroom preview */}
            {previewHall && !layoutLoading && (
              <View>
                <Text style={styles.subHeading}>
                  Classroom preview: {previewHall.name} • {previewHall.building}, Floor {previewHall.floor} • {previewHall.total_benches} benches
                </Text>
                <Text style={styles.hintText}>
                  Tap a position to switch it on or off, or tap a bench title to switch both. This changes the mode to Custom.
                </Text>
                <SeatGrid
                  hall={previewHall}
                  seatsGrid={previewHall.seats}
                  getSeatState={selectionSeatState(previewHall.id)}
                  onSeatPress={(seat) => toggleSeats([seat], previewHall.id)}
                  onBenchPress={(benchSeats) => toggleSeats(benchSeats, previewHall.id)}
                  legendStates={["selected", "disabled", "occupied", "unavailable"]}
                />
              </View>
            )}

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
              <Text style={styles.stepTitle}>Step 4: Review Allocation</Text>
              <Text style={styles.stepSub}>Confirm configuration before generating seating arrangement</Text>
            </View>

            <View style={styles.reviewBox}>
              {[
                ["Examination", `${selectedExam?.course_name || selectedExam?.name || "—"} (${selectedExam?.course_code || selectedExam?.subject_code || "—"}) • ${selectedExam?.exam_date || ""}`],
                ["Selected halls", selectedLayoutHalls.map((h) => h.hall_code || h.name).join(", ") || "—"],
                ["Benches selected", String(selectedBenchCount)],
                ["Positions selected", `${enabledSeats.length} (Left ${leftSelected} • Right ${rightSelected})`],
                ["Seat positions", sideModeLabel],
                ["Allocation strategy", selectedStrategy],
                ["Branch separation", branchSeparation ? "On: no two students of one branch share a bench" : "Off"],
                ["Total eligible students", `${requiredStudents} (${branchText(layout.eligible_by_branch)})`],
                ["Available seating capacity", `${enabledSeats.length} positions`],
                ["Expected allocated", previewLoading ? "Calculating…" : expectedAllocated ?? "—"],
                ["Expected unallocated", previewLoading ? "Calculating…" : expectedUnallocated ?? "—"],
              ].map(([label, val]) => (
                <View key={label} style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>{label}</Text>
                  <Text style={[styles.reviewVal, label === "Expected unallocated" && expectedUnallocated > 0 && { color: colors.dangerText }]}>
                    {String(val)}
                  </Text>
                </View>
              ))}
            </View>

            {previewError ? <Text style={styles.errorText}>{previewError}</Text> : null}
            {expectedUnallocated > 0 && (
              <View style={styles.warnBox}>
                <Ionicons name="warning-outline" size={16} color={colors.warningText} />
                <Text style={styles.warnText}>
                  {expectedUnallocated} student(s) do not fit ({branchText(preview?.unallocated_by_branch)}). Add halls or positions in Step 3, or
                  confirm a partial plan in Step 5. Every unallocated student will be listed.
                </Text>
              </View>
            )}

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
              <Text style={styles.stepTitle}>Step 5: Generate Seating Plan</Text>
              <Text style={styles.stepSub}>Run the bench allocation engine and review the result</Text>
            </View>

            {!result ? (
              <View style={styles.generateCtaBox}>
                <View style={styles.sparkleIcon}>
                  <Ionicons name="sparkles" size={32} color={colors.primary} />
                </View>
                <Text style={styles.generateCtaTitle}>Ready to Allocate Seats</Text>
                <Text style={styles.generateCtaSub}>
                  The engine fills {enabledSeats.length} selected positions across {selectedBenchCount} benches
                  {branchSeparation ? ", never seating two students of one branch on the same bench" : ""}.
                </Text>
                {expectedUnallocated > 0 && (
                  <Text style={[styles.generateCtaSub, { color: colors.dangerText }]}>
                    {expectedUnallocated} student(s) will be unallocated. You will be asked to confirm.
                  </Text>
                )}

                <Button
                  title={generating ? "Running Allocation Engine..." : "Generate Seating Plan Now"}
                  loading={generating}
                  onPress={handleGenerate}
                  style={{ width: "100%", maxWidth: 360, marginTop: 14 }}
                />
              </View>
            ) : (
              <View style={styles.resultBox}>
                <View style={styles.statGrid}>
                  {[
                    ["Allocated", result.summary?.total_allocated],
                    ["Unallocated", result.summary?.total_unallocated],
                    ["Benches", result.summary?.benches_selected],
                    ["Left used", result.summary?.left_used],
                    ["Right used", result.summary?.right_used],
                    ["Vacant positions", result.summary?.vacant_positions],
                  ].map(([label, val]) => (
                    <View key={label} style={styles.statBox}>
                      <Text style={styles.statNum}>{val ?? "—"}</Text>
                      <Text style={styles.statLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.reviewLabel}>Allocated per branch: {branchText(result.summary?.allocated_by_branch)}</Text>

                {result.summary?.unallocated_students?.length > 0 && (
                  <View style={styles.warnBoxCol}>
                    <Text style={styles.warnTitle}>
                      Unallocated students ({result.summary.unallocated_students.length})
                    </Text>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                      {result.summary.unallocated_students.map((u) => (
                        <Text key={u.student_id} style={styles.warnText}>
                          {u.usn} • {u.student_name} • {u.department_code}
                        </Text>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  {result.planId ? (
                    <Button
                      title="Open Seating Plan →"
                      onPress={() => navigation.navigate("SeatingPlanDetail", { planId: result.planId })}
                    />
                  ) : null}
                  <Button title="Generate Again" variant="secondary" onPress={() => setResult(null)} />
                </View>
              </View>
            )}

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
  hallRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 10,
  },
  statNum: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modeCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    cursor: "pointer",
    ...transition("all", 160),
  },
  modeCardHover: {
    borderColor: colors.primaryMuted,
  },
  modeCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  modeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  toggleText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: colors.dangerText,
  },
  warnBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
  },
  warnBoxCol: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    gap: 4,
  },
  warnTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.warningText,
  },
  warnText: {
    fontSize: 12,
    color: colors.warningText,
    flex: 1,
  },
  resultBox: {
    gap: 12,
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
    gap: 12,
    flexWrap: "wrap",
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
