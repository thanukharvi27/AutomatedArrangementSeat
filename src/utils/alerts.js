import { Alert, Platform } from "react-native";

export const confirmSignOut = (logoutFn) => {
  if (Platform.OS === "web") {
    let confirmed = true;
    try {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        confirmed = window.confirm("Are you sure you want to sign out of ExamEase?");
      }
    } catch {}
    if (confirmed && typeof logoutFn === "function") {
      logoutFn();
    }
    return;
  }

  Alert.alert(
    "Sign Out",
    "Are you sure you want to sign out of ExamEase?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          if (logoutFn) logoutFn();
        },
      },
    ],
    { cancelable: true }
  );
};

export const showAlert = (title, message) => {
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
