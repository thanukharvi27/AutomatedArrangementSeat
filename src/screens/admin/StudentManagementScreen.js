import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { SearchInput, Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { DataTable } from "../../components/common/DataTable";
import { Pagination } from "../../components/common/Pagination";
import { Drawer } from "../../components/common/Drawer";
import { ModalDialog } from "../../components/common/ModalDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert, confirmAction } from "../../utils/alerts";
import { useFeedback } from "../../components/common/Feedback";
import ImportStudentsDialog from "../../components/ImportStudentsDialog";
import api, { studentApi, departmentApi } from "../../services/api";

export default function StudentManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Server pagination & filters
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const perPage = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Drawer & Modals state
  const [detailStudent, setDetailStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useFeedback();

  // Form states
  const [formUsn, setFormUsn] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formSemester, setFormSemester] = useState("5");
  const [formSection, setFormSection] = useState("A");

  // Debounce search by 300ms
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (text) => {
    setSearchTerm(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 300);
  };

  const fetchStudents = async () => {
    try {
      let query = `/students?page=${page}&per_page=${perPage}`;
      if (debouncedSearch.trim()) query += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      if (selectedDeptId) query += `&department_id=${selectedDeptId}`;
      if (selectedSemester) query += `&semester=${selectedSemester}`;
      if (selectedStatus) query += `&status=${selectedStatus}`;

      const [stuRes, deptRes] = await Promise.allSettled([
        api.get(query),
        departmentApi.getAll(),
      ]);

      if (stuRes.status === "fulfilled") {
        const s = stuRes.value.data || stuRes.value;
        if (s.success) {
          setStudents(s.students || []);
          if (s.pagination) {
            setPage(s.pagination.page || 1);
            setTotalPages(s.pagination.pages || 1);
            setTotalStudents(s.pagination.total || (s.students || []).length);
          } else {
            setTotalStudents(s.total || (s.students || []).length);
            setTotalPages(Math.ceil((s.total || s.students?.length || 1) / perPage));
          }
        }
      }

      if (deptRes.status === "fulfilled") {
        const d = deptRes.value.data || deptRes.value;
        if (d.success) {
          setDepartments(d.departments || []);
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
  }, [page, debouncedSearch, selectedDeptId, selectedSemester, selectedStatus]);

  const handleOpenAdd = () => {
    setFormUsn("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormDeptId(departments[0]?.id ? String(departments[0].id) : "1");
    setFormSemester("5");
    setFormSection("A");
    setShowAddModal(true);
  };

  const handleSaveNewStudent = async () => {
    const trimmedUsn = formUsn.trim().toUpperCase();
    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim().toLowerCase();

    if (!trimmedUsn || !trimmedName || !trimmedEmail || !formDeptId) {
      showAlert("Missing Fields", "Please enter USN, Full Name, Email, and Department.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        usn: trimmedUsn,
        full_name: trimmedName,
        email: trimmedEmail,
        department_id: parseInt(formDeptId, 10),
        semester: parseInt(formSemester, 10) || 5,
        section: formSection.trim().toUpperCase() || "A",
        phone: formPhone.trim() || undefined,
      };

      const res = await studentApi.create(payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Candidate Added", `${trimmedName} (${trimmedUsn}) registered into database!`);
        setShowAddModal(false);
        fetchStudents();
      } else {
        showAlert("Creation Error", data.error || "Could not register student.");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.error || err.message || "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (stu) => {
    setEditingStudent(stu);
    setFormUsn(stu.usn);
    setFormName(stu.full_name);
    setFormEmail(stu.email);
    setFormPhone(stu.phone || "");
    setFormDeptId(String(stu.department_id));
    setFormSemester(String(stu.semester || 5));
    setFormSection(stu.section || "A");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      const payload = {
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        department_id: parseInt(formDeptId, 10),
        semester: parseInt(formSemester, 10) || 5,
        section: formSection.trim().toUpperCase() || "A",
        phone: formPhone.trim() || null,
      };

      const res = await studentApi.update(editingStudent.id, payload);
      const data = res.data || res;
      if (data.success) {
        showAlert("Updated", "Student candidate details updated successfully.");
        setShowEditModal(false);
        if (detailStudent?.id === editingStudent.id) {
          setDetailStudent({ ...detailStudent, ...payload });
        }
        fetchStudents();
      } else {
        showAlert("Update Error", data.error || "Could not update student.");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.error || err.message || "Failed to update student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = (stu) => {
    confirmAction({
      title: "Remove Candidate",
      message: `Are you sure you want to delete ${stu.full_name} (${stu.usn}) from examination records?`,
      confirmText: "Delete Student",
      destructive: true,
      onConfirm: async () => {
        try {
          const res = await studentApi.delete(stu.id);
          const data = res.data || res;
          if (data.success) {
            showAlert("Deleted", `Student ${stu.full_name} has been removed.`);
            if (detailStudent?.id === stu.id) setDetailStudent(null);
            const newTotal = totalStudents - 1;
            const newPages = Math.max(1, Math.ceil(newTotal / perPage));
            if (page > newPages) {
              setPage(newPages);
            } else {
              fetchStudents();
            }
          } else {
            showAlert("Delete Error", data.error || "Could not delete student.");
          }
        } catch (err) {
          showAlert("Error", err.response?.data?.error || err.message || "Failed to delete student.");
        }
      },
    });
  };

  const columns = [
    {
      key: "usn",
      title: "USN",
      width: 130,
      render: (val) => (
        <View style={styles.usnChip}>
          <Text style={styles.usnChipText}>{val}</Text>
        </View>
      ),
    },
    {
      key: "full_name",
      title: "Full Name",
      render: (val, row) => (
        <View>
          <Text style={styles.nameText}>{val}</Text>
          <Text style={styles.subText}>{row.email}</Text>
        </View>
      ),
    },
    {
      key: "department_code",
      title: "Department",
      width: 100,
      render: (val) => (
        <View style={styles.deptBadge}>
          <Text style={styles.deptBadgeText}>{val || "DEPT"}</Text>
        </View>
      ),
    },
    {
      key: "semester",
      title: "Semester",
      width: 90,
      render: (val, row) => (
        <Text style={styles.semText}>Sem {val} ({row.section || "A"})</Text>
      ),
    },
    {
      key: "status",
      title: "Status",
      width: 90,
      render: (val) => (
        <View style={[styles.statusPill, val === "ACTIVE" ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusPillText, val === "ACTIVE" ? styles.statusTextActive : styles.statusTextInactive]}>
            {val || "ACTIVE"}
          </Text>
        </View>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      width: 140,
      align: "right",
      render: (_, row) => (
        <View style={styles.actionsCell}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View details"
            onPress={() => setDetailStudent(row)}
            style={styles.actionBtn}
            hitSlop={6}
          >
            <Ionicons name="eye-outline" size={15} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit candidate"
            onPress={() => handleOpenEdit(row)}
            style={styles.actionBtn}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete candidate"
            onPress={() => handleDeleteStudent(row)}
            style={[styles.actionBtn, styles.actionBtnDanger]}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </Pressable>
        </View>
      ),
    },
  ];

  return (
    <AppLayout
      title="Student Directory"
      subtitle={`${totalStudents} candidates registered in examination system`}
      breadcrumb="Management / Students"
      currentRouteName="StudentManagement"
      rightAction={
        <View style={styles.headerActionsRow}>
          {Platform.OS === "web" && (
            <Button
              title="Import CSV"
              variant="outline"
              size="sm"
              icon={<Ionicons name="cloud-upload-outline" size={14} color={colors.text} />}
              onPress={() => setShowImportModal(true)}
              accessibilityLabel="Import students from CSV"
            />
          )}
          <Button
            title="Add Student"
            size="sm"
            icon={<Ionicons name="person-add" size={14} color="#FFFFFF" />}
            onPress={handleOpenAdd}
            accessibilityLabel="Add new student"
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(); }} />
        }
      >
        {/* Filter & Search Bar */}
        <Card style={styles.filterCard}>
          <View style={styles.filterTopRow}>
            <SearchInput
              value={searchTerm}
              onChangeText={handleSearchChange}
              placeholder="Search by USN, Student Name, or Email..."
              style={{ flex: 1 }}
            />
          </View>

          {/* Department Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptChipScroll}>
            <Pressable
              style={[styles.filterChip, selectedDeptId === null && styles.filterChipActive]}
              onPress={() => { setSelectedDeptId(null); setPage(1); }}
            >
              <Text style={[styles.filterChipText, selectedDeptId === null && styles.filterChipTextActive]}>
                All Departments
              </Text>
            </Pressable>
            {departments.map((d) => (
              <Pressable
                key={d.id}
                style={[styles.filterChip, selectedDeptId === d.id && styles.filterChipActive]}
                onPress={() => { setSelectedDeptId(d.id); setPage(1); }}
              >
                <Text style={[styles.filterChipText, selectedDeptId === d.id && styles.filterChipTextActive]}>
                  {d.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {/* Data Table with server pagination */}
        {loading ? (
          <LoadingSkeleton height={260} />
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <DataTable
              columns={columns}
              data={students}
              keyExtractor={(item) => String(item.id)}
              onRowPress={(item) => setDetailStudent(item)}
              emptyComponent={
                <EmptyState
                  iconName="school-outline"
                  title="No Candidates Found"
                  message={searchTerm ? `No records matched "${searchTerm}".` : "No registered students in database."}
                  actionLabel="Add Candidate"
                  onAction={handleOpenAdd}
                />
              }
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalStudents}
              perPage={perPage}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </Card>
        )}

        {/* Candidate Detail Drawer */}
        <Drawer
          visible={Boolean(detailStudent)}
          onClose={() => setDetailStudent(null)}
          title={detailStudent?.full_name || "Student Details"}
          subtitle={`USN: ${detailStudent?.usn}`}
        >
          {detailStudent && (
            <View style={styles.drawerBody}>
              <View style={styles.drawerAvatarBox}>
                <Text style={styles.drawerAvatarText}>
                  {detailStudent.full_name?.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.drawerName}>{detailStudent.full_name}</Text>
              <Text style={styles.drawerUsn}>{detailStudent.usn}</Text>

              <View style={styles.drawerMetaList}>
                <View style={styles.drawerMetaItem}>
                  <Text style={styles.drawerMetaLabel}>Email Address</Text>
                  <Text style={styles.drawerMetaVal}>{detailStudent.email}</Text>
                </View>
                <View style={styles.drawerMetaItem}>
                  <Text style={styles.drawerMetaLabel}>Department</Text>
                  <Text style={styles.drawerMetaVal}>{detailStudent.department_code || "Engineering"}</Text>
                </View>
                <View style={styles.drawerMetaItem}>
                  <Text style={styles.drawerMetaLabel}>Semester & Section</Text>
                  <Text style={styles.drawerMetaVal}>Semester {detailStudent.semester} • Section {detailStudent.section || "A"}</Text>
                </View>
                <View style={styles.drawerMetaItem}>
                  <Text style={styles.drawerMetaLabel}>Contact Phone</Text>
                  <Text style={styles.drawerMetaVal}>{detailStudent.phone || "Not provided"}</Text>
                </View>
                <View style={styles.drawerMetaItem}>
                  <Text style={styles.drawerMetaLabel}>Account Status</Text>
                  <Text style={[styles.drawerMetaVal, { color: colors.successText, fontWeight: "700" }]}>
                    {detailStudent.status || "ACTIVE"}
                  </Text>
                </View>
              </View>

              <View style={styles.drawerBtnRow}>
                <Button
                  title="Edit Details"
                  variant="secondary"
                  icon={<Ionicons name="create-outline" size={15} color={colors.text} />}
                  onPress={() => {
                    const s = detailStudent;
                    setDetailStudent(null);
                    handleOpenEdit(s);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Delete"
                  variant="danger"
                  icon={<Ionicons name="trash-outline" size={15} color="#FFFFFF" />}
                  onPress={() => handleDeleteStudent(detailStudent)}
                />
              </View>
            </View>
          )}
        </Drawer>

        {/* Add Student Modal */}
        <ModalDialog
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Register New Student"
          subtitle="Add enrolled candidate into university exam database"
          maxWidth={460}
        >
          <View style={styles.modalForm}>
            <Input
              label="Student USN *"
              placeholder="e.g. 1MS22CS001"
              value={formUsn}
              onChangeText={setFormUsn}
              autoCapitalize="characters"
            />
            <Input
              label="Full Name *"
              placeholder="e.g. Rahul Sharma"
              value={formName}
              onChangeText={setFormName}
            />
            <Input
              label="Email Address *"
              placeholder="e.g. rahul@college.edu"
              value={formEmail}
              onChangeText={setFormEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalRow}>
              <Input
                label="Semester *"
                placeholder="5"
                value={formSemester}
                onChangeText={setFormSemester}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="Section *"
                placeholder="A"
                value={formSection}
                onChangeText={setFormSection}
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
            </View>
            <Select
              label="Department *"
              value={formDeptId}
              onChange={setFormDeptId}
              options={departments.map((d) => ({ value: String(d.id), label: `${d.code} - ${d.name}` }))}
            />
            <Input
              label="Phone Number (Optional)"
              placeholder="e.g. 9876543210"
              value={formPhone}
              onChangeText={setFormPhone}
              keyboardType="phone-pad"
            />

            <Button
              title="Save Student"
              loading={submitting}
              onPress={handleSaveNewStudent}
              style={{ marginTop: 10 }}
            />
          </View>
        </ModalDialog>

        {/* Edit Student Modal */}
        <ModalDialog
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Candidate Details"
          subtitle={`USN: ${editingStudent?.usn}`}
          maxWidth={460}
        >
          <View style={styles.modalForm}>
            <Input
              label="Full Name *"
              value={formName}
              onChangeText={setFormName}
            />
            <Input
              label="Email Address *"
              value={formEmail}
              onChangeText={setFormEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalRow}>
              <Input
                label="Semester *"
                value={formSemester}
                onChangeText={setFormSemester}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="Section *"
                value={formSection}
                onChangeText={setFormSection}
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
            </View>
            <Select
              label="Department *"
              value={formDeptId}
              onChange={setFormDeptId}
              options={departments.map((d) => ({ value: String(d.id), label: `${d.code} - ${d.name}` }))}
            />
            <Input
              label="Phone Number"
              value={formPhone}
              onChangeText={setFormPhone}
              keyboardType="phone-pad"
            />

            <Button
              title="Update Candidate"
              loading={submitting}
              onPress={handleSaveEdit}
              style={{ marginTop: 10 }}
            />
          </View>
        </ModalDialog>

        {/* Import Students from CSV Modal */}
        <ImportStudentsDialog
          visible={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImported={(count) => {
            toast(`Successfully imported ${count} student${count !== 1 ? "s" : ""} from CSV.`, "success");
            fetchStudents();
          }}
        />
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
  filterCard: {
    gap: 12,
  },
  filterTopRow: {
    flexDirection: "row",
    gap: 10,
  },
  deptChipScroll: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    cursor: "pointer",
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  usnChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    alignSelf: "flex-start",
  },
  usnChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  nameText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  subText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  deptBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
    alignSelf: "flex-start",
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  semText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.warningLight,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  statusTextActive: {
    color: colors.successText,
  },
  statusTextInactive: {
    color: colors.warningText,
  },
  actionsCell: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceAlt,
    cursor: "pointer",
  },
  actionBtnDanger: {
    backgroundColor: colors.dangerLight,
  },
  drawerBody: {
    alignItems: "center",
    gap: 12,
  },
  drawerAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  drawerAvatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  drawerName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  drawerUsn: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  drawerMetaList: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 14,
    gap: 12,
    marginVertical: 10,
  },
  drawerMetaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  drawerMetaVal: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  drawerBtnRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  modalForm: {
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
