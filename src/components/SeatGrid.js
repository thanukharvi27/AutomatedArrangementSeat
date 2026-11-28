import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { colors, radii, transition } from "../theme/tokens";

/**
 * Classroom bench layout. Consecutive seats in a row form one bench:
 * seat 1 = LEFT / seat 2 = RIGHT of bench 1, seat 3 = LEFT of bench 2, ...
 * (same rule as the backend Seat.bench_in_row / Seat.position).
 *
 * Seat state (from getSeatState, or derived): "vacant" | "selected" | "occupied" | "unavailable" | "disabled".
 */
export const SEAT_STATE_LEGEND = {
  vacant: "Vacant",
  selected: "Selected",
  occupied: "Occupied",
  unavailable: "Unavailable",
  disabled: "Position off",
};

const BRANCH_TONES = [
  { bg: colors.pastelBlue, fg: colors.primaryDark },
  { bg: colors.pastelPeach, fg: colors.warningText },
  { bg: colors.pastelMint, fg: colors.successText },
  { bg: colors.pastelLavender, fg: colors.accent },
  { bg: colors.pastelYellow, fg: colors.warningText },
  { bg: colors.dangerLight, fg: colors.dangerText },
];

export const branchTone = (code) => {
  if (!code) return BRANCH_TONES[0];
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return BRANCH_TONES[h % BRANCH_TONES.length];
};

const benchInRow = (seatNum) => Math.ceil(seatNum / 2);
const positionOf = (seatNum) => (seatNum % 2 === 1 ? "LEFT" : "RIGHT");

const defaultState = (seat, selectedSeatId) => {
  const id = seat.seat_id ?? seat.id;
  if (selectedSeatId != null && selectedSeatId === id) return "selected";
  if (seat.is_active === false) return "unavailable";
  if (seat.enabled === false) return "disabled";
  if (seat.is_occupied) return "occupied";
  return "vacant";
};

const rowName = (rowNum) => (rowNum <= 26 ? String.fromCharCode(64 + rowNum) : `R${rowNum}`);

