import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/colors";

export const LoadingSpinner = ({ message = "Loading ExamEase..." }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 12,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
});
