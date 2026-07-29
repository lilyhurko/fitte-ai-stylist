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
    const token = localStorage.getItem("fitte_token");

    try {
      const formData = new FormData();
      if (aiResult.imageBlob) {
        formData.append("image", aiResult.imageBlob, "cloth.png");
      } else {
        alert("Brak pliku obrazu do przetworzenia.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/wardrobe/add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        await fetchClothes();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Błąd sieci podczas dodawania ubrania:", error);
    }
  };

  const handleUpdateItem = async (id, updatedFields) => {
    const token = localStorage.getItem("fitte_token");

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
      }
    } catch (error) {
      console.error("Błąd sieci podczas edycji ubrania:", error);
    }
  };

  return (
    <div className="wardrobe-content md:p-10 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-5 w-full">
        <div>
          <h2 className="font-playfair text-2xl md:text-4xl mb-1 leading-tight">
            Moja <span className="italic">Garderoba</span>
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Twoja cyfrowa szafa sterowana przez AI
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-fitte-brown-dark text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs md:text-sm shadow-sm touch-manipulation"
        >
          <Plus size={16} /> Dodaj ubranie
        </button>
      </header>

      <div className="relative mb-4 w-full">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj po nazwie ubrania..."
          className="w-full bg-white border border-fitte-sand/50 rounded-xl pl-9 pr-8 py-2 text-xs md:text-sm focus:outline-none focus:border-fitte-brown-dark transition-colors shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-fitte-brown-dark touch-manipulation p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="categories-tabbar flex gap-4 md:gap-8 border-b border-fitte-sand mb-4 overflow-x-auto no-scrollbar pb-1 w-full max-w-full">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`pb-2 text-xs md:text-sm font-medium transition-all whitespace-nowrap touch-manipulation shrink-0 ${
              activeTab === cat
                ? "text-fitte-brown-dark border-b-2 border-fitte-brown-dark font-semibold"
                : "text-gray-400 hover:text-fitte-brown-dark"
            }`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {(availableColors.length > 0 || availableStyles.length > 0) && (
        <div className="flex flex-col gap-2 mb-5 w-full">
          {availableStyles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mr-1">Styl:</span>
              {availableStyles.map((style) => (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer touch-manipulation ${
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
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mr-1">Kolor:</span>
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all cursor-pointer touch-manipulation ${
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
              className="self-start text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 cursor-pointer mt-0.5 touch-manipulation"
            >
              <X size={12} /> Wyczyść filtry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 w-full">
          <Loader2
            className="animate-spin text-fitte-brown-dark mb-3"
            size={36}
          />
          <p className="text-gray-500 italic text-xs">Otwieram Twoją szafę...</p>
        </div>
      ) : (
        <div className="wardrobe-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 w-full">
          {filteredClothes.length > 0 ? (
            filteredClothes.map((item) => (
              <div key={item.id} className="cloth-card group w-full">
                <div className="image-wrapper relative aspect-square rounded-xl overflow-hidden mb-2 bg-[#fdfdfd] border border-fitte-sand/20 w-full">

                  <div className="action-buttons absolute top-1.5 left-1.5 flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg text-fitte-brown-dark hover:bg-gray-50 active:scale-95 shadow-2xs touch-manipulation"
                      title="Edytuj ubranie"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Czy na pewno chcesz usunąć "${item.name}" ze swojej garderoby?`)) {
                          deleteCloth(item.id);
                        }
                      }}
                      className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg text-red-500 hover:bg-red-50 active:scale-95 shadow-2xs touch-manipulation"
                      title="Usuń ubranie"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-2.5 md:p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.style && (
                    <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase text-fitte-brown-dark shadow-2xs max-w-[65%] truncate">
                      {item.style}
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-xs text-fitte-brown-dark truncate w-full">
                  {item.name}
                </h4>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block truncate w-full">
                  {item.category} • {item.style || "Classic"}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 w-full">
              <p className="text-gray-400 italic text-xs">
                {hasActiveFilters
                  ? "Brak ubrań spełniających wybrane kryteria."
                  : "Brak ubrań w tej kategorii."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs font-bold text-fitte-brown-dark hover:underline cursor-pointer touch-manipulation"
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