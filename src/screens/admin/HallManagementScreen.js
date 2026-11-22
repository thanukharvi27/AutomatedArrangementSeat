import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import api from "../../services/api";

export default function HallManagementScreen() {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHalls = async () => {
    try {
      const res = await api.get("/halls");
      if (res.data?.success) {
        setHalls(res.data.halls || []);
      }
    } catch (err) {
      console.log("Error loading halls:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Examination Halls" subtitle="Campus Hall & Room Capacities" showBack />
      {loading ? (
        <LoadingSpinner message="Loading halls..." />
      ) : (
        <FlatList
          data={halls}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHalls(); }} />}
          ListEmptyComponent={<EmptyState icon="🏛️" title="No Halls" message="No exam halls configured." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.code}>{item.hall_code}</Text>
                <Text style={styles.cap}>Capacity: {item.capacity} Seats</Text>
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>Building: {item.building} • Floor {item.floor}</Text>
              <Text style={styles.meta}>Grid Setup: {item.rows_count} Rows × {item.cols_count} Cols ({item.benches_per_row} seats/bench)</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  code: { fontSize: 14, fontWeight: "700", color: colors.primary },
  cap: { fontSize: 13, fontWeight: "600", color: colors.success },
  name: { fontSize: 16, fontWeight: "600", color: colors.text, marginVertical: 6 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
