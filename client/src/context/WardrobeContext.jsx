// Zwróć uwagę na dodane useEffect w klamrach
import React, { createContext, useState, useContext, useEffect } from "react"; 
import { useAuth } from "./AuthContext";

const WardrobeContext = createContext();

export const WardrobeProvider = ({ children }) => {
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchClothes = async () => {
    const token = sessionStorage.getItem("fitte_token");
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/wardrobe", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setClothes(data.clothes || []);
      }
    } catch (error) {
      console.error("Błąd podczas pobierania szafy:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      console.log("Wykryto zalogowanego użytkownika, pobieram szafę...");
      fetchClothes();
    } else {
      setClothes([]);
    }
  }, [user]);

  const addCloth = (item) => setClothes((prev) => [item, ...prev]);

  return (
    <WardrobeContext.Provider
      value={{ clothes, loading, fetchClothes, addCloth }}
    >
      {children}
    </WardrobeContext.Provider>
  );
};

export const useWardrobe = () => useContext(WardrobeContext);