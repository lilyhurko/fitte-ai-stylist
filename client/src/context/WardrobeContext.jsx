import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { API_BASE_URL } from "../config";
import { useAuth } from "./AuthContext";
import { useNotification } from "./NotificationContext";

const WardrobeContext = createContext();

export const WardrobeProvider = ({ children }) => {
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  const fetchClothes = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się pobrać garderoby.");
      }

      setClothes(data.clothes || []);
    } catch (error) {
      console.error("Błąd podczas pobierania szafy:", error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const deleteCloth = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się usunąć ubrania.");
      }

      setClothes((current) => current.filter((item) => item.id !== id));

      showSuccess("Ubranie zostało usunięte z garderoby.");
      return true;
    } catch (error) {
      console.error("Błąd podczas usuwania ubrania:", error);
      showError(error.message);
      return false;
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (user) {
        fetchClothes();
      } else {
        setClothes([]);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchClothes, user]);

  const addCloth = (item) => {
    setClothes((current) => [item, ...current]);
    showSuccess("Ubranie zostało dodane do garderoby.");
  };

  return (
    <WardrobeContext.Provider
      value={{
        clothes,
        loading,
        fetchClothes,
        addCloth,
        deleteCloth,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
};

export const useWardrobe = () => useContext(WardrobeContext);
