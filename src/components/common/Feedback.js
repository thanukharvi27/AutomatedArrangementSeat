import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, motion } from "../../theme/tokens";
import { prefersReducedMotion } from "./Motion";
import { ModalDialog } from "./ModalDialog";
import { Button } from "./Button";

export const FeedbackContext = createContext(null);

let feedbackInstance = null;

/**
 * Dispatches toast or alert through FeedbackContext singleton if mounted
 */
export const getFeedbackInstance = () => feedbackInstance;

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    feedbackInstance = {
      toast: addToast,
      confirm: showConfirm,
    };
    return () => {
      feedbackInstance = null;
    };
  }, []);

  const addToast = (message, variant = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showConfirm = ({
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
  }) => {
    setConfirmDialog({
      title,
      message,
      confirmText,
      cancelText,
      destructive,
      onConfirm: () => {
        setConfirmDialog(null);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(null);
        if (onCancel) onCancel();
      },
    });
  };

  return (
    <FeedbackContext.Provider value={{ toast: addToast, confirm: showConfirm }}>
      {children}

      {/* Toasts Container */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </View>

      {/* Confirmation Modal Dialog */}
      {confirmDialog && (
        <ModalDialog
          visible={Boolean(confirmDialog)}
          onClose={confirmDialog.onCancel}
          title={confirmDialog.title}
          maxWidth={420}
        >
          <Text style={styles.confirmMessage}>{confirmDialog.message}</Text>
          <View style={styles.confirmBtnRow}>
            <Button
              title={confirmDialog.cancelText}
              variant="secondary"
              onPress={confirmDialog.onCancel}
              style={{ flex: 1 }}
            />
            <Button
              title={confirmDialog.confirmText}
              variant={confirmDialog.destructive ? "danger" : "primary"}
              onPress={confirmDialog.onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </ModalDialog>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    return {
      toast: (msg) => console.log("Toast (no provider):", msg),
      confirm: (opts) => {
        if (opts.onConfirm) opts.onConfirm();
      },
    };
  }
  return ctx;
};

const ToastItem = ({ toast, onClose }) => {
  const slideAnim = useRef(new Animated.Value(prefersReducedMotion() ? 0 : 100)).current;

  useEffect(() => {
    if (!prefersReducedMotion()) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: motion.base,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }

    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (prefersReducedMotion()) {
      onClose();
    } else {
      Animated.timing(slideAnim, {
        toValue: 120,
        duration: motion.fast,
        useNativeDriver: Platform.OS !== "web",
      }).start(() => onClose());
    }
  };

  const getVariantStyles = () => {
    switch (toast.variant) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: colors.success,
          bg: colors.successLight,
          border: colors.successBorder,
        };
      case "error":
        return {
          icon: "alert-circle",
          color: colors.danger,
          bg: colors.dangerLight,
          border: colors.dangerBorder,
        };
      case "warning":
        return {
          icon: "warning",
          color: colors.warning,
          bg: colors.warningLight,
          border: colors.warningBorder,
        };
      case "info":
      default:
        return {
          icon: "information-circle",
          color: colors.primary,
          bg: colors.primaryLight,
          border: colors.primaryMuted,
        };
    }
  };

  const v = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.toastCard,
        { backgroundColor: colors.surface, borderColor: v.border },
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={[styles.toastIconBox, { backgroundColor: v.bg }]}>
        <Ionicons name={v.icon} size={18} color={v.color} />
      </View>

      <Text style={styles.toastText}>{toast.message}</Text>

      <Pressable onPress={handleClose} hitSlop={8} style={styles.toastClose}>
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 99999,
    gap: 8,
    maxWidth: 380,
    width: "100%",
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    ...shadows.popover,
  },
  toastIconBox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    lineHeight: 18,
  },
  toastClose: {
    padding: 4,
    marginLeft: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
});
