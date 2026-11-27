import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, textStyles } from "../../theme/tokens";

export const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems,
  perPage = 10,
  onPageChange,
  style,
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const startItem = (page - 1) * perPage + 1;
  const endItem = totalItems ? Math.min(totalItems, page * perPage) : page * perPage;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.summaryText}>
        Showing <Text style={styles.boldText}>{startItem}-{endItem}</Text> of{" "}
        <Text style={styles.boldText}>{totalItems || totalPages * perPage}</Text>
      </Text>

      <View style={styles.btnRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          disabled={!canPrev}
          onPress={() => canPrev && onPageChange && onPageChange(page - 1)}
          style={[styles.btn, !canPrev && styles.btnDisabled]}
        >
          <Ionicons name="chevron-back" size={15} color={canPrev ? colors.text : colors.textMuted} />
        </Pressable>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            Page <Text style={styles.boldText}>{page}</Text> of <Text style={styles.boldText}>{totalPages || 1}</Text>
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next page"
          disabled={!canNext}
          onPress={() => canNext && onPageChange && onPageChange(page + 1)}
          style={[styles.btn, !canNext && styles.btnDisabled]}
        >
          <Ionicons name="chevron-forward" size={15} color={canNext ? colors.text : colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: "wrap",
    gap: 10,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: "700",
    color: colors.text,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  pageIndicator: {
    paddingHorizontal: 8,
  },
  pageText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
