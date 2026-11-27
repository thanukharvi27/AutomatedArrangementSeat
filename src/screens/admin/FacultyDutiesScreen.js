import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Select } from "../../components/common/Select";
import { Input } from "../../components/common/Input";
import { ModalDialog } from "../../components/common/ModalDialog";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { showAlert, confirmAction } from "../../utils/alerts";
import api, { facultyApi, examApi, hallApi } from "../../services/api";

export default function FacultyDutiesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [duties, setDuties] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [exams, setExams] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignFacultyId, setAssignFacultyId] = useState("");
  const [assignExamId, setAssignExamId] = useState("");
  const [assignHallId, setAssignHallId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const loadDuties = async () => {
    try {
      if (isAdmin) {
        const [dutiesRes, facRes, examsRes, hallsRes] = await Promise.allSettled([
          facultyApi.getDuties(),
          facultyApi.getAll(),
          examApi.getAll(),
          hallApi.getAll(),
        ]);

        if (dutiesRes.status === "fulfilled") {
          const dData = dutiesRes.value.data || dutiesRes.value;
          setDuties(dData.assignments || []);
        }
        if (facRes.status === "fulfilled") {
          const fData = facRes.value.data || facRes.value;
          setFacultyList(fData.faculty || []);
        }
        if (examsRes.status === "fulfilled") {
          const eData = examsRes.value.data || examsRes.value;
          setExams(eData.exams || []);
        }
        if (hallsRes.status === "fulfilled") {
          const hData = hallsRes.value.data || hallsRes.value;
          setHalls(hData.halls || []);
        }
      } else {
        // Faculty logged in: fetch their own duties
        const res = await facultyApi.getMyDuties();
        const data = res.data || res;
        if (data.success) {
          setDuties(data.duties || []);
        }
      }
    } catch (err) {
      console.log("Error loading duties:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDuties();
  }, []);

  const handleOpenAssign = () => {
    setAssignFacultyId(facultyList[0]?.id ? String(facultyList[0].id) : "");
    setAssignExamId(exams[0]?.id ? String(exams[0].id) : "");
    setAssignHallId(halls[0]?.id ? String(halls[0].id) : "");
    setAssignNotes("");
    setShowAssignModal(true);
  };

  const handleCreateAssignment = async () => {
    if (!assignFacultyId || !assignExamId || !assignHallId) {
      showAlert("Missing Selection", "Please select Faculty, Exam, and Hall.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        faculty_id: parseInt(assignFacultyId, 10),
        exam_id: parseInt(assignExamId, 10),
        hall_id: parseInt(assignHallId, 10),
        notes: assignNotes.trim() || undefined,
      };

      const res = await facultyApi.assignDuty(payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Duty Assigned", "Invigilation duty assignment recorded successfully!");
        setShowAssignModal(false);
        loadDuties();
      } else {
        showAlert("Assignment Note", data.error || "Could not assign duty.");
      }
    } catch (err) {
      showAlert("Assignment Error", err.response?.data?.error || err.message || "Failed to assign duty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDuty = (duty) => {
    confirmAction({
      title: "Remove Duty Assignment",
      message: `Cancel invigilation assignment for ${duty.faculty_name} on ${duty.duty_date}?`,
      confirmText: "Cancel Assignment",
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await facultyApi.cancelDuty(duty.id);
          const data = res.data || res;
          if (data.success) {
            showAlert("Cancelled", "Duty assignment removed.");
            loadDuties();
          } else {
            showAlert("Error", data.error || "Could not cancel duty.");
          }
        } catch (err) {
          showAlert("Error", err.response?.data?.error || err.message || "Failed to cancel duty.");
        }
      },
    });
  };

  // Group duties by date for admin view
  const groupedDuties = duties.reduce((acc, d) => {
    const key = d.duty_date || "Upcoming";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedDuties).sort();

  return (
    <AppLayout
      title={isAdmin ? "Invigilation Duties" : "My Assigned Duties"}
      subtitle={isAdmin ? "Supervision rosters & hall invigilation schedules" : "Your official exam hall supervisory duties"}
      breadcrumb="Exam Operations / Invigilation"
      currentRouteName="FacultyDuties"
      rightAction={
        isAdmin ? (
          <Button
            title="Assign Duty"
            size="sm"
            icon={<Ionicons name="add-circle-outline" size={15} color="#FFFFFF" />}
            onPress={handleOpenAssign}
          />
        ) : null
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDuties(); }} />
        }
      >
        {loading ? (
          <LoadingSkeleton height={180} />
        ) : duties.length === 0 ? (
          <EmptyState
            iconName="shield-checkmark-outline"
            title="No Invigilation Duties"
            message={isAdmin ? "No invigilation duties scheduled yet." : "You have no supervisory duties assigned."}
            actionLabel={isAdmin ? "Assign First Duty" : undefined}
            onAction={isAdmin ? handleOpenAssign : undefined}
          />
        ) : isAdmin ? (
          // Admin View: Grouped by Date with Remove action
          <View style={styles.dutyTimeline}>
            {dateKeys.map((dateStr) => (
              <View key={dateStr} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.dateTitle}>{dateStr}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{groupedDuties[dateStr].length} supervisors</Text>
                  </View>
                </View>

                <View style={styles.dutyCardsGrid}>
                  {groupedDuties[dateStr].map((item) => (
                    <Card key={item.id} style={styles.dutyCard}>
                      <View style={styles.dutyTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dutyFacultyName}>{item.faculty_name}</Text>
                          <Text style={styles.dutyFacultySub}>ID: {item.employee_id} • Dept: {item.department_code || "Faculty"}</Text>
                        </View>
                        <Button
                          title="Remove"
                          size="sm"
                          variant="ghost"
                          icon={<Ionicons name="trash-outline" size={13} color={colors.danger} />}
                          onPress={() => handleRemoveDuty(item)}
                          textStyle={{ color: colors.danger }}
                        />
                      </View>

                      <View style={styles.dutyInfoBox}>
                        <Text style={styles.dutyExamText}>📝 {item.exam_name} ({item.subject_code || "Exam"})</Text>
                        <Text style={styles.dutyHallText}>🏛️ Room: <Text style={{ fontWeight: "700" }}>{item.hall_name}</Text> ({item.building || "Academic Block"})</Text>
                        <Text style={styles.dutyTimeText}>⏰ {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
          // Faculty View: Own assigned cards
          <View style={styles.facultyDutyGrid}>
            {duties.map((item) => (
              <Card key={item.id} style={styles.ownDutyCard}>
                <View style={styles.dutyTop}>
                  <View style={styles.assignedBadge}>
                    <Text style={styles.assignedBadgeText}>ASSIGNED SUPERVISOR</Text>
                  </View>
                  <Text style={styles.dutyDateBadge}>📅 {item.duty_date}</Text>
                </View>

                <Text style={styles.ownExamTitle}>{item.exam_name}</Text>
                <Text style={styles.ownExamSub}>{item.subject_code || "Examination"}</Text>

                <View style={styles.dutyDetailBox}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.detailText}>Timing: {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.detailText}>Assigned Hall: <Text style={{ fontWeight: "700" }}>{item.hall_name}</Text> ({item.building})</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Assign Duty Modal */}
        {isAdmin && (
          <ModalDialog
            visible={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            title="Assign Invigilation Duty"
            subtitle="Allocate faculty supervisor to examination hall"
            maxWidth={460}
          >
            <View style={styles.modalForm}>
              <Select
                label="Faculty Member *"
                value={assignFacultyId}
                onChange={setAssignFacultyId}
                options={facultyList.map((f) => ({ value: String(f.id), label: `${f.full_name} (${f.employee_id})` }))}
              />
              <Select
                label="Examination *"
                value={assignExamId}
                onChange={setAssignExamId}
                options={exams.map((e) => ({ value: String(e.id), label: `${e.course_name || e.name} (${e.exam_date})` }))}
              />
              <Select
                label="Examination Hall *"
                value={assignHallId}
                onChange={setAssignHallId}
                options={halls.map((h) => ({ value: String(h.id), label: `${h.hall_code || h.name} (${h.capacity} seats)` }))}
              />
              <Input
                label="Supervisory Notes (Optional)"
                placeholder="e.g. Chief Superintendent, Verification Duty"
                value={assignNotes}
                onChangeText={setAssignNotes}
              />

              <Button
                title="Confirm Assignment"
                loading={submitting}
                onPress={handleCreateAssignment}
                style={{ marginTop: 10 }}
              />
            </View>
          </ModalDialog>
        )}
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
  dutyTimeline: {
    gap: 18,
  },
  dateGroup: {
    gap: 10,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  dateTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginLeft: 8,
  },
  countText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dutyCardsGrid: {
    gap: 10,
  },
  dutyCard: {
    gap: 8,
  },
  dutyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dutyFacultyName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  dutyFacultySub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dutyInfoBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 10,
    gap: 4,
  },
  dutyExamText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  dutyHallText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dutyTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  facultyDutyGrid: {
    gap: 12,
  },
  ownDutyCard: {
    gap: 8,
  },
  assignedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successText,
    letterSpacing: 0.5,
  },
  dutyDateBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  ownExamTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  ownExamSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dutyDetailBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 12,
    color: colors.text,
  },
  modalForm: {
    gap: 12,
  },
});
