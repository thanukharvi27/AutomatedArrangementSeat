import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModalDialog } from "./common/ModalDialog";
import { Button } from "./common/Button";
import { colors, textStyles, spacing, radii, shadows } from "../theme/tokens";
import { showAlert } from "../utils/alerts";
import api from "../services/api";

const TEMPLATE_HEADERS = ["usn", "full_name", "department", "semester", "email", "section", "phone"];
const TEMPLATE_EXAMPLE = [
  "1MS22CS001", "Rahul Sharma", "CSE", "5", "rahul@college.edu", "A", "9876543210",
];

/**
 * Triggers a CSV file download in the browser.
 * Reuses the same pattern as ReportsScreen.
 */
function triggerCsvDownload(filename, csvText) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const bom = "\uFEFF" + csvText;
  const blob = new Blob([bom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ImportStudentsDialog({ visible, onClose, onImported }) {
  const fileInputRef = useRef(null);

  // State machine: idle -> previewing -> importing -> done
  const [phase, setPhase] = useState("idle"); // idle | previewing | importing | done
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null); // { total, valid, skipped, errors }
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setFileName("");
    setCsvText("");
    setPreview(null);
    setLoading(false);
    // Reset file input value so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")].join("\r\n");
    triggerCsvDownload("examease_student_import_template.csv", csv);
  };

  const handlePickFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      showAlert("Invalid File", "Please select a .csv file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showAlert("File Too Large", "The CSV file must be under 2 MB.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (!text || typeof text !== "string") {
        showAlert("Read Error", "Could not read the file contents.");
        return;
      }
      setCsvText(text);
      await runPreview(text);
    };
    reader.onerror = () => {
      showAlert("Read Error", "An error occurred reading the file.");
    };
    reader.readAsText(file, "utf-8");
  };

  const runPreview = async (text) => {
    setLoading(true);
    setPhase("previewing");
    try {
      const res = await api.post("/students/import", { csv: text, save: false });
      const data = res.data || res;
      if (data.success) {
        setPreview(data);
      } else {
        showAlert("Preview Error", data.error || "Could not preview the CSV.");
        setPhase("idle");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to preview CSV.";
      showAlert("Preview Error", msg);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!csvText || !preview || preview.valid === 0) return;
    setLoading(true);
    setPhase("importing");
    try {
      const res = await api.post("/students/import", { csv: csvText, save: true });
      const data = res.data || res;
      if (data.success && data.saved) {
        setPhase("done");
        if (onImported) onImported(data.valid);
        // Auto-close after brief delay
        setTimeout(() => {
          handleClose();
        }, 600);
      } else {
        showAlert("Import Error", data.error || "Could not save the students.");
        setPhase("previewing");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to import students.";
      showAlert("Import Error", msg);
      setPhase("previewing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      visible={visible}
      onClose={handleClose}
      title="Import Students from CSV"
      subtitle="Bulk-add students to the examination database"
      maxWidth={560}
    >
      <View style={styles.body}>
        {/* Hidden file input (web only) */}
        {Platform.OS === "web" && typeof document !== "undefined" && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelected}
            style={{ display: "none" }}
            aria-label="Choose CSV file"
          />
        )}

        {/* Step 1: Instructions & file pick */}
        {(phase === "idle" || (phase === "previewing" && !preview)) && (
          <View style={styles.section}>
            <Text style={styles.instructionHeading}>CSV Format Requirements</Text>
            <Text style={styles.instructionText}>
              The CSV file must have a header row with these columns:
            </Text>

            <View style={styles.columnsGrid}>
              <View style={styles.colRequired}>
                <Text style={styles.colGroupLabel}>Required</Text>
                {["usn", "full_name", "department", "semester", "email"].map((col) => (
                  <View key={col} style={styles.colChip}>
                    <Text style={styles.colChipText}>{col}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.colOptional}>
                <Text style={styles.colGroupLabel}>Optional</Text>
                {["section", "phone"].map((col) => (
                  <View key={col} style={[styles.colChip, styles.colChipOptional]}>
                    <Text style={[styles.colChipText, styles.colChipTextOptional]}>{col}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.instructionHint}>
              The <Text style={{ fontWeight: "700" }}>department</Text> column must use the department code (e.g. CSE, ECE, ISE, ME).
            </Text>

            <View style={styles.buttonRow}>
              <Button
                title="Download Template"
                variant="outline"
                size="sm"
                onPress={handleDownloadTemplate}
                icon={<Ionicons name="download-outline" size={14} color={colors.text} />}
                accessibilityLabel="Download CSV template file"
              />
              <Button
                title="Choose CSV File"
                variant="primary"
                size="sm"
                onPress={handlePickFile}
                loading={loading && phase === "previewing"}
                icon={<Ionicons name="document-outline" size={14} color={colors.textInverse} />}
                accessibilityLabel="Choose a CSV file to import"
              />
            </View>
          </View>
        )}

        {/* Loading spinner during preview */}
        {loading && phase === "previewing" && !preview && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Analysing CSV file...</Text>
          </View>
        )}

        {/* Step 2: Preview results */}
        {phase === "previewing" && preview && !loading && (
          <View style={styles.section}>
            {/* File info */}
            <View style={styles.fileInfoRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.fileNameText} numberOfLines={1}>{fileName}</Text>
            </View>

            {/* Counts */}
            <View style={styles.countsRow}>
              <View style={styles.countBox}>
                <Text style={styles.countNum}>{preview.total}</Text>
                <Text style={styles.countLabel}>Total rows</Text>
              </View>
              <View style={[styles.countBox, styles.countBoxSuccess]}>
                <Text style={[styles.countNum, { color: colors.successText }]}>{preview.valid}</Text>
                <Text style={styles.countLabel}>Valid</Text>
              </View>
              <View style={[styles.countBox, styles.countBoxWarn]}>
                <Text style={[styles.countNum, { color: preview.skipped > 0 ? colors.warningText : colors.textMuted }]}>
                  {preview.skipped}
                </Text>
                <Text style={styles.countLabel}>Skipped</Text>
              </View>
            </View>

            {/* Error list */}
            {preview.errors.length > 0 && (
              <View style={styles.errorsBox}>
                <Text style={styles.errorsTitle}>
                  <Ionicons name="alert-circle" size={14} color={colors.warning} /> Skip reasons
                  ({preview.errors.length > 100 ? "first 100 shown" : preview.errors.length}):
                </Text>
                <ScrollView style={styles.errorsScroll} nestedScrollEnabled>
                  {preview.errors.slice(0, 100).map((msg, i) => (
                    <Text key={i} style={styles.errorLine}>• {msg}</Text>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.buttonRow}>
              <Button
                title="Choose Different File"
                variant="outline"
                size="sm"
                onPress={() => {
                  reset();
                }}
                accessibilityLabel="Choose a different CSV file"
              />
              <Button
                title={preview.valid > 0 ? `Import ${preview.valid} Student${preview.valid !== 1 ? "s" : ""}` : "No valid rows"}
                variant="primary"
                size="sm"
                onPress={handleImport}
                disabled={preview.valid === 0}
                accessibilityLabel={`Import ${preview.valid} students into the database`}
              />
            </View>
          </View>
        )}

        {/* Importing spinner */}
        {phase === "importing" && loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Importing students into database...</Text>
          </View>
        )}

        {/* Done */}
        {phase === "done" && (
          <View style={styles.doneBox}>
            <View style={styles.doneIconCircle}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            </View>
            <Text style={styles.doneTitle}>Import Complete</Text>
            <Text style={styles.doneSubtitle}>
              {preview?.valid || 0} student{(preview?.valid || 0) !== 1 ? "s" : ""} successfully added to the database.
            </Text>
          </View>
        )}
      </View>
    </ModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  instructionHeading: {
    ...textStyles.label,
    fontWeight: "700",
    color: colors.text,
  },
  instructionText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  instructionHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: -4,
  },
  columnsGrid: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  colRequired: {
    gap: spacing.xs,
  },
  colOptional: {
    gap: spacing.xs,
  },
  colGroupLabel: {
    ...textStyles.overline,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  colChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    alignSelf: "flex-start",
  },
  colChipText: {
    ...textStyles.caption,
    fontWeight: "600",
    color: colors.primaryDark,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  colChipOptional: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  colChipTextOptional: {
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  fileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileNameText: {
    ...textStyles.label,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  countsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  countBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBoxSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  countBoxWarn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  countNum: {
    ...textStyles.heading,
    fontSize: 24,
    color: colors.text,
  },
  countLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorsBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorsTitle: {
    ...textStyles.caption,
    fontWeight: "600",
    color: colors.warningText,
  },
  errorsScroll: {
    maxHeight: 160,
  },
  errorLine: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  doneBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  doneIconCircle: {
    marginBottom: spacing.xs,
  },
  doneTitle: {
    ...textStyles.title,
    color: colors.text,
  },
  doneSubtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
