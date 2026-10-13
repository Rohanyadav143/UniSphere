import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_KEY = "unisphere-theme";
const LEGACY_THEME_KEY = "pathway-theme";

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) return stored === "light" ? "light" : "dark";
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy !== null) {
      localStorage.setItem(THEME_KEY, legacy);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return legacy === "light" ? "light" : "dark";
    }
  } catch {
    return "dark";
  }
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const value = useMemo(() => ({
    theme,
    toggleTheme() {
      setTheme(previous => {
        const next = previous === "dark" ? "light" : "dark";
        try { localStorage.setItem(THEME_KEY, next); } catch { /* Theme still works for this visit. */ }
        return next;
      });
    }
  }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
