import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 

 const register = async (formData) => {
  try {
    const response = await fetch('http://localhost:5001/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) throw new Error('Błąd rejestracji');

    const savedUser = await response.json();
    
    const processedUser = {
      ...savedUser,
      styleTags: JSON.parse(savedUser.styleTags),
      favoriteColors: JSON.parse(savedUser.favoriteColors)
    };

    setUser(processedUser);
  } catch (error) {
    console.error("Błąd połączenia z backendem:", error);
    alert("Serwer nie odpowiada. Upewnij się, że backend jest włączony!");
  }
};
  return (
    <AuthContext.Provider value={{ user, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);