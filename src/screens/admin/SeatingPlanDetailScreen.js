import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { SeatGrid } from "../../components/SeatGrid";
import { showAlert } from "../../utils/alerts";
import api from "../../services/api";

export default function SeatingPlanDetailScreen({ route, navigation }) {
  const { planId } = route.params;
  const [plan, setPlan] = useState(null);
  const [halls, setHalls] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [hallGrid, setHallGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const fetchPlanDetail = async () => {
    try {
      const res = await api.get(`/seating-plans/${planId}`);
      const data = res.data || res;

      if (data.success && data.plan) {
        setPlan(data.plan);
        const planHalls = data.halls || data.plan.halls || [];
        setHalls(planHalls);

        if (planHalls.length > 0) {
          const defaultHall = planHalls[0];
          setSelectedHallId(defaultHall.id || defaultHall.hall_id);
          setHallGrid(defaultHall);
        }
      }
    } catch (err) {
      console.log("Error loading plan detail:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHall = (h) => {
    setSelectedHallId(h.id || h.hall_id);
    setHallGrid(h);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await api.post(`/seating-plans/${planId}/publish`);
      const data = res.data || res;
      if (data.success) {
        showAlert("Published", "Seating plan is now live and visible to students in the Student Portal!");
        fetchPlanDetail();
      } else {
        showAlert("Error", data.error || "Could not publish plan.");
      }
    } catch (err) {
      showAlert("Error", err?.response?.data?.error || err?.response?.data?.message || err.message || "Could not publish plan.");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    fetchPlanDetail();
  }, [planId]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />;

  const isPublished = (plan?.status || "").toLowerCase() === "published";

  return (
    <View style={styles.container}>
      <Header
        title={plan?.plan_name || plan?.exam_name || "Seating Plan"}
        subtitle={`Status: ${(plan?.status || "DRAFT").toUpperCase()}`}
        showBack
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoTitle}>{plan?.exam_name || "Examination"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#dcfce7" : "#fef3c7" }]}>
              <Text style={[styles.badgeText, { color: isPublished ? "#15803d" : "#b45309" }]}>
                {(plan?.status || "DRAFT").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.infoSub}>
            📅 Date: {plan?.exam_date} • Timing: {plan?.start_time || "09:30"} - {plan?.end_time || "12:30"} ({plan?.session || "Morning"})
          </Text>
          <Text style={styles.infoSub}>
            👥 Allocated Students: <Text style={{ fontWeight: "700", color: colors.text }}>{plan?.allocated_seats ?? plan?.total_allocated ?? 0}</Text>
          </Text>

          {!isPublished && (
            <Pressable style={styles.publishBtn} onPress={handlePublish} disabled={publishing}>
              {publishing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.publishBtnText}>📢 Publish to Student Portal</Text>
              )}
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Select Examination Hall to View Visual Grid:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hallSelector}>
          {halls.map((h) => {
            const hid = h.id || h.hall_id;
            const isSelected = selectedHallId === hid;
            return (
              <Pressable
                key={hid}
                style={[styles.hallChip, isSelected && styles.hallChipActive]}
                onPress={() => handleSelectHall(h)}
              >
                <Text style={[styles.hallChipText, isSelected && styles.hallChipTextActive]}>
                  {h.hall_name || h.hall_code || h.name} ({h.allocated_count ?? h.allocations?.length ?? 0}/{h.capacity || 0})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {hallGrid ? (
          <View>
            <View style={styles.hallMetaBox}>
              <Text style={styles.hallMetaText}>
                🏛️ {hallGrid.hall_name || hallGrid.name} • {hallGrid.building} (Floor {hallGrid.floor})
              </Text>
              <Text style={styles.hallMetaSub}>
                Capacity: {hallGrid.capacity} seats | Allocated: {hallGrid.allocated_count ?? hallGrid.allocations?.length ?? 0}
              </Text>
            </View>
            <SeatGrid
              hall={hallGrid}
              seatsGrid={hallGrid.seats_grid || hallGrid.seats || []}
            />
          </View>
        ) : (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  infoCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  infoTitle: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  infoSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  publishBtn: { backgroundColor: colors.success, marginTop: 14, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  publishBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  hallSelector: { flexDirection: "row", marginBottom: 12 },
  hallChip: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  hallChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hallChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  hallChipTextActive: { color: "#ffffff" },
  hallMetaBox: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  hallMetaText: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  hallMetaSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
});
