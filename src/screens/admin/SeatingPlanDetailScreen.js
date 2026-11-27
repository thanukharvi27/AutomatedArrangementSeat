import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Select } from "../../components/common/Select";
import { ModalDialog } from "../../components/common/ModalDialog";
import { Tooltip } from "../../components/common/Tooltip";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert, confirmAction } from "../../utils/alerts";
import api, { seatingApi } from "../../services/api";

export default function SeatingPlanDetailScreen({ route, navigation }) {
  const { planId } = route.params || {};
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [plan, setPlan] = useState(null);
  const [halls, setHalls] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Reassignment Modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetSeatId, setTargetSeatId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const fetchPlanDetail = async () => {
    if (!planId) return;
    try {
      const res = await seatingApi.getPlan(planId);
      const data = res.data || res;
      if (data.success && data.plan) {
        setPlan(data.plan);
        const planHalls = data.halls || data.plan.halls || [];
        setHalls(planHalls);
        setAllocations(planHalls.flatMap((h) => h.allocations || []));

        if (planHalls.length > 0 && !selectedHallId) {
          setSelectedHallId(planHalls[0].id || planHalls[0].hall_id);
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

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await seatingApi.publish(planId);
      const data = res.data || res;
      if (data.success) {
        showAlert("Published!", "Seating plan published live! Candidates can view their hall and seat.");
        fetchPlanDetail();
      } else {
        showAlert("Error", data.error || "Could not publish plan.");
      }
    } catch (err) {
      showAlert("Publish Error", err.response?.data?.error || err.message || "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  const handleExportCsv = () => {
    if (allocations.length === 0) {
      showAlert("Notice", "No allocations to export.");
      return;
    }

    // Escape formula-like cells & add UTF-8 BOM
    const headers = ["USN", "Student Name", "Department", "Hall", "Seat Label", "Row", "Position"];
    const rows = allocations.map((a) => {
      const escape = (val) => {
        let s = String(val ?? "");
        if (/^[=\+\-@]/.test(s)) s = `'${s}`;
        return `"${s.replace(/"/g, '""')}"`;
      };
      return [
        escape(a.usn),
        escape(a.student_name),
        escape(a.department_code),
        escape(a.hall_name),
        escape(a.seat_label),
        escape(a.row_num || 1),
        escape(a.seat_num || 1),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `seating_plan_${planId}_allocations.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert("Export Complete", "Allocations CSV downloaded successfully.");
    } else {
      showAlert("Export Ready", `${allocations.length} allocations exported to CSV.`);
    }
  };

  const handleReassign = async () => {
    if (!selectedSeat?.allocation?.id || !targetSeatId) {
      showAlert("Missing Selection", "Please select a target vacant seat.");
      return;
    }

    setReassigning(true);
    try {
      const res = await seatingApi.reassign(
        planId,
        selectedSeat.allocation.id,
        targetSeatId,
        reassignReason || "Administrative reassignment"
      );
      const data = res.data || res;
      if (data.success) {
        showAlert("Seat Reassigned", "Candidate successfully reassigned to target seat.");
        setTargetSeatId("");
        setShowReassignModal(false);
        setSelectedSeat(null);
        fetchPlanDetail();
      } else {
        showAlert("Error", data.error || "Could not reassign seat.");
      }
    } catch (err) {
      showAlert("Reassign Error", err.response?.data?.error || err.message || "Failed to reassign seat.");
    } finally {
      setReassigning(false);
    }
  };

  const isPublished = (plan?.status || "").toUpperCase() === "PUBLISHED";
  const activeHall = halls.find((h) => (h.id || h.hall_id) === selectedHallId) || halls[0];
  const activeHallSeats = activeHall?.seats_grid || activeHall?.seats || [];

  // Find all free seats across active hall for the Select dropdown
  const freeSeats = activeHallSeats
    .filter((s) => !s.is_occupied)
    .map((s) => ({ value: String(s.seat_id || s.id), label: `Seat ${s.seat_label} (Row ${s.row_num}, Pos ${s.seat_num})` }));

  return (
    <AppLayout
      title={plan?.exam_name || "Seating Plan Detail"}
      subtitle={`Subject: ${plan?.subject_code || ""} • ${allocations.length} allocated candidates`}
      breadcrumb="Seating Plans / Detail"
      showBack
      currentRouteName="SeatingPlans"
      rightAction={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            title="Export CSV"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="download-outline" size={14} color={colors.text} />}
            onPress={handleExportCsv}
          />
          {!isPublished && (
            <Button
              title="Publish Live"
              size="sm"
              loading={publishing}
              icon={<Ionicons name="megaphone-outline" size={14} color="#FFFFFF" />}
              onPress={handlePublish}
            />
          )}
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTitle}>{plan?.exam_name}</Text>
              <Text style={styles.examSub}>
                📅 Date: {plan?.exam_date} • {plan?.start_time} - {plan?.end_time} • Version {plan?.version || 1}
              </Text>
            </View>
            <View style={[styles.statusBadge, isPublished ? styles.statusPub : styles.statusDraft]}>
              <Text style={[styles.statusBadgeText, isPublished ? styles.statusTextPub : styles.statusTextDraft]}>
                {plan?.status || "DRAFT"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Hall Picker Chips */}
        <Card style={styles.hallPickerCard}>
          <Text style={styles.pickerHeading}>Select Examination Hall:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hallChipScroll}>
            {halls.map((h) => {
              const hid = h.id || h.hall_id;
              const isSelected = selectedHallId === hid;
              return (
                <Pressable
                  key={hid}
                  onPress={() => {
                    setSelectedHallId(hid);
                    setSelectedSeat(null);
                  }}
                  style={[styles.hallChip, isSelected && styles.hallChipActive]}
                >
                  <Text style={[styles.hallChipText, isSelected && styles.hallChipTextActive]}>
                    {h.hall_name || h.name || h.hall_code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>

        {/* Selected Seat Inspector Banner */}
        {selectedSeat && (
          <Card style={styles.seatInspectorCard}>
            <View style={styles.inspectorTop}>
              <View>
                <Text style={styles.inspectorTitle}>
                  Seat {selectedSeat.seat_label} ({selectedSeat.is_occupied ? "Occupied" : "Vacant"})
                </Text>
                {selectedSeat.allocation ? (
                  <Text style={styles.inspectorSub}>
                    {selectedSeat.allocation.student_name} • USN: {selectedSeat.allocation.usn} • Dept: {selectedSeat.allocation.department_code}
                  </Text>
                ) : (
                  <Text style={styles.inspectorSub}>Seat is currently unassigned.</Text>
                )}
              </View>

              {selectedSeat.allocation && (
                <Button
                  title="Reassign Seat"
                  size="sm"
                  variant="outline"
                  onPress={() => setShowReassignModal(true)}
                />
              )}
            </View>
          </Card>
        )}

        {/* Interactive Department-Colored Seat Grid */}
        <Card style={styles.gridCard}>
          <View style={styles.gridLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Allocated Candidate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]} />
              <Text style={styles.legendText}>Available Vacant</Text>
            </View>
          </View>

          {loading ? (
            <LoadingSkeleton height={200} />
          ) : (
            <View style={styles.seatGridContainer}>
              {activeHallSeats.map((seat, idx) => {
                const isSelected = selectedSeat?.seat_id === seat.seat_id;
                const isOccupied = seat.is_occupied;
                const deptCode = seat.allocation?.department_code;

                return (
                  <Tooltip
                    key={seat.seat_id || idx}
                    content={isOccupied ? `${seat.seat_label}: ${seat.allocation?.student_name} (${seat.allocation?.usn})` : `${seat.seat_label}: Vacant`}
                  >
                    <Pressable
                      onPress={() => setSelectedSeat(seat)}
                      style={[
                        styles.seatCell,
                        isOccupied ? styles.seatOccupied : styles.seatVacant,
                        isSelected && styles.seatSelected,
                      ]}
                    >
                      <Text style={[styles.seatCellLabel, isOccupied ? styles.seatLabelOccupied : styles.seatLabelVacant]}>
                        {seat.seat_label}
                      </Text>
                      {deptCode ? (
                        <Text style={styles.seatDeptCode}>{deptCode}</Text>
                      ) : null}
                    </Pressable>
                  </Tooltip>
                );
              })}
            </View>
          )}
        </Card>

        {/* Reassign Dialog */}
        <ModalDialog
          visible={showReassignModal}
          onClose={() => setShowReassignModal(false)}
          title="Reassign Candidate Seat"
          subtitle={`Moving ${selectedSeat?.allocation?.student_name} (${selectedSeat?.allocation?.usn})`}
          maxWidth={420}
        >
          <View style={styles.modalForm}>
            <Select
              label="Target Vacant Seat"
              placeholder="Select available vacant seat..."
              value={targetSeatId}
              onChange={setTargetSeatId}
              options={freeSeats}
            />

            <Button
              title="Confirm Reassignment"
              loading={reassigning}
              onPress={handleReassign}
              style={{ marginTop: 10 }}
            />
          </View>
        </ModalDialog>
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
  headerCard: {
    gap: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  examTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  examSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  },
  statusTextPub: {
    color: colors.successText,
  },
  statusTextDraft: {
    color: colors.warningText,
  },
  hallPickerCard: {
    gap: 10,
    padding: 14,
  },
  pickerHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hallChipScroll: {
    flexDirection: "row",
  },
  hallChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    cursor: "pointer",
  },
  hallChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hallChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hallChipTextActive: {
    color: "#FFFFFF",
  },
  seatInspectorCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryMuted,
  },
  inspectorTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inspectorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  inspectorSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gridCard: {
    gap: 14,
  },
  gridLegendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  seatGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seatCell: {
    width: 58,
    height: 48,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    cursor: "pointer",
  },
  seatOccupied: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryMuted,
  },
  seatVacant: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  seatSelected: {
    borderColor: colors.primaryDark,
    borderWidth: 2,
  },
  seatCellLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  seatLabelOccupied: {
    color: colors.primaryDark,
  },
  seatLabelVacant: {
    color: colors.textMuted,
  },
  seatDeptCode: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 1,
  },
  modalForm: {
    gap: 12,
  },
});
