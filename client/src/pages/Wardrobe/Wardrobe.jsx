import React, { useState, useEffect, useMemo } from "react";
import { useWardrobe } from "../../context/WardrobeContext";
import AddItemModal from "../../components/Wardrobe/AddItemModal";
import EditItemModal from "../../components/Wardrobe/EditItemModal";
import { Trash2, Loader2, Plus, Pencil, Search, X } from 'lucide-react'; 
import "./Wardrobe.css";
import { API_BASE_URL } from '../../config';

const Wardrobe = () => {
  const { clothes, deleteCloth, loading, fetchClothes } = useWardrobe();
  const [activeTab, setActiveTab] = useState("Wszystkie");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);

  const categories = [
    "Wszystkie", "Góra", "Dół", "Sukienki", "Obuwie",
    "Okrycia wierzchnie", "Akcesoria", "Torby", "Bielizna"
  ];

  useEffect(() => {
    fetchClothes();
  }, []);

  useEffect(() => {
    setSelectedColors([]);
    setSelectedStyles([]);
  }, [activeTab]);

  const parseStyles = (styleString) =>
    (styleString || "").split(",").map((s) => s.trim()).filter(Boolean);

  const categoryScoped = useMemo(
    () => (activeTab === "Wszystkie" ? clothes : clothes.filter((c) => c.category === activeTab)),
    [clothes, activeTab]
  );

  const availableColors = useMemo(() => {
    const set = new Set();
    categoryScoped.forEach((c) => { if (c.color) set.add(c.color); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
  }, [categoryScoped]);

  const availableStyles = useMemo(() => {
    const set = new Set();
    categoryScoped.forEach((c) => parseStyles(c.style).forEach((s) => set.add(s)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
  }, [categoryScoped]);

  const filteredClothes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categoryScoped.filter((c) => {
      const matchesSearch = !query || (c.name || "").toLowerCase().includes(query);
      const matchesColor = selectedColors.length === 0 || (c.color && selectedColors.includes(c.color));
      const itemStyles = parseStyles(c.style);
      const matchesStyle = selectedStyles.length === 0 || itemStyles.some((s) => selectedStyles.includes(s));
      return matchesSearch && matchesColor && matchesStyle;
    });
  }, [categoryScoped, searchQuery, selectedColors, selectedStyles]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedColors.length > 0 || selectedStyles.length > 0;

  const toggleColor = (color) => {
    setSelectedColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));
  };

  const toggleStyle = (style) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedColors([]);
    setSelectedStyles([]);
  };

  const handleItemAdded = async (aiResult) => {
    const token = sessionStorage.getItem("fitte_token");

    try {
      console.log("Dane przekazywane z Modala do zapisu Proxy:", aiResult);

      const formData = new FormData();
      
      if (aiResult.imageBlob) {
        formData.append("image", aiResult.imageBlob, "cloth.png");
      } else {
        alert("Brak pliku obrazu do przetworzenia.");
        return;
      }

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
        const errorData = await response.json().catch(() => ({}));
        console.error("🚨 Błąd serwera podczas zapisu proxy:", errorData);
        alert(`Serwer odrzucił żądanie. Powód: ${errorData.details || errorData.error || "Błąd zapisu"}`);
      }
    } catch (error) {
      console.error("Błąd sieci podczas dodawania ubrania:", error);
      alert("Wystąpił błąd sieci. Upewnij się, że serwer Node.js działa.");
    }
  };

  const handleUpdateItem = async (id, updatedFields) => {
    const token = sessionStorage.getItem("fitte_token");

    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });

      if (response.ok) {
        await fetchClothes();
        setEditingItem(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("🚨 Błąd serwera podczas edycji ubrania:", errorData);
        alert(`Nie udało się zapisać zmian. Powód: ${errorData.error || "Błąd zapisu"}`);
      }
    } catch (error) {
      console.error("Błąd sieci podczas edycji ubrania:", error);
      alert("Wystąpił błąd sieci. Upewnij się, że serwer Node.js działa.");
    }
  };

  return (
    <div className="wardrobe-content p-10">
      <header className="flex justify-between items-end mb-8">
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

      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj po nazwie ubrania..."
          className="w-full bg-white border border-fitte-sand/50 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-fitte-brown-dark transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-fitte-brown-dark"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex gap-10 border-b border-fitte-sand mb-6 overflow-x-auto">
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

      {(availableColors.length > 0 || availableStyles.length > 0) && (
        <div className="flex flex-col gap-3 mb-8">
          {availableStyles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Styl:</span>
              {availableStyles.map((style) => (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    selectedStyles.includes(style)
                      ? "bg-fitte-brown-dark text-white border-fitte-brown-dark"
                      : "bg-white text-fitte-brown-dark border-fitte-sand/50 hover:border-fitte-brown-dark"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          )}

          {availableColors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Kolor:</span>
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    selectedColors.includes(color)
                      ? "bg-fitte-brown-dark text-white border-fitte-brown-dark"
                      : "bg-white text-fitte-brown-dark border-fitte-sand/50 hover:border-fitte-brown-dark"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="self-start text-[11px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 cursor-pointer mt-1"
            >
              <X size={12} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

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

                  <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-fitte-brown-dark hover:bg-gray-50 hover:scale-110 shadow-sm"
                      title="Edytuj ubranie"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Czy na pewno chcesz usunąć "${item.name}" ze swojej garderoby?`)) {
                          deleteCloth(item.id);
                        }
                      }}
                      className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-red-500 hover:bg-red-50 hover:scale-110 shadow-sm"
                      title="Usuń ubranie"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.style && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase text-fitte-brown-dark shadow-sm max-w-[75%] truncate">
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
                {hasActiveFilters
                  ? "Brak ubrań spełniających wybrane kryteria."
                  : "Brak ubrań w tej kategorii."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs font-bold text-fitte-brown-dark hover:underline cursor-pointer"
                >
                  Wyczyść filtry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSuccess={handleItemAdded}
      />

      <EditItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={(fields) => handleUpdateItem(editingItem.id, fields)}
      />
    </div>
  );
};

export default Wardrobe;