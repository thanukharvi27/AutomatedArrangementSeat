/**
 * Backward compatibility re-export wrapper around tokens.js
 */
import tokens, {
  colors as tokenColors,
  lightColors,
  darkColors,
  tones,
  textStyles,
  spacing,
  radii as tokenRadii,
  shadows as tokenShadows,
  motion,
  transition,
} from "./tokens";

export const colors = tokenColors;
export const radii = tokenRadii;
export const shadows = tokenShadows;
export { lightColors, darkColors, tones, textStyles, spacing, motion, transition };

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

export default tokens;
