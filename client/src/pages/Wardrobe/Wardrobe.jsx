import React, { useState } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import './Wardrobe.css';

const Wardrobe = () => {
  const { clothes } = useWardrobe();
  const [activeTab, setActiveTab] = useState('Wszystkie');

  const categories = ['Wszystkie', 'Góra', 'Dół', 'Sukienki', 'Obuwie'];

  const filteredClothes = activeTab === 'Wszystkie' 
    ? clothes 
    : clothes.filter(c => c.category === activeTab);

  return (
    <div className="wardrobe-content p-10">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="font-playfair text-4xl mb-2">Moja <span className="italic">Garderoba</span></h2>
          <p className="text-gray-400 text-sm">Zbiór Twoich wyselekcjonowanych ubrań</p>
        </div>
        <button className="bg-fitte-brown-dark text-white px-8 py-3 rounded-xl font-bold">+ Dodaj ubranie</button>
      </header>

      <div className="flex gap-10 border-b border-fitte-sand mb-10">
        {categories.map(cat => (
          <button 
            key={cat}
            className={`pb-4 text-sm font-medium transition-all ${activeTab === cat ? 'text-fitte-brown-dark border-b-2 border-fitte-brown-dark' : 'text-gray-400'}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {filteredClothes.map(item => (
          <div key={item.id} className="cloth-card">
            <div className="image-wrapper aspect-[3/4] rounded-2xl overflow-hidden mb-3 bg-fitte-beige">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            <h4 className="font-bold text-sm text-fitte-brown-dark">{item.name}</h4>
            <span className="text-xs text-gray-400 uppercase tracking-tighter">{item.color} • {item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wardrobe;