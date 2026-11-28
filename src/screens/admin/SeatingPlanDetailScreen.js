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
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { SeatGrid } from "../../components/SeatGrid";
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

  // Classroom filters
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [rowFilter, setRowFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | OCCUPIED | VACANT

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
    const headers = ["USN", "Student Name", "Department", "Hall", "Seat Label", "Row", "Seat No", "Bench", "Side"];
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
        escape(a.bench_num ?? ""),
        escape(a.position ?? ""),
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

  const handleUnpublish = () => {
    confirmAction({
      title: "Unpublish Plan?",
      message: "Students will no longer see their seats until you publish again.",
      confirmText: "Unpublish",
      destructive: true,
      onConfirm: async () => {
        try {
          await seatingApi.unpublish(planId);
          fetchPlanDetail();
        } catch (err) {
          showAlert("Unpublish Error", err.response?.data?.error || err.message || "Failed to unpublish.");
        }
      },
    });
  };

  const handleExportPdf = async () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      showAlert("Notice", "PDF download is available in the web app.");
      return;
    }
    try {
      const res = await seatingApi.downloadPdf(planId);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `seating_plan_${planId}_v${plan?.version || 1}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      showAlert("Export Error", err.message || "Failed to download PDF.");
    }
  };

  const handleReassign = async () => {
    if (!selectedSeat?.allocation?.id || !targetSeatId) {
      showAlert("Missing Selection", "Please select a target seat.");
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
        showAlert("Seat Reassigned", data.message || "Candidate successfully reassigned to target seat.");
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

  const planStatus = (plan?.status || "").toUpperCase();
  const isPublished = planStatus === "PUBLISHED";
  const isArchived = planStatus === "ARCHIVED";
  const activeHall = halls.find((h) => (h.id || h.hall_id) === selectedHallId) || halls[0];
  const activeHallSeats = activeHall?.seats_grid || activeHall?.seats || [];

  const benchText = (s) => `Bench ${String(s.bench_num ?? "").padStart(2, "0")} ${s.position === "RIGHT" ? "Right" : "Left"}`;

  // Vacant seats move the student; occupied seats swap the two students.
  // Positions switched off for this plan are left out (the backend rejects them too).
  const targetSeats = activeHallSeats
    .filter((s) => s.seat_id !== selectedSeat?.seat_id && s.enabled !== false)
    .map((s) => ({
      value: String(s.seat_id || s.id),
      label: s.is_occupied
        ? `Swap with ${s.allocation?.usn} (${s.allocation?.department_code}) at ${s.seat_label}, ${benchText(s)}`
        : `${s.seat_label}, ${benchText(s)} - vacant`,
    }));

  const deptOptions = [
    { value: "ALL", label: "All departments" },
    ...[...new Set(allocations.map((a) => a.department_code).filter(Boolean))].sort().map((c) => ({ value: c, label: c })),
  ];
  const hallRows = [...new Set(activeHallSeats.map((s) => s.row_num))].sort((a, b) => a - b);
  const rowOptions = [{ value: "ALL", label: "All rows" }, ...hallRows.map((r) => ({ value: String(r), label: `Row ${r}` }))];
  const statusOptions = [
    { value: "ALL", label: "All seats" },
    { value: "OCCUPIED", label: "Occupied" },
    { value: "VACANT", label: "Vacant" },
  ];
  const isDimmed = (seat) => {
    if (deptFilter !== "ALL" && seat.allocation?.department_code !== deptFilter) return true;
    if (statusFilter === "OCCUPIED" && !seat.is_occupied) return true;
    if (statusFilter === "VACANT" && seat.is_occupied) return true;
    return false;
  };
  const summary = plan?.summary;
  const planConfig = plan?.config;
  const SIDE_TEXT = { BOTH: "Both sides", LEFT: "Left side only", RIGHT: "Right side only", CUSTOM: "Custom selection" };

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
          <Button
            title="Export PDF"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="document-outline" size={14} color={colors.text} />}
            onPress={handleExportPdf}
          />
          {isPublished && (
            <Button
              title="Unpublish"
              size="sm"
              variant="outline"
              onPress={handleUnpublish}
            />
          )}
          {!isPublished && !isArchived && (
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
              {plan?.notes ? <Text style={styles.examSub}>{plan.notes}</Text> : null}
              {planConfig ? (
                <Text style={styles.examSub}>
                  Positions: {SIDE_TEXT[planConfig.side_mode] || planConfig.side_mode} • Strategy: {planConfig.policy} • Branch separation:{" "}
                  {planConfig.branch_separation ? "On" : "Off"}
                </Text>
              ) : null}
              {summary ? (
                <Text style={styles.examSub}>
                  Allocated {summary.total_allocated} of {summary.total_eligible} • Left {summary.left_used} / Right {summary.right_used} •
                  Vacant {summary.vacant_positions}
                </Text>
              ) : null}
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
                  Seat {selectedSeat.seat_label} • {benchText(selectedSeat)} ({selectedSeat.is_occupied ? "Occupied" : "Vacant"})
                </Text>
                {selectedSeat.allocation ? (
                  <Text style={styles.inspectorSub}>
                    {selectedSeat.allocation.student_name} • USN: {selectedSeat.allocation.usn} • Dept: {selectedSeat.allocation.department_code}
                  </Text>
                ) : (
                  <Text style={styles.inspectorSub}>Seat is currently unassigned.</Text>
                )}
              </View>

              {selectedSeat.allocation && !isArchived && (
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

        {/* Unallocated students of a partial plan */}
        {summary?.unallocated_students?.length > 0 && (
          <Card style={styles.unallocCard}>
            <Text style={styles.unallocTitle}>Unallocated students ({summary.unallocated_students.length})</Text>
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
              {summary.unallocated_students.map((u) => (
                <Text key={u.student_id} style={styles.unallocText}>
                  {u.usn} • {u.student_name} • {u.department_code}
                </Text>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Classroom bench layout */}
        <Card style={styles.gridCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Select label="Department" value={deptFilter} onChange={setDeptFilter} options={deptOptions} />
            </View>
            <View style={styles.filterItem}>
              <Select label="Row" value={rowFilter} onChange={setRowFilter} options={rowOptions} />
            </View>
            <View style={styles.filterItem}>
              <Select label="Seats" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            </View>
          </View>

          {loading ? (
            <LoadingSkeleton height={200} />
          ) : (
            <SeatGrid
              hall={activeHall}
              seatsGrid={activeHallSeats}
              selectedSeatId={selectedSeat?.seat_id}
              onSeatPress={setSelectedSeat}
              rows={rowFilter === "ALL" ? null : [Number(rowFilter)]}
              isDimmed={isDimmed}
              detailed
              legendStates={["vacant", "occupied", "selected", "disabled", "unavailable"]}
              renderSeatContent={(seat, state) =>
                seat.allocation ? (
                  <View>
                    <Text style={[styles.seatName, state === "selected" && styles.seatTextInverse]} numberOfLines={1}>
                      {seat.allocation.student_name}
                    </Text>
                    <Text style={[styles.seatMeta, state === "selected" && styles.seatTextInverse]} numberOfLines={1}>
                      {seat.allocation.usn}
                    </Text>
                    <Text style={[styles.seatBranch, state === "selected" && styles.seatTextInverse]}>
                      {seat.allocation.department_code} • {seat.seat_label}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.seatMeta, state === "selected" && styles.seatTextInverse]}>
                    {seat.seat_label} • {state === "disabled" ? "Off" : "Vacant"}
                  </Text>
                )
              }
            />
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
              label="Target Seat"
              placeholder="Select a vacant seat, or a student to swap with..."
              value={targetSeatId}
              onChange={setTargetSeatId}
              options={targetSeats}
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  filterItem: {
    flex: 1,
    minWidth: 160,
  },
  seatName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  seatMeta: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  seatBranch: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },
  seatTextInverse: {
    color: colors.textInverse,
  },
  unallocCard: {
    gap: 6,
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  unallocTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.warningText,
  },
  unallocText: {
    fontSize: 12,
    color: colors.warningText,
  },
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
  modalForm: {
    gap: 12,
  },
});