export const SeatGrid = ({
  hall,
  seatsGrid = [],
  onSeatPress,
  onBenchPress,
  selectedSeatId,
  getSeatState,
  renderSeatContent,
  isDimmed,
  rows: visibleRows,
  legendStates = ["vacant", "occupied", "selected", "unavailable"],
  detailed = false,
}) => {
  if (!seatsGrid || seatsGrid.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No seats configured for this hall.</Text>
      </View>
    );
  }

  const seatsPerRow = Math.max(hall?.seats_per_row || 0, ...seatsGrid.map((s) => s.seat_num));
  const benchesPerRow = Math.ceil(seatsPerRow / 2);
  const byPos = {};
  seatsGrid.forEach((s) => {
    byPos[`${s.row_num}-${s.seat_num}`] = s;
  });
  const numRows = Math.max(hall?.num_rows || 0, ...seatsGrid.map((s) => s.row_num));
  const rowNumbers = (visibleRows && visibleRows.length ? visibleRows : Array.from({ length: numRows }, (_, i) => i + 1));

  const stateOf = (seat) => (getSeatState ? getSeatState(seat) : defaultState(seat, selectedSeatId));

  const renderPosition = (rowNum, seatNum, benchNum) => {
    const seat = byPos[`${rowNum}-${seatNum}`];
    const side = positionOf(seatNum);
    if (!seat) {
      return (
        <View
          key={seatNum}
          style={[styles.seat, detailed && styles.seatDetailed, styles.state_unavailable]}
          accessibilityLabel={`Bench ${benchNum} ${side.toLowerCase()} position, no seat`}
        >
          <Text style={[styles.sideTag, styles.text_unavailable]}>{side[0]}</Text>
          <Text style={[styles.seatLabel, styles.text_unavailable]}>—</Text>
        </View>
      );
    }
    const state = stateOf(seat);
    const dept = seat.allocation?.department_code;
    const tone = state === "occupied" && dept ? branchTone(dept) : null;
    const dim = isDimmed ? isDimmed(seat) : false;
    const pressable = !!onSeatPress && state !== "unavailable";
    const a11y = [
      `Bench ${benchNum}`,
      `${side.toLowerCase()} position`,
      seat.seat_label,
      SEAT_STATE_LEGEND[state] || state,
      seat.allocation ? `${seat.allocation.student_name}, ${seat.allocation.usn}, ${dept}` : null,
    ].filter(Boolean).join(", ");

    return (
      <Pressable
        key={seatNum}
        disabled={!pressable}
        onPress={() => onSeatPress && onSeatPress(seat)}
        accessibilityRole={pressable ? "button" : undefined}
        accessibilityLabel={a11y}
        accessibilityState={{ selected: state === "selected", disabled: !pressable }}
        style={({ hovered, pressed }) => [
          styles.seat,
          detailed && styles.seatDetailed,
          styles[`state_${state}`],
          tone && { backgroundColor: tone.bg, borderColor: tone.fg },
          pressable && hovered && styles.seatHover,
          pressed && styles.seatPressed,
          dim && styles.seatDim,
          transition("all", 160),
        ]}
      >
        <Text style={[styles.sideTag, styles[`text_${state}`], tone && { color: tone.fg }]}>{side[0]}</Text>
        {renderSeatContent ? (
          renderSeatContent(seat, state)
        ) : (
          <Text style={[styles.seatLabel, styles[`text_${state}`], tone && { color: tone.fg }]} numberOfLines={1}>
            {seat.seat_label}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {legendStates.length > 0 && (
        <View style={styles.legend}>
          {legendStates.map((st) => (
            <View key={st} style={styles.legendItem}>
              <View style={[styles.legendBox, styles[`state_${st}`]]} />
              <Text style={styles.legendText}>{SEAT_STATE_LEGEND[st]}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.board}>
        <Text style={styles.boardText}>FRONT / BLACKBOARD</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {rowNumbers.map((rowNum) => (
            <View key={`row-${rowNum}`} style={styles.rowBlock}>
              <Text style={styles.rowTitle}>ROW {rowNum} ({rowName(rowNum)})</Text>
              <View style={styles.row}>
                {Array.from({ length: benchesPerRow }, (_, i) => {
                  const b = i + 1;
                  const benchNum = (rowNum - 1) * benchesPerRow + b;
                  const leftNum = 2 * b - 1;
                  const rightNum = 2 * b;
                  const benchSeats = [byPos[`${rowNum}-${leftNum}`], byPos[`${rowNum}-${rightNum}`]].filter(Boolean);
                  return (
                    <View key={`bench-${b}`} style={styles.bench}>
                      <Pressable
                        disabled={!onBenchPress}
                        onPress={() => onBenchPress && onBenchPress(benchSeats, benchNum)}
                        accessibilityRole={onBenchPress ? "button" : undefined}
                        accessibilityLabel={`Bench ${benchNum}${onBenchPress ? ", toggle both positions" : ""}`}
                        style={({ hovered }) => [styles.benchHeader, onBenchPress && hovered && styles.benchHeaderHover]}
                      >
                        <Text style={styles.benchTitle}>BENCH {String(benchNum).padStart(2, "0")}</Text>
                      </Pressable>
                      <View style={styles.benchSeats}>
                        {renderPosition(rowNum, leftNum, benchNum)}
                        <View style={styles.benchDivider} />
                        {rightNum <= seatsPerRow ? renderPosition(rowNum, rightNum, benchNum) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.backWall}>
        <Text style={styles.boardText}>BACK OF CLASSROOM</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 6,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendBox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: colors.textSecondary },
  board: {
    backgroundColor: colors.navy,
    borderRadius: radii.sm,
    paddingVertical: 6,
    alignItems: "center",
    marginBottom: 14,
    marginHorizontal: "10%",
  },
  backWall: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: colors.borderDark,
    paddingTop: 6,
    marginTop: 12,
    alignItems: "center",
  },
  boardText: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 2 },
  scrollContent: { paddingVertical: 4, flexGrow: 1, justifyContent: "center" },
  gridContainer: { gap: 12 },
  rowBlock: { gap: 4 },
  rowTitle: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 1 },
  row: { flexDirection: "row", gap: 12 },
  bench: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: 4,
    gap: 3,
  },
  benchHeader: { alignItems: "center", borderRadius: radii.xs, paddingVertical: 1 },
  benchHeaderHover: { backgroundColor: colors.surfaceHover },
  benchTitle: { fontSize: 9, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5 },
  benchSeats: { flexDirection: "row", alignItems: "stretch" },
  benchDivider: { width: 2, backgroundColor: colors.borderDark, marginHorizontal: 3, borderRadius: 1 },
  seat: {
    width: 46,
    minHeight: 40,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  seatDetailed: { width: 108, minHeight: 62, alignItems: "flex-start", justifyContent: "flex-start", paddingHorizontal: 6 },
  seatHover: { transform: [{ translateY: -1 }], shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  seatPressed: { opacity: 0.75 },
  seatDim: { opacity: 0.25 },
  sideTag: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5, opacity: 0.8 },
  seatLabel: { fontSize: 11, fontWeight: "700" },
  state_vacant: { backgroundColor: colors.availableLight, borderColor: colors.available },
  state_selected: { backgroundColor: colors.selected, borderColor: colors.primaryDark },
  state_occupied: { backgroundColor: colors.occupiedLight, borderColor: colors.occupied },
  state_unavailable: { backgroundColor: colors.disabled, borderColor: colors.disabled, ...(Platform.OS === "web" ? { cursor: "not-allowed" } : {}) },
  state_disabled: { backgroundColor: colors.surface, borderColor: colors.borderDark, borderStyle: "dashed" },
  text_vacant: { color: colors.successText },
  text_selected: { color: colors.textInverse },
  text_occupied: { color: colors.dangerText },
  text_unavailable: { color: colors.textMuted },
  text_disabled: { color: colors.textMuted },
  emptyContainer: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
