import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { apiMessage } from "../services/api.js";
import { loadGuestProgress, GUEST_PROGRESS_KEY } from "../utils/progress.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data.user);
      return data.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const authenticate = useCallback(async (mode, values) => {
    setError("");
    try {
      const guestProgress = loadGuestProgress();
      await api.post(`/auth/${mode}`, { ...values, guestProgress });
      const { data } = await api.get("/auth/me");
      if (!data.data.user) {
        throw new Error("Your account was accepted, but this browser did not save the sign-in session. Please allow cookies for this site and try again.");
      }
      setUser(data.data.user);
      try { localStorage.removeItem(GUEST_PROGRESS_KEY); } catch { /* The server has synced this snapshot. */ }
      return data.data.user;
    } catch (requestError) {
      const message = requestError.response
        ? apiMessage(requestError, "Unable to sign in right now.")
        : requestError.message || "Unable to sign in right now.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    clearError: () => setError(""),
    login: values => authenticate("login", values),
    register: values => authenticate("register", values),
    logout,
    refreshUser
  }), [user, loading, error, authenticate, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
