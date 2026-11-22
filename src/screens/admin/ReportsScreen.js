import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { colors } from "../../theme/colors";
import { Header } from "../../components/Header";

export default function ReportsScreen() {
  const downloadReport = (title) => {
    Alert.alert("Report Generated", `${title} PDF export ready for download on Web/Desktop portal.`);
  };

  return (
    <View style={styles.container}>
      <Header title="Reports & Charts" subtitle="Export Seating Charts & Attendance Sheets" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.reportCard} onPress={() => downloadReport("Hall Notice Board Seating Chart")}>
          <Text style={styles.reportIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Hall Notice Board Seating Chart</Text>
            <Text style={styles.reportSub}>Formatted PDF printout with USN and Seat Labels for each hall door.</Text>
          </View>
        </Pressable>

        <Pressable style={styles.reportCard} onPress={() => downloadReport("Student Invigilation Attendance Roster")}>
          <Text style={styles.reportIcon}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Invigilation Attendance Sheet</Text>
            <Text style={styles.reportSub}>Student signature collection sheets organized per examination hall.</Text>
          </View>
        </Pressable>

        <Pressable style={styles.reportCard} onPress={() => downloadReport("Comprehensive Utilization Summary")}>
          <Text style={styles.reportIcon}>📊</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Hall Utilization Analysis</Text>
            <Text style={styles.reportSub}>Statistical summary of bench capacity and seat utilization percentages.</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16 },
  reportCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 14, elevation: 1 },
  reportIcon: { fontSize: 32 },
  reportTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  reportSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
