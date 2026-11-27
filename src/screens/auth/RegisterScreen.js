import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, textStyles, spacing, radii, shadows } from "../../theme/tokens";
import { Button } from "../../components/common/Button";
import { FadeIn } from "../../components/common/Motion";

export default function RegisterScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FadeIn delay={60} style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="information-circle-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Account Provisioning</Text>
        <Text style={styles.subtitle}>
          Student, Faculty, and Staff accounts are centrally provisioned by the Examination Management Cell.
        </Text>
        <Text style={styles.note}>
          If you are an enrolled student or assigned faculty member and have not received your credentials, please contact your department coordinator or campus examination administrator.
        </Text>
        <Button
          title="Back to Sign In"
          variant="primary"
          size="md"
          onPress={() => navigation.navigate("Login")}
          icon={<Ionicons name="arrow-back" size={16} color={colors.textInverse} />}
        />
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    ...shadows.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.heading,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "center",
    lineHeight: 22,
  },
  note: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 18,
  },
});