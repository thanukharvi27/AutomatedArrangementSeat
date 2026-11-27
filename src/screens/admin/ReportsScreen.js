import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Tabs } from "../../components/common/Tabs";
import { HBarList } from "../../components/common/Charts";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { colors, radii, textStyles, shadows } from "../../theme/tokens";
import { showAlert } from "../../utils/alerts";
import api, { reportApi, hallApi, studentApi, seatingApi } from "../../services/api";

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW | HALLS | EXPORTS
  const [occupancyData, setOccupancyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  // Escape formula-like cells & construct UTF-8 BOM CSV
  const triggerCsvDownload = (filename, csvText) => {
    const bomCsv = "\uFEFF" + csvText;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([bomCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert("Export Complete", `${filename} downloaded successfully.`);
    } else {
      showAlert("Export Generated", `${filename} generated.`);
    }
  };

  const escapeCell = (val) => {
    let s = String(val ?? "");
    if (/^[=\+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };

  // 1. Download Halls CSV
  const handleDownloadHallsCsv = async () => {
    setDownloading(true);
    try {
      const res = await hallApi.getAll();
      const data = res.data || res;
      const halls = data.halls || [];

      const headers = ["Hall ID", "Room Number", "Building", "Floor", "Benches", "Seats Per Bench", "Capacity"];
      const rows = halls.map((h) => [
        escapeCell(h.id),
        escapeCell(h.hall_code || h.name),
        escapeCell(h.building),
        escapeCell(h.floor),
        escapeCell(h.num_rows || h.benches),
        escapeCell(h.seats_per_row || h.seats_per_bench),
        escapeCell(h.capacity),
      ].join(","));

      const csv = [headers.join(","), ...rows].join("\r\n");
      triggerCsvDownload("examease_halls_report.csv", csv);
    } catch (err) {
      showAlert("Export Error", err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 2. Download Students CSV (page through per_page=100)
  const handleDownloadStudentsCsv = async () => {
    setDownloading(true);
    try {
      let allStudents = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await api.get(`/students?page=${currentPage}&per_page=100`);
        const d = res.data || res;
        const pageList = d.students || [];
        allStudents = allStudents.concat(pageList);

        if (d.pagination) {
          totalPages = d.pagination.pages || 1;
        } else {
          break;
        }
        currentPage++;
      } while (currentPage <= totalPages);

      const headers = ["Student ID", "USN", "Full Name", "Email", "Department", "Semester", "Section", "Status"];
      const rows = allStudents.map((s) => [
        escapeCell(s.id),
        escapeCell(s.usn),
        escapeCell(s.full_name),
        escapeCell(s.email),
        escapeCell(s.department_code),
        escapeCell(s.semester),
        escapeCell(s.section),
        escapeCell(s.status),
      ].join(","));

      const csv = [headers.join(","), ...rows].join("\r\n");
      triggerCsvDownload("examease_students_roster.csv", csv);
    } catch (err) {
      showAlert("Export Error", err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 3. Download Seating Allocations CSV
  const handleDownloadAllocationsCsv = async () => {
    setDownloading(true);
    try {
      const plansRes = await seatingApi.getPlans();
      const pData = plansRes.data || plansRes;
      const plans = pData.plans || [];

      if (plans.length === 0) {
        showAlert("Notice", "No seating plans available to export.");
        return;
      }

      // Fetch allocations for the latest plan
      const latestPlanId = plans[0].id;
      const planRes = await seatingApi.getPlan(latestPlanId);
      const detail = planRes.data || planRes;
      const allocs = detail.plan?.allocations || [];

      const headers = ["Plan ID", "Exam Name", "Date", "USN", "Candidate Name", "Hall", "Seat Label"];
      const rows = allocs.map((a) => [
        escapeCell(latestPlanId),
        escapeCell(detail.plan?.exam_name),
        escapeCell(detail.plan?.exam_date),
        escapeCell(a.usn),
        escapeCell(a.student_name),
        escapeCell(a.hall_name),
        escapeCell(a.seat_label),
      ].join(","));

      const csv = [headers.join(","), ...rows].join("\r\n");
      triggerCsvDownload(`examease_seating_allocations_plan_${latestPlanId}.csv`, csv);
    } catch (err) {
      showAlert("Export Error", err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Print via window.print() on web. No fake PDF!
  const handlePrintWeb = () => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.print) {
      window.print();
    } else {
      showAlert("Print Notice", "Browser print is supported on web browser preview.");
    }
  };

  return (
    <AppLayout
      title="Analytics & Reports"
      subtitle="Capacity metrics, hall occupancy analytics, and official CSV exports"
      breadcrumb="Analytics / Reports"
      currentRouteName="AdminReports"
      rightAction={
        Platform.OS === "web" ? (
          <Button
            title="Print View"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="print-outline" size={14} color={colors.text} />}
            onPress={handlePrintWeb}
          />
        ) : null
      }
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
        {/* Tabs: Overview | Halls | Exports */}
        <Card style={{ padding: 0 }}>
          <Tabs
            tabs={[
              { key: "OVERVIEW", label: "Overview & Occupancy" },
              { key: "HALLS", label: "Hall Utilisation" },
              { key: "EXPORTS", label: "Official CSV Exports" },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
        </Card>

        {/* TAB 1 & 2: OVERVIEW & HALLS */}
        {(activeTab === "OVERVIEW" || activeTab === "HALLS") && (
          <View style={{ gap: 16 }}>
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Campus Hall Occupancy Metrics</Text>
              <Text style={styles.cardSub}>Current seat saturation per examination room</Text>

              {loading ? (
                <LoadingSkeleton height={140} />
              ) : occupancyData.length === 0 ? (
                <Text style={styles.emptyText}>No examination hall data available.</Text>
              ) : (
                <HBarList
                  data={occupancyData.map((h) => ({
                    label: h.hall_name || `Hall ${h.hall_id}`,
                    value: h.occupied_seats || 0,
                    max: h.total_seats || 1,
                    color: h.occupancy_percentage > 80 ? colors.warning : colors.primary,
                  }))}
                  style={{ marginTop: 14 }}
                />
              )}
            </Card>

            <View style={styles.hallGrid}>
              {occupancyData.map((h) => {
                const pct = h.occupancy_percentage || 0;
                return (
                  <Card key={h.hall_id} style={styles.hallDetailCard}>
                    <View style={styles.hallTop}>
                      <Text style={styles.hallName}>{h.hall_name}</Text>
                      <View style={[styles.pctBadge, pct > 80 ? styles.pctBadgeWarn : styles.pctBadgeOk]}>
                        <Text style={[styles.pctBadgeText, pct > 80 ? styles.pctTextWarn : styles.pctTextOk]}>
                          {pct}% FULL
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hallBuilding}>{h.building} • Floor {h.floor}</Text>

                    <View style={styles.hallStatsRow}>
                      <View style={styles.hallStatCol}>
                        <Text style={styles.hallStatVal}>{h.occupied_seats}</Text>
                        <Text style={styles.hallStatLabel}>Occupied</Text>
                      </View>
                      <View style={styles.hallStatDivider} />
                      <View style={styles.hallStatCol}>
                        <Text style={[styles.hallStatVal, { color: colors.successText }]}>{h.available_seats}</Text>
                        <Text style={styles.hallStatLabel}>Available</Text>
                      </View>
                      <View style={styles.hallStatDivider} />
                      <View style={styles.hallStatCol}>
                        <Text style={styles.hallStatVal}>{h.total_seats}</Text>
                        <Text style={styles.hallStatLabel}>Total Capacity</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 3: EXPORTS */}
        {activeTab === "EXPORTS" && (
          <View style={{ gap: 14 }}>
            <Card style={styles.exportCard}>
              <View style={styles.exportLeft}>
                <View style={[styles.iconChip, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="school-outline" size={20} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>Student Candidate Directory CSV</Text>
                  <Text style={styles.exportSub}>Complete enrolled candidate roster with USN, department, semester & email (auto-paged).</Text>
                </View>
              </View>
              <Button
                title="Download CSV"
                size="sm"
                variant="primary"
                loading={downloading}
                icon={<Ionicons name="download-outline" size={14} color="#FFFFFF" />}
                onPress={handleDownloadStudentsCsv}
              />
            </Card>

            <Card style={styles.exportCard}>
              <View style={styles.exportLeft}>
                <View style={[styles.iconChip, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="business-outline" size={20} color={colors.warningText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>Examination Halls & Rooms CSV</Text>
                  <Text style={styles.exportSub}>Configured room capacities, bench layouts, seats per bench, and floor locations.</Text>
                </View>
              </View>
              <Button
                title="Download CSV"
                size="sm"
                variant="secondary"
                loading={downloading}
                icon={<Ionicons name="download-outline" size={14} color={colors.text} />}
                onPress={handleDownloadHallsCsv}
              />
            </Card>

            <Card style={styles.exportCard}>
              <View style={styles.exportLeft}>
                <View style={[styles.iconChip, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="layers-outline" size={20} color={colors.successText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>Seating Allocations Report CSV</Text>
                  <Text style={styles.exportSub}>Complete candidate seat assignments with Hall, Seat Label, and USN roll.</Text>
                </View>
              </View>
              <Button
                title="Download CSV"
                size="sm"
                variant="outline"
                loading={downloading}
                icon={<Ionicons name="download-outline" size={14} color={colors.primary} />}
                onPress={handleDownloadAllocationsCsv}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  scrollDesktop: {
    maxWidth: 1160,
    width: "100%",
    alignSelf: "center",
  },
  chartCard: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  hallGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  hallDetailCard: {
    flex: 1,
    minWidth: 260,
    gap: 8,
  },
  hallTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hallName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  hallBuilding: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  pctBadgeOk: {
    backgroundColor: colors.successLight,
  },
  pctBadgeWarn: {
    backgroundColor: colors.warningLight,
  },
  pctBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pctTextOk: {
    color: colors.successText,
  },
  pctTextWarn: {
    color: colors.warningText,
  },
  hallStatsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 8,
    marginTop: 4,
  },
  hallStatCol: {
    flex: 1,
    alignItems: "center",
  },
  hallStatVal: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  hallStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  hallStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  exportCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  exportLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  exportSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 14,
    textAlign: "center",
  },
});
