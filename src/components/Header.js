import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { confirmSignOut, showAlert } from "../utils/alerts";
import { colors } from "../theme/colors";

export const Header = ({
  title,
  subtitle,
  rightElement,
  onBack,
  showBack,
  showSettings = true,
  showLogout = true,
}) => {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const handleBack = onBack || (showBack ? () => navigation.goBack() : null);

  const handleSignOut = () => {
    confirmSignOut(() => {
      if (authContext?.logout) {
        authContext.logout();
      }
    });
  };

  const handleSettings = () => {
    confirmSignOut(() => {
      if (authContext?.logout) {
        authContext.logout();
      }
    });
  };

  const isLoggedIn = !!authContext?.user;

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        {handleBack && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rightRow}>
        {rightElement ? <View>{rightElement}</View> : null}
        {isLoggedIn && showLogout && (
          <Pressable
            onPress={handleSignOut}
            style={styles.logoutBtn}
            hitSlop={8}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          </Pressable>
        )}
        {showSettings && (
          <Pressable onPress={handleSettings} style={styles.settingsBtn} hitSlop={8}>
            <Ionicons name="settings-sharp" size={18} color="#475569" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
});
