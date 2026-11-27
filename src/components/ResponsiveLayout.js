import React from "react";
import { AppLayout } from "./layout/AppLayout";

/**
 * Backward-compatible ResponsiveLayout delegating to modern AppLayout
 */
export const ResponsiveLayout = (props) => {
  return <AppLayout {...props} />;
};

export default ResponsiveLayout;
