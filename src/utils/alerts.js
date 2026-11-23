import { Alert } from "react-native";

export const confirmSignOut = (logoutFn) => {
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
  Alert.alert(title || "Notice", message || "", [{ text: "OK" }], {
    cancelable: true,
  });
};
