import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import { colors, radii, shadows, motion, transition } from "../../theme/tokens";

/**
 * DataTable Component
 * Table on desktop (>=768px) with row hover; card list on mobile.
 */
export const DataTable = ({
  columns = [], // [{ key, title, width, align, render }]
  data = [],
  keyExtractor = (item, idx) => item.id || String(idx),
  onRowPress,
  renderMobileCard,
  emptyComponent,
  style,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (data.length === 0 && emptyComponent) {
    return <View style={style}>{emptyComponent}</View>;
  }

  if (isMobile) {
    return (
      <View style={[styles.mobileList, style]}>
        {data.map((item, idx) => {
          const key = keyExtractor(item, idx);
          if (renderMobileCard) {
            return (
              <View key={key}>
                {renderMobileCard(item, idx)}
              </View>
            );
          }

          // Fallback mobile card
          return (
            <Pressable
              key={key}
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              style={styles.mobileCard}
            >
              {columns.map((col) => (
                <View key={col.key} style={styles.mobileField}>
                  <Text style={styles.mobileFieldLabel}>{col.title}:</Text>
                  <View style={styles.mobileFieldValue}>
                    {col.render ? col.render(item[col.key], item) : <Text style={styles.cellText}>{String(item[col.key] ?? "")}</Text>}
                  </View>
                </View>
              ))}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Desktop Table view
  return (
    <View style={[styles.tableWrap, style]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <View
            key={col.key}
            style={[
              styles.headerCell,
              col.width ? { width: col.width } : { flex: 1 },
              col.align === "right" && { alignItems: "flex-end" },
              col.align === "center" && { alignItems: "center" },
            ]}
          >
            <Text style={styles.headerText}>{col.title}</Text>
          </View>
        ))}
      </View>

      {/* Body Rows */}
      {data.map((item, idx) => {
        const key = keyExtractor(item, idx);
        return (
          <DataTableRow
            key={key}
            item={item}
            columns={columns}
            onPress={onRowPress ? () => onRowPress(item) : undefined}
          />
        );
      })}
    </View>
  );
};

const DataTableRow = ({ item, columns, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        transition("all", motion.fast),
        hovered && Platform.OS === "web" && styles.rowHover,
        pressed && onPress && { backgroundColor: colors.surfaceActive },
      ]}
    >
      {columns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.cell,
            col.width ? { width: col.width } : { flex: 1 },
            col.align === "right" && { alignItems: "flex-end" },
            col.align === "center" && { alignItems: "center" },
          ]}
        >
          {col.render ? (
            col.render(item[col.key], item)
          ) : (
            <Text style={styles.cellText} numberOfLines={1}>
              {String(item[col.key] ?? "")}
            </Text>
          )}
        </View>
      ))}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tableWrap: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerCell: {
    justifyContent: "center",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: "center",
  },
  rowHover: {
    backgroundColor: colors.surfaceHover,
  },
  cell: {
    justifyContent: "center",
  },
  cellText: {
    fontSize: 13,
    color: colors.text,
  },
  mobileList: {
    gap: 10,
  },
  mobileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    ...shadows.card,
  },
  mobileField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mobileFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  mobileFieldValue: {
    alignItems: "flex-end",
  },
});
