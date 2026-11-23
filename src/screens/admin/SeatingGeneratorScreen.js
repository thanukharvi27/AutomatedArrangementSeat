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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { showAlert } from "../../utils/alerts";
import api, { examApi, hallApi, seatingApi } from "../../services/api";

export default function SeatingGeneratorScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
        // Default select all active halls
        setSelectedHallIds(loadedHalls.map((h) => h.id));
      }

      if (plansRes.status === "fulfilled") {
        const pdata = plansRes.value.data || plansRes.value;
        setPlans(pdata.plans || []);
      }

      // If no exam selected yet, select the first scheduled one
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

  if (loading) return <LoadingSpinner message="Loading seating generator..." />;

  return (
    <View style={styles.container}>
      <Header
        title="Seating Allocation Generator"
        subtitle="Automatic exam seat allocation & hall assignment"
        showBack
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Step 1: Select Examination */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.stepBadgeText, { color: "#1d4ed8" }]}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Select Examination</Text>
              <Text style={styles.sectionSub}>Choose scheduled exam for seating allocation</Text>
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
                    {exam.exam_date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected Exam Details Card */}
          {selectedExam ? (
            <View style={styles.selectedExamDetail}>
              <View style={styles.selectedExamTop}>
                <View>
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
                  <Ionicons name="alert-circle" size={18} color="#b45309" style={{ marginRight: 8 }} />
                  <Text style={styles.emptyRegWarningText}>
                    No registered students found yet for this exam.
                  </Text>
                  <Pressable
                    style={styles.autoRegisterBtn}
                    onPress={handleRegisterEligible}
                    disabled={registering}
                  >
                    <Text style={styles.autoRegisterBtnText}>
                      {registering ? "Registering..." : "Register Students"}
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
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: "#f0fdf4" }]}>
              <Text style={[styles.stepBadgeText, { color: "#16a34a" }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Select Examination Halls</Text>
              <Text style={styles.sectionSub}>Pick rooms to allocate students into</Text>
            </View>
            <Pressable onPress={handleSelectAllHalls}>
              <Text style={styles.selectAllText}>Select All</Text>
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
                      size={20}
                      color={isSelected ? "#2563eb" : "#94a3b8"}
                    />
                  </View>
                  <Text style={[styles.hallSelectBuilding, isSelected && { color: "#1e293b" }]}>
                    {hall.building} (Floor {hall.floor})
                  </Text>
                  <Text style={[styles.hallSelectCap, isSelected && { color: "#16a34a", fontWeight: "700" }]}>
                    Capacity: {hall.capacity} seats ({hall.num_rows || hall.rows_count} benches)
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Step 3: Verification & Automatic Generation */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: "#faf5ff" }]}>
              <Text style={[styles.stepBadgeText, { color: "#9333ea" }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Verify Capacity & Generate</Text>
              <Text style={styles.sectionSub}>Validate seating balance and run allocation</Text>
            </View>
          </View>

          {/* Verification Stats Bar */}
          <View style={[styles.capacitySummaryBox, hasSufficientCapacity ? styles.capacityOk : styles.capacityWarn]}>
            <View style={styles.capacityStatCol}>
              <Text style={styles.capacityStatLabel}>Students to Seat</Text>
              <Text style={styles.capacityStatVal}>{selectedExamRegCount}</Text>
            </View>
            <View style={styles.capacityDivider} />
            <View style={styles.capacityStatCol}>
              <Text style={styles.capacityStatLabel}>Selected Hall Seats</Text>
              <Text style={[styles.capacityStatVal, { color: hasSufficientCapacity ? "#16a34a" : "#b45309" }]}>
                {totalSelectedCapacity}
              </Text>
            </View>
            <View style={styles.capacityDivider} />
            <View style={styles.capacityStatCol}>
              <Text style={styles.capacityStatLabel}>Surplus / Deficit</Text>
              <Text style={[styles.capacityStatVal, { color: hasSufficientCapacity ? "#16a34a" : "#dc2626" }]}>
                {totalSelectedCapacity - selectedExamRegCount >= 0 ? `+${totalSelectedCapacity - selectedExamRegCount}` : `${totalSelectedCapacity - selectedExamRegCount}`}
              </Text>
            </View>
          </View>

          {/* Generation Button */}
          <Pressable
            style={[styles.generateBtn, generating && { opacity: 0.7 }]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={[styles.generateBtnText, { marginLeft: 10 }]}>Running Auto-Allocation Engine...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="sparkles" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.generateBtnText}>Generate Seating Arrangement</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Previously Generated Plans History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Saved Seating Arrangements</Text>
          <Text style={styles.historySub}>Review, inspect grid & publish live arrangements</Text>

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
                    <View style={[styles.planStatusPill, { backgroundColor: isPub ? "#dcfce7" : "#fef3c7" }]}>
                      <Text style={[styles.planStatusText, { color: isPub ? "#15803d" : "#b45309" }]}>
                        {p.status || "DRAFT"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.planMeta}>
                    📅 {p.exam_date} • {p.start_time} - {p.end_time} • Version {p.version || 1}
                  </Text>
                  <Text style={styles.planAllocated}>
                    👥 Allocated: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{p.allocated_seats || p.total_allocated || 0} students</Text>
                  </Text>

                  <View style={styles.planActionRow}>
                    <Text style={styles.viewPlanLink}>View Visual Grid & Seat Allocations →</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    width: "100%",
  },
  scrollDesktop: {
    maxWidth: 900,
    alignSelf: "center",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  examPickerScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  examChip: {
    width: 170,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 10,
  },
  examChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  examChipCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 2,
  },
  examChipCodeActive: {
    color: "#1d4ed8",
  },
  examChipName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  examChipNameActive: {
    color: "#1e3a8a",
  },
  examChipDate: {
    fontSize: 11,
    color: "#64748b",
  },
  examChipDateActive: {
    color: "#2563eb",
  },
  selectedExamDetail: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginTop: 4,
  },
  selectedExamTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedExamTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  selectedExamMeta: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  selectedExamDept: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  regCountPill: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  regCountNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  regCountLabel: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "600",
  },
  emptyRegWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyRegWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  autoRegisterBtn: {
    backgroundColor: "#d97706",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  autoRegisterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  hallsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  hallSelectCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  hallSelectCardActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  hallSelectCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hallSelectCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  hallSelectCodeActive: {
    color: "#1d4ed8",
  },
  hallSelectBuilding: {
    fontSize: 11,
    color: "#64748b",
  },
  hallSelectCap: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
  },
  capacitySummaryBox: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 16,
  },
  capacityOk: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  capacityWarn: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  capacityStatCol: {
    flex: 1,
    alignItems: "center",
  },
  capacityStatLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  capacityStatVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  capacityDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
  },
  generateBtn: {
    height: 50,
    backgroundColor: "#1e3a8a",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  historySub: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },
  noPlansText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    padding: 20,
  },
  planCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 10,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  planExamName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  planStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  planMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  planAllocated: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
  },
  planActionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  viewPlanLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  noExamText: {
    fontSize: 13,
    color: "#94a3b8",
    padding: 10,
  },
});
