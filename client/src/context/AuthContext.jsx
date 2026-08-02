import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { API_BASE_URL } from "../config";

const AuthContext = createContext();

const isStandalonePWA = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator?.standalone === true ||
    document.referrer.includes("android-app://")
  );
};

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (e) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  const resetInactivityTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (user && !isStandalonePWA()) {
      timeoutRef.current = setTimeout(() => {
        console.log("Sesja w przeglądarce wygasła z powodu braku aktywności.");
        logout();
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    if (user && !isStandalonePWA()) {
      const events = [
        "mousedown",
        "keydown",
        "scroll",
        "touchstart",
        "mousemove",
      ];

      events.forEach((event) =>
        window.addEventListener(event, resetInactivityTimer)
      );
      resetInactivityTimer();

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach((event) =>
          window.removeEventListener(event, resetInactivityTimer)
        );
      };
    }
  }, [user]);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem("fitte_token");
      const savedUser = localStorage.getItem("fitte_user");

      if (token && savedUser && !isTokenExpired(token)) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Błąd odczytu fitte_user z localStorage:", e);
          logout();
        }
      } else {
        if (token || savedUser) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const saveSession = (userData, token) => {
    localStorage.setItem("fitte_token", token);
    const processedUser = {
      ...userData,
      styleTags:
        typeof userData.styleTags === "string"
          ? JSON.parse(userData.styleTags)
          : userData.styleTags,
      favoriteColors:
        typeof userData.favoriteColors === "string"
          ? JSON.parse(userData.favoriteColors)
          : userData.favoriteColors,
    };
    localStorage.setItem("fitte_user", JSON.stringify(processedUser));
    setUser(processedUser);
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        saveSession(data.user, data.token);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: "Błąd połączenia z serwerem." };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        saveSession(data.user, data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Błąd rejestracji" };
      }
    } catch (error) {
      return { success: false, error: "Serwer nie odpowiada." };
    }
  };

  const logout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    localStorage.removeItem("fitte_token");
    localStorage.removeItem("fitte_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, logout, login, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);