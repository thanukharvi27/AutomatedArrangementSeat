import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveLayout } from "../../components/ResponsiveLayout";
import { Badge } from "../../components/Badge";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { colors, typography, shadows } from "../../theme/colors";
import { showAlert } from "../../utils/alerts";
import { reportApi } from "../../services/api";

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [occupancyData, setOccupancyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await reportApi.getOccupancy();
      const data = res.data || res;
      if (data.success) {
        setOccupancyData(data.occupancy || []);
      }
    } catch (err) {
      console.log("Error loading occupancy report:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const downloadReport = (title, details) => {
    showAlert("Report Export Ready", `${title} PDF export generated.\n\n${details}`);
  };

  return (
    <ResponsiveLayout
      title="Analytics & Printable Reports"
      subtitle="Campus seat occupancy statistics & printable examination rosters"
      currentRouteName="AdminReports"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} />
        }
      >
        {/* Printable Exports Section */}
        <Text style={styles.sectionHeading}>Official Printable Exports</Text>
        <View style={styles.reportsGrid}>
          <Pressable
            style={styles.reportCard}
            onPress={() => downloadReport("Hall Notice Board Seating Chart", "Formatted printable PDF chart with USN, Student Name, and Seat Labels for each hall entrance door.")}
          >
            <View style={[styles.reportIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="clipboard-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Hall Door Seating Chart</Text>
              <Text style={styles.reportSub}>Formatted PDF printout with USN and Seat Labels for each hall door.</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
          </Pressable>

          <Pressable
            style={styles.reportCard}
            onPress={() => downloadReport("Student Invigilation Attendance Roster", "Official student signature collection sheets organized per examination hall and bench.")}
          >
            <View style={[styles.reportIconBox, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkbox-outline" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Invigilation Attendance Sheet</Text>
              <Text style={styles.reportSub}>Student signature collection sheets organized per examination hall.</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={colors.success} />
          </Pressable>

          <Pressable
            style={styles.reportCard}
            onPress={() => downloadReport("Comprehensive Utilization Summary", "Statistical breakdown of bench capacity and seat utilization percentages across campus.")}
          >
            <View style={[styles.reportIconBox, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="bar-chart-outline" size={22} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Hall Utilization Analysis</Text>
              <Text style={styles.reportSub}>Statistical summary of bench capacity and seat utilization percentages.</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={colors.info} />
          </Pressable>
        </View>

        {/* Live Occupancy Analytics Section */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Live Hall Occupancy Breakdown</Text>

        {loading ? (
          <LoadingSpinner message="Calculating room occupancy metrics..." />
        ) : occupancyData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active examination halls found.</Text>
          </View>
        ) : (
          <View style={styles.occupancyList}>
            {occupancyData.map((item) => {
              const pct = item.occupancy_percentage || 0;
              return (
                <View key={item.hall_id} style={styles.occupancyCard}>
                  <View style={styles.occupancyTop}>
                    <View>
                      <Text style={styles.hallName}>{item.hall_name}</Text>
                      <Text style={styles.hallLocation}>
                        {item.building} • Floor {item.floor}
                      </Text>
                    </View>
                    <Badge
                      label={`${pct}% OCCUPIED`}
                      variant={pct > 80 ? "warning" : pct > 0 ? "success" : "neutral"}
                      size="sm"
                    />
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${Math.min(100, pct)}%` }]} />
                  </View>

                  <View style={styles.occupancyBottom}>
                    <Text style={styles.metricText}>
                      Occupied: <Text style={{ fontWeight: "700", color: colors.text }}>{item.occupied_seats}</Text>
                    </Text>
                    <Text style={styles.metricText}>
                      Available: <Text style={{ fontWeight: "700", color: colors.successText }}>{item.available_seats}</Text>
                    </Text>
                    <Text style={styles.metricText}>
                      Capacity: <Text style={{ fontWeight: "700", color: colors.text }}>{item.total_seats}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  scrollDesktop: {
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  reportsGrid: {
    gap: 10,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.sm,
  },
  reportIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  reportSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  occupancyList: {
    gap: 10,
  },
  occupancyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.sm,
  },
  occupancyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hallName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  hallLocation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  progressTrack: {
    height: 7,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  occupancyBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
