import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { colors, typography, shadows } from "../../theme/colors";
import { showAlert } from "../../utils/alerts";
import api, { hallApi } from "../../services/api";

export default function HallManagementScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [roomNumber, setRoomNumber] = useState("");
  const [building, setBuilding] = useState("Main Academic Block");
  const [floor, setFloor] = useState("1");
  const [benches, setBenches] = useState("15");
  const [seatsPerBench, setSeatsPerBench] = useState("2");
  const [notes, setNotes] = useState("");

  const numBenches = parseInt(benches, 10) || 0;
  const numSeatsPerBench = parseInt(seatsPerBench, 10) || 0;
  const calculatedCapacity = numBenches * numSeatsPerBench;

  const fetchHalls = async () => {
    try {
      const res = await hallApi.getAll();
      const data = res.data || res;
      if (data.success) {
        setHalls(data.halls || []);
      }
    } catch (err) {
      console.log("Error loading halls:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const handleCreateHall = async () => {
    const trimmedRoom = roomNumber.trim().toUpperCase();
    if (!trimmedRoom) {
      showAlert("Validation Error", "Please enter a Room / Hall Number.");
      return;
    }
    if (numBenches <= 0) {
      showAlert("Validation Error", "Please enter a valid number of benches (greater than 0).");
      return;
    }
    if (numSeatsPerBench <= 0) {
      showAlert("Validation Error", "Please enter valid seats per bench (e.g. 2 or 3).");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: trimmedRoom,
        building: building.trim() || "Main Academic Block",
        floor: parseInt(floor, 10) || 1,
        benches: numBenches,
        num_rows: numBenches,
        seats_per_bench: numSeatsPerBench,
        seats_per_row: numSeatsPerBench,
        capacity: calculatedCapacity,
        notes: notes.trim(),
      };

      const res = await hallApi.create(payload);
      const data = res.data || res;

      if (data.success) {
        showAlert("Hall Added", `Room ${trimmedRoom} added with ${calculatedCapacity} seats capacity!`);
        setRoomNumber("");
        setNotes("");
        setShowAddModal(false);
        fetchHalls();
      } else {
        showAlert("Creation Error", data.error || "Could not create hall.");
      }
    } catch (err) {
      showAlert("Creation Failed", err.response?.data?.error || err.message || "Failed to create hall.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteHall = async (hall) => {
    try {
      const res = await hallApi.delete(hall.id);
      const data = res.data || res;
      if (data.success) {
        showAlert("Deleted", `Hall ${hall.name} removed from campus configuration.`);
        fetchHalls();
      } else {
        showAlert("Delete Failed", data.error || "Could not delete hall.");
      }
    } catch (err) {
      showAlert("Delete Error", err.response?.data?.error || err.message || "Could not delete hall.");
    }
  };

  const totalSeats = halls.reduce((acc, h) => acc + (h.capacity || 0), 0);
  const totalBenches = halls.reduce((acc, h) => acc + (h.num_rows || h.rows_count || 0), 0);

  return (
    <ResponsiveLayout
      title="Examination Halls & Rooms"
      subtitle={`${halls.length} halls • ${totalBenches} benches • ${totalSeats} total seat capacity`}
      currentRouteName="HallManagement"
      rightAction={
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Room / Hall</Text>
        </Pressable>
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHalls(); }} />
        }
      >
        {/* Top Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{halls.length}</Text>
            <Text style={styles.summaryLabel}>Total Halls</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{totalBenches}</Text>
            <Text style={styles.summaryLabel}>Total Benches</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: colors.primary }]}>{totalSeats}</Text>
            <Text style={styles.summaryLabel}>Seating Capacity</Text>
          </View>
        </View>

        {/* Existing Halls Grid */}
        {loading ? (
          <LoadingSpinner message="Loading examination halls..." />
        ) : halls.length === 0 ? (
          <EmptyState
            iconName="business-outline"
            title="No Examination Halls Configured"
            message="Click 'Add Room / Hall' to register your first examination room with bench rows."
            actionLabel="Add Hall Now"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <View style={styles.hallsGrid}>
            {halls.map((item) => (
              <View key={item.id} style={styles.hallCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.hallCodeBadge}>
                    <Text style={styles.hallCodeText}>{item.hall_code || item.name}</Text>
                  </View>
                  <Badge
                    label={`${item.capacity} SEATS`}
                    variant="success"
                    size="sm"
                  />
                </View>

                <Text style={styles.hallBuilding}>
                  🏛️ {item.building} (Floor {item.floor})
                </Text>

                {/* Bench Breakdown */}
                <View style={styles.benchDetailBox}>
                  <View style={styles.benchCol}>
                    <Text style={styles.benchNum}>{item.num_rows || item.rows_count || 0}</Text>
                    <Text style={styles.benchLabel}>Benches / Rows</Text>
                  </View>
                  <View style={styles.benchDivider} />
                  <View style={styles.benchCol}>
                    <Text style={styles.benchNum}>{item.seats_per_row || item.benches_per_row || 0}</Text>
                    <Text style={styles.benchLabel}>Seats / Bench</Text>
                  </View>
                  <View style={styles.benchDivider} />
                  <View style={styles.benchCol}>
                    <Text style={[styles.benchNum, { color: colors.successText }]}>{item.capacity}</Text>
                    <Text style={styles.benchLabel}>Room Capacity</Text>
                  </View>
                </View>

                {/* Footer Status and Remove */}
                <View style={styles.cardFooter}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{item.status || "ACTIVE"}</Text>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteHall(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={styles.deleteBtnText}>Remove Room</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Room Modal */}
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
                  <Text style={styles.modalTitle}>Add Examination Room</Text>
                  <Text style={styles.modalSub}>Configure bench rows and seating layout</Text>
                </View>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.modalInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.modalLabel}>Room / Hall Number *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. LH-101"
                      placeholderTextColor={colors.textMuted}
                      value={roomNumber}
                      onChangeText={setRoomNumber}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Floor</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      value={floor}
                      onChangeText={setFloor}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Building Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Main Academic Block"
                    placeholderTextColor={colors.textMuted}
                    value={building}
                    onChangeText={setBuilding}
                  />
                </View>

                <View style={styles.modalInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.modalLabel}>Total Benches *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="15"
                      placeholderTextColor={colors.textMuted}
                      value={benches}
                      onChangeText={setBenches}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Seats per Bench *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="2"
                      placeholderTextColor={colors.textMuted}
                      value={seatsPerBench}
                      onChangeText={setSeatsPerBench}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Live Calculated Capacity Callout */}
                <View style={styles.calculatedCallout}>
                  <MaterialCommunityIcons name="calculator" size={20} color={colors.success} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calloutTitle}>
                      Calculated Capacity: <Text style={{ color: colors.successText, fontWeight: "800" }}>{calculatedCapacity} Seats</Text>
                    </Text>
                    <Text style={styles.calloutSub}>
                      {numBenches} benches × {numSeatsPerBench} seats per bench
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Room Notes (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. CCTV enabled, projector equipped"
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <Pressable
                  style={[styles.saveBtn, creating && styles.btnDisabled]}
                  onPress={handleCreateHall}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Room & Generate Seats</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    marginBottom: 16,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  hallsGrid: {
    gap: 12,
  },
  hallCard: {
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
    marginBottom: 6,
  },
  hallCodeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hallCodeText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  hallBuilding: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  benchDetailBox: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginBottom: 10,
  },
  benchCol: {
    flex: 1,
    alignItems: "center",
  },
  benchNum: {
    fontSize: 15,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },
  benchLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  benchDivider: {
    width: 1,
    backgroundColor: colors.border,
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
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.successText,
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
  calculatedCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 8,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.successText,
  },
  calloutSub: {
    fontSize: 10,
    color: colors.success,
    marginTop: 1,
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
