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
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { showAlert } from "../../utils/alerts";
import api, { hallApi } from "../../services/api";

export default function HallManagementScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [roomNumber, setRoomNumber] = useState("");
  const [building, setBuilding] = useState("Main Block");
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
        building: building.trim() || "Main Block",
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
        showAlert("Success", data.message || `Room ${trimmedRoom} added with ${calculatedCapacity} seats capacity!`);
        setRoomNumber("");
        setNotes("");
        setShowAddForm(false);
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
        showAlert("Deleted", `Hall ${hall.name} deleted successfully.`);
        fetchHalls();
      } else {
        showAlert("Delete Failed", data.error || "Could not delete hall.");
      }
    } catch (err) {
      showAlert("Delete Error", err.response?.data?.error || err.message || "Could not delete hall.");
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Room & Hall Management"
        subtitle="Configure campus halls, benches & seating capacity"
        showBack
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHalls(); }} />}
      >
        {/* Top Action & Summary */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.sectionTitle}>Examination Rooms</Text>
            <Text style={styles.sectionSub}>
              {halls.length} room(s) configured • Total Capacity: {halls.reduce((acc, h) => acc + (h.capacity || 0), 0)} seats
            </Text>
          </View>
          <Pressable
            style={[styles.toggleBtn, showAddForm && styles.toggleBtnActive]}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons name={showAddForm ? "close" : "add"} size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.toggleBtnText}>{showAddForm ? "Cancel" : "Add Room"}</Text>
          </Pressable>
        </View>

        {/* Add New Room Card / Form */}
        {showAddForm && (
          <View style={styles.addCard}>
            <View style={styles.addCardHeader}>
              <View style={styles.addCardIconBox}>
                <Ionicons name="business" size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.addCardTitle}>Add New Examination Hall / Room</Text>
                <Text style={styles.addCardSub}>Define bench rows and seating capacity</Text>
              </View>
            </View>

            {/* Room Number & Building */}
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Room / Hall Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. LH-101 or Room 204"
                  placeholderTextColor="#94a3b8"
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Building</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Main Block"
                  placeholderTextColor="#94a3b8"
                  value={building}
                  onChangeText={setBuilding}
                />
              </View>
            </View>

            {/* Floor, Benches, Seats per Bench */}
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Floor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#94a3b8"
                  value={floor}
                  onChangeText={setFloor}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Total Benches *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  placeholderTextColor="#94a3b8"
                  value={benches}
                  onChangeText={setBenches}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Seats / Bench *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor="#94a3b8"
                  value={seatsPerBench}
                  onChangeText={setSeatsPerBench}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Live Calculated Capacity Callout */}
            <View style={styles.capacityCallout}>
              <MaterialCommunityIcons name="calculator" size={22} color="#16a34a" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.capacityCalloutTitle}>
                  Calculated Total Capacity: <Text style={{ color: "#16a34a", fontSize: 16 }}>{calculatedCapacity} Seats</Text>
                </Text>
                <Text style={styles.capacityCalloutSub}>
                  Formula: {numBenches} benches × {numSeatsPerBench} seats per bench
                </Text>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes / Room Features (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 40 }]}
                placeholder="e.g. Projector equipped, CCTV active"
                placeholderTextColor="#94a3b8"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.createBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreateHall}
              disabled={creating}
            >
              {creating ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={[styles.createBtnText, { marginLeft: 8 }]}>Creating & Generating Seats...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.createBtnText}>Save Room & Generate Seats</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Existing Halls List */}
        {loading ? (
          <LoadingSpinner message="Loading exam halls..." />
        ) : halls.length === 0 ? (
          <EmptyState
            icon="🏛️"
            title="No Exam Halls Found"
            message="Click 'Add Room' above to register your first examination hall and configure benches."
          />
        ) : (
          <View style={styles.cardsGrid}>
            {halls.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardCodeBadge}>
                    <Text style={styles.cardCodeText}>{item.hall_code || item.name}</Text>
                  </View>
                  <View style={styles.cardCapBadge}>
                    <MaterialCommunityIcons name="seat" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                    <Text style={styles.cardCapText}>{item.capacity} Seats</Text>
                  </View>
                </View>

                <Text style={styles.cardBuilding}>
                  🏛️ {item.building} • Floor {item.floor}
                </Text>

                <View style={styles.benchDetailBox}>
                  <View style={styles.benchStat}>
                    <Text style={styles.benchStatNum}>{item.num_rows || item.rows_count || 0}</Text>
                    <Text style={styles.benchStatLabel}>Benches / Rows</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.benchStat}>
                    <Text style={styles.benchStatNum}>{item.seats_per_row || item.benches_per_row || 0}</Text>
                    <Text style={styles.benchStatLabel}>Seats / Bench</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.benchStat}>
                    <Text style={[styles.benchStatNum, { color: "#16a34a" }]}>{item.capacity}</Text>
                    <Text style={styles.benchStatLabel}>Max Capacity</Text>
                  </View>
                </View>

                <View style={styles.cardBottomRow}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{item.status || "ACTIVE"}</Text>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteHall(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    width: "100%",
  },
  scrollDesktop: {
    maxWidth: 900,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a8a",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#64748b",
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  addCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  addCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  addCardSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    height: 44,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0f172a",
  },
  capacityCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  capacityCalloutTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  capacityCalloutSub: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 2,
  },
  createBtn: {
    height: 46,
    backgroundColor: "#1e3a8a",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  cardsGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardCodeBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardCodeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  cardCapBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardCapText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  cardBuilding: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  benchDetailBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    marginBottom: 12,
  },
  benchStat: {
    flex: 1,
    alignItems: "center",
  },
  benchStatNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  benchStatLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#dc2626",
    marginLeft: 4,
  },
});
