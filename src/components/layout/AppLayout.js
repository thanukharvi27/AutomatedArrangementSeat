import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/tokens";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { FadeIn } from "../common/Motion";

/**
 * AppLayout Component
 * Wraps page content in FadeIn.
 * Desktop: Collapsible sidebar on the left.
 * Mobile (<768px): Drawer modal on hamburger press.
 */
export const AppLayout = ({
  children,
  title,
  subtitle,
  breadcrumb,
  currentRouteName,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.shell}>
        {/* Desktop Fixed Left Sidebar */}
        {isDesktop && (
          <Sidebar currentRouteName={currentRouteName} />
        )}

        {/* Mobile Slide-out Drawer */}
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
                <Sidebar
                  currentRouteName={currentRouteName}
                  onCloseMobileDrawer={() => setMobileDrawerVisible(false)}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Main Content Pane */}
        <View style={styles.mainContent}>
          <TopHeader
            title={title}
            subtitle={subtitle}
            breadcrumb={breadcrumb}
            showBack={showBack}
            onBack={onBack}
            rightAction={rightAction}
            onOpenMobileDrawer={() => setMobileDrawerVisible(true)}
            isDesktop={isDesktop}
          />

          <FadeIn style={styles.pageBody}>
            {children}
          </FadeIn>
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
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: colors.background,
  },
  pageBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.overlay,
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerSheet: {
    width: 250,
    backgroundColor: colors.surface,
    height: "100%",
  },
});
