import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  Share,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { Badge } from "../../components/Badge";
import { SeatGrid } from "../../components/SeatGrid";
import { colors, typography, shadows } from "../../theme/colors";
import { showAlert } from "../../utils/alerts";
import api, { seatingApi } from "../../services/api";

export default function SeatingPlanDetailScreen({ route, navigation }) {
  const { planId } = route.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [plan, setPlan] = useState(null);
  const [halls, setHalls] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [hallGrid, setHallGrid] = useState(null);
  const [activeTab, setActiveTab] = useState("grid"); // "grid" | "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeat, setSelectedSeat] = useState(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlanDetail = async () => {
    if (!planId) return;
    try {
      const res = await seatingApi.getPlan(planId);
      const data = res.data || res;

      if (data.success && data.plan) {
        setPlan(data.plan);
        const planHalls = data.halls || data.plan.halls || [];
        setHalls(planHalls);
        setAllocations(data.plan.allocations || []);

        if (planHalls.length > 0) {
          const defaultHall = selectedHallId
            ? planHalls.find((h) => (h.id || h.hall_id) === selectedHallId) || planHalls[0]
            : planHalls[0];
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

  useEffect(() => {
    fetchPlanDetail();
  }, [planId]);

  const handleSelectHall = (h) => {
    setSelectedHallId(h.id || h.hall_id);
    setHallGrid(h);
    setSelectedSeat(null);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await seatingApi.publish(planId);
      const data = res.data || res;
      if (data.success) {
        showAlert("Published!", "Seating arrangement is now live! Candidates can view their allocated hall and seat.");
        fetchPlanDetail();
      } else {
        showAlert("Error", data.error || "Could not publish plan.");
      }
    } catch (err) {
      showAlert("Publish Error", err.response?.data?.error || err.message || "Failed to publish plan.");
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!plan) return;
    setRegenerating(true);
    try {
      const res = await seatingApi.generate({
        exam_id: plan.exam_id,
        policy: "INTERLEAVE",
        force: true,
      });
      const data = res.data || res;
      if (data.success) {
        showAlert("Regenerated", "Seating plan regenerated with updated allocations.");
        fetchPlanDetail();
      } else {
        showAlert("Error", data.error || "Could not regenerate seating.");
      }
    } catch (err) {
      showAlert("Regeneration Error", err.response?.data?.error || err.message || "Failed to regenerate.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      const hallNames = halls.map((h) => h.name || h.hall_code).join(", ");
      const summaryText =
        `EXAMEASE EXAMINATION SEATING PLAN\n` +
        `Exam: ${plan?.exam_name || "Exam"} (${plan?.subject_code || ""})\n` +
        `Date: ${plan?.exam_date} | Time: ${plan?.start_time} - ${plan?.end_time}\n` +
        `Total Candidates: ${allocations.length}\n` +
        `Halls: ${hallNames}\n` +
        `Status: ${plan?.status || "DRAFT"}\n\n` +
        `Allocations Summary:\n` +
        allocations
          .slice(0, 30)
          .map(
            (a) =>
              `• ${a.usn} (${a.student_name}): Hall ${a.hall_name}, Seat ${a.seat_label}`
          )
          .join("\n") +
        (allocations.length > 30 ? `\n...and ${allocations.length - 30} more students.` : "");

      await Share.share({
        title: `Seating Plan - ${plan?.exam_name || "Exam"}`,
        message: summaryText,
      });
    } catch (err) {
      console.log("Error sharing plan:", err?.message);
    }
  };

  if (loading) {
    return (
      <ResponsiveLayout title="Seating Plan Details" showBack currentRouteName="SeatingPlans">
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </ResponsiveLayout>
    );
  }

  const isPublished = (plan?.status || "").toUpperCase() === "PUBLISHED";
  const totalAllocated = plan?.total_allocated ?? allocations.length ?? 0;
  const benchesUsed = plan?.benches_used ?? Math.ceil(totalAllocated / 2);

  const filteredAllocations = allocations.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.student_name || "").toLowerCase().includes(q) ||
      (a.usn || "").toLowerCase().includes(q) ||
      (a.hall_name || "").toLowerCase().includes(q) ||
      (a.seat_label || "").toLowerCase().includes(q)
    );
  });

  return (
    <ResponsiveLayout
      title={plan?.exam_name || "Seating Plan"}
      subtitle={`Exam: ${plan?.subject_code || ""} • Status: ${plan?.status || "DRAFT"}`}
      showBack
      currentRouteName="SeatingPlans"
      rightAction={
        !isPublished ? (
          <Pressable
            style={[styles.publishHeaderBtn, publishing && styles.btnDisabled]}
            onPress={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="megaphone" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.publishHeaderBtnText}>Publish Live</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Badge label="PUBLISHED LIVE" variant="success" size="sm" />
        )
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.examTitle}>{plan?.exam_name || "Examination Plan"}</Text>
              <Text style={styles.examSub}>
                📅 Date: {plan?.exam_date} • {plan?.start_time} - {plan?.end_time} ({plan?.session || "Session"})
              </Text>
            </View>

            <Badge
              label={plan?.status || "DRAFT"}
              variant={isPublished ? "success" : "warning"}
            />
          </View>

          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{totalAllocated}</Text>
              <Text style={styles.metricLabel}>Students Allocated</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>{benchesUsed}</Text>
              <Text style={styles.metricLabel}>Benches Used</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.successText }]}>{halls.length}</Text>
              <Text style={styles.metricLabel}>Halls Assigned</Text>
            </View>
          </View>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            {!isPublished && (
              <Pressable
                style={[styles.publishBtn, publishing && styles.btnDisabled]}
                onPress={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="megaphone" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.publishBtnText}>Publish Live for Students</Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable
              style={[styles.secondaryActionBtn, regenerating && styles.btnDisabled]}
              onPress={handleRegenerate}
              disabled={regenerating}
            >
              <Ionicons name="refresh" size={15} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionBtnText}>
                {regenerating ? "Regenerating..." : "Regenerate"}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryActionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={15} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionBtnText}>Share</Text>
            </Pressable>
          </View>
        </View>

        {/* View Mode Toggle: Visual Grid vs Student List */}
        <View style={styles.viewToggleRow}>
          <Pressable
            style={[styles.toggleTab, activeTab === "grid" && styles.toggleTabActive]}
            onPress={() => setActiveTab("grid")}
          >
            <MaterialCommunityIcons
              name="view-grid"
              size={17}
              color={activeTab === "grid" ? colors.primaryDark : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleTabText, activeTab === "grid" && styles.toggleTabTextActive]}>
              Interactive Hall Grid
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleTab, activeTab === "list" && styles.toggleTabActive]}
            onPress={() => setActiveTab("list")}
          >
            <Ionicons
              name="list"
              size={17}
              color={activeTab === "list" ? colors.primaryDark : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleTabText, activeTab === "list" && styles.toggleTabTextActive]}>
              Student Allocations List ({allocations.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search allocations by USN, Name, Hall, or Seat Label (e.g. 1MS22CS001, A1)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* TAB 1: VISUAL HALL GRID */}
        {activeTab === "grid" ? (
          <View>
            <Text style={styles.subSectionTitle}>Select Hall to View Seating Layout:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hallPicker}>
              {halls.map((h) => {
                const hid = h.id || h.hall_id;
                const isSelected = selectedHallId === hid;
                return (
                  <Pressable
                    key={hid}
                    style={[styles.hallChip, isSelected && styles.hallChipActive]}
                    onPress={() => handleSelectHall(h)}
                  >
                    <Text style={[styles.hallChipTitle, isSelected && styles.hallChipTitleActive]}>
                      {h.name || h.hall_name || h.hall_code}
                    </Text>
                    <Text style={[styles.hallChipMeta, isSelected && styles.hallChipMetaActive]}>
                      {h.allocated_count ?? h.allocations?.length ?? 0}/{h.capacity || 0} seats
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {hallGrid ? (
              <View>
                <View style={styles.hallBanner}>
                  <Text style={styles.hallBannerTitle}>
                    🏛️ {hallGrid.name || hallGrid.hall_name} • {hallGrid.building} (Floor {hallGrid.floor})
                  </Text>
                  <Text style={styles.hallBannerSub}>
                    Benches: {hallGrid.num_rows || hallGrid.rows_count || 0} • Seats / Bench: {hallGrid.seats_per_row || hallGrid.benches_per_row || 0} • Allocated: {hallGrid.allocated_count ?? hallGrid.allocations?.length ?? 0}
                  </Text>
                </View>

                {/* Selected Seat Detail Banner */}
                {selectedSeat && (
                  <View style={styles.seatDetailCard}>
                    <View style={styles.seatDetailTop}>
                      <Text style={styles.seatDetailLabel}>
                        Seat {selectedSeat.seat_label} (Row {selectedSeat.row_num}, Position {selectedSeat.seat_num})
                      </Text>
                      <Pressable onPress={() => setSelectedSeat(null)} hitSlop={8}>
                        <Ionicons name="close" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    {selectedSeat.is_occupied && selectedSeat.allocation ? (
                      <View>
                        <Text style={styles.seatStudentName}>{selectedSeat.allocation.student_name}</Text>
                        <Text style={styles.seatStudentUSN}>
                          USN: {selectedSeat.allocation.usn} • Dept: {selectedSeat.allocation.department_code || "ENG"} • Sec {selectedSeat.allocation.section || "A"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.seatEmptyText}>This seat is currently unassigned / available.</Text>
                    )}
                  </View>
                )}

                <SeatGrid
                  hall={hallGrid}
                  seatsGrid={hallGrid.seats_grid || hallGrid.seats || []}
                  onSeatPress={(seat) => setSelectedSeat(seat)}
                  selectedSeatId={selectedSeat?.seat_id}
                />
              </View>
            ) : (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            )}
          </View>
        ) : (
          /* TAB 2: STUDENT ALLOCATIONS LIST */
          <View style={styles.listContainer}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                Allocated Students ({filteredAllocations.length})
              </Text>
            </View>

            {filteredAllocations.length === 0 ? (
              <View style={styles.emptyResults}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyResultsText}>
                  No students matched "{searchQuery}".
                </Text>
              </View>
            ) : (
              filteredAllocations.map((alloc, idx) => (
                <View key={alloc.id || idx} style={styles.allocCard}>
                  <View style={styles.allocCardLeft}>
                    <View style={styles.allocSeatBadge}>
                      <Text style={styles.allocSeatBadgeText}>{alloc.seat_label || `S${idx + 1}`}</Text>
                    </View>
                    <View style={styles.allocInfo}>
                      <Text style={styles.allocStudentName}>{alloc.student_name || "Student"}</Text>
                      <Text style={styles.allocUSN}>
                        USN: <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{alloc.usn}</Text> • Dept: {alloc.department_code || "CSE"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.allocCardRight}>
                    <Text style={styles.allocHallName}>{alloc.hall_name}</Text>
                    <Text style={styles.allocBench}>
                      Bench {alloc.row_num || 1} • Seat {alloc.seat_num || 1}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
  publishHeaderBtn: {
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  publishHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  examSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  metricDivider: {
    width: 1,
    height: "80%",
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  publishBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingVertical: 9,
    borderRadius: 8,
  },
  publishBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  viewToggleRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: 10,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 6,
  },
  toggleTabActive: {
    backgroundColor: colors.primaryLight,
  },
  toggleTabText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  toggleTabTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 12,
    color: colors.text,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  hallPicker: {
    flexDirection: "row",
    marginBottom: 10,
  },
  hallChip: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  hallChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hallChipTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  hallChipTitleActive: {
    color: "#FFFFFF",
  },
  hallChipMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  hallChipMetaActive: {
    color: colors.primaryMuted,
  },
  hallBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  hallBannerTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  hallBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seatDetailCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    padding: 10,
    marginBottom: 8,
  },
  seatDetailTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  seatDetailLabel: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  seatStudentName: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  seatStudentUSN: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  seatEmptyText: {
    fontSize: 11,
    color: colors.successText,
    fontWeight: typography.weights.medium,
  },
  listContainer: {
    gap: 8,
  },
  listHeaderRow: {
    marginBottom: 4,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  allocCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  allocCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  allocSeatBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  allocSeatBadgeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  allocInfo: {
    flex: 1,
  },
  allocStudentName: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  allocUSN: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  allocCardRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  allocHallName: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  allocBench: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyResults: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyResultsText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
});
