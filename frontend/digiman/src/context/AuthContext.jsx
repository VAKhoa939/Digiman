import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  login as apiLogin, logout as apiLogout, fetchUser as apiFetchUser,
  register as apiRegister
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); 
  const [fetchUserLoading, setfetchUserLoading] = useState(true);

  async function fetchUser() {
    try {
      const data = await apiFetchUser();
      setUser(data);
      setIsAuthenticated(true);
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
    }
  }

  async function login(identifier, password, rememberMe) {
    const data = await apiLogin(identifier, password, rememberMe);
    await fetchUser();
    return data;
  }

  async function register(username, email, password, rememberMe) {
    const data = await apiRegister(username, email, password, rememberMe);
    await fetchUser();
    return data;
  }

  async function logout() {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Logout API call failed, clearing local auth state', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }
  
  // Auto-login on page refresh (using refresh cookie)
  useEffect(() => {
    async function tryAutoLogin() {
      try {
        // Attempt to refresh token by calling any protected endpoint
        await fetchUser();
        console.log("Auto-login successful");
      } catch (err) {
        console.log("Auto-login unsuccessful\nMessage: " + err.message);
      } finally {
        setfetchUserLoading(false);
      }
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
