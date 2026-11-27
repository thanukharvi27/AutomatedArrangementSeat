import React, { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { FeedbackProvider } from "./src/components/common/Feedback";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const linkId = "google-fonts-inter";
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <FeedbackProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </AuthProvider>
      </FeedbackProvider>
    </SafeAreaProvider>
  );
}