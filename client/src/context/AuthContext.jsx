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

const clearPrivateApiCache = async () => {
  if ("caches" in window) {
    await window.caches.delete("fitte-user-data");
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
    const initAuth = async () => {
      clearPrivateApiCache().catch((error) => {
        console.error("Nie udało się usunąć starego cache PWA:", error);
      });

      localStorage.removeItem("fitte_token");
      localStorage.removeItem("fitte_user");

      try {
        const response = await fetch(`${API_BASE_URL}/session`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          saveSession(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Nie udało się sprawdzić sesji:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const saveSession = (userData) => {
    const { password: _password, ...safeUserData } = userData;

    const processedUser = {
      ...safeUserData,
      styleTags:
        typeof safeUserData.styleTags === "string"
          ? JSON.parse(safeUserData.styleTags)
          : safeUserData.styleTags,
      favoriteColors:
        typeof safeUserData.favoriteColors === "string"
          ? JSON.parse(safeUserData.favoriteColors)
          : safeUserData.favoriteColors,
    };

    setUser(processedUser);
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        saveSession(data.user);
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
        credentials: "include",
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        saveSession(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Błąd rejestracji" };
      }
    } catch (error) {
      return { success: false, error: "Serwer nie odpowiada." };
    }
  };

  const logout = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    localStorage.removeItem("fitte_token");
    localStorage.removeItem("fitte_user");

    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Nie udało się zakończyć sesji na serwerze:", error);
    }

    clearPrivateApiCache().catch((error) => {
      console.error("Nie udało się wyczyścić prywatnego cache:", error);
    });

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, logout, login, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
