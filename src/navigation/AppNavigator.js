import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";

import SplashScreen from "../screens/auth/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

import StudentHomeScreen from "../screens/student/StudentHomeScreen";
import StudentExamsScreen from "../screens/student/StudentExamsScreen";
import FindSeatScreen from "../screens/student/FindSeatScreen";
import StudentProfileScreen from "../screens/student/StudentProfileScreen";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import StudentManagementScreen from "../screens/admin/StudentManagementScreen";
import ExamManagementScreen from "../screens/admin/ExamManagementScreen";
import HallManagementScreen from "../screens/admin/HallManagementScreen";
import SeatingGeneratorScreen from "../screens/admin/SeatingGeneratorScreen";
import SeatingPlanDetailScreen from "../screens/admin/SeatingPlanDetailScreen";
import FacultyManagementScreen from "../screens/admin/FacultyManagementScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";

import FacultyDutiesScreen from "../screens/faculty/FacultyDutiesScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIcon = ({ type, name, label, focused }) => {
  const activeColor = "#2563eb";
  const inactiveColor = "#64748b";
  const color = focused ? activeColor : inactiveColor;

  return (
    <View style={navStyles.tabItem}>
      {type === "material" ? (
        <MaterialCommunityIcons name={name} size={22} color={color} />
      ) : (
        <Ionicons name={name} size={22} color={color} />
      )}
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
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon type="material" name={focused ? "seat" : "seat-outline"} label="Find Seat" focused={focused} /> }}
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
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "people" : "people-outline"} label="Management" focused={focused} /> }}
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
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "shield-checkmark" : "shield-checkmark-outline"} label="Profile" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const FacultyTabs = () => (
  <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: navStyles.tabBar }}>
    <Tab.Screen
      name="FacultyDuties"
      component={FacultyDutiesScreen}
      options={{ tabBarIcon: ({ focused }) => <TabBarIcon name={focused ? "person" : "person-outline"} label="Duties" focused={focused} /> }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        ) : (user.role || "").toUpperCase() === "ADMIN" ? (
          <>
            <Stack.Screen name="AdminRoot" component={AdminTabs} />
            <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
            <Stack.Screen name="ExamManagement" component={ExamManagementScreen} />
            <Stack.Screen name="HallManagement" component={HallManagementScreen} />
            <Stack.Screen name="FacultyManagement" component={FacultyManagementScreen} />
            <Stack.Screen name="SeatingPlans" component={SeatingGeneratorScreen} />
            <Stack.Screen name="SeatingPlanDetail" component={SeatingPlanDetailScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        ) : (user.role || "").toUpperCase() === "FACULTY" ? (
          <>
            <Stack.Screen name="FacultyRoot" component={FacultyTabs} />
            <Stack.Screen name="SeatingPlanDetail" component={SeatingPlanDetailScreen} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentRoot" component={StudentTabs} />
            <Stack.Screen name="PublicFindSeat" component={FindSeatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const navStyles = StyleSheet.create({
  tabBar: {
    height: 64,
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
});
