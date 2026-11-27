import { Appearance, Platform } from "react-native";

export const lightColors = {
  // Backgrounds & Surfaces
  background: "#F4F2EC",
  backgroundAlt: "#F8F7F3",
  surfaceAlt: "#F8F7F3",
  surface: "#FFFFFF",
  surfaceHover: "#F3F1EB",
  surfaceActive: "#ECE9E1",

  // Typography
  text: "#252B3A",
  textSecondary: "#747B8C",
  textMuted: "#8F95A3",
  textInverse: "#FFFFFF",

  // Primary & Accents
  primary: "#6478D9",
  primaryHover: "#5266C9",
  primaryDark: "#4757B8",
  primaryLight: "#E5EDFF",
  primaryMuted: "#D3DDFB",
  accent: "#8B7CE8",
  accentLight: "#EFE9FF",
  navy: "#252B3A",

  // Pastels
  pastelBlue: "#E5EDFF",
  pastelLavender: "#EFE9FF",
  pastelMint: "#E2F3E9",
  pastelPeach: "#FCEBDD",
  pastelYellow: "#FFF3D7",

  // Borders
  border: "#E8E5DE",
  borderLight: "#F0EDE7",
  borderDark: "#D9D5CC",

  // Semantics
  success: "#26865A",
  successLight: "#E2F3E9",
  successBorder: "#B8E4CD",
  successText: "#1B6543",

  warning: "#D28A32",
  warningLight: "#FFF3D7",
  warningBorder: "#F6DC9F",
  warningText: "#945B13",

  danger: "#D95D61",
  dangerLight: "#FDECEE",
  dangerBorder: "#F8BFC2",
  dangerText: "#9B3135",

  error: "#D95D61",
  errorLight: "#FDECEE",
  errorBorder: "#F8BFC2",
  errorText: "#9B3135",

  info: "#6478D9",
  infoLight: "#E5EDFF",
  infoBorder: "#D3DDFB",
  infoText: "#4757B8",

  // Overlays
  overlay: "rgba(37,43,58,0.38)",

  // Seating Specific
  occupied: "#D95D61",
  occupiedLight: "#FDECEE",
  available: "#26865A",
  availableLight: "#E2F3E9",
  selected: "#6478D9",
  selectedLight: "#E5EDFF",
  disabled: "#D9D5CC",
};

export const darkColors = {
  background: "#161922",
  backgroundAlt: "#1C202B",
  surfaceAlt: "#1C202B",
  surface: "#212634",
  surfaceHover: "#282E3E",
  surfaceActive: "#303648",

  text: "#F4F6FB",
  textSecondary: "#A5ACB9",
  textMuted: "#6B7280",
  textInverse: "#161922",

  primary: "#7B8DF0",
  primaryHover: "#6478D9",
  primaryDark: "#94A4F7",
  primaryLight: "#262E52",
  primaryMuted: "#323C6A",
  accent: "#A295F4",
  accentLight: "#2D2852",
  navy: "#0E1118",

  pastelBlue: "#222B48",
  pastelLavender: "#2B244A",
  pastelMint: "#1B3528",
  pastelPeach: "#3A281E",
  pastelYellow: "#3A311A",

  border: "#2C3242",
  borderLight: "#232836",
  borderDark: "#3A4256",

  success: "#38A169",
  successLight: "#183325",
  successBorder: "#275E3F",
  successText: "#68D391",

  warning: "#DD6B20",
  warningLight: "#372416",
  warningBorder: "#683E1C",
  warningText: "#F6AD55",

  danger: "#E53E3E",
  dangerLight: "#3B1D20",
  dangerBorder: "#6E2B30",
  dangerText: "#FC8181",

  error: "#E53E3E",
  errorLight: "#3B1D20",
  errorBorder: "#6E2B30",
  errorText: "#FC8181",

  info: "#7B8DF0",
  infoLight: "#262E52",
  infoBorder: "#3E4C86",
  infoText: "#A5B4FC",

  overlay: "rgba(0,0,0,0.65)",

  occupied: "#E53E3E",
  occupiedLight: "#3B1D20",
  available: "#38A169",
  availableLight: "#183325",
  selected: "#7B8DF0",
  selectedLight: "#262E52",
  disabled: "#3A4256",
};

// Pick once at startup from Appearance
const isDark = Appearance.getColorScheme() === "dark";
export const colors = isDark ? darkColors : lightColors;

export const tones = {
  blue: { bg: colors.pastelBlue, fg: colors.primaryDark },
  lavender: { bg: colors.pastelLavender, fg: colors.accent },
  mint: { bg: colors.pastelMint, fg: colors.success },
  peach: { bg: colors.pastelPeach, fg: colors.warning },
  yellow: { bg: colors.pastelYellow, fg: colors.warningText },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
};

export const textStyles = {
  display: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.text,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textMuted,
  },
  overline: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  number: {
    fontVariant: ["tabular-nums"],
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 20,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: "transparent",
    elevation: 0,
  },
  subtle: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  popover: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  // Compatibility mappings
  sm: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  base: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const motion = {
  fast: 160,
  base: 200,
  slow: 260,
  easing: "cubic-bezier(0.2,0.8,0.2,1)",
};

/**
 * Returns web CSS transition styles, or null on native platforms.
 */
export const transition = (property = "all", ms = motion.base) => {
  if (Platform.OS === "web") {
    return {
      transitionProperty: property,
      transitionDuration: `${ms}ms`,
      transitionTimingFunction: motion.easing,
    };
  }
  return {};
};

// Also export default tokens bundle
const tokens = {
  colors,
  lightColors,
  darkColors,
  tones,
  textStyles,
  spacing,
  radii,
  shadows,
  motion,
  transition,
};

export default tokens;
