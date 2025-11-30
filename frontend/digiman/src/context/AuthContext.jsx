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
      console.log("fetchUser successful", data);
      return true;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      console.error("fetchUser failed\nMessage: " + err.message);
      return false;
    }
  }, []);

  const login = useCallback(async (identifier, password, remember) => {
    try {
      const data = await apiLogin(identifier, password, remember);
      if (data) {
        const result = await fetchUser();
        if (result) {
          console.log("Login successful");
          try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Login successful' } })); } catch (e) { /* fallback */ }
          return true;
        }
        else {
          console.log("Login failed");
          try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'Login failed. Please try again.' } })); } catch (e) { /* fallback */ }
          return false;
        }
      }
      return false;
    } catch (err) {
      console.error("Login failed\nMessage: " + err.message);
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Login failed: ${err.message}` } })); } catch (e) { /* fallback */ }
      return false;
    }
  }, [fetchUser]);

  const register = useCallback(async (username, email, password, remember) => {
    try {
      const data = await apiRegister(username, email, password, remember);
      if (data) {
        const result = await fetchUser();
        if (result) {
          console.log("Registration successful");
          try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Registration successful' } })); } catch (e) { /* fallback */ }
          return true;
        }
        else {
          console.log("Registration failed");
          try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: 'Registration failed. Please try again.' } })); } catch (e) { /* fallback */ }
          return false;
        }
      }
      return false;
    } catch (err) {
      console.error("Registration failed\nMessage: " + err.message);
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'error', message: `Registration failed: ${err.message}` } })); } catch (e) { /* fallback */ }
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
      console.log("Logout successful");
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'You have been logged out.' } })); } catch (e) { /* fallback */ }
    }
  }, [fetchUser]);
  
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
