import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/colors";

export const SeatCard = ({ card, allocation }) => {
  const c = card || allocation;
  if (!c) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerBanner}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>OFFICIAL HALL TICKET ALLOCATION</Text>
        </View>
        <Text style={styles.examName}>{c.exam_name}</Text>
        <Text style={styles.subCode}>{c.subject_code} • {c.department}</Text>
      </View>

      <View style={styles.dateTimeRow}>
        <View style={styles.dtItem}>
          <Text style={styles.dtLabel}>EXAM DATE</Text>
          <Text style={styles.dtValue}>{c.exam_date}</Text>
        </View>
        <View style={styles.dtDivider} />
        <View style={styles.dtItem}>
          <Text style={styles.dtLabel}>TIMING</Text>
          <Text style={styles.dtValue}>{c.start_time} - {c.end_time}</Text>
        </View>
      </View>

      <View style={styles.spotlight}>
        <View style={styles.spotlightItem}>
          <Text style={styles.spotlightLabel}>EXAM HALL</Text>
          <Text style={styles.hallName}>{c.hall_name}</Text>
          <Text style={styles.spotlightSub}>{c.building} • Floor {c.floor}</Text>
        </View>

        <View style={styles.spotlightDivider} />

        <View style={styles.spotlightItem}>
          <Text style={styles.spotlightLabel}>ASSIGNED SEAT</Text>
          <View style={styles.seatBadge}>
            <Text style={styles.seatNumber}>{c.seat_label}</Text>
          </View>
          <Text style={styles.spotlightSub}>Row {c.row_number} • Pos {c.seat_number}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{c.student_name}</Text>
          <Text style={styles.usn}>USN: {c.usn}</Text>
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.classText}>Sem {c.semester} • Sec {c.section}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 12,
  },
  headerBanner: {
    backgroundColor: colors.primary,
    padding: 16,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  examName: {
    color: "#ffffff",
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  subCode: {
    color: "rgba(255,255,255,0.85)",
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  dateTimeRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dtItem: { flex: 1, alignItems: "center" },
  dtDivider: { width: 1, backgroundColor: colors.border },
  dtLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  dtValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  spotlight: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  spotlightItem: { flex: 1, alignItems: "center" },
  spotlightDivider: { width: 1, height: 70, backgroundColor: colors.border },
  spotlightLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  hallName: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  seatBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  seatNumber: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: "#ffffff",
  },
  spotlightSub: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  usn: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  classInfo: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
