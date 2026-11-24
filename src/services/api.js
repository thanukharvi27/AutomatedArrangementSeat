import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

let generatedNetworkConfig = null;
try {
  generatedNetworkConfig = require("../config/network-config.json");
} catch {}

export const HOST_LAN_IP = generatedNetworkConfig?.hostLanIp || "172.17.4.15";

export const PRESET_HOSTS = [
  { label: "Localhost (Browser)", url: "http://localhost:5000/api", desc: "For web browser preview (localhost:8081)" },
  { label: "Wi-Fi LAN (Phone)", url: `http://${HOST_LAN_IP}:5000/api`, desc: `For physical phone on same Wi-Fi (${HOST_LAN_IP})` },
  { label: "Android Emulator", url: "http://10.0.2.2:5000/api", desc: "For Android Studio emulator" },
];

export const getAutoDetectedHost = () => {
  // 1. Web preview in browser: use actual hostname
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window?.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:5000/api";
      }
      return `http://${hostname}:5000/api`;
    }
    return "http://localhost:5000/api";
  }

  // 2. Physical Android or iOS device running via Expo Go:
  // Expo provides the host PC's IP via hostUri or debuggerHost!
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:5000/api`;
    }
  }

  // 3. Android Emulator (not a physical device): uses 10.0.2.2 loopback
  if (Platform.OS === "android" && !Constants.isDevice) {
    return "http://10.0.2.2:5000/api";
  }

  // 4. Default fallback to dynamic LAN IP
  const activeIp = generatedNetworkConfig?.hostLanIp || HOST_LAN_IP;
  return `http://${activeIp}:5000/api`;
};

const DEFAULT_URL = getAutoDetectedHost();
let currentBaseUrl = DEFAULT_URL;

export const setApiBaseUrl = (url) => {
  if (!url) return;
  const clean = url.trim().replace(/\/+$/, "");
  currentBaseUrl = clean.endsWith("/api") ? clean : `${clean}/api`;
  api.defaults.baseURL = currentBaseUrl;
};

export const getApiBaseUrl = () => currentBaseUrl;

const api = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "examease_auth_token";
let inMemoryToken = null;

export const tokenStorage = {
  getToken: async () => {
    try {
      if (inMemoryToken) return inMemoryToken;
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          const t = localStorage.getItem(TOKEN_KEY);
          if (t) {
            inMemoryToken = t;
            return t;
          }
        }
        return null;
      }
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      if (t) inMemoryToken = t;
      return t;
    } catch {
      return inMemoryToken;
    }
  },
  saveToken: async (token) => {
    inMemoryToken = token;
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined" && token) {
          localStorage.setItem(TOKEN_KEY, String(token));
        }
        return;
      }
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, String(token));
      }
    } catch (e) {
      console.warn("Token storage save error:", e);
    }
  },
  removeToken: async () => {
    inMemoryToken = null;
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn("Token storage remove error:", e);
    }
  },
};

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    let message =
      error.response?.data?.error ||
      error.response?.data?.message;

    if (!message) {
      if (
        error.message === "Network Error" ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED"
      ) {
        message = `Cannot connect to server at ${currentBaseUrl}.\n\n• Make sure Flask backend is running on your PC ('python run.py')\n• For Android Emulator: tap 'Android Emulator' (10.0.2.2)\n• For physical phone: tap 'Wi-Fi LAN' (${HOST_LAN_IP}) and verify phone is on same Wi-Fi.`;
      } else {
        message = error.message || "An unexpected error occurred.";
      }
    }
    return Promise.reject(new Error(message));
  }
);

/**
 * Pings backend health endpoint to verify connectivity
 */
export const pingBackend = async (candidateUrl) => {
  const target = candidateUrl || currentBaseUrl;
  const clean = target.trim().replace(/\/+$/, "");
  const healthUrl = clean.endsWith("/api") ? `${clean}/health` : `${clean}/api/health`;

  try {
    const res = await axios.get(healthUrl, { timeout: 3500 });
    if (res.status === 200) {
      return { ok: true, data: res.data, url: clean };
    }
    return { ok: false, error: `Status ${res.status}`, url: clean };
  } catch (err) {
    return { ok: false, error: err.message, url: clean };
  }
};

export const authApi = {
  login: (username, password) => api.post("/auth/login", { username, password }),
  register: (payload) => api.post("/auth/register", payload),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const studentApi = {
  getAll: (params) => api.get("/students", { params }),
  getStudent: (id) => api.get(`/students/${id}`),
  create: (data) => api.post("/students", data),
  update: (id, data) => api.patch(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkCreate: (data) => api.post("/students/bulk", data),
};

export const examApi = {
  getAll: (params) => api.get("/exams", { params }),
  create: (data) => api.post("/exams", data),
  getExam: (id) => api.get(`/exams/${id}`),
  registerStudents: (id, payload) => api.post(`/exams/${id}/register-students`, payload || {}),
};

export const hallApi = {
  getAll: (params) => api.get("/halls", { params }),
  getHall: (id) => api.get(`/halls/${id}`),
  create: (data) => api.post("/halls", data),
  delete: (id) => api.delete(`/halls/${id}`),
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
  getDashboard: () => api.get("/student/dashboard"),
  getProfile: () => api.get("/student/me/profile"),
  updateProfile: (data) => api.patch("/student/me/profile", data),
  getExams: () => api.get("/student/me/exams"),
  findSeat: (examId) => api.get(`/student/me/exams/${examId}/seating`),
  publicFindSeat: (usn) => api.get(`/student-portal/find-seat`, { params: { usn } }),
};

export const facultyApi = {
  getAll: (params) => api.get("/faculty", { params }),
  getFaculty: (id) => api.get(`/faculty/${id}`),
  create: (data) => api.post("/faculty", data),
  update: (id, data) => api.patch(`/faculty/${id}`, data),
  delete: (id) => api.delete(`/faculty/${id}`),
  getDuties: (params) => api.get("/faculty/invigilation", { params }),
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
  create: (data) => api.post("/departments", data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export default api;
