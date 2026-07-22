import React, { useState, useEffect } from "react";
import { X, Plus, Check } from "lucide-react";

export const STYLE_OPTIONS = [
  "Classic", "Minimalizm", "Casual", "Boho", "Chic", "Romantic",
  "Streetwear", "Modern", "Sport", "Elegancki", "Vintage"
];

export const CATEGORY_OPTIONS = [
  "Góra", "Dół", "Sukienki", "Obuwie",
  "Okrycia wierzchnie", "Akcesoria", "Torby", "Bielizna"
];

const parseStyleString = (styleString) =>
  (styleString || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const EditItemModal = ({ isOpen, onClose, item, onSave }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [customStyleInput, setCustomStyleInput] = useState("");
  const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setCategory(item.category || "");
      setSelectedStyles(parseStyleString(item.style));
      setCustomStyleInput("");
      setShowCustomStyleInput(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const canSave = name.trim().length > 0 && category.length > 0 && selectedStyles.length > 0;

  const toggleStyle = (style) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleAddCustomStyle = () => {
    const trimmed = customStyleInput.trim();
    if (!trimmed) return;
    const alreadyExists = selectedStyles.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      setSelectedStyles((prev) => [...prev, trimmed]);
    }
    setCustomStyleInput("");
  };

  // Style spoza wbudowanej listy (np. dodane wcześniej ręcznie), które i tak są przypisane do ubrania —
  // pokazujemy je jako osobne, usuwalne chipy, żeby nie zniknęły z widoku.
  const extraSelectedStyles = selectedStyles.filter((s) => !STYLE_OPTIONS.includes(s));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    try {
      await onSave({ name: name.trim(), category, style: selectedStyles.join(", ") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content apple-card max-w-md w-[90%] p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]">
        <button className="close-btn absolute top-5 right-5 text-gray-400 hover:text-black transition-colors" onClick={onClose}>
          <X size={22} />
        </button>

        <h2 className="font-playfair text-2xl mb-1">
          Edytuj <span className="italic">ubranie</span>
        </h2>
        <p className="text-xs text-gray-400 mb-6">Zmień nazwę, kategorię lub style tego elementu garderoby. Możesz wybrać kilka stylów naraz.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 object-contain bg-white rounded-xl border border-[#E8DDD0]/40 p-1 shrink-0"
            />
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Nazwa</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#E8DDD0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8E7A6B]"
                placeholder="Nazwa ubrania"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    category === cat
                      ? "bg-[#3D2B1F] text-white border-[#3D2B1F]"
                      : "bg-white text-[#3D2B1F] border-[#E8DDD0] hover:border-[#8E7A6B]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Style {selectedStyles.length > 0 && `(${selectedStyles.length})`}
              </label>
              <button
                type="button"
                onClick={() => setShowCustomStyleInput((prev) => !prev)}
                className="text-[10px] font-bold text-[#8E7A6B] hover:text-[#3D2B1F] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={11} /> {showCustomStyleInput ? "Ukryj" : "Dodaj własny styl"}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">Możesz zaznaczyć kilka — np. Classic i Romantic jednocześnie.</p>

            <div className="flex flex-wrap gap-2 mb-2">
              {STYLE_OPTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    selectedStyles.includes(s)
                      ? "bg-[#3D2B1F] text-white border-[#3D2B1F]"
                      : "bg-white text-[#3D2B1F] border-[#E8DDD0] hover:border-[#8E7A6B]"
                  }`}
                >
                  {s}
                </button>
              ))}

              {extraSelectedStyles.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border bg-[#3D2B1F] text-white border-[#3D2B1F] flex items-center gap-1 cursor-pointer"
                  title="Kliknij, aby usunąć"
                >
                  {s} <X size={10} />
                </button>
              ))}
            </div>

            {showCustomStyleInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStyleInput}
                  onChange={(e) => setCustomStyleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomStyle();
                    }
                  }}
                  className="flex-1 bg-white border border-[#E8DDD0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8E7A6B]"
                  placeholder="Wpisz nowy styl, np. Athleisure"
                />
                <button
                  type="button"
                  onClick={handleAddCustomStyle}
                  className="bg-[#3D2B1F] text-white px-4 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                >
                  Dodaj
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSave || saving}
            className="mt-2 bg-[#3D2B1F] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Zapisywanie..." : (<><Check size={16} /> Zapisz zmiany</>)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;