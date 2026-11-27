import React, { createContext, useState, useEffect, useContext } from "react";
import {
  authApi,
  tokenStorage,
  urlStorage,
  getApiBaseUrl,
  setApiBaseUrl,
  setOnUnauthorizedCallback,
} from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setToken(null);
      setUser(null);
    });
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setLoading(true);
      const savedUrl = await urlStorage.getUrl();
      if (savedUrl) {
        setApiBaseUrl(savedUrl);
        setApiUrlState(savedUrl);
      }
      const savedToken = await tokenStorage.getToken();
      if (savedToken) {
        setToken(savedToken);
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            await tokenStorage.removeToken();
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          const status = err.status || err.response?.status;
          if (status === 401 || status === 404) {
            await tokenStorage.removeToken();
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await authApi.login(username, password);
      if (res.success && res.access_token) {
        await tokenStorage.saveToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.error || "Login failed." };
    } catch (err) {
      return { success: false, message: err.message || "Authentication failed." };
    }
  };

  const register = async (payload) => {
    try {
      const res = await authApi.register(payload);
      if (res.success && res.access_token) {
        await tokenStorage.saveToken(res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.error || "Registration failed." };
    } catch (err) {
      return { success: false, message: err.message || "Registration failed." };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn("Server logout error:", e);
    } finally {
      await tokenStorage.removeToken();
      setToken(null);
      setUser(null);
    }
  };

  const updateApiUrl = async (newUrl) => {
    setApiBaseUrl(newUrl);
    setApiUrlState(getApiBaseUrl());
    await urlStorage.saveUrl(getApiBaseUrl());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        role: user?.role,
        apiUrl,
        login,
        register,
        logout,
        restoreSession,
        updateApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
