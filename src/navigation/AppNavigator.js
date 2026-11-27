import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { colors, textStyles } from "../theme/tokens";

import LoginScreen from "../screens/auth/LoginScreen";

import StudentHomeScreen from "../screens/student/StudentHomeScreen";
import StudentExamsScreen from "../screens/student/StudentExamsScreen";
import FindSeatScreen from "../screens/student/FindSeatScreen";
import StudentProfileScreen from "../screens/student/StudentProfileScreen";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import StudentManagementScreen from "../screens/admin/StudentManagementScreen";
import DepartmentManagementScreen from "../screens/admin/DepartmentManagementScreen";
import ExamManagementScreen from "../screens/admin/ExamManagementScreen";
import HallManagementScreen from "../screens/admin/HallManagementScreen";
import SeatingGeneratorScreen from "../screens/admin/SeatingGeneratorScreen";
import SeatingPlanDetailScreen from "../screens/admin/SeatingPlanDetailScreen";
import FacultyManagementScreen from "../screens/admin/FacultyManagementScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";
import SettingsScreen from "../screens/admin/SettingsScreen";

import FacultyDutiesScreen from "../screens/faculty/FacultyDutiesScreen";
import AdminFacultyDutiesScreen from "../screens/admin/FacultyDutiesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIcon = ({ name, label, focused }) => {
  const color = focused ? colors.primary : colors.textSecondary;

  return (
    <View style={navStyles.tabItem}>
      <Ionicons name={name} size={20} color={color} />
      <Text style={[navStyles.tabLabel, { color, fontWeight: focused ? "700" : "500" }]}>
        {label}
      </Text>
    </View>
  );
};

const StudentTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: navStyles.tabBar }}>
    <Tab.Screen
      name="StudentHome"
      component={StudentHomeScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "home" : "home-outline"} label="Home" focused={focused} /> }}
    />
    <Tab.Screen
      name="StudentExams"
      component={StudentExamsScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "calendar" : "calendar-outline"} label="My Exams" focused={focused} /> }}
    />
    <Tab.Screen
      name="FindSeat"
      component={FindSeatScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "search" : "search-outline"} label="Find Seat" focused={focused} /> }}
    />
    <Tab.Screen
      name="StudentProfile"
      component={StudentProfileScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "person" : "person-outline"} label="Profile" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: navStyles.tabBar }}>
    <Tab.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "grid" : "grid-outline"} label="Dashboard" focused={focused} /> }}
    />
    <Tab.Screen
      name="Management"
      component={StudentManagementScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "people" : "people-outline"} label="Students" focused={focused} /> }}
    />
    <Tab.Screen
      name="SeatingPlans"
      component={SeatingGeneratorScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "layers" : "layers-outline"} label="Seating" focused={focused} /> }}
    />
    <Tab.Screen
      name="AdminReports"
      component={ReportsScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "bar-chart" : "bar-chart-outline"} label="Reports" focused={focused} /> }}
    />
    <Tab.Screen
      name="AdminProfile"
      component={StudentProfileScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "person" : "person-outline"} label="Profile" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const FacultyTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: navStyles.tabBar }}>
    <Tab.Screen
      name="FacultyDuties"
      component={FacultyDutiesScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "shield-checkmark" : "shield-checkmark-outline"} label="Duties" focused={focused} /> }}
    />
    <Tab.Screen
      name="FacultyProfile"
      component={StudentProfileScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "person" : "person-outline"} label="Profile" focused={focused} /> }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    // Reset navigation history on every auth change so login lands on the correct home screen
    <NavigationContainer key={user ? (user.role || "user") : "guest"}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        /* Guests start on PublicFindSeat; logged-in users start on their first screen (AdminRoot, etc.) */
        initialRouteName={!user ? "PublicFindSeat" : undefined}
      >
        {!user ? (
          <>
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (user.role || "").toUpperCase() === "ADMIN" ? (
          <>
            <Stack.Screen name="AdminRoot" component={AdminTabs} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
            <Stack.Screen name="FacultyManagement" component={FacultyManagementScreen} />
            <Stack.Screen name="DepartmentManagement" component={DepartmentManagementScreen} />
            <Stack.Screen name="ExamManagement" component={ExamManagementScreen} />
            <Stack.Screen name="HallManagement" component={HallManagementScreen} />
            <Stack.Screen name="SeatingPlans" component={SeatingGeneratorScreen} />
            <Stack.Screen name="SeatingPlanDetail" component={SeatingPlanDetailScreen} />
            <Stack.Screen name="FacultyDuties" component={AdminFacultyDutiesScreen} />
            <Stack.Screen name="AdminReports" component={ReportsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AdminProfile" component={StudentProfileScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        ) : (user.role || "").toUpperCase() === "FACULTY" ? (
          <>
            <Stack.Screen name="FacultyRoot" component={FacultyTabs} />
            <Stack.Screen name="FacultyDuties" component={FacultyDutiesScreen} />
            <Stack.Screen name="SeatingPlanDetail" component={SeatingPlanDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AdminProfile" component={StudentProfileScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentRoot" component={StudentTabs} />
            <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
            <Stack.Screen name="StudentExams" component={StudentExamsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
            <Stack.Screen name="AdminProfile" component={StudentProfileScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
            <Stack.Screen name="FindSeat" component={FindSeatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const navStyles = StyleSheet.create({
  tabBar: {
    height: 60,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    ...textStyles.caption,
    fontSize: 11,
    marginTop: 2,
  },
});