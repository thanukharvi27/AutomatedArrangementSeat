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
import { colors, darkColors, radii, shadows, motion, transition } from "../../theme/tokens";

/**
 * Shared web-only reset styles for inner TextInput elements so they blend seamlessly
 * inside themed parent containers without browser outlines or autofill rectangles.
 */
export const getWebInputPropsStyle = (
  autofillBg = colors.surfaceAlt,
  textColor = colors.text,
  placeholderColor = colors.textMuted
) =>
  Platform.OS === "web"
    ? {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
        backgroundColor: "transparent",
        borderWidth: 0,
        width: "100%",
        minWidth: 0,
        "--ee-autofill-bg": autofillBg,
        "--ee-input-color": textColor,
        "--ee-placeholder-color": placeholderColor,
      }
    : {
        minWidth: 0,
      };

/**
 * Consistent theme-aware focus styling for outer input wrapper containers.
 */
export const getContainerFocusStyle = () => ({
  borderColor: colors.primary,
  ...(Platform.OS === "web"
    ? {
        boxShadow:
          colors === darkColors
            ? "0 0 0 3px rgba(123, 141, 240, 0.25)"
            : "0 0 0 3px rgba(100, 120, 217, 0.2)",
      }
    : shadows.subtle),
});

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
  onFocus,
  onBlur,
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
          focused && getContainerFocusStyle(),
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
          onFocus={(e) => {
            setFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          style={[
            styles.input,
            getWebInputPropsStyle(disabled ? colors.surfaceAlt : colors.surface),
            inputStyle,
          ]}
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
  onFocus,
  onBlur,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.searchContainer,
        transition("all", motion.fast),
        focused && getContainerFocusStyle(),
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
        onFocus={(e) => {
          setFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (onBlur) onBlur(e);
        }}
        style={[styles.searchInput, getWebInputPropsStyle(colors.surface)]}
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
    overflow: "hidden",
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
    minWidth: 0,
    height: "100%",
    fontSize: 13,
    color: colors.text,
    backgroundColor: "transparent",
    borderWidth: 0,
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
    overflow: "hidden",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    fontSize: 13,
    color: colors.text,
    backgroundColor: "transparent",
    borderWidth: 0,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 2,
  },
});
