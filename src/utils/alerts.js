import { Alert, Platform } from "react-native";

export const confirmSignOut = (logoutFn) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Are you sure you want to sign out?")) {
        logoutFn();
      }
    } else {
      logoutFn();
    }
  } else {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logoutFn },
    ]);
  }
};

export const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.alert) {
      window.alert(`${title ? `${title}\n\n` : ""}${message || ""}`);
      return;
    }
  }
  Alert.alert(title || "Notice", message || "");
};

