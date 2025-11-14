import React, { createContext, useContext, useState } from "react";
import { login as apiLogin, logout as apiLogout } from "../services/auth";
import { setAccessToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function login(identifier, password, rememberMe) {
    const data = await apiLogin(identifier, password, rememberMe);
    setIsAuthenticated(true);
    return data;
  }

  async function logout() {
    await apiLogout();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
