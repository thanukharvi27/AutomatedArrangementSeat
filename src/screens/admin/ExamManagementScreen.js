import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { colors, typography, shadows } from "../../theme/colors";
import { showAlert } from "../../utils/alerts";
import api, { examApi, departmentApi } from "../../services/api";

export default function ExamManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Add Exam Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [examName, setExamName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [deptId, setDeptId] = useState("");
  const [semester, setSemester] = useState("5");
  const [examDate, setExamDate] = useState("2026-11-15");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("12:30");
  const [autoRegister, setAutoRegister] = useState(true);

  const fetchExamsAndDepts = async () => {
    try {
      const [examsRes, deptsRes] = await Promise.allSettled([
        examApi.getAll(),
        departmentApi.getAll(),
      ]);

      if (examsRes.status === "fulfilled") {
        const edata = examsRes.value.data || examsRes.value;
        if (edata.success) {
          setExams(edata.exams || []);
        }
      }

      if (deptsRes.status === "fulfilled") {
        const ddata = deptsRes.value.data || deptsRes.value;
        if (ddata.success) {
          setDepartments(ddata.departments || []);
          if (!deptId && ddata.departments?.length > 0) {
            setDeptId(String(ddata.departments[0].id));
          }
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
    fetchExamsAndDepts();
  }, []);

  const handleCreateExam = async () => {
    const trimmedName = examName.trim();
    const trimmedCode = subjectCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode || !deptId || !examDate || !startTime || !endTime) {
      showAlert("Missing Fields", "Please fill in Exam Name, Code, Department, Date, and Timings.");
      return;
    }

    setCreating(true);
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
        showAlert("Exam Created", `Examination ${trimmedName} (${trimmedCode}) scheduled successfully!`);
        setShowAddModal(false);
        setExamName("");
        setSubjectCode("");
        fetchExamsAndDepts();
      } else {
        showAlert("Error", data.error || "Could not schedule exam.");
      }
    } catch (err) {
      showAlert("Scheduling Failed", err.response?.data?.error || err.message || "Failed to create exam.");
    } finally {
      setCreating(false);
    }
  };

  const handleRegisterEligible = async (exam) => {
    try {
      const res = await examApi.registerStudents(exam.id);
      const data = res.data || res;
      if (data.success) {
        showAlert("Students Registered", data.message || "Eligible students registered for this exam.");
        fetchExamsAndDepts();
      } else {
        showAlert("Notice", data.error || "Could not register students.");
      }
    } catch (err) {
      showAlert("Registration Failed", err.response?.data?.error || err.message || "Failed to register.");
    }
  };

  const filteredExams = exams.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (e.course_code || e.subject_code || "").toLowerCase().includes(q) ||
      (e.course_name || e.name || "").toLowerCase().includes(q) ||
      (e.department_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <ResponsiveLayout
      title="Examination Schedules"
      subtitle={`${exams.length} university examinations configured in system`}
      currentRouteName="ExamManagement"
      rightAction={
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="calendar-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Schedule Exam</Text>
        </Pressable>
      }
    >
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Search Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Exam Name, Subject Code, or Department..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {loading ? (
          <LoadingSpinner message="Loading exam schedules..." />
        ) : (
          <FlatList
            data={filteredExams}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExamsAndDepts(); }} />
            }
            ListEmptyComponent={
              <EmptyState
                iconName="calendar-outline"
                title="No Examinations Scheduled"
                message={search ? `No exams matched "${search}".` : "No upcoming examinations currently scheduled."}
                actionLabel="Schedule First Exam"
                onAction={() => setShowAddModal(true)}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.examCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.examCodeBadge}>
                    <Text style={styles.examCodeText}>
                      {item.course_code || item.subject_code}
                    </Text>
                  </View>
                  <Badge
                    label={item.status || "SCHEDULED"}
                    variant={item.status === "COMPLETED" ? "success" : "info"}
                    size="sm"
                  />
                </View>

                <Text style={styles.examTitle}>{item.course_name || item.name}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    📅 Date: <Text style={{ fontWeight: "700", color: colors.text }}>{item.exam_date}</Text> • Timing: {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)} ({item.session || "Session"})
                  </Text>
                  <Text style={styles.metaText}>
                    Department: {item.department_name || "Engineering"} • Semester {item.semester}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.primaryDark, fontWeight: "600", marginTop: 2 }]}>
                    👥 Registered Students: {item.registered_count || item.total_students || 0}
                  </Text>
                </View>

                {/* Card Action Row */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.actionChip}
                    onPress={() => handleRegisterEligible(item)}
                  >
                    <Ionicons name="people" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.actionChipText}>Sync Registered Students</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionChip, styles.actionChipPrimary]}
                    onPress={() => navigation.navigate("SeatingPlans")}
                  >
                    <Ionicons name="layers" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.actionChipPrimaryText}>Seating Allocation →</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        {/* Schedule Exam Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Schedule New Exam</Text>
                  <Text style={styles.modalSub}>Add course and official exam timetable</Text>
                </View>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.modalInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.modalLabel}>Subject Code *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. 21CS51"
                      placeholderTextColor={colors.textMuted}
                      value={subjectCode}
                      onChangeText={setSubjectCode}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Semester *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      value={semester}
                      onChangeText={setSemester}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Subject / Course Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Database Management Systems"
                    placeholderTextColor={colors.textMuted}
                    value={examName}
                    onChangeText={setExamName}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Department *</Text>
                  <View style={styles.deptPickerRow}>
                    {departments.map((d) => (
                      <Pressable
                        key={d.id}
                        style={[
                          styles.deptPickerChip,
                          deptId === String(d.id) && styles.deptPickerChipActive,
                        ]}
                        onPress={() => setDeptId(String(d.id))}
                      >
                        <Text
                          style={[
                            styles.deptPickerChipText,
                            deptId === String(d.id) && styles.deptPickerChipTextActive,
                          ]}
                        >
                          {d.code}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Exam Date (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="2026-11-15"
                    placeholderTextColor={colors.textMuted}
                    value={examDate}
                    onChangeText={setExamDate}
                  />
                </View>

                <View style={styles.modalInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.modalLabel}>Start Time (HH:MM) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="09:30"
                      placeholderTextColor={colors.textMuted}
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>End Time (HH:MM) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="12:30"
                      placeholderTextColor={colors.textMuted}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>

                {/* Auto register checkbox */}
                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setAutoRegister(!autoRegister)}
                >
                  <Ionicons
                    name={autoRegister ? "checkbox" : "square-outline"}
                    size={20}
                    color={autoRegister ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.checkboxText}>
                    Auto-register all eligible active students from department
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.saveBtn, creating && styles.btnDisabled]}
                  onPress={handleCreateExam}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Examination Schedule</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDesktop: {
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  filterSection: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  examCodeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  examCodeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    gap: 2,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDark,
  },
  actionChipPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionChipPrimaryText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalForm: {
    gap: 10,
  },
  modalInputGroup: {},
  modalInputRow: {
    flexDirection: "row",
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalInput: {
    height: 40,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.text,
  },
  deptPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  deptPickerChip: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptPickerChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  deptPickerChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  deptPickerChipTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  checkboxText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  saveBtn: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
});
