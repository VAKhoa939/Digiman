import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  login as apiLogin, logout as apiLogout, fetchUser as apiFetchUser,
  register as apiRegister
} from "../services/auth";
import { fetchMySubscription } from "../services/subscriptionService";
import { emitToast } from "../utils/toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); 
  const [subscription, setSubscription] = useState(null);
  const [fetchUserLoading, setfetchUserLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await apiFetchUser();
      setUser(data);
      setIsAuthenticated(true);

      const subscription = await fetchMySubscription();
      setSubscription(subscription);

      console.log("fetchUser successful", data, subscription);

      return true;
    } catch (err) {
      setUser(null);
      setSubscription(null);
      setIsAuthenticated(false);
      console.error("fetchUser failed\nMessage: " + err.message);
      return false;
    }
  }, []);

  const login = useCallback(async (identifier, password, remember) => {
    try {
      const data = await apiLogin(identifier, password, remember);
      if (!data) return false;
      const result = await fetchUser();
      if (result) {
        emitToast('success', 'Login successful');
        return true;
      }
      else {
        emitToast('error', 'Login failed. Please try again.');
        return false;
      }
    } catch (err) {
      console.error("Login failed\nMessage: " + err.message);
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Login failed: ${err.message}` } })); } catch (e) { /* fallback */ }
      return false;
    }
  }, [fetchUser]);

  const register = useCallback(async (username, email, password, remember) => {
    try {
      const data = await apiRegister(username, email, password, remember);
      if (!data) return false;
      const result = await fetchUser();
      if (result) {
        emitToast('success', 'Registration successful');
        return true;
      }
      else {
        emitToast('error', 'Registration failed. Please try again.');
        return false;
      }
      return false;
    } catch (err) {
      emitToast('error', 'Registration failed. Please try again.');
      return false;
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
      emitToast('info', 'You have been logged out.');
    }
  }, [fetchUser]);

  const refetchSubscription = useCallback(async () => {
    try {
      const subscription = await fetchMySubscription();
      setSubscription(subscription);
      console.log("refetchSubscription successful", subscription);
    } catch (err) {
      console.error("refetchSubscription failed\nMessage: " + err.message);
    }
  }, []);
  
  // Auto-login on page refresh (using refresh cookie)
  useEffect(() => {
    async function tryAutoLogin() {
        if (!navigator.onLine) {
        console.log("Auto-login skipped: User is offline.");
        setfetchUserLoading(false); // Mark auto-login as complete
        return;
      }
      
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
      user, isAuthenticated, fetchUserLoading, subscription,
      login, logout, register, refetchSubscription
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
