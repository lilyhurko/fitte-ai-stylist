import React, { useState, useEffect } from "react";
import { useWardrobe } from "../../context/WardrobeContext";
import AddItemModal from "../../components/Wardrobe/AddItemModal";
import { Trash2, Loader2, Plus } from 'lucide-react'; 
import "./Wardrobe.css";
import { API_BASE_URL } from '../../config';

const Wardrobe = () => {
  const { clothes, deleteCloth, loading, fetchClothes } = useWardrobe();
  const [activeTab, setActiveTab] = useState("Wszystkie");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = ["Wszystkie", "Góra", "Dół", "Sukienki", "Obuwie"];

  useEffect(() => {
    fetchClothes();
  }, []);

  const filteredClothes =
    activeTab === "Wszystkie"
      ? clothes
      : clothes.filter((c) => c.category === activeTab);

  const handleItemAdded = async (aiResult) => {
    const token = sessionStorage.getItem("fitte_token");

    try {
      const formData = new FormData();
      formData.append("image", aiResult.imageBlob); 
      formData.append("name", aiResult.name);
      formData.append("category", aiResult.category);
      formData.append("style", aiResult.style);

      const response = await fetch(`${API_BASE_URL}/wardrobe/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchClothes();
        setIsModalOpen(false);
      } else {
        console.error("Błąd zapisu w MongoDB");
      }
    } catch (error) {
      console.error("Błąd podczas dodawania ubrania:", error);
    }
  };

  return (
    <div className="wardrobe-content p-10">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="font-playfair text-4xl mb-2">
            Moja <span className="italic">Garderoba</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Twoja cyfrowa szafa sterowana przez AI
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-fitte-brown-dark text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Dodaj ubranie
        </button>
      </header>

      <div className="flex gap-10 border-b border-fitte-sand mb-10 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`pb-4 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === cat
                ? "text-fitte-brown-dark border-b-2 border-fitte-brown-dark"
                : "text-gray-400 hover:text-fitte-brown-dark"
            }`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2
            className="animate-spin text-fitte-brown-dark mb-4"
            size={48}
          />
          <p className="text-gray-500 italic">Otwieram Twoją szafę...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {filteredClothes.length > 0 ? (
            filteredClothes.map((item) => (
              <div key={item.id} className="cloth-card group">
                <div className="image-wrapper relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 bg-[#fdfdfd] border border-fitte-sand/20">
                  
                  <button 
                    onClick={() => {
                      if (window.confirm(`Czy na pewno chcesz usunąć "${item.name}" ze swojej garderoby?`)) {
                        deleteCloth(item.id);
                      }
                    }}
                    className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm p-2 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 z-10 shadow-sm"
                    title="Usuń ubranie"
                  >
                    <Trash2 size={14} />
                  </button>

                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.style && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase text-fitte-brown-dark shadow-sm">
                      {item.style}
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm text-fitte-brown-dark truncate">
                  {item.name}
                </h4>
                <span className="text-[11px] text-gray-400 uppercase tracking-widest">
                  {item.category} • {item.style || "Classic"}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <p className="text-gray-400 italic">
                Brak ubrań w tej kategorii.
              </p>
            </div>
          )}
        </div>
      )}

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSuccess={handleItemAdded}
      />
    </div>
  );
};

export default Wardrobe;