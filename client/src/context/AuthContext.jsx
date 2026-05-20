import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { API_BASE_URL } from "../config";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  const resetInactivityTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log("Sesja wygasła z powodu braku aktywności.");
        logout();
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    if (user) {
      const events = [
        "mousedown",
        "keydown",
        "scroll",
        "touchstart",
        "mousemove",
      ];

      events.forEach((event) =>
        window.addEventListener(event, resetInactivityTimer),
      );
      resetInactivityTimer();

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach((event) =>
          window.removeEventListener(event, resetInactivityTimer),
        );
      };
    }
  }, [user]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("fitte_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const saveSession = (userData, token) => {
    sessionStorage.setItem("fitte_token", token);
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
    sessionStorage.setItem("fitte_user", JSON.stringify(processedUser));
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
        return { success: false, error: data.error || "Błąd rejestracji" }; // Zwracamy błąd
      }
    } catch (error) {
      return { success: false, error: "Serwer nie odpowiada." };
    }
  };

  const logout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    sessionStorage.removeItem("fitte_token");
    sessionStorage.removeItem("fitte_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, logout, login, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
