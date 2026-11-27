import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, motion, transition } from "../../theme/tokens";

/**
 * Input with focus ring support
 */
export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry,
  disabled = false,
  style,
  inputStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.container,
          transition("all", motion.fast),
          focused && styles.containerFocused,
          Boolean(error) && styles.containerError,
          disabled && styles.containerDisabled,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          accessibilityLabel={label || placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, inputStyle]}
          {...props}
        />

        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/**
 * SearchInput with focus ring and clear button
 */
export const SearchInput = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.searchContainer,
        transition("all", motion.fast),
        focused && styles.containerFocused,
        style,
      ]}
    >
      <Ionicons
        name="search"
        size={16}
        color={focused ? colors.primary : colors.textMuted}
        style={styles.searchIcon}
      />

      <TextInput
        accessibilityLabel="Search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />

      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => {
            if (onChangeText) onChangeText("");
            if (onClear) onClear();
          }}
          hitSlop={8}
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
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
  container: {
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  containerFocused: {
    borderColor: colors.primary,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 0 3px rgba(100, 120, 217, 0.2)" }
      : shadows.subtle),
  },
  containerError: {
    borderColor: colors.danger,
  },
  containerDisabled: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: colors.text,
    outlineStyle: "none",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
  searchContainer: {
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: colors.text,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 2,
  },
});
