import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors, typography } from "../theme/colors";

export const SeatGrid = ({ hall, seatsGrid = [], onSeatPress, selectedSeatId }) => {
  if (!seatsGrid || seatsGrid.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No seats configured for this hall.</Text>
      </View>
    );
  }

  const rowsMap = {};
  seatsGrid.forEach((seat) => {
    if (!rowsMap[seat.row_num]) rowsMap[seat.row_num] = [];
    rowsMap[seat.row_num].push(seat);
  });

  const rowNumbers = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.occupied }]} />
          <Text style={styles.legendText}>Occupied</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.available }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
      </View>

      <View style={styles.stageIndicator}>
        <Text style={styles.stageText}>FRONT / BLACKBOARD</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {rowNumbers.map((rowNum) => {
            const seats = rowsMap[rowNum].sort((a, b) => a.seat_num - b.seat_num);
            const rowLetter = rowNum <= 26 ? String.fromCharCode(64 + rowNum) : `R${rowNum}`;

            return (
              <View key={`row-${rowNum}`} style={styles.row}>
                <View style={styles.rowLabelContainer}>
                  <Text style={styles.rowLabelText}>{rowLetter}</Text>
                </View>

                {seats.map((seat) => {
                  const seatIdentifier = seat.seat_id ?? seat.id;
                  const isOccupied = seat.is_occupied;
                  const isSelected = selectedSeatId === seatIdentifier;
                  const bgColor = isSelected ? colors.selected : (isOccupied ? colors.occupied : colors.available);

                  return (
                    <Pressable
                      key={`seat-${seatIdentifier}`}
                      style={[styles.seatBox, { backgroundColor: bgColor }]}
                      onPress={() => onSeatPress && onSeatPress(seat)}
                    >
                      <Text style={styles.seatLabel}>{seat.seat_label}</Text>
                      {isOccupied && seat.allocation?.usn ? (
                        <Text style={styles.seatUsnSub} numberOfLines={1}>
                          {seat.allocation.usn.slice(-4)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    elevation: 2,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendBox: { width: 14, height: 14, borderRadius: 3 },
  legendText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  stageIndicator: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    paddingVertical: 4,
    alignItems: "center",
    marginBottom: 14,
  },
  stageText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  scrollContent: { paddingVertical: 4 },
  gridContainer: { flexDirection: "column", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabelContainer: { width: 24, alignItems: "center" },
  rowLabelText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.textSecondary },
  seatBox: {
    width: 52,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  seatLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: "#ffffff" },
  seatUsnSub: { fontSize: 9, color: "#ffffff", opacity: 0.9, marginTop: 1 },
  emptyContainer: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: typography.sizes.sm },
});
