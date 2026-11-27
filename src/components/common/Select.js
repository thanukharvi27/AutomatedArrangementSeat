import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, motion } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";

/**
 * Select Component
 * Dropdown in a transparent Modal under the trigger, fade + slide.
 */
export const Select = ({
  options = [], // [{ value, label, sublabel }]
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  label,
  error,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 200, height: 40 });
  const triggerRef = useRef(null);

  const anim = useRef(new Animated.Value(0)).current;

  const selectedOption = options.find((opt) => opt.value === value);

  const handleOpen = () => {
    if (disabled) return;
    if (triggerRef.current && triggerRef.current.measureInWindow) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        setCoords({ x, y: y + height + 4, width, height });
        setOpen(true);
        if (prefersReducedMotion()) {
          anim.setValue(1);
        } else {
          Animated.timing(anim, {
            toValue: 1,
            duration: motion.fast,
            useNativeDriver: Platform.OS !== "web",
          }).start();
        }
      });
    } else {
      setOpen(true);
    }
  };

  const handleClose = () => {
    if (prefersReducedMotion()) {
      anim.setValue(0);
      setOpen(false);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: motion.fast,
        useNativeDriver: Platform.OS !== "web",
      }).start(() => setOpen(false));
    }
  };

  const handleSelect = (val) => {
    handleClose();
    if (onChange) onChange(val);
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        ref={triggerRef}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={handleOpen}
        style={[
          styles.trigger,
          open && styles.triggerActive,
          Boolean(error) && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Popover Dropdown Modal */}
      {open && (
        <Modal transparent visible={open} onRequestClose={handleClose} animationType="none">
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <Animated.View
              style={[
                styles.popover,
                {
                  top: coords.y,
                  left: coords.x,
                  minWidth: Math.max(180, coords.width),
                  opacity: anim,
                  transform: [{ translateY }],
                },
              ]}
            >
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.value)}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable
                      onPress={() => handleSelect(item.value)}
                      style={[
                        styles.item,
                        isSelected && styles.itemSelected,
                      ]}
                    >
                      <View style={styles.itemTextCol}>
                        <Text
                          style={[
                            styles.itemLabel,
                            isSelected && styles.itemLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.sublabel ? (
                          <Text style={styles.itemSublabel}>{item.sublabel}</Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                }}
              />
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  trigger: {
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  triggerError: {
    borderColor: colors.danger,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.6,
  },
  triggerText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: colors.textMuted,
    fontWeight: "400",
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
  popover: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 240,
    ...shadows.popover,
  },
  list: {
    paddingVertical: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 12,
    cursor: "pointer",
  },
  itemSelected: {
    backgroundColor: colors.primaryLight,
  },
  itemTextCol: {
    flex: 1,
    marginRight: 8,
  },
  itemLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  itemLabelSelected: {
    fontWeight: "700",
    color: colors.primaryDark,
  },
  itemSublabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
