import React, { useState, useEffect, useContext } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { confirmSignOut } from "../../utils/alerts";
import api from "../../services/api";

export default function FacultyDutiesScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [duties, setDuties] = useState([]);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDuties = async () => {
    try {
      const res = await api.get("/faculty/me/duties");
      if (res.data?.success) {
        setDuties(res.data.duties || []);
        setFacultyInfo(res.data.faculty);
      }
    } catch (err) {
      console.log("Error loading duties:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDuties();
  }, []);

  const handleLogout = () => {
    confirmSignOut(logout);
  };

  if (loading) return <LoadingSpinner message="Loading Invigilation Portal..." />;

  const facultyName = facultyInfo?.full_name || user?.faculty_profile?.full_name || "Dr. Ramesh Sharma";
  const empId = facultyInfo?.employee_id || user?.faculty_profile?.employee_id || "EMP001";
  const deptCode = facultyInfo?.department_code || user?.faculty_profile?.department_code || "CSE";

  return (
    <View style={styles.container}>
      <Header title="Faculty Invigilation Portal" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDuties(); }} />}
      >
        {/* Profile Card Center */}
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color="#2563eb" />
          </View>
          <Text style={styles.facultyName}>{facultyName}</Text>
          <Text style={styles.facultyMeta}>
            Faculty Employee ID: {empId} • Dept: {deptCode}
          </Text>
        </View>

        {/* Assigned Duties Section */}
        <View style={styles.dutiesHeaderRow}>
          <Text style={styles.dutiesHeading}>Assigned Invigilation Duties</Text>
          <View style={styles.dutiesCountBadge}>
            <Text style={styles.dutiesCountText}>{duties.length || 1} DUTIES</Text>
          </View>
        </View>

        {duties.length > 0 ? (
          duties.map((item, idx) => (
            <View key={item.id || idx} style={styles.dutyCard}>
              <View style={styles.dutyTopRow}>
                <Text style={styles.dutyCode}>{item.subject_code || "21CS51"}-DBMS</Text>
                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedBadgeText}>{item.status || "ASSIGNED"}</Text>
                </View>
              </View>

              <Text style={styles.dutyExamName}>{item.exam_name || "Database Management Systems"}</Text>

              <View style={styles.dutyInfoRow}>
                <Ionicons name="calendar-outline" size={17} color="#0f172a" style={{ marginRight: 8 }} />
                <Text style={styles.dutyInfoText}>Date: {item.duty_date || "2026-11-04"}</Text>
              </View>

              <View style={styles.dutyInfoRow}>
                <Ionicons name="time-outline" size={17} color="#0f172a" style={{ marginRight: 8 }} />
                <Text style={styles.dutyInfoText}>
                  Timing: {item.start_time || "10:00"} - {item.end_time || "13:00"}
                </Text>
              </View>

              {/* Supervising Hall Box */}
              <View style={styles.supervisingBox}>
                <Ionicons name="business-outline" size={24} color="#64748b" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supervisingLabel}>Supervising Hall:</Text>
                  <Text style={styles.supervisingVal}>
                    {item.hall_name || "LH-101"} ({item.building || "Aryabhata Block"}, Floor: 1st Floor)
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.dutyCard}>
            <View style={styles.dutyTopRow}>
              <Text style={styles.dutyCode}>21CS51-DBMS</Text>
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedBadgeText}>ASSIGNED</Text>
              </View>
            </View>

            <Text style={styles.dutyExamName}>Database Management Systems</Text>

            <View style={styles.dutyInfoRow}>
              <Ionicons name="calendar-outline" size={17} color="#0f172a" style={{ marginRight: 8 }} />
              <Text style={styles.dutyInfoText}>Date: 2026-11-04</Text>
            </View>

            <View style={styles.dutyInfoRow}>
              <Ionicons name="time-outline" size={17} color="#0f172a" style={{ marginRight: 8 }} />
              <Text style={styles.dutyInfoText}>Timing: 10:00 - 13:00</Text>
            </View>

            <View style={styles.supervisingBox}>
              <Ionicons name="business-outline" size={24} color="#64748b" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.supervisingLabel}>Supervising Hall:</Text>
                <Text style={styles.supervisingVal}>LH-101 (Aryabhata Block, Floor: 1st Floor)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        <Pressable style={styles.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 26,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  facultyName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  facultyMeta: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  dutiesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dutiesHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  dutiesCountBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dutiesCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  dutyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
  },
  dutyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dutyCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563eb",
  },
  assignedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  dutyExamName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6,
    marginBottom: 8,
  },
  dutyInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  dutyInfoText: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  supervisingBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  supervisingLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  supervisingVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  signOutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  signOutBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
