import React, { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import {
  CLOTHING_CATEGORIES,
  CLOTHING_STYLES,
  MATERIAL_OPTIONS,
  SEASON_OPTIONS,
  WARMTH_OPTIONS,
  WATER_RESISTANCE_OPTIONS,
  FORMALITY_OPTIONS,
  PATTERN_OPTIONS,
  SLEEVE_LENGTH_OPTIONS,
} from "../../constants/clothingOptions";
import "./AddItemModal.css";

const parseStyleString = (styleString) =>
  (styleString || "")
    .split(",")
    .map((style) => style.trim())
    .filter(Boolean);

const SelectField = ({ label, value, options, onChange, numeric = false }) => (
  <label className="draft-field">
    <span>{label}</span>
    <select
      value={value ?? ""}
      onChange={(event) => {
        const selectedValue = event.target.value;
        onChange(
          selectedValue === ""
            ? ""
            : numeric
              ? Number(selectedValue)
              : selectedValue,
        );
      }}
    >
      <option value="">Nie określono</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const CheckboxGroup = ({ label, values, options, onToggle }) => (
  <fieldset className="draft-checkbox-group">
    <legend>{label}</legend>
    <div className="draft-checkbox-options">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={values.includes(option.value)}
            onChange={() => onToggle(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

const EditItemModalForm = ({ onClose, item, onSave }) => {
  const [name, setName] = useState(item.name || "");
  const [category, setCategory] = useState(item.category || "");
  const [selectedStyles, setSelectedStyles] = useState(() =>
    parseStyleString(item.style),
  );
  const [color, setColor] = useState(item.color || "");
  const [materials, setMaterials] = useState(item.materials || []);
  const [seasons, setSeasons] = useState(item.seasons || []);
  const [warmthLevel, setWarmthLevel] = useState(item.warmthLevel ?? "");
  const [waterResistance, setWaterResistance] = useState(
    item.waterResistance || "",
  );
  const [formality, setFormality] = useState(item.formality || "");
  const [pattern, setPattern] = useState(item.pattern || "");
  const [sleeveLength, setSleeveLength] = useState(
    item.sleeveLength || "",
  );
  const [customStyleInput, setCustomStyleInput] = useState("");
  const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave =
    name.trim().length > 0 &&
    category.length > 0 &&
    selectedStyles.length > 0 &&
    color.trim().length > 0;

  const toggleStyle = (style) => {
    setSelectedStyles((current) =>
      current.includes(style)
        ? current.filter((value) => value !== style)
        : [...current, style],
    );
  };

  const toggleMaterial = (material) => {
    setMaterials((current) => {
      if (current.includes(material)) {
        return current.filter((value) => value !== material);
      }
      return current.length >= 5 ? current : [...current, material];
    });
  };

  const toggleSeason = (season) => {
    setSeasons((current) => {
      if (current.includes(season)) {
        return current.filter((value) => value !== season);
      }
      if (season === "ALL_SEASON") return ["ALL_SEASON"];
      return [
        ...current.filter((value) => value !== "ALL_SEASON"),
        season,
      ];
    });
  };

  const handleAddCustomStyle = () => {
    const trimmed = customStyleInput.trim();
    if (!trimmed) return;

    const alreadyExists = selectedStyles.some(
      (style) => style.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!alreadyExists) {
      setSelectedStyles((current) => [...current, trimmed]);
    }
    setCustomStyleInput("");
  };

  const extraSelectedStyles = selectedStyles.filter(
    (style) => !CLOTHING_STYLES.includes(style),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        category,
        style: selectedStyles.join(", "),
        color: color.trim(),
        materials,
        seasons,
        warmthLevel: warmthLevel === "" ? null : Number(warmthLevel),
        waterResistance: waterResistance || null,
        formality: formality || null,
        pattern: pattern || null,
        sleeveLength: sleeveLength || null,
      });
    } catch (saveError) {
      setError(saveError.message || "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content apple-card draft-modal-content max-w-md w-[90%] p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]">
        <button
          type="button"
          className="close-btn absolute top-5 right-5 text-gray-400 hover:text-black transition-colors"
          onClick={onClose}
          disabled={saving}
          aria-label="Zamknij edycję ubrania"
        >
          <X size={22} />
        </button>

        <h2 className="font-playfair text-2xl mb-1">
          Edytuj <span className="italic">ubranie</span>
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          Popraw dane ubrania, aby rekomendacje lepiej pasowały do pogody,
          okazji i Twojego stylu.
        </p>

        <form onSubmit={handleSubmit} className="draft-form">
          <div className="flex items-center gap-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-20 h-20 object-contain bg-white rounded-xl border border-[#E8DDD0]/40 p-1 shrink-0"
            />
            <label className="draft-field flex-1">
              <span>Nazwa</span>
              <input
                type="text"
                value={name}
                maxLength={120}
                required
                onChange={(event) => setName(event.target.value)}
                placeholder="Nazwa ubrania"
              />
            </label>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Kategoria
            </span>
            <div className="flex flex-wrap gap-2">
              {CLOTHING_CATEGORIES.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setCategory(option)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    category === option
                      ? "bg-[#3D2B1F] text-white border-[#3D2B1F]"
                      : "bg-white text-[#3D2B1F] border-[#E8DDD0] hover:border-[#8E7A6B]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Style {selectedStyles.length > 0 && `(${selectedStyles.length})`}
              </span>
              <button
                type="button"
                onClick={() => setShowCustomStyleInput((current) => !current)}
                className="text-[10px] font-bold text-[#8E7A6B] hover:text-[#3D2B1F] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={11} />
                {showCustomStyleInput ? "Ukryj" : "Dodaj własny styl"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {CLOTHING_STYLES.map((style) => (
                <button
                  type="button"
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    selectedStyles.includes(style)
                      ? "bg-[#3D2B1F] text-white border-[#3D2B1F]"
                      : "bg-white text-[#3D2B1F] border-[#E8DDD0] hover:border-[#8E7A6B]"
                  }`}
                >
                  {style}
                </button>
              ))}

              {extraSelectedStyles.map((style) => (
                <button
                  type="button"
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border bg-[#3D2B1F] text-white border-[#3D2B1F] flex items-center gap-1 cursor-pointer"
                  title="Kliknij, aby usunąć"
                >
                  {style} <X size={10} />
                </button>
              ))}
            </div>

            {showCustomStyleInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStyleInput}
                  onChange={(event) => setCustomStyleInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddCustomStyle();
                    }
                  }}
                  className="flex-1 bg-white border border-[#E8DDD0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8E7A6B]"
                  placeholder="Wpisz własny styl"
                />
                <button
                  type="button"
                  onClick={handleAddCustomStyle}
                  className="bg-[#3D2B1F] text-white px-4 rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
                >
                  Dodaj
                </button>
              </div>
            )}
          </div>

          <label className="draft-field">
            <span>Kolor</span>
            <input
              type="text"
              value={color}
              maxLength={50}
              required
              onChange={(event) => setColor(event.target.value)}
            />
          </label>

          <CheckboxGroup
            label="Materiały (maksymalnie 5)"
            values={materials}
            options={MATERIAL_OPTIONS}
            onToggle={toggleMaterial}
          />
          <CheckboxGroup
            label="Sezony"
            values={seasons}
            options={SEASON_OPTIONS}
            onToggle={toggleSeason}
          />

          <SelectField
            label="Poziom ciepła"
            value={warmthLevel}
            options={WARMTH_OPTIONS}
            numeric
            onChange={setWarmthLevel}
          />
          <SelectField
            label="Wodoodporność"
            value={waterResistance}
            options={WATER_RESISTANCE_OPTIONS}
            onChange={setWaterResistance}
          />
          <SelectField
            label="Formalność"
            value={formality}
            options={FORMALITY_OPTIONS}
            onChange={setFormality}
          />
          <SelectField
            label="Wzór"
            value={pattern}
            options={PATTERN_OPTIONS}
            onChange={setPattern}
          />
          <SelectField
            label="Długość rękawa"
            value={sleeveLength}
            options={SLEEVE_LENGTH_OPTIONS}
            onChange={setSleeveLength}
          />

          {error && (
            <p className="draft-error" role="alert">
              {error}
            </p>
          )}

          <div className="draft-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Anuluj
            </button>
            <button
              type="submit"
              className="btn-fitte btn-primary"
              disabled={!canSave || saving}
            >
              {saving ? (
                "Zapisywanie..."
              ) : (
                <>
                  <Check size={16} /> Zapisz zmiany
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditItemModal = ({ isOpen, onClose, item, onSave }) => {
  if (!isOpen || !item) return null;

  return (
    <EditItemModalForm
      key={item.id}
      item={item}
      onClose={onClose}
      onSave={onSave}
    />
  );
};

export default EditItemModal;
