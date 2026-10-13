import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import api, { apiMessage } from "../services/api.js";
import { contentKey, GUEST_PROGRESS_KEY, loadGuestProgress } from "../utils/progress.js";

const ProgressContext = createContext(null);

function persistGuest(ids) {
  try {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

export function ProgressProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [completed, setCompleted] = useState(() => new Set(loadGuestProgress()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    if (!user) {
      setCompleted(new Set(loadGuestProgress()));
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    api.get("/progress")
      .then(({ data }) => {
        if (active) setCompleted(new Set(data.data.map(row => contentKey(row.contentType, row.contentId))));
      })
      .catch(requestError => { if (active) setError(apiMessage(requestError, "Unable to load your progress.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading]);

  const toggle = useCallback(async (contentType, contentId) => {
    const key = contentKey(contentType, contentId);
    const wasComplete = completed.has(key);
    const next = new Set(completed);
    if (wasComplete) next.delete(key);
    else next.add(key);
    setCompleted(next);
    setError("");
    if (!user) {
      if (!persistGuest(next)) {
        setCompleted(completed);
        setError("Progress could not be saved in this browser.");
        throw new Error("Progress could not be saved in this browser.");
      }
      return;
    }
    try {
      await api.post("/progress", { contentType, contentId, completed: !wasComplete });
    } catch (requestError) {
      setCompleted(completed);
      const message = apiMessage(requestError, "Unable to save progress. Please try again.");
      setError(message);
      throw new Error(message);
    }
  }, [completed, user]);

  const value = useMemo(() => ({ completed, loading, error, toggle }), [completed, loading, error, toggle]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  return useContext(ProgressContext);
}
