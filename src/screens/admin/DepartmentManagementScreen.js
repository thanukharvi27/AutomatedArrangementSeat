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
import { SearchInput, Input } from "../../components/common/Input";
import { ModalDialog } from "../../components/common/ModalDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert } from "../../utils/alerts";
import api, { departmentApi, facultyApi } from "../../services/api";

export default function DepartmentManagementScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Add Department Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const loadData = async () => {
    try {
      const [deptRes, facRes] = await Promise.allSettled([
        departmentApi.getAll(),
        facultyApi.getAll(),
      ]);

      if (deptRes.status === "fulfilled") {
        const d = deptRes.value.data || deptRes.value;
        setDepartments(d.departments || []);
      }

      if (facRes.status === "fulfilled") {
        const f = facRes.value.data || facRes.value;
        setFaculty(f.faculty || []);
      }
    } catch (err) {
      console.log("Error loading departments:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDepartment = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      showAlert("Missing Fields", "Please enter both Department Code (e.g. CSE) and Department Name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await departmentApi.create({
        code: trimmedCode,
        name: trimmedName,
      });
      const data = res.data || res;
      if (data.success) {
        showAlert("Department Added", `Department ${trimmedName} (${trimmedCode}) created successfully!`);
        setShowAddModal(false);
        setCode("");
        setName("");
        loadData();
      } else {
        showAlert("Creation Error", data.error || "Could not create department.");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.error || err.message || "Failed to create department.");
    } finally {
      setSubmitting(false);
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
    <AppLayout
      title="Academic Departments"
      subtitle={`${departments.length} university faculties and academic branches`}
      breadcrumb="Management / Departments"
      currentRouteName="DepartmentManagement"
      rightAction={
        <Button
          title="Add Department"
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFFFFF" />}
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Search Bar */}
        <Card style={styles.searchCard}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search departments by code or branch name..."
          />
        </Card>

        {/* Department Cards Grid */}
        {loading ? (
          <LoadingSkeleton height={180} />
        ) : filteredDepts.length === 0 ? (
          <EmptyState
            iconName="business-outline"
            title="No Departments Found"
            message={search ? `No branches match "${search}".` : "No departments currently registered."}
            actionLabel="Add Department"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <View style={styles.grid}>
            {filteredDepts.map((d) => {
              // Compute faculty count client-side
              const facultyCount = faculty.filter(
                (f) => f.department_id === d.id || f.department_code === d.code
              ).length;

              return (
                <Card key={d.id} style={styles.deptCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.codeChip}>
                      <Text style={styles.codeChipText}>{d.code}</Text>
                    </View>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ACTIVE</Text>
                    </View>
                  </View>

                  <Text style={styles.deptName}>{d.name}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>{d.student_count || 0}</Text>
                      <Text style={styles.statLabel}>Students</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statBox}>
                      <Text style={[styles.statNum, { color: colors.primaryDark }]}>{facultyCount}</Text>
                      <Text style={styles.statLabel}>Faculty</Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statBox}>
                      <Text style={styles.statNum}>#{d.id}</Text>
                      <Text style={styles.statLabel}>Dept ID</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Add Department Modal */}
        <ModalDialog
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create Academic Department"
          subtitle="Register new engineering or academic branch"
          maxWidth={440}
        >
          <View style={styles.modalForm}>
            <Input
              label="Department Code *"
              placeholder="e.g. AIML, CSE, ECE"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <Input
              label="Department Full Name *"
              placeholder="e.g. Artificial Intelligence & Machine Learning"
              value={name}
              onChangeText={setName}
            />

            <Button
              title="Save Department"
              loading={submitting}
              onPress={handleCreateDepartment}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  deptCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  codeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  activePill: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successText,
    letterSpacing: 0.4,
  },
  deptName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    minHeight: 38,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  modalForm: {
    gap: 12,
  },
});
