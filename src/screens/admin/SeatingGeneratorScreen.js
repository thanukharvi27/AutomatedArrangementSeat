import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { showAlert } from "../../utils/alerts";
import api from "../../services/api";

export default function SeatingGeneratorScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("ALL");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = async () => {
    try {
      const [plansRes, examsRes] = await Promise.allSettled([
        api.get("/seating-plans"),
        api.get("/exams"),
      ]);

      if (plansRes.status === "fulfilled") {
        const data = plansRes.value.data || plansRes.value;
        setPlans(data.plans || []);
      }
      if (examsRes.status === "fulfilled") {
        const edata = examsRes.value.data || examsRes.value;
        setExams(edata.exams || []);
      }
    } catch (err) {
      console.log("Error fetching seating plans:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const hallsRes = await api.get("/halls");
      const hallsData = hallsRes.data || hallsRes;
      const hallsList = hallsData.halls || [];
      const hallIds = hallsList.map((h) => h.id);

      let payload = {
        hall_ids: hallIds,
        policy: "INTERLEAVE",
        force: true,
      };

      if (selectedExamId === "ALL") {
        const examIds = exams.map((e) => e.id);
        payload.exam_ids = examIds;
      } else {
        payload.exam_id = parseInt(selectedExamId, 10);
      }

      const res = await api.post("/seating-plans/generate", payload);
      const data = res.data || res;

      if (data.success) {
        showAlert("Success", data.message || "Automated seating arrangement generated successfully!");
        fetchPlans();
      } else {
        showAlert("Allocation Note", data.error || "Could not complete seat allocation.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Could not generate plan.";
      showAlert("Generation Failed", msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Seating Plans" subtitle="Automated Allocation Engine" showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlans(); }} />}
      >
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>🚀 Automated Seating Generator</Text>
          <Text style={styles.bannerText}>
            Distributes registered students into campus examination halls using anti-cheating interleaved branch allocation.
          </Text>

          {/* Target Exam Selector */}
          <Text style={styles.selectorLabel}>Generate seating for:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Pressable
              style={[styles.examChip, selectedExamId === "ALL" && styles.examChipActive]}
              onPress={() => setSelectedExamId("ALL")}
            >
              <Text style={[styles.examChipText, selectedExamId === "ALL" && styles.examChipTextActive]}>
                ⚡ All Scheduled Exams
              </Text>
            </Pressable>
            {exams.map((ex) => (
              <Pressable
                key={ex.id}
                style={[styles.examChip, selectedExamId === String(ex.id) && styles.examChipActive]}
                onPress={() => setSelectedExamId(String(ex.id))}
              >
                <Text
                  style={[styles.examChipText, selectedExamId === String(ex.id) && styles.examChipTextActive]}
                  numberOfLines={1}
                >
                  {ex.subject_code || ex.course_code || ex.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.genBtn} onPress={handleGenerate} disabled={generating}>
            {generating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.genBtnText}>⚡ Run Allocation Engine</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          Generated Seating Plans ({plans.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : plans.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Seating Plans Yet</Text>
            <Text style={styles.emptySubtitle}>Click "Run Allocation Engine" above to allocate exam seats automatically.</Text>
          </View>
        ) : (
          plans.map((p) => {
            const isPub = (p.status || "").toLowerCase() === "published";
            const allocCount = p.allocated_seats ?? p.total_allocated ?? 0;
            return (
              <Pressable
                key={p.id}
                style={styles.card}
                onPress={() => navigation.navigate("SeatingPlanDetail", { planId: p.id })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.planName} numberOfLines={1}>
                    {p.plan_name || p.exam_name || `Plan #${p.id}`}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: isPub ? "#dcfce7" : "#fef3c7" }]}>
                    <Text style={[styles.badgeText, { color: isPub ? "#15803d" : "#b45309" }]}>
                      {(p.status || "DRAFT").toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.date}>
                  Exam Date: {p.exam_date || "Upcoming"} {p.session ? `(${p.session})` : ""}
                </Text>
                <Text style={styles.info}>
                  👥 Allocated: <Text style={{ fontWeight: "700", color: colors.text }}>{allocCount} students</Text> assigned
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  banner: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, marginBottom: 20 },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  bannerText: { fontSize: 13, color: "#cbd5e1", lineHeight: 18, marginBottom: 12 },
  selectorLabel: { fontSize: 12, fontWeight: "600", color: "#e2e8f0", marginBottom: 6 },
  chipRow: { flexDirection: "row", marginBottom: 14 },
  examChip: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  examChipActive: { backgroundColor: "#ffffff" },
  examChipText: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" },
  examChipTextActive: { color: colors.primary, fontWeight: "700" },
  genBtn: { backgroundColor: "#ffffff", paddingVertical: 13, borderRadius: 8, alignItems: "center" },
  genBtnText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  emptyBox: { backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: "center", marginTop: 10 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  emptySubtitle: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  info: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
