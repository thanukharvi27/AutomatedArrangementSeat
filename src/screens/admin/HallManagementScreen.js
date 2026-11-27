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
import { Input } from "../../components/common/Input";
import { Meter } from "../../components/common/Charts";
import { Drawer } from "../../components/common/Drawer";
import { ModalDialog } from "../../components/common/ModalDialog";
import { SeatGrid } from "../../components/SeatGrid";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert, confirmAction } from "../../utils/alerts";
import api, { hallApi } from "../../services/api";

export default function HallManagementScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Drawer state
  const [selectedHall, setSelectedHall] = useState(null);
  const [hallSeats, setHallSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Add Hall Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [building, setBuilding] = useState("Main Academic Block");
  const [floor, setFloor] = useState("1");
  const [benches, setBenches] = useState("15");
  const [seatsPerBench, setSeatsPerBench] = useState("2");
  const [notes, setNotes] = useState("");

  const [occupancyMap, setOccupancyMap] = useState({});

  const numBenches = parseInt(benches, 10) || 0;
  const numSeatsPerBench = parseInt(seatsPerBench, 10) || 0;
  const calculatedCapacity = numBenches * numSeatsPerBench;

  const loadHalls = async () => {
    try {
      const [res, occRes] = await Promise.allSettled([
        hallApi.getAll(),
        reportApi.getOccupancy(),
      ]);

      if (res.status === "fulfilled") {
        const data = res.value.data || res.value;
        if (data.success) {
          setHalls(data.halls || []);
        }
      }

      if (occRes.status === "fulfilled") {
        const occData = occRes.value.data || occRes.value;
        const list = occData.occupancy || [];
        const map = {};
        list.forEach((item) => {
          map[item.hall_id] = item.occupied_seats ?? 0;
        });
        setOccupancyMap(map);
      }
    } catch (err) {
      console.log("Error loading halls:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHalls();
  }, []);

  const handleOpenHallDetail = async (hall) => {
    setSelectedHall(hall);
    setLoadingSeats(true);
    try {
      const res = await hallApi.getHall(hall.id);
      const data = res.data || res;
      if (data.success && data.hall) {
        setSelectedHall(data.hall);
        setHallSeats(data.hall.seats || []);
      }
    } catch (err) {
      console.log("Error loading hall seats:", err?.message);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleRegenerateSeats = (hall) => {
    confirmAction({
      title: "Regenerate Hall Seats",
      message: `Regenerate all seats for Room ${hall.hall_code || hall.name}? Existing seat layout will be refreshed according to configured bench rows.`,
      confirmText: "Regenerate Seats",
      onConfirm: async () => {
        try {
          const res = await hallApi.generateSeats(hall.id);
          const data = res.data || res;
          if (data.success) {
            showAlert("Seats Generated", `Seats for ${hall.hall_code || hall.name} successfully regenerated!`);
            handleOpenHallDetail(hall);
            loadHalls();
          } else {
            showAlert("Notice", data.error || "Could not regenerate seats.");
          }
        } catch (err) {
          showAlert("Error", err.response?.data?.error || err.message || "Failed to regenerate seats.");
        }
      },
    });
  };

  const handleCreateHall = async () => {
    const trimmedRoom = roomNumber.trim().toUpperCase();
    if (!trimmedRoom) {
      showAlert("Validation Error", "Please enter a Room / Hall Number.");
      return;
    }
    if (numBenches <= 0 || numSeatsPerBench <= 0) {
      showAlert("Validation Error", "Please enter valid bench count and seats per bench.");
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
        showAlert("Hall Added", `Room ${trimmedRoom} created with ${calculatedCapacity} seats capacity!`);
        setShowAddModal(false);
        setRoomNumber("");
        setNotes("");
        loadHalls();
      } else {
        showAlert("Error", data.error || "Could not create hall.");
      }
    } catch (err) {
      showAlert("Creation Failed", err.response?.data?.error || err.message || "Failed to create hall.");
    } finally {
      setCreating(false);
    }
  };

  const totalSeats = halls.reduce((sum, h) => sum + (h.capacity || 0), 0);

  return (
    <AppLayout
      title="Examination Halls & Rooms"
      subtitle={`${halls.length} halls • ${totalSeats} total seating capacity`}
      breadcrumb="Management / Halls"
      currentRouteName="HallManagement"
      rightAction={
        <Button
          title="Add Room / Hall"
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHalls(); }} />
        }
      >
        {/* Hall Cards Grid */}
        {loading ? (
          <LoadingSkeleton height={180} />
        ) : halls.length === 0 ? (
          <EmptyState
            iconName="business-outline"
            title="No Halls Registered"
            message="Configure examination rooms with bench rows to allocate student seats."
            actionLabel="Add Room / Hall"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <View style={styles.grid}>
            {halls.map((hall) => {
              const allocated = occupancyMap[hall.id] ?? hall.allocated_count ?? 0;
              const cap = hall.capacity || 1;
              const pct = Math.min(100, Math.round((allocated / cap) * 100));

              return (
                <Card key={hall.id} style={styles.hallCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.hallBadge}>
                      <Text style={styles.hallBadgeText}>{hall.hall_code || hall.name}</Text>
                    </View>
                    <View style={styles.capBadge}>
                      <Text style={styles.capBadgeText}>{hall.capacity} SEATS</Text>
                    </View>
                  </View>

                  <Text style={styles.buildingText}>
                    🏛️ {hall.building} • Floor {hall.floor}
                  </Text>

                  {/* Occupancy Meter */}
                  <View style={styles.meterBlock}>
                    <View style={styles.meterHeader}>
                      <Text style={styles.meterLabel}>Capacity Utilisation</Text>
                      <Text style={styles.meterVal}>{pct}%</Text>
                    </View>
                    <Meter percent={pct} color={pct > 80 ? colors.warning : colors.primary} />
                  </View>

                  <View style={styles.benchRow}>
                    <View style={styles.benchCol}>
                      <Text style={styles.benchNum}>{hall.num_rows || hall.rows_count || 0}</Text>
                      <Text style={styles.benchLabel}>Benches</Text>
                    </View>
                    <View style={styles.benchDivider} />
                    <View style={styles.benchCol}>
                      <Text style={styles.benchNum}>{hall.seats_per_row || hall.benches_per_row || 0}</Text>
                      <Text style={styles.benchLabel}>Seats/Bench</Text>
                    </View>
                    <View style={styles.benchDivider} />
                    <View style={styles.benchCol}>
                      <Text style={[styles.benchNum, { color: colors.successText }]}>{hall.capacity}</Text>
                      <Text style={styles.benchLabel}>Total</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <Button
                      title="Inspect Grid"
                      size="sm"
                      variant="secondary"
                      icon={<Ionicons name="grid-outline" size={13} color={colors.text} />}
                      onPress={() => handleOpenHallDetail(hall)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Hall Detail Drawer with SeatGrid and Regenerate Seats */}
        <Drawer
          visible={Boolean(selectedHall)}
          onClose={() => setSelectedHall(null)}
          title={`Room ${selectedHall?.hall_code || selectedHall?.name}`}
          subtitle={`${selectedHall?.building} (Floor ${selectedHall?.floor}) • ${selectedHall?.capacity} seats`}
        >
          {selectedHall && (
            <View style={styles.drawerContent}>
              <View style={styles.drawerActions}>
                <Button
                  title="Regenerate Hall Seats"
                  size="sm"
                  variant="outline"
                  icon={<Ionicons name="refresh" size={14} color={colors.primary} />}
                  onPress={() => handleRegenerateSeats(selectedHall)}
                  style={{ width: "100%" }}
                />
              </View>

              <Text style={styles.gridHeading}>Seat Layout Preview:</Text>

              {loadingSeats ? (
                <LoadingSkeleton height={180} />
              ) : (
                <SeatGrid
                  hall={selectedHall}
                  seatsGrid={hallSeats.length > 0 ? hallSeats : selectedHall.seats || []}
                />
              )}
            </View>
          )}
        </Drawer>

        {/* Add Hall Modal */}
        <ModalDialog
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Examination Room"
          subtitle="Configure bench rows and seating capacity"
          maxWidth={460}
        >
          <View style={styles.modalForm}>
            <View style={styles.modalRow}>
              <Input
                label="Room / Hall Number *"
                placeholder="e.g. LH-101"
                value={roomNumber}
                onChangeText={setRoomNumber}
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
              <Input
                label="Floor"
                placeholder="1"
                value={floor}
                onChangeText={setFloor}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            <Input
              label="Building Name"
              placeholder="Main Academic Block"
              value={building}
              onChangeText={setBuilding}
            />

            <View style={styles.modalRow}>
              <Input
                label="Total Benches *"
                placeholder="15"
                value={benches}
                onChangeText={setBenches}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="Seats per Bench *"
                placeholder="2"
                value={seatsPerBench}
                onChangeText={setSeatsPerBench}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.calcCallout}>
              <Ionicons name="calculator-outline" size={18} color={colors.success} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.calcTitle}>
                  Room Capacity: <Text style={{ color: colors.successText, fontWeight: "700" }}>{calculatedCapacity} Seats</Text>
                </Text>
                <Text style={styles.calcSub}>
                  {numBenches} benches × {numSeatsPerBench} seats per bench
                </Text>
              </View>
            </View>

            <Input
              label="Room Notes (Optional)"
              placeholder="e.g. CCTV enabled, projector equipped"
              value={notes}
              onChangeText={setNotes}
            />

            <Button
              title="Save Room & Generate Seats"
              loading={creating}
              onPress={handleCreateHall}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  hallCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hallBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  hallBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  capBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  capBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successText,
    letterSpacing: 0.4,
  },
  buildingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  meterBlock: {
    gap: 4,
  },
  meterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meterLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  meterVal: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  benchRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 8,
  },
  benchCol: {
    flex: 1,
    alignItems: "center",
  },
  benchNum: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  benchLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  benchDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  actionRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  drawerContent: {
    gap: 14,
  },
  drawerActions: {
    marginBottom: 4,
  },
  gridHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  modalForm: {
    gap: 12,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
  },
  calcCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  calcSub: {
    fontSize: 10,
    color: colors.success,
  },
});
