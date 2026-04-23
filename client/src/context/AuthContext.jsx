import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("fitte_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:5001/api/login", {
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

  const saveSession = (userData, token) => {
    localStorage.setItem("fitte_token", token);
    const processedUser = {
      ...userData,
      styleTags: JSON.parse(userData.styleTags),
      favoriteColors: JSON.parse(userData.favoriteColors)
    };
    localStorage.setItem("fitte_user", JSON.stringify(processedUser));
    setUser(processedUser);
  };
  const register = async (userData) => {
    try {
      const response = await fetch("http://localhost:5001/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("fitte_token", data.token);
        
        const loggedUser = {
          ...data.user,
          styleTags: JSON.parse(data.user.styleTags),
          favoriteColors: JSON.parse(data.user.favoriteColors)
        };

        localStorage.setItem("fitte_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
        return true;
      } else {
        alert(data.error || "Błąd rejestracji");
        return false;
      }
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Serwer nie odpowiada.");
      return false;
    }
  };

  const logout = () => {
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