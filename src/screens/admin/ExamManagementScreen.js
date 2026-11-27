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
import { Tabs } from "../../components/common/Tabs";
import { SearchInput, Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { ModalDialog } from "../../components/common/ModalDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert } from "../../utils/alerts";
import api, { examApi, departmentApi } from "../../services/api";

export default function ExamManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState("UPCOMING"); // UPCOMING | PAST | ALL
  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Add (POST)
  const [examName, setExamName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [deptId, setDeptId] = useState("");
  const [semester, setSemester] = useState("5");
  const [examDate, setExamDate] = useState("2026-11-15");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("12:30");
  const [autoRegister, setAutoRegister] = useState(true);

  // Form states for Edit (PATCH: name, subject_code, status only)
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editStatus, setEditStatus] = useState("SCHEDULED");

  const loadExams = async () => {
    try {
      const [exRes, deptRes] = await Promise.allSettled([
        examApi.getAll(),
        departmentApi.getAll(),
      ]);

      if (exRes.status === "fulfilled") {
        const eData = exRes.value.data || exRes.value;
        setExams(eData.exams || []);
      }

      if (deptRes.status === "fulfilled") {
        const dData = deptRes.value.data || deptRes.value;
        const depts = dData.departments || [];
        setDepartments(depts);
        if (!deptId && depts.length > 0) {
          setDeptId(String(depts[0].id));
        }
      }
    } catch (err) {
      console.log("Error loading exams:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleCreateExam = async () => {
    const trimmedName = examName.trim();
    const trimmedCode = subjectCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode || !deptId || !examDate || !startTime || !endTime) {
      showAlert("Missing Fields", "Please fill in Exam Name, Code, Department, Date, and Timings.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        subject_code: trimmedCode,
        department_id: parseInt(deptId, 10),
        semester: parseInt(semester, 10) || 5,
        exam_date: examDate.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        auto_register_students: autoRegister,
      };

      const res = await examApi.create(payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Exam Created", `Examination ${trimmedName} scheduled successfully!`);
        setShowAddModal(false);
        setExamName("");
        setSubjectCode("");
        loadExams();
      } else {
        showAlert("Error", data.error || "Could not schedule exam.");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.error || err.message || "Failed to schedule exam.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (exam) => {
    setEditingExam(exam);
    setEditName(exam.course_name || exam.name);
    setEditCode(exam.course_code || exam.subject_code);
    setEditStatus(exam.status || "SCHEDULED");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingExam) return;
    setSubmitting(true);
    try {
      // PATCH: name, subject_code, status only as per API prompt constraints
      const payload = {
        name: editName.trim(),
        subject_code: editCode.trim().toUpperCase(),
        status: editStatus,
      };

      const res = await api.patch(`/exams/${editingExam.id}`, payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Updated", "Examination details updated successfully.");
        setShowEditModal(false);
        loadExams();
      } else {
        showAlert("Error", data.error || "Could not update exam.");
      }
    } catch (err) {
      showAlert("Update Error", err.response?.data?.error || err.message || "Failed to update exam.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterEligible = async (exam) => {
    try {
      const res = await examApi.registerStudents(exam.id);
      const data = res.data || res;
      if (data.success) {
        showAlert("Students Registered", data.message || "Department students registered for exam!");
        loadExams();
      } else {
        showAlert("Notice", data.error || "Could not register students.");
      }
    } catch (err) {
      showAlert("Registration Error", err.response?.data?.error || err.message || "Failed to register.");
    }
  };

  // Filter exams by tab & search query
  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredExams = exams.filter((e) => {
    // Search query filter
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (e.course_code || e.subject_code || "").toLowerCase().includes(q) ||
      (e.course_name || e.name || "").toLowerCase().includes(q) ||
      (e.department_name || "").toLowerCase().includes(q);

    if (!matchSearch) return false;

    // Tab filter
    if (activeTab === "UPCOMING") {
      return (e.exam_date || "") >= todayStr;
    }
    if (activeTab === "PAST") {
      return (e.exam_date || "") < todayStr && e.status !== "SCHEDULED";
    }
    return true; // ALL
  });

  // Group exams by date for the timeline
  const groupedByDate = filteredExams.reduce((acc, exam) => {
    const d = exam.exam_date || "Undated";
    if (!acc[d]) acc[d] = [];
    acc[d].push(exam);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedByDate).sort();

  return (
    <AppLayout
      title="Examination Timetable"
      subtitle={`${exams.length} examinations scheduled across academic sessions`}
      breadcrumb="Management / Exams"
      currentRouteName="ExamManagement"
      rightAction={
        <Button
          title="Schedule Exam"
          size="sm"
          icon={<Ionicons name="calendar-outline" size={14} color="#FFFFFF" />}
          onPress={() => setShowAddModal(true)}
        />
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExams(); }} />
        }
      >
        {/* Tabs: Upcoming / Past / All */}
        <Card style={{ padding: 0 }}>
          <Tabs
            tabs={[
              { key: "UPCOMING", label: "Upcoming Exams", count: exams.filter((e) => (e.exam_date || "") >= todayStr || e.status === "SCHEDULED").length },
              { key: "PAST", label: "Past Exams" },
              { key: "ALL", label: "All Scheduled", count: exams.length },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
        </Card>

        {/* Search */}
        <Card style={styles.searchCard}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Exam Name, Subject Code, or Department..."
          />
        </Card>

        {/* Timeline Grouped by Date */}
        {loading ? (
          <LoadingSkeleton height={200} />
        ) : dateKeys.length === 0 ? (
          <EmptyState
            iconName="calendar-outline"
            title="No Examinations Found"
            message={search ? `No exams matched "${search}".` : "No examinations found in this category."}
            actionLabel="Schedule First Exam"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <View style={styles.timelineList}>
            {dateKeys.map((dateStr) => (
              <View key={dateStr} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.dateHeaderText}>{dateStr}</Text>
                  <View style={styles.dateCountBadge}>
                    <Text style={styles.dateCountBadgeText}>
                      {groupedByDate[dateStr].length} exam{groupedByDate[dateStr].length > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.examCardsCol}>
                  {groupedByDate[dateStr].map((exam) => (
                    <Card key={exam.id} style={styles.examCard}>
                      <View style={styles.examTopRow}>
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>
                            {exam.course_code || exam.subject_code}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, exam.status === "COMPLETED" ? styles.statusCompleted : styles.statusScheduled]}>
                          <Text style={[styles.statusBadgeText, exam.status === "COMPLETED" ? styles.statusTextCompleted : styles.statusTextScheduled]}>
                            {exam.status || "SCHEDULED"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.examTitle}>{exam.course_name || exam.name}</Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                          ⏰ {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)} ({exam.session || "Session"})
                        </Text>
                        <Text style={styles.metaText}>
                          🏛️ {exam.department_name || "Engineering"} • Semester {exam.semester}
                        </Text>
                        <Text style={[styles.metaText, { color: colors.primaryDark, fontWeight: "600" }]}>
                          👥 Registered Candidates: {exam.registered_count || exam.total_students || 0}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View style={styles.actionRow}>
                        <Button
                          title="Register Students"
                          size="sm"
                          variant="secondary"
                          icon={<Ionicons name="people-outline" size={13} color={colors.text} />}
                          onPress={() => handleRegisterEligible(exam)}
                        />
                        <Button
                          title="Edit"
                          size="sm"
                          variant="ghost"
                          icon={<Ionicons name="create-outline" size={13} color={colors.textSecondary} />}
                          onPress={() => handleOpenEdit(exam)}
                        />
                        <Button
                          title="Seating Plan →"
                          size="sm"
                          variant="outline"
                          onPress={() => navigation.navigate("SeatingPlans")}
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Schedule Exam Modal (POST) */}
        <ModalDialog
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Schedule New Examination"
          subtitle="Add subject code, timetable, and department"
          maxWidth={480}
        >
          <View style={styles.modalForm}>
            <View style={styles.modalRow}>
              <Input
                label="Subject Code *"
                placeholder="e.g. 21CS51"
                value={subjectCode}
                onChangeText={setSubjectCode}
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
              <Input
                label="Semester *"
                placeholder="5"
                value={semester}
                onChangeText={setSemester}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            <Input
              label="Subject / Course Name *"
              placeholder="e.g. Database Management Systems"
              value={examName}
              onChangeText={setExamName}
            />

            <Select
              label="Department *"
              value={deptId}
              onChange={setDeptId}
              options={departments.map((d) => ({ value: String(d.id), label: `${d.code} - ${d.name}` }))}
            />

            <Input
              label="Exam Date (YYYY-MM-DD) *"
              placeholder="2026-11-15"
              value={examDate}
              onChangeText={setExamDate}
            />

            <View style={styles.modalRow}>
              <Input
                label="Start Time (HH:MM) *"
                placeholder="09:30"
                value={startTime}
                onChangeText={setStartTime}
                style={{ flex: 1 }}
              />
              <Input
                label="End Time (HH:MM) *"
                placeholder="12:30"
                value={endTime}
                onChangeText={setEndTime}
                style={{ flex: 1 }}
              />
            </View>

            <Button
              title="Schedule Examination"
              loading={submitting}
              onPress={handleCreateExam}
              style={{ marginTop: 10 }}
            />
          </View>
        </ModalDialog>

        {/* Edit Exam Modal (PATCH) */}
        <ModalDialog
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Examination"
          subtitle="Update course name, code, or schedule status"
          maxWidth={460}
        >
          <View style={styles.modalForm}>
            <Input
              label="Subject Code *"
              value={editCode}
              onChangeText={setEditCode}
              autoCapitalize="characters"
            />
            <Input
              label="Course / Exam Name *"
              value={editName}
              onChangeText={setEditName}
            />
            <Select
              label="Exam Status"
              value={editStatus}
              onChange={setEditStatus}
              options={[
                { value: "SCHEDULED", label: "SCHEDULED" },
                { value: "SEATING_DRAFT", label: "SEATING DRAFT" },
                { value: "SEATING_PUBLISHED", label: "SEATING PUBLISHED" },
                { value: "COMPLETED", label: "COMPLETED" },
                { value: "CANCELLED", label: "CANCELLED" },
              ]}
            />

            <Button
              title="Update Examination"
              loading={submitting}
              onPress={handleSaveEdit}
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
  searchCard: {
    padding: 12,
  },
  timelineList: {
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
  dateHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  dateCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginLeft: 8,
  },
  dateCountBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  examCardsCol: {
    gap: 10,
  },
  examCard: {
    gap: 8,
  },
  examTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  statusScheduled: {
    backgroundColor: colors.primaryLight,
  },
  statusCompleted: {
    backgroundColor: colors.successLight,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  statusTextScheduled: {
    color: colors.primaryDark,
  },
  statusTextCompleted: {
    color: colors.successText,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  metaRow: {
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  modalForm: {
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
  },
});
