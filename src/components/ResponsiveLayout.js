import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export const ResponsiveLayout = ({
  children,
  title,
  subtitle,
  currentRouteName,
  showBack = false,
  onBack,
  rightAction,
  noScroll = false,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Desktop Fixed Left Sidebar */}
        {isDesktop && (
          <AppSidebar currentRouteName={currentRouteName} />
        )}

        {/* Mobile Slide-out Drawer Modal */}
        {!isDesktop && (
          <Modal
            visible={mobileDrawerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMobileDrawerVisible(false)}
          >
            <View style={styles.drawerOverlay}>
              <Pressable
                style={styles.drawerBackdrop}
                onPress={() => setMobileDrawerVisible(false)}
              />
              <View style={styles.drawerSheet}>
                <AppSidebar
                  currentRouteName={currentRouteName}
                  onCloseMobileDrawer={() => setMobileDrawerVisible(false)}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Header */}
          <AppHeader
            title={title}
            subtitle={subtitle}
            showBack={showBack}
            onBack={onBack}
            rightAction={rightAction}
            onOpenMobileDrawer={() => setMobileDrawerVisible(true)}
            isDesktop={isDesktop}
          />

          {/* Children Screen Body */}
          <View style={styles.contentBody}>
            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.background,
  },
  contentBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerSheet: {
    width: 270,
    backgroundColor: colors.surface,
    height: "100%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
});
