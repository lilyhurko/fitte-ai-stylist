import React, { createContext, useState, useContext } from 'react';

const WardrobeContext = createContext();

export const WardrobeProvider = ({ children }) => {
  const [clothes, setClothes] = useState([
    { id: 1, name: "Lniana Marynarka", category: "Góra", color: "Beż", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500" },
    { id: 2, name: "Szerokie Spodnie", category: "Dół", color: "Czerń", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=500" },
    { id: 3, name: "Jedwabna Sukienka", category: "Sukienki", color: "Zieleń", image: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=500" }
  ]);

  const addCloth = (item) => setClothes([...clothes, { ...item, id: Date.now() }]);

  return (
    <WardrobeContext.Provider value={{ clothes, addCloth }}>
      {children}
    </WardrobeContext.Provider>
  );
};

export const useWardrobe = () => useContext(WardrobeContext);