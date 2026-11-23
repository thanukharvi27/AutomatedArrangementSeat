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
import api, { departmentApi } from "../../services/api";

export default function DepartmentManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Add Department Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      const data = res.data || res;
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.log("Error loading departments:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      showAlert("Missing Fields", "Please enter both Department Code (e.g. CSE) and Department Name.");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/departments", {
        code: trimmedCode,
        name: trimmedName,
      });
      const data = res.data || res;
      if (data.success) {
        showAlert("Department Created", `Department ${trimmedName} (${trimmedCode}) registered successfully!`);
        setShowAddModal(false);
        setCode("");
        setName("");
        fetchDepartments();
      } else {
        showAlert("Error", data.error || "Could not create department.");
      }
    } catch (err) {
      showAlert("Creation Failed", err.response?.data?.error || err.message || "Failed to create department.");
    } finally {
      setCreating(false);
    }
  };

  const filteredDepts = departments.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (d.code || "").toLowerCase().includes(q) ||
      (d.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <ResponsiveLayout
      title="Academic Departments"
      subtitle="Manage university departments and academic branches"
      currentRouteName="DepartmentManagement"
      rightAction={
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Department</Text>
        </Pressable>
      }
    >
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Search */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search departments by code or name..."
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
          <LoadingSpinner message="Loading departments..." />
        ) : (
          <FlatList
            data={filteredDepts}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDepartments(); }} />
            }
            ListEmptyComponent={
              <EmptyState
                iconName="business-outline"
                title="No Departments Found"
                message={search ? `No departments match "${search}".` : "No departments currently registered."}
                actionLabel="Add Department"
                onAction={() => setShowAddModal(true)}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.deptCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.deptCodeBadge}>
                    <Text style={styles.deptCodeText}>{item.code}</Text>
                  </View>
                  <Badge label="ACTIVE" variant="success" size="sm" />
                </View>
                <Text style={styles.deptName}>{item.name}</Text>
                <Text style={styles.deptMeta}>
                  Academic Code: <Text style={{ fontWeight: "700", color: colors.text }}>{item.code}</Text> • ID #{item.id}
                </Text>
              </View>
            )}
          />
        )}

        {/* Add Department Modal */}
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
                  <Text style={styles.modalTitle}>Add Department</Text>
                  <Text style={styles.modalSub}>Register new academic branch</Text>
                </View>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Department Code *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. AIML, CSE, ECE"
                    placeholderTextColor={colors.textMuted}
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Department Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Artificial Intelligence & Machine Learning"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <Pressable
                  style={[styles.saveBtn, creating && styles.btnDisabled]}
                  onPress={handleCreateDepartment}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Department</Text>
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
    gap: 10,
  },
  deptCard: {
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
  deptCodeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deptCodeText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  deptName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  deptMeta: {
    fontSize: 12,
    color: colors.textSecondary,
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
    maxWidth: 440,
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
