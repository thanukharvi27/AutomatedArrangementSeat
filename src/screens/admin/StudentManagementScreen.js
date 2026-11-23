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
import api, { studentApi, departmentApi } from "../../services/api";

export default function StudentManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [usn, setUsn] = useState("");
  const [fullName, setFullName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [semester, setSemester] = useState("5");
  const [section, setSection] = useState("A");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchStudents = async () => {
    try {
      let queryParams = `/students?per_page=100`;
      if (search.trim()) queryParams += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedDeptId) queryParams += `&department_id=${selectedDeptId}`;
      if (selectedSemester) queryParams += `&semester=${selectedSemester}`;

      const [stuRes, deptRes] = await Promise.allSettled([
        api.get(queryParams),
        departmentApi.getAll(),
      ]);

      if (stuRes.status === "fulfilled") {
        const sdata = stuRes.value.data || stuRes.value;
        if (sdata.success) {
          setStudents(sdata.students || []);
        }
      }

      if (deptRes.status === "fulfilled") {
        const ddata = deptRes.value.data || deptRes.value;
        if (ddata.success) {
          setDepartments(ddata.departments || []);
          if (!deptId && ddata.departments?.length > 0) {
            setDeptId(String(ddata.departments[0].id));
          }
        }
      }
    } catch (err) {
      console.log("Error loading students:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedDeptId, selectedSemester]);

  const handleCreateStudent = async () => {
    const trimmedUsn = usn.trim().toUpperCase();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsn || !trimmedName || !trimmedEmail || !deptId) {
      showAlert("Missing Fields", "Please enter USN, Full Name, Email, and select Department.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        usn: trimmedUsn,
        full_name: trimmedName,
        email: trimmedEmail,
        department_id: parseInt(deptId, 10),
        semester: parseInt(semester, 10) || 5,
        section: section.trim().toUpperCase() || "A",
        phone: phone.trim() || undefined,
      };

      const res = await studentApi.create(payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Student Added", `Candidate ${trimmedName} (${trimmedUsn}) successfully added to directory!`);
        setShowAddModal(false);
        setUsn("");
        setFullName("");
        setEmail("");
        setPhone("");
        fetchStudents();
      } else {
        showAlert("Error", data.error || "Could not add student.");
      }
    } catch (err) {
      showAlert("Creation Failed", err.response?.data?.error || err.message || "Failed to create student.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    try {
      const res = await studentApi.delete(student.id);
      const data = res.data || res;
      if (data.success) {
        showAlert("Deleted", `Student ${student.full_name} (${student.usn}) deleted.`);
        fetchStudents();
      } else {
        showAlert("Delete Failed", data.error || "Could not delete student.");
      }
    } catch (err) {
      showAlert("Delete Error", err.response?.data?.error || err.message || "Could not delete student.");
    }
  };

  return (
    <ResponsiveLayout
      title="Student Directory"
      subtitle={`${students.length} candidates registered in examination system`}
      currentRouteName="StudentManagement"
      rightAction={
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Add Student</Text>
        </Pressable>
      }
    >
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Search & Filter Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by USN, Student Name, or Email..."
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

          {/* Department Filter Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, code: "ALL DEPTS" }, ...departments]}
            keyExtractor={(item) => String(item.id ?? "all")}
            contentContainerStyle={styles.deptChipList}
            renderItem={({ item }) => {
              const isSelected = selectedDeptId === item.id;
              return (
                <Pressable
                  style={[styles.deptChip, isSelected && styles.deptChipActive]}
                  onPress={() => setSelectedDeptId(item.id)}
                >
                  <Text style={[styles.deptChipText, isSelected && styles.deptChipTextActive]}>
                    {item.code}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Student Roster List */}
        {loading ? (
          <LoadingSpinner message="Loading registered candidates..." />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} />
            }
            ListEmptyComponent={
              <EmptyState
                iconName="school-outline"
                title="No Students Found"
                message={search ? `No student candidates matched "${search}".` : "No registered candidates found in database."}
                actionLabel="Add First Student"
                onAction={() => setShowAddModal(true)}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.studentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.usnBadge}>
                    <Text style={styles.usnText}>{item.usn}</Text>
                  </View>
                  <Badge
                    label={item.department_code || "ENG"}
                    variant="info"
                    size="sm"
                  />
                </View>

                <Text style={styles.studentName}>{item.full_name}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Sem {item.semester} • Section {item.section || "A"} • {item.email}
                  </Text>
                  {item.phone ? (
                    <Text style={styles.metaText}> • 📞 {item.phone}</Text>
                  ) : null}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: item.status === "ACTIVE" ? colors.success : colors.warning }]} />
                    <Text style={styles.statusText}>{item.status || "ACTIVE"}</Text>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteStudent(item)}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        {/* Add Student Modal */}
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
                  <Text style={styles.modalTitle}>Add New Student</Text>
                  <Text style={styles.modalSub}>Register candidate into exam database</Text>
                </View>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Student USN *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 1MS22CS001"
                    placeholderTextColor={colors.textMuted}
                    value={usn}
                    onChangeText={setUsn}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor={colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.modalInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
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

                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Section *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="A"
                      placeholderTextColor={colors.textMuted}
                      value={section}
                      onChangeText={setSection}
                      autoCapitalize="characters"
                    />
                  </View>
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
                  <Text style={styles.modalLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. rahul@college.edu"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Phone Number (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <Pressable
                  style={[styles.saveBtn, creating && styles.btnDisabled]}
                  onPress={handleCreateStudent}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Candidate</Text>
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
    paddingBottom: 8,
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
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  deptChipList: {
    paddingBottom: 4,
    gap: 6,
  },
  deptChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  deptChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  deptChipTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  usnBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  usnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  studentName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.errorLight,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.errorText,
    marginLeft: 4,
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
    marginBottom: 16,
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
    gap: 12,
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
    paddingVertical: 5,
    paddingHorizontal: 10,
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
