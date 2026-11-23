import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { showAlert } from "../../utils/alerts";
import { facultyApi, departmentApi, examApi, hallApi } from "../../services/api";

export default function FacultyManagementScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("roster"); // 'roster' | 'duties'
  const [faculty, setFaculty] = useState([]);
  const [duties, setDuties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);
  const [halls, setHalls] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Add Faculty Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmpId, setNewEmpId] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newPassword, setNewPassword] = useState("Faculty@123");
  const [newPhone, setNewPhone] = useState("");

  // Edit Faculty Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");

  // Assign Duty Modal State
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [submittingDuty, setSubmittingDuty] = useState(false);
  const [dutyFacultyId, setDutyFacultyId] = useState("");
  const [dutyExamId, setDutyExamId] = useState("");
  const [dutyHallId, setDutyHallId] = useState("");
  const [dutyNotes, setDutyNotes] = useState("");

  const loadAllData = async () => {
    try {
      const [facRes, dutiesRes, deptsRes, examsRes, hallsRes] = await Promise.allSettled([
        facultyApi.getAll(),
        facultyApi.getDuties(),
        departmentApi.getAll(),
        examApi.getAll(),
        hallApi.getAll(),
      ]);

      if (facRes.status === "fulfilled" && facRes.value.data?.faculty) {
        setFaculty(facRes.value.data.faculty);
      }
      if (dutiesRes.status === "fulfilled" && dutiesRes.value.data?.assignments) {
        setDuties(dutiesRes.value.data.assignments);
      }
      if (deptsRes.status === "fulfilled" && deptsRes.value.data?.departments) {
        setDepartments(deptsRes.value.data.departments);
      }
      if (examsRes.status === "fulfilled" && examsRes.value.data?.exams) {
        setExams(examsRes.value.data.exams);
      }
      if (hallsRes.status === "fulfilled" && hallsRes.value.data?.halls) {
        setHalls(hallsRes.value.data.halls);
      }
    } catch (err) {
      console.log("Error loading faculty data:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Open Add Modal with smart suggested Employee ID
  const openAddModal = () => {
    const nextNum = faculty.length + 1;
    const padded = String(nextNum).padStart(3, "0");
    setNewEmpId(`FAC-${padded}`);
    setNewUsername(`faculty${nextNum}`);
    setNewName("");
    setNewEmail("");
    setNewDeptId(departments[0]?.id ? String(departments[0].id) : "1");
    setNewPassword("Faculty@123");
    setNewPhone("");
    setShowAddModal(true);
  };

  const handleCreateFaculty = async () => {
    if (!newName.trim() || !newEmpId.trim() || !newEmail.trim() || !newDeptId) {
      showAlert("Missing Fields", "Please enter Full Name, Faculty ID, Email, and Department.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const payload = {
        employee_id: newEmpId.trim().toUpperCase(),
        full_name: newName.trim(),
        username: newUsername.trim() || newEmpId.trim().toLowerCase().replace("-", ""),
        email: newEmail.trim().toLowerCase(),
        department_id: parseInt(newDeptId, 10),
        password: newPassword.trim() || "Faculty@123",
        phone: newPhone.trim() || undefined,
        is_active: true,
      };

      const res = await facultyApi.create(payload);
      if (res.data?.success || res.success) {
        showAlert("Success", `Faculty member ${newName} (${newEmpId.toUpperCase()}) created successfully!`);
        setShowAddModal(false);
        loadAllData();
      } else {
        showAlert("Failed", res.data?.error || res.error || "Could not create faculty.");
      }
    } catch (err) {
      showAlert("Error", err.message || "Failed to create faculty member.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingFaculty(item);
    setEditName(item.full_name);
    setEditEmail(item.email);
    setEditDeptId(String(item.department_id));
    setEditPhone(item.phone || "");
    setEditIsActive(item.is_active !== false);
    setEditNewPassword("");
    setShowEditModal(true);
  };

  const handleUpdateFaculty = async () => {
    if (!editingFaculty) return;
    if (!editName.trim() || !editEmail.trim() || !editDeptId) {
      showAlert("Missing Fields", "Please provide Name, Email, and Department.");
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload = {
        full_name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        department_id: parseInt(editDeptId, 10),
        phone: editPhone.trim() || null,
        is_active: editIsActive,
      };
      if (editNewPassword.trim()) {
        payload.password = editNewPassword.trim();
      }

      const res = await facultyApi.update(editingFaculty.id, payload);
      if (res.data?.success || res.success) {
        showAlert("Updated", "Faculty details updated successfully.");
        setShowEditModal(false);
        loadAllData();
      } else {
        showAlert("Failed", res.data?.error || res.error || "Could not update faculty.");
      }
    } catch (err) {
      showAlert("Error", err.message || "Failed to update faculty member.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (item) => {
    const action = item.is_active ? "Deactivate" : "Activate";
    Alert.alert(
      `${action} Account`,
      `Are you sure you want to ${action.toLowerCase()} ${item.full_name} (${item.employee_id})? ${
        item.is_active ? "They will no longer be able to log in." : "They will be able to log in again."
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: item.is_active ? "destructive" : "default",
          onPress: async () => {
            try {
              await facultyApi.update(item.id, { is_active: !item.is_active });
              loadAllData();
            } catch (err) {
              showAlert("Error", err.message || `Failed to ${action.toLowerCase()} faculty.`);
            }
          },
        },
      ]
    );
  };

  // Delete Faculty
  const handleDeleteFaculty = (item) => {
    Alert.alert(
      "Delete Faculty Member",
      `Are you sure you want to permanently delete ${item.full_name} (${item.employee_id})? This will also remove their user account and duty assignments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await facultyApi.delete(item.id);
              if (res.data?.success || res.success) {
                showAlert("Deleted", "Faculty member removed from system.");
                loadAllData();
              }
            } catch (err) {
              showAlert("Error", err.message || "Failed to delete faculty member.");
            }
          },
        },
      ]
    );
  };

  // Open Assign Duty Modal (optionally preselect faculty)
  const openDutyModal = (preselectedFacultyId = "") => {
    setDutyFacultyId(preselectedFacultyId ? String(preselectedFacultyId) : (faculty[0]?.id ? String(faculty[0].id) : ""));
    setDutyExamId(exams[0]?.id ? String(exams[0].id) : "");
    setDutyHallId(halls[0]?.id ? String(halls[0].id) : "");
    setDutyNotes("");
    setShowDutyModal(true);
  };

  const handleAssignDuty = async () => {
    if (!dutyFacultyId || !dutyExamId || !dutyHallId) {
      showAlert("Missing Selection", "Please select a Faculty Member, Examination, and Examination Hall.");
      return;
    }

    setSubmittingDuty(true);
    try {
      const payload = {
        faculty_id: parseInt(dutyFacultyId, 10),
        exam_id: parseInt(dutyExamId, 10),
        hall_id: parseInt(dutyHallId, 10),
        notes: dutyNotes.trim() || undefined,
      };

      const res = await facultyApi.assignDuty(payload);
      if (res.data?.success || res.success) {
        showAlert("Duty Assigned", res.data?.message || res.message || "Invigilation duty successfully assigned!");
        setShowDutyModal(false);
        loadAllData();
      } else {
        showAlert("Assignment Failed", res.data?.error || res.error || "Could not assign duty.");
      }
    } catch (err) {
      showAlert("Conflict or Error", err.message || "Failed to assign duty.");
    } finally {
      setSubmittingDuty(false);
    }
  };

  // Cancel Duty
  const handleCancelDuty = (dutyItem) => {
    Alert.alert(
      "Cancel Duty Assignment",
      `Remove ${dutyItem.faculty_name} from supervising ${dutyItem.hall_name} for ${dutyItem.exam_name}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel Duty",
          style: "destructive",
          onPress: async () => {
            try {
              await facultyApi.cancelDuty(dutyItem.id);
              showAlert("Cancelled", "Invigilation duty assignment removed.");
              loadAllData();
            } catch (err) {
              showAlert("Error", err.message || "Failed to cancel duty.");
            }
          },
        },
      ]
    );
  };

  // Filter faculty by search query and active status
  const filteredFaculty = faculty.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      f.full_name?.toLowerCase().includes(q) ||
      f.employee_id?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.department_code?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && f.is_active !== false) ||
      (statusFilter === "INACTIVE" && f.is_active === false);

    return matchQuery && matchStatus;
  });

  if (loading) return <LoadingSpinner message="Loading Faculty & Duties..." />;

  return (
    <View style={styles.container}>
      <Header
        title="Faculty & Invigilators"
        subtitle="Manage faculty roster and exam duties"
        showBack
      />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "roster" && styles.tabButtonActive]}
          onPress={() => setActiveTab("roster")}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === "roster" ? "#1e3a8a" : "#64748b"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === "roster" && styles.tabTextActive]}>
            Faculty Roster ({faculty.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === "duties" && styles.tabButtonActive]}
          onPress={() => setActiveTab("duties")}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === "duties" ? "#1e3a8a" : "#64748b"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === "duties" && styles.tabTextActive]}>
            Assigned Duties ({duties.length})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: FACULTY ROSTER */}
      {activeTab === "roster" ? (
        <View style={{ flex: 1 }}>
          {/* Search & Actions Bar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, ID (FAC-001), dept..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            <Pressable style={styles.addBtn} onPress={openAddModal}>
              <Ionicons name="person-add" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>Add Faculty</Text>
            </Pressable>
          </View>

          {/* Status Filter Chips */}
          <View style={styles.filterRow}>
            {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
              <Pressable
                key={st}
                style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}
                >
                  {st === "ALL" ? `All (${faculty.length})` : st === "ACTIVE" ? "Active Only" : "Inactive"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Faculty List */}
          <FlatList
            data={filteredFaculty}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Faculty Members Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Tap 'Add Faculty' above to register a new faculty member."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const initials = (item.full_name || "F")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const dutyCount = item.assigned_duties_count ?? 0;

              return (
                <View style={[styles.facultyCard, !item.is_active && styles.facultyCardInactive]}>
                  {/* Card Top Row */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.facultyName} numberOfLines={1}>
                        {item.full_name}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.empIdBadge}>
                          <Text style={styles.empIdBadgeText}>{item.employee_id}</Text>
                        </View>
                        <View style={styles.deptBadge}>
                          <Text style={styles.deptBadgeText}>
                            {item.department_code || "DEPT"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            item.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              item.is_active ? styles.statusTextActive : styles.statusTextInactive,
                            ]}
                          >
                            {item.is_active ? "ACTIVE" : "INACTIVE"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Card Meta Details */}
                  <View style={styles.metaSection}>
                    <View style={styles.metaRow}>
                      <Ionicons name="mail-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name="person-circle-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                      <Text style={styles.metaText}>
                        Login Username: <Text style={styles.boldText}>{item.username || item.employee_id.toLowerCase()}</Text>
                      </Text>
                    </View>

                    {item.phone ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="call-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                        <Text style={styles.metaText}>{item.phone}</Text>
                      </View>
                    ) : null}

                    <View style={styles.dutyCountBadgeRow}>
                      <Ionicons
                        name="clipboard-outline"
                        size={14}
                        color={dutyCount > 0 ? "#16a34a" : "#64748b"}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.dutyCountText, dutyCount > 0 && styles.dutyCountActiveText]}>
                        {dutyCount === 1 ? "1 Duty Assigned" : `${dutyCount} Duties Assigned`}
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <Pressable
                      style={[styles.actionChip, styles.assignChip]}
                      onPress={() => openDutyModal(item.id)}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#1d4ed8" style={{ marginRight: 4 }} />
                      <Text style={styles.assignChipText}>Assign Duty</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionChip, styles.editChip]}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
                      <Text style={styles.editChipText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionChip, item.is_active ? styles.deactivateChip : styles.activateChip]}
                      onPress={() => handleToggleActive(item)}
                    >
                      <Ionicons
                        name={item.is_active ? "pause-circle-outline" : "play-circle-outline"}
                        size={14}
                        color={item.is_active ? "#b45309" : "#16a34a"}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.toggleChipText, item.is_active ? styles.textAmber : styles.textGreen]}>
                        {item.is_active ? "Deactivate" : "Activate"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionChip, styles.deleteChip]}
                      onPress={() => handleDeleteFaculty(item)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : (
        /* TAB 2: ASSIGNED DUTIES */
        <View style={{ flex: 1 }}>
          <View style={styles.dutiesToolbar}>
            <Text style={styles.dutiesSubtitle}>
              Scheduled exam hall invigilation assignments
            </Text>
            <Pressable style={styles.assignNewDutyBtn} onPress={() => openDutyModal()}>
              <Ionicons name="add-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.assignNewDutyBtnText}>Assign Duty</Text>
            </Pressable>
          </View>

          <FlatList
            data={duties}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Invigilation Duties Assigned</Text>
                <Text style={styles.emptySub}>
                  Tap 'Assign Duty' to allocate a faculty member to an exam hall.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.dutyCard}>
                <View style={styles.dutyTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dutyExamTitle}>{item.exam_name || "Exam"}</Text>
                    <Text style={styles.dutySubjectCode}>
                      {item.subject_code ? `Code: ${item.subject_code}` : "Official Examination"}
                    </Text>
                  </View>
                  <View style={styles.dutyStatusBadge}>
                    <Text style={styles.dutyStatusBadgeText}>{item.status || "ASSIGNED"}</Text>
                  </View>
                </View>

                {/* Faculty Assigned */}
                <View style={styles.dutyDetailBox}>
                  <View style={styles.dutyInfoRow}>
                    <Ionicons name="person" size={16} color="#2563eb" style={{ marginRight: 8 }} />
                    <Text style={styles.dutyFacultyName}>
                      {item.faculty_name} ({item.employee_id})
                    </Text>
                  </View>

                  <View style={styles.dutyInfoRow}>
                    <Ionicons name="business" size={16} color="#ea580c" style={{ marginRight: 8 }} />
                    <Text style={styles.dutyHallName}>
                      Hall: {item.hall_name} {item.building ? `(${item.building})` : ""}
                    </Text>
                  </View>

                  <View style={styles.dutyInfoRow}>
                    <Ionicons name="time" size={16} color="#059669" style={{ marginRight: 8 }} />
                    <Text style={styles.dutyTimeText}>
                      Date: {item.duty_date} • {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </Text>
                  </View>

                  {item.notes ? (
                    <Text style={styles.dutyNotes}>Note: {item.notes}</Text>
                  ) : null}
                </View>

                {/* Cancel Assignment Button */}
                <View style={styles.dutyFooterRow}>
                  <Pressable
                    style={styles.cancelDutyBtn}
                    onPress={() => handleCancelDuty(item)}
                  >
                    <Ionicons name="close-circle-outline" size={15} color="#dc2626" style={{ marginRight: 4 }} />
                    <Text style={styles.cancelDutyBtnText}>Cancel Assignment</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL 1: ADD NEW FACULTY */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Faculty Member</Text>
                <Text style={styles.modalSubtitle}>Register faculty for login and invigilation</Text>
              </View>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Faculty ID */}
              <Text style={styles.inputLabel}>Faculty ID *</Text>
              <TextInput
                style={styles.input}
                value={newEmpId}
                onChangeText={setNewEmpId}
                placeholder="e.g. FAC-006"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
              />

              {/* Full Name */}
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Dr. Sneha Patil"
                placeholderTextColor="#94a3b8"
              />

              {/* Username */}
              <Text style={styles.inputLabel}>Login Username *</Text>
              <TextInput
                style={styles.input}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="e.g. faculty6"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              {/* Email */}
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="e.g. sneha.patil@college.edu"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Department Picker */}
              <Text style={styles.inputLabel}>Department *</Text>
              <View style={styles.pickerRow}>
                {departments.map((dept) => (
                  <Pressable
                    key={dept.id}
                    style={[
                      styles.deptChip,
                      newDeptId === String(dept.id) && styles.deptChipActive,
                    ]}
                    onPress={() => setNewDeptId(String(dept.id))}
                  >
                    <Text
                      style={[
                        styles.deptChipText,
                        newDeptId === String(dept.id) && styles.deptChipTextActive,
                      ]}
                    >
                      {dept.code}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Initial Password */}
              <Text style={styles.inputLabel}>Initial Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Faculty@123"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              {/* Submit Buttons */}
              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setShowAddModal(false)}
                  disabled={submittingAdd}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.saveBtn, submittingAdd && styles.btnDisabled]}
                  onPress={handleCreateFaculty}
                  disabled={submittingAdd}
                >
                  {submittingAdd ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Faculty Member</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT FACULTY */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Edit Faculty ({editingFaculty?.employee_id})
                </Text>
                <Text style={styles.modalSubtitle}>Update details, department, or reset password</Text>
              </View>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Department</Text>
              <View style={styles.pickerRow}>
                {departments.map((dept) => (
                  <Pressable
                    key={dept.id}
                    style={[
                      styles.deptChip,
                      editDeptId === String(dept.id) && styles.deptChipActive,
                    ]}
                    onPress={() => setEditDeptId(String(dept.id))}
                  >
                    <Text
                      style={[
                        styles.deptChipText,
                        editDeptId === String(dept.id) && styles.deptChipTextActive,
                      ]}
                    >
                      {dept.code}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Optional"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              {/* Status Toggle */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Account Active Status</Text>
                <Pressable
                  style={[styles.statusToggleBtn, editIsActive ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => setEditIsActive(!editIsActive)}
                >
                  <Text style={styles.statusToggleText}>
                    {editIsActive ? "ACTIVE" : "INACTIVE"}
                  </Text>
                </Pressable>
              </View>

              {/* Reset Password */}
              <Text style={styles.inputLabel}>Reset Password (leave empty to keep current)</Text>
              <TextInput
                style={styles.input}
                value={editNewPassword}
                onChangeText={setEditNewPassword}
                placeholder="New password (optional)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setShowEditModal(false)}
                  disabled={submittingEdit}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.saveBtn, submittingEdit && styles.btnDisabled]}
                  onPress={handleUpdateFaculty}
                  disabled={submittingEdit}
                >
                  {submittingEdit ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ASSIGN INVIGILATION DUTY */}
      <Modal visible={showDutyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Invigilation Duty</Text>
                <Text style={styles.modalSubtitle}>Allocate faculty to an examination hall</Text>
              </View>
              <Pressable onPress={() => setShowDutyModal(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Select Faculty */}
              <Text style={styles.inputLabel}>Select Faculty Member *</Text>
              <View style={styles.selectionList}>
                {faculty
                  .filter((f) => f.is_active !== false)
                  .map((f) => {
                    const isSelected = dutyFacultyId === String(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        style={[styles.selectionItem, isSelected && styles.selectionItemActive]}
                        onPress={() => setDutyFacultyId(String(f.id))}
                      >
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={16}
                          color={isSelected ? "#1e3a8a" : "#64748b"}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.selectionTitle, isSelected && styles.selectionTitleActive]}>
                            {f.full_name} ({f.employee_id})
                          </Text>
                          <Text style={styles.selectionSub}>Dept: {f.department_code || "N/A"}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>

              {/* Select Exam */}
              <Text style={styles.inputLabel}>Select Examination *</Text>
              <View style={styles.selectionList}>
                {exams.map((ex) => {
                  const isSelected = dutyExamId === String(ex.id);
                  return (
                    <Pressable
                      key={ex.id}
                      style={[styles.selectionItem, isSelected && styles.selectionItemActive]}
                      onPress={() => setDutyExamId(String(ex.id))}
                    >
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={isSelected ? "#1e3a8a" : "#64748b"}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectionTitle, isSelected && styles.selectionTitleActive]}>
                          {ex.name}
                        </Text>
                        <Text style={styles.selectionSub}>
                          Date: {ex.exam_date} • {ex.start_time?.slice(0, 5)} - {ex.end_time?.slice(0, 5)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Select Hall */}
              <Text style={styles.inputLabel}>Select Examination Hall *</Text>
              <View style={styles.selectionList}>
                {halls.map((h) => {
                  const isSelected = dutyHallId === String(h.id);
                  return (
                    <Pressable
                      key={h.id}
                      style={[styles.selectionItem, isSelected && styles.selectionItemActive]}
                      onPress={() => setDutyHallId(String(h.id))}
                    >
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={isSelected ? "#1e3a8a" : "#64748b"}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectionTitle, isSelected && styles.selectionTitleActive]}>
                          {h.name} {h.building ? `(${h.building})` : ""}
                        </Text>
                        <Text style={styles.selectionSub}>Capacity: {h.capacity} seats</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes / Instructions</Text>
              <TextInput
                style={styles.input}
                value={dutyNotes}
                onChangeText={setDutyNotes}
                placeholder="e.g. Lead invigilator, collect answer scripts"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.modalBtnRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setShowDutyModal(false)}
                  disabled={submittingDuty}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.saveBtn, submittingDuty && styles.btnDisabled]}
                  onPress={handleAssignDuty}
                  disabled={submittingDuty}
                >
                  {submittingDuty ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Assign Duty</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: "#1e3a8a",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: "#1e3a8a",
    borderRadius: 8,
    justifyContent: "center",
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#dbeafe",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  list: {
    padding: 16,
    paddingBottom: 36,
  },
  facultyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  facultyCardInactive: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  cardTitleBlock: {
    flex: 1,
  },
  facultyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  empIdBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  empIdBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  deptBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeInactive: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#15803d",
  },
  statusTextInactive: {
    color: "#b91c1c",
  },
  metaSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#475569",
  },
  boldText: {
    fontWeight: "700",
    color: "#0f172a",
  },
  dutyCountBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dutyCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  dutyCountActiveText: {
    color: "#15803d",
    fontWeight: "700",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  assignChip: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    flex: 1.2,
    justifyContent: "center",
  },
  assignChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  editChip: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
  },
  editChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  deactivateChip: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  activateChip: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },
  toggleChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  textAmber: { color: "#b45309" },
  textGreen: { color: "#15803d" },
  deleteChip: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    paddingHorizontal: 8,
  },
  dutiesToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dutiesSubtitle: {
    fontSize: 11,
    color: "#64748b",
    flex: 1,
  },
  assignNewDutyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignNewDutyBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  dutyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  dutyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  dutyExamTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  dutySubjectCode: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  dutyStatusBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dutyStatusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  dutyDetailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 8,
  },
  dutyInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dutyFacultyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  dutyHallName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  dutyTimeText: {
    fontSize: 12,
    color: "#334155",
  },
  dutyNotes: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#64748b",
    marginTop: 2,
  },
  dutyFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelDutyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  cancelDutyBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#dc2626",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  modalScroll: {
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    height: 40,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0f172a",
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  deptChipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  deptChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  deptChipTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  statusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleOn: {
    backgroundColor: "#dcfce7",
  },
  toggleOff: {
    backgroundColor: "#fee2e2",
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  selectionList: {
    gap: 6,
    marginTop: 4,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  selectionItemActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  selectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  selectionTitleActive: {
    color: "#1e3a8a",
    fontWeight: "700",
  },
  selectionSub: {
    fontSize: 11,
    color: "#64748b",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  saveBtn: {
    flex: 2,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
