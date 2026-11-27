import { Alert, Platform } from "react-native";
import { getFeedbackInstance } from "../components/common/Feedback";

/**
 * Shows an alert or toast message.
 * Routes through FeedbackProvider if mounted, otherwise falls back gracefully.
 */
export const showAlert = (title, message) => {
  const feedback = getFeedbackInstance();
  if (feedback && feedback.toast) {
    const formatted = title ? `${title}: ${message || ""}` : (message || "");
    feedback.toast(formatted, "info");
    return;
  }

  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(`${title ? title + "\n\n" : ""}${message || ""}`);
        return;
      }
    } catch {}
  }

  Alert.alert(title || "Notice", message || "", [{ text: "OK" }], {
    cancelable: true,
  });
};

/**
 * Generic confirm action dialog
 */
export const confirmAction = ({
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const feedback = getFeedbackInstance();
  if (feedback && feedback.confirm) {
    feedback.confirm({
      title,
      message,
      confirmText,
      cancelText,
      destructive,
      onConfirm,
      onCancel,
    });
    return;
  }

  if (Platform.OS === "web") {
    let confirmed = true;
    try {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        confirmed = window.confirm(`${title}\n\n${message}`);
      }
    } catch {}
    if (confirmed) {
      if (onConfirm) onConfirm();
    } else {
      if (onCancel) onCancel();
    }
    return;
  }

  Alert.alert(
    title,
    message,
    [
      { text: cancelText, style: "cancel", onPress: onCancel },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

/**
 * Sign out confirmation dialog
 */
export const confirmSignOut = (logoutFn) => {
  confirmAction({
    title: "Sign Out",
    message: "Are you sure you want to sign out of ExamEase?",
    confirmText: "Sign Out",
    cancelText: "Cancel",
    destructive: true,
    onConfirm: logoutFn,
  });
};
