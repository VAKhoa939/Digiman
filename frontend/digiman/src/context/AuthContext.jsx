import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  login as apiLogin, logout as apiLogout, fetchUser as apiFetchUser,
  register as apiRegister
} from "../services/authService";
import { fetchMySubscription } from "../services/subscriptionService";
import { emitToast } from "../utils/toast";
import { mapReaderSubscription, mapUser } from "../utils/transform";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); 
  const [subscription, setSubscription] = useState(null);
  const [fetchUserLoading, setfetchUserLoading] = useState(true);
  const [isErrorFetchingUser, setIsErrorFetchingUser] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const fetchedData = await apiFetchUser();
      const mappedUser = mapUser(fetchedData);
      setUser(mappedUser);
      setIsAuthenticated(true);

      const fetchedSubscription = await fetchMySubscription();
      setSubscription(mapReaderSubscription(fetchedSubscription));

      console.log("fetchUser successful", mappedUser, fetchedSubscription);

      return true;
    } catch (err) {
      setUser(null);
      setSubscription(null);
      setIsAuthenticated(false);
      setIsErrorFetchingUser(true);
      console.error("fetchUser failed\nMessage: " + err.message, err);
      return false;
    } finally {
      setfetchUserLoading(false);
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
      console.error("Login failed\nMessage: " + err.message, err);
      emitToast('error', 'Login failed. Please try again.');
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
      console.error("Registration failed\nMessage: " + err.message, err);
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
      setSubscription(null);
      setIsAuthenticated(false);
      emitToast('info', 'You have been logged out.');
    }
  }, [fetchUser]);

  const refetchSubscription = useCallback(async () => {
    try {
      const newSubscription = await fetchMySubscription();
      const mappedSubscription = mapReaderSubscription(newSubscription);
      setSubscription(mappedSubscription);
      console.log("refetchSubscription successful", mappedSubscription);
      return mappedSubscription;
    } catch (err) {
      console.error("refetchSubscription failed\nMessage: " + err.message, err);
      return subscription;
    }
  }, [subscription]);
  
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
