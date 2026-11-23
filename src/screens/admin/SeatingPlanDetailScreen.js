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
  Platform,
  Share,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { SeatGrid } from "../../components/SeatGrid";
import { showAlert } from "../../utils/alerts";
import api, { seatingApi } from "../../services/api";

export default function SeatingPlanDetailScreen({ route, navigation }) {
  const { planId } = route.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
            ? planHalls.find(h => (h.id || h.hall_id) === selectedHallId) || planHalls[0]
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
        showAlert("Published!", "Seating arrangement is now live! Students can view their hall and seat.");
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
        `Total Students: ${allocations.length}\n` +
        `Benches Used: ${benchesUsed}\n` +
        `Halls: ${hallNames}\n` +
        `Status: ${plan?.status || "DRAFT"}\n\n` +
        `Allocations Summary:\n` +
        allocations
          .slice(0, 40)
          .map(
            (a) =>
              `• ${a.usn} (${a.student_name}): Hall ${a.hall_name}, Seat ${a.seat_label}`
          )
          .join("\n") +
        (allocations.length > 40 ? `\n...and ${allocations.length - 40} more students.` : "");

      await Share.share({
        title: `Seating Plan - ${plan?.exam_name || "Exam"}`,
        message: summaryText,
      });
    } catch (err) {
      console.log("Error sharing plan:", err?.message);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  const isPublished = (plan?.status || "").toUpperCase() === "PUBLISHED";
  const totalAllocated = plan?.total_allocated ?? allocations.length ?? 0;
  const benchesUsed = plan?.benches_used ?? Math.ceil(totalAllocated / 2);

  // Filter allocations by search query and optional hall filter
  const filteredAllocations = allocations.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (a.student_name || "").toLowerCase().includes(q);
    const usnMatch = (a.usn || "").toLowerCase().includes(q);
    const hallMatch = (a.hall_name || "").toLowerCase().includes(q);
    const seatMatch = (a.seat_label || "").toLowerCase().includes(q);
    return nameMatch || usnMatch || hallMatch || seatMatch;
  });

  return (
    <View style={styles.container}>
      <Header
        title={plan?.exam_name || "Seating Plan"}
        subtitle={`Exam: ${plan?.subject_code || ""} • Status: ${plan?.status || "DRAFT"}`}
        showBack
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
      >
        {/* Exam Overview & Control Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.examTitle}>{plan?.exam_name || "Examination Plan"}</Text>
              <Text style={styles.examSub}>
                📅 Date: {plan?.exam_date} • {plan?.start_time} - {plan?.end_time} ({plan?.session || "Session"})
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#dcfce7" : "#fef3c7" }]}>
              <Text style={[styles.statusBadgeText, { color: isPublished ? "#15803d" : "#b45309" }]}>
                {plan?.status || "DRAFT"}
              </Text>
            </View>
          </View>

          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{totalAllocated}</Text>
              <Text style={styles.metricLabel}>Students Allocated</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: "#2563eb" }]}>{benchesUsed}</Text>
              <Text style={styles.metricLabel}>Benches Used</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: "#16a34a" }]}>{halls.length}</Text>
              <Text style={styles.metricLabel}>Halls Assigned</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {!isPublished && (
              <Pressable
                style={[styles.publishBtn, publishing && { opacity: 0.7 }]}
                onPress={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="megaphone" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.publishBtnText}>Publish Live</Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable
              style={[styles.secondaryActionBtn, regenerating && { opacity: 0.7 }]}
              onPress={handleRegenerate}
              disabled={regenerating}
            >
              <Ionicons name="refresh" size={16} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionBtnText}>
                {regenerating ? "Regenerating..." : "Regenerate"}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryActionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionBtnText}>Share Plan</Text>
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
              size={18}
              color={activeTab === "grid" ? "#1e3a8a" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleTabText, activeTab === "grid" && styles.toggleTabTextActive]}>
              Visual Hall Grid
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleTab, activeTab === "list" && styles.toggleTabActive]}
            onPress={() => setActiveTab("list")}
          >
            <Ionicons
              name="list"
              size={18}
              color={activeTab === "list" ? "#1e3a8a" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleTabText, activeTab === "list" && styles.toggleTabTextActive]}>
              Student Allocations List ({allocations.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar for USN or Student Name */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Student USN, Name, Hall, or Seat (e.g. 1MS22CS001, A1)..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
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
                    Total Benches: {hallGrid.num_rows || hallGrid.rows_count || 0} • Seats per Bench: {hallGrid.seats_per_row || hallGrid.benches_per_row || 0} • Allocated: {hallGrid.allocated_count ?? hallGrid.allocations?.length ?? 0}
                  </Text>
                </View>

                {/* Selected Seat Detail Banner */}
                {selectedSeat && (
                  <View style={styles.seatDetailCard}>
                    <View style={styles.seatDetailTop}>
                      <Text style={styles.seatDetailLabel}>
                        Seat {selectedSeat.seat_label} (Row {selectedSeat.row_num}, Position {selectedSeat.seat_num})
                      </Text>
                      <Pressable onPress={() => setSelectedSeat(null)}>
                        <Ionicons name="close" size={18} color="#64748b" />
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
                <Ionicons name="search-outline" size={36} color="#94a3b8" />
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
                        USN: <Text style={{ fontWeight: "700", color: "#1e3a8a" }}>{alloc.usn}</Text> • Dept: {alloc.department_code || "CSE"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.allocCardRight}>
                    <Text style={styles.allocHallName}>{alloc.hall_name}</Text>
                    <Text style={styles.allocBench}>
                      Bench (Row) {alloc.row_num || 1} • Seat {alloc.seat_num || 1}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
    maxWidth: 920,
    alignSelf: "center",
  },
  headerCard: {
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  examSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metricsGrid: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#cbd5e1",
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
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 8,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  viewToggleRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 4,
    marginBottom: 12,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleTabActive: {
    backgroundColor: "#eff6ff",
  },
  toggleTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  toggleTabTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: "#0f172a",
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  hallPicker: {
    flexDirection: "row",
    marginBottom: 12,
  },
  hallChip: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  hallChipActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#1e3a8a",
  },
  hallChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  hallChipTitleActive: {
    color: "#ffffff",
  },
  hallChipMeta: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  hallChipMetaActive: {
    color: "#bfdbfe",
  },
  hallBanner: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  hallBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  hallBannerSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  seatDetailCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 12,
    marginBottom: 10,
  },
  seatDetailTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seatDetailLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  seatStudentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  seatStudentUSN: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  seatEmptyText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  listContainer: {
    gap: 8,
  },
  listHeaderRow: {
    marginBottom: 6,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  allocCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  allocCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  allocSeatBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  allocSeatBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  allocInfo: {
    flex: 1,
  },
  allocStudentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  allocUSN: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  allocCardRight: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  allocHallName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  allocBench: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  emptyResults: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyResultsText: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 8,
  },
});
