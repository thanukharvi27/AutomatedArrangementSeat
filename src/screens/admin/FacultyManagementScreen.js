import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import api from "../../services/api";

export default function FacultyManagementScreen() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFaculty = async () => {
    try {
      const res = await api.get("/faculty");
      if (res.data?.success) {
        setFaculty(res.data.faculty || []);
      }
    } catch (err) {
      console.log("Error loading faculty:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Faculty & Invigilators" subtitle="Campus invigilation roster" showBack />
      {loading ? (
        <LoadingSpinner message="Loading faculty roster..." />
      ) : (
        <FlatList
          data={faculty}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFaculty(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.sub}>Emp ID: {item.employee_id} • {item.designation}</Text>
              <Text style={styles.dept}>Department: {item.department_name || "Engineering"}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  dept: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
