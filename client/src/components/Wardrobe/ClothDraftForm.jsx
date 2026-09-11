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

const SelectField = ({
  label,
  value,
  options,
  onChange,
  allowEmpty = true,
  numeric = false,
}) => (
  <label className="draft-field">
    <span>{label}</span>

    <select
      value={value ?? ""}
      onChange={(event) => {
        const selectedValue = event.target.value;

        if (selectedValue === "") {
          onChange(null);
          return;
        }

        onChange(
          numeric ? Number(selectedValue) : selectedValue,
        );
      }}
    >
      {allowEmpty && (
        <option value="">Nie określono</option>
      )}

      {options.map((option) => {
        const optionValue =
          typeof option === "string" ? option : option.value;

        const optionLabel =
          typeof option === "string" ? option : option.label;

        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  </label>
);

const CheckboxGroup = ({
  label,
  field,
  values,
  options,
  onToggle,
}) => (
  <fieldset className="draft-checkbox-group">
    <legend>{label}</legend>

    <div className="draft-checkbox-options">
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={values.includes(option.value)}
            onChange={() => onToggle(field, option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

const ClothDraftForm = ({
  draft,
  values,
  isSaving,
  error,
  onFieldChange,
  onArrayToggle,
  onConfirm,
  onCancel,
}) => (
  <form
    className="draft-form"
    onSubmit={(event) => {
      event.preventDefault();
      onConfirm();
    }}
  >
    <div className="draft-preview">
      <img
        src={draft.imageUrl}
        alt="Ubranie przeanalizowane przez Fitte AI"
      />
    </div>

    <p className="draft-description">
      Sprawdź dane rozpoznane przez AI i popraw je przed
      dodaniem ubrania do szafy.
    </p>

    <label className="draft-field">
      <span>Nazwa</span>
      <input
        type="text"
        value={values.name}
        maxLength={120}
        required
        onChange={(event) =>
          onFieldChange("name", event.target.value)
        }
      />
    </label>

    <SelectField
      label="Kategoria"
      value={values.category}
      options={CLOTHING_CATEGORIES}
      allowEmpty={false}
      onChange={(value) =>
        onFieldChange("category", value)
      }
    />

    <SelectField
      label="Styl"
      value={values.style}
      options={CLOTHING_STYLES}
      allowEmpty={false}
      onChange={(value) =>
        onFieldChange("style", value)
      }
    />

    <label className="draft-field">
      <span>Kolor</span>
      <input
        type="text"
        value={values.color}
        maxLength={50}
        required
        onChange={(event) =>
          onFieldChange("color", event.target.value)
        }
      />
    </label>

    <CheckboxGroup
      label="Materiały"
      field="materials"
      values={values.materials}
      options={MATERIAL_OPTIONS}
      onToggle={onArrayToggle}
    />

    <CheckboxGroup
      label="Sezony"
      field="seasons"
      values={values.seasons}
      options={SEASON_OPTIONS}
      onToggle={onArrayToggle}
    />

    <SelectField
      label="Poziom ciepła"
      value={values.warmthLevel}
      options={WARMTH_OPTIONS}
      numeric
      onChange={(value) =>
        onFieldChange("warmthLevel", value)
      }
    />

    <SelectField
      label="Wodoodporność"
      value={values.waterResistance}
      options={WATER_RESISTANCE_OPTIONS}
      onChange={(value) =>
        onFieldChange("waterResistance", value)
      }
    />

    <SelectField
      label="Formalność"
      value={values.formality}
      options={FORMALITY_OPTIONS}
      onChange={(value) =>
        onFieldChange("formality", value)
      }
    />

    <SelectField
      label="Wzór"
      value={values.pattern}
      options={PATTERN_OPTIONS}
      onChange={(value) =>
        onFieldChange("pattern", value)
      }
    />

    <SelectField
      label="Długość rękawa"
      value={values.sleeveLength}
      options={SLEEVE_LENGTH_OPTIONS}
      onChange={(value) =>
        onFieldChange("sleeveLength", value)
      }
    />

    {error && (
      <p className="draft-error" role="alert">
        {error}
      </p>
    )}

    <div className="draft-actions">
      <button
        type="button"
        disabled={isSaving}
        onClick={onCancel}
      >
        Anuluj
      </button>

      <button
        type="submit"
        className="btn-fitte btn-primary"
        disabled={isSaving}
      >
        {isSaving ? "Zapisywanie..." : "Dodaj do szafy"}
      </button>
    </div>
  </form>
);

export default ClothDraftForm;