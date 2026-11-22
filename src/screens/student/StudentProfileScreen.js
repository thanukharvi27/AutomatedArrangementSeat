import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { confirmSignOut } from "../../utils/alerts";

export default function StudentProfileScreen() {
  const { user, logout } = useContext(AuthContext);

  const confirmLogout = () => {
    confirmSignOut(logout);
  };

  const role = (user?.role || "STUDENT").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isFaculty = role === "FACULTY";

  return (
    <View style={styles.container}>
      <Header
        title={isAdmin ? "Administrator Profile" : isFaculty ? "Faculty Profile" : "My Profile"}
        subtitle={`${role} Account`}
      />
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || "U"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name || user?.username}</Text>
        <Text style={styles.role}>
          {role} • {user?.student_profile?.usn || user?.username}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoVal}>{user?.username || "N/A"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoVal}>{user?.email || "N/A"}</Text>
        </View>

        {!isAdmin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoVal}>
              {user?.student_profile?.department_name ||
                user?.faculty_profile?.department_name ||
                "Computer Science & Engineering"}
            </Text>
          </View>
        )}

        {user?.student_profile?.semester ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Semester</Text>
            <Text style={styles.infoVal}>Semester {user?.student_profile?.semester}</Text>
          </View>
        ) : null}

        <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, margin: 16, borderRadius: 16, padding: 20, alignItems: "center", elevation: 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, color: "#ffffff", fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  role: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  infoRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoVal: { fontSize: 13, fontWeight: "600", color: colors.text },
  logoutBtn: { marginTop: 24, width: "100%", height: 48, backgroundColor: colors.errorLight, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  logoutBtnText: { color: colors.error, fontWeight: "700", fontSize: 14 },
});
