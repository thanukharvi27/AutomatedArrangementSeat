import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const getAutoDetectedHost = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:5000/api`;
    }
  }
  return Platform.OS === "android" 
    ? "http://10.0.2.2:5000/api" 
    : "http://localhost:5000/api";
};

const DEFAULT_URL = getAutoDetectedHost();

let currentBaseUrl = DEFAULT_URL;

export const setApiBaseUrl = (url) => {
  currentBaseUrl = url.endsWith("/api") ? url : `${url}/api`;
  api.defaults.baseURL = currentBaseUrl;
};

export const getApiBaseUrl = () => currentBaseUrl;

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "examease_auth_token";

export const tokenStorage = {
  getToken: async () => {
    try {
      if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  saveToken: async (token) => {
    try {
      if (Platform.OS === "web") localStorage.setItem(TOKEN_KEY, token);
      else await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.warn("Error storing token:", e);
    }
  },
  removeToken: async () => {
    try {
      if (Platform.OS === "web") localStorage.removeItem(TOKEN_KEY);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn("Error clearing token:", e);
    }
  },
};

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data === "object" && data.data === undefined) {
      data.data = data;
    }
    return data;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (error.message === "Network Error" 
        ? `Cannot connect to server at ${currentBaseUrl}. Ensure backend is running.` 
        : error.message);
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (username, password) => api.post("/auth/login", { username, password }),
  register: (payload) => api.post("/auth/register", payload),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const studentApi = {
  getAll: (params) => api.get("/students", { params }),
  create: (data) => api.post("/students", data),
  delete: (id) => api.delete(`/students/${id}`),
};

export const examApi = {
  getAll: (params) => api.get("/exams", { params }),
  create: (data) => api.post("/exams", data),
  registerStudents: (id, payload) => api.post(`/exams/${id}/register-students`, payload),
};

export const hallApi = {
  getAll: (params) => api.get("/halls", { params }),
  create: (data) => api.post("/halls", data),
  generateSeats: (id) => api.post(`/halls/${id}/generate-seats`),
};

export const seatingApi = {
  getPlans: () => api.get("/seating-plans"),
  generate: (payload) => api.post("/seating-plans/generate", payload),
  getPlan: (id) => api.get(`/seating-plans/${id}`),
  publish: (id) => api.post(`/seating-plans/${id}/publish`),
  reassign: (planId, allocId, targetSeatId, reason) => 
    api.patch(`/seating-plans/${planId}/allocations/${allocId}/reassign`, { target_seat_id: targetSeatId, reason }),
};

export const studentPortalApi = {
  getProfile: () => api.get("/student/me/profile"),
  updateProfile: (data) => api.patch("/student/me/profile", data),
  getExams: () => api.get("/student/me/exams"),
  findSeat: (examId) => api.get(`/student/me/exams/${examId}/seating`),
};

export const facultyApi = {
  getAll: (params) => api.get("/faculty", { params }),
  create: (data) => api.post("/faculty", data),
  getDuties: () => api.get("/faculty/invigilation"),
  assignDuty: (payload) => api.post("/faculty/invigilation", payload),
  cancelDuty: (id) => api.delete(`/faculty/invigilation/${id}`),
  getMyDuties: () => api.get("/faculty/me/duties"),
};

export const reportApi = {
  getDashboard: () => api.get("/reports/dashboard"),
  getOccupancy: () => api.get("/reports/occupancy"),
};

export const departmentApi = {
  getAll: () => api.get("/departments"),
};

export default api;
