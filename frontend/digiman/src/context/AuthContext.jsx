import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  login as apiLogin, logout as apiLogout, fetchUser as apiFetchUser,
  register as apiRegister
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); 
  const [fetchUserLoading, setfetchUserLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await apiFetchUser();
      setUser(data);
      setIsAuthenticated(true);
      console.log("fetchUser successful");
      return true;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      console.log("fetchUser failed\nMessage: " + err.message);
      return false;
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const data = await apiLogin(username, password);
      await fetchUser();
      return data;
    } catch (err) {
      throw err;
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Logout API call failed, clearing local auth state', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [fetchUser]);

  const register = useCallback(async (username, email, password) => {
    try {
      const data = await apiRegister(username, email, password);
      await fetchUser();
      return data;
    } catch (err) {
      throw err;
    }
  }, [fetchUser]);
  
  // Auto-login on page refresh (using refresh cookie)
  useEffect(() => {
    async function tryAutoLogin() {
      // Attempt to refresh token by calling any protected endpoint
      const result = await fetchUser();
      if (result) console.log("Auto-login successful");
      else console.log("Auto-login failed");
      setfetchUserLoading(false);
    }
    tryAutoLogin();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, fetchUserLoading, login, logout, register
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
