/**
 * ExamEase Unified Design System Tokens
 * Minimal, Premium, Modern, Clean & Professional SaaS Palette
 */

export const colors = {
  // Brand & Primary
  primary: "#2563EB",         // Primary Blue
  primaryHover: "#1D4ED8",
  primaryLight: "#EFF6FF",     // 50
  primaryMuted: "#DBEAFE",     // 100
  primaryDark: "#1E40AF",      // 700
  deepNavy: "#172554",         // Deep Navy (950)

  // Neutrals & Surfaces
  background: "#F8FAFC",       // Slate 50
  surface: "#FFFFFF",          // White
  surfaceAlt: "#F1F5F9",       // Slate 100
  surfaceSubtle: "#F8FAFC",    // Slate 50
  surfaceHover: "#F1F5F9",     // Hover state

  // Borders & Dividers
  border: "#E2E8F0",           // Slate 200
  borderLight: "#F1F5F9",      // Slate 100
  borderDark: "#CBD5E1",       // Slate 300
  borderFocus: "#2563EB",      // Primary Blue Focus

  // Typography / Text Colors
  text: "#0F172A",             // Primary text (Slate 900)
  textSecondary: "#64748B",    // Secondary text (Slate 500)
  textMuted: "#94A3B8",        // Muted text (Slate 400)
  textInverse: "#FFFFFF",      // Inverted text

  // Semantic Status Colors
  success: "#10B981",          // Emerald 500
  successLight: "#ECFDF5",     // Emerald 50
  successBorder: "#A7F3D0",    // Emerald 200
  successText: "#065F46",      // Emerald 800

  warning: "#F59E0B",          // Amber 500
  warningLight: "#FEF3C7",     // Amber 50
  warningBorder: "#FDE68A",    // Amber 200
  warningText: "#92400E",      // Amber 800

  error: "#EF4444",            // Red 500
  errorLight: "#FEE2E2",       // Red 50
  errorBorder: "#FECACA",      // Red 200
  errorText: "#991B1B",        // Red 800

  info: "#0284C7",             // Sky 600
  infoLight: "#F0F9FF",        // Sky 50
  infoBorder: "#BAE6FD",       // Sky 200
  infoText: "#075985",         // Sky 800

  // Seating Specific Tokens
  occupied: "#EF4444",         // Red
  occupiedLight: "#FEE2E2",
  available: "#10B981",        // Green
  availableLight: "#ECFDF5",
  selected: "#2563EB",         // Blue
  selectedLight: "#EFF6FF",
  disabled: "#CBD5E1",         // Slate 300
};

export const typography = {
  fontFamily: "System",
  sizes: {
    xs: 11,
    sm: 13,
    base: 14,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
    display: 32,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  none: {
    shadowColor: "transparent",
    elevation: 0,
  },
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
