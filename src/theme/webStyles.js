import { Platform, Appearance } from "react-native";
import { colors, darkColors } from "./tokens";

const STYLE_ELEMENT_ID = "examease-global-web-styles";

/**
 * Injects centralized web CSS rules to normalize all React Native Web
 * TextInput / textarea controls and suppress white browser focus/autofill boxes.
 */
export function injectGlobalWebStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }

  const isDark =
    colors === darkColors || Appearance.getColorScheme() === "dark";

  const textInputSelector =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]), textarea';
  const textFocusSelector =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):focus, ' +
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):focus-visible, ' +
    "textarea:focus, textarea:focus-visible";

  styleEl.textContent = `
:root {
  color-scheme: ${isDark ? "dark" : "light"};
}

${textInputSelector} {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  min-width: 0;
  caret-color: var(--ee-input-color, ${colors.text});
}

${textFocusSelector} {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

input::placeholder,
textarea::placeholder {
  color: var(--ee-placeholder-color, var(--placeholderTextColor, ${colors.textMuted}));
  opacity: 1;
}

input::-ms-clear,
input::-ms-reveal,
input::-webkit-search-cancel-button,
input::-webkit-search-decoration {
  display: none !important;
  -webkit-appearance: none !important;
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--ee-input-color, ${colors.text}) !important;
  caret-color: var(--ee-input-color, ${colors.text}) !important;
  -webkit-box-shadow: 0 0 0 1000px var(--ee-autofill-bg, ${colors.surfaceAlt}) inset !important;
  box-shadow: 0 0 0 1000px var(--ee-autofill-bg, ${colors.surfaceAlt}) inset !important;
  background-color: transparent !important;
  background-image: none !important;
  border: none !important;
  transition: background-color 999999s ease-in-out 0s, color 999999s ease-in-out 0s !important;
}

input:autofill,
input:autofill:hover,
input:autofill:focus,
textarea:autofill {
  color: var(--ee-input-color, ${colors.text}) !important;
  caret-color: var(--ee-input-color, ${colors.text}) !important;
  box-shadow: 0 0 0 1000px var(--ee-autofill-bg, ${colors.surfaceAlt}) inset !important;
  background-color: transparent !important;
  border: none !important;
}
`;
}
