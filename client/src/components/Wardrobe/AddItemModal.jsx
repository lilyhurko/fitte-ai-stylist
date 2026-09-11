import React, { useRef, useState } from "react";
import { Loader2, Sparkles, Upload, X } from "lucide-react";

import { API_BASE_URL } from "../../config";
import ClothDraftForm from "./ClothDraftForm";
import "./AddItemModal.css";

const AddItemModal = ({ isOpen, onClose, onAddSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftValues, setDraftValues] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const clearPreview = () => {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  };

  const resetModal = () => {
    clearPreview();
    setFile(null);
    setPreview(null);
    setDraft(null);
    setDraftValues(null);
    setIsDragging(false);
    setIsProcessing(false);
    setIsSaving(false);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelDraft = async () => {
    if (!draft?.id) return true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/wardrobe/drafts/${draft.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}));

        throw new Error(data.error || "Nie udało się usunąć wersji roboczej.");
      }

      return true;
    } catch (cancelError) {
      setError(cancelError.message);
      return false;
    }
  };

  const handleClose = async () => {
    if (isProcessing || isSaving) return;

    if (draft) {
      setIsSaving(true);

      const cancelled = await cancelDraft();

      setIsSaving(false);

      if (!cancelled) return;
    }

    resetModal();
    onClose();
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setIsDragging(true);
    } else if (event.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files?.[0]) {
      handleFile(event.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    clearPreview();
    setError("");

    const isHeic =
      selectedFile.type === "image/heic" ||
      selectedFile.type === "image/heif" ||
      /\.(heic|heif)$/i.test(selectedFile.name);

    setFile(selectedFile);

    setPreview(isHeic ? null : URL.createObjectURL(selectedFile));
  };

  const handleGenerate = async () => {
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`${API_BASE_URL}/wardrobe/analyze`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.draft) {
        throw new Error(data.error || "Nie udało się przeanalizować ubrania.");
      }

      setDraft(data.draft);

      setDraftValues({
        name: data.draft.name,
        category: data.draft.category,
        style: data.draft.style,
        color: data.draft.color,
        materials: data.draft.materials ?? [],
        seasons: data.draft.seasons ?? [],
        warmthLevel: data.draft.warmthLevel ?? null,
        waterResistance: data.draft.waterResistance ?? null,
        formality: data.draft.formality ?? null,
        pattern: data.draft.pattern ?? null,
        sleeveLength: data.draft.sleeveLength ?? null,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setError("");

    setDraftValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleArrayToggle = (field, value) => {
    const currentValues = draftValues[field] ?? [];

    if (!currentValues.includes(value) && currentValues.length >= 5) {
      setError("Możesz wybrać maksymalnie pięć wartości.");
      return;
    }

    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    handleFieldChange(field, nextValues);
  };

  const handleConfirm = async () => {
    if (!draft?.id || !draftValues || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/wardrobe/drafts/${draft.id}/confirm`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draftValues),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.item) {
        throw new Error(data.error || "Nie udało się zapisać ubrania.");
      }

      const savedItem = data.item;

      resetModal();
      onAddSuccess(savedItem);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className={`modal-content apple-card ${
          draft ? "draft-modal-content" : ""
        }`}
      >
        {" "}
        {!isProcessing && (
          <button
            type="button"
            className="close-btn"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        )}
        {isProcessing ? (
          <div className="ai-loading-state animate-fade-in">
            <div className="ai-loader-content">
              <div className="spinner-container">
                <Loader2
                  className="animate-spin text-fitte-brown-dark"
                  size={48}
                />
                <Sparkles className="sparkle-icon" size={24} />
              </div>

              <h3 className="font-playfair italic text-xl text-fitte-brown-dark mb-1">
                Fitte AI analizuje Twoje ubranie...
              </h3>

              <p className="text-xs text-gray-400">
                Rozpoznajemy właściwości ubrania
              </p>

              <div className="loading-bar">
                <div className="loading-progress" />
              </div>
            </div>
          </div>
        ) : draft && draftValues ? (
          <ClothDraftForm
            draft={draft}
            values={draftValues}
            isSaving={isSaving}
            error={error}
            onFieldChange={handleFieldChange}
            onArrayToggle={handleArrayToggle}
            onConfirm={handleConfirm}
            onCancel={handleClose}
          />
        ) : (
          <>
            <h2 className="modal-title font-playfair text-2xl mb-2">
              Dodaj do <span className="italic">Garderoby</span>
            </h2>

            <div
              className={`drop-zone ${
                isDragging ? "dragging" : ""
              } ${preview ? "has-image" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Podgląd wybranego ubrania"
                  className="image-preview"
                />
              ) : file ? (
                <div className="drop-zone-content">
                  <div className="upload-icon-circle">
                    <Upload size={32} />
                  </div>

                  <p className="main-text text-sm font-bold">{file.name}</p>

                  <p className="sub-text text-xs text-gray-400">
                    Plik HEIC zostanie przetworzony po wysłaniu
                  </p>
                </div>
              ) : (
                <div className="drop-zone-content">
                  <div className="upload-icon-circle">
                    <Upload size={32} />
                  </div>

                  <p className="main-text text-sm font-bold">
                    Przeciągnij i upuść zdjęcie
                  </p>

                  <p className="sub-text text-xs text-gray-400">
                    lub kliknij, aby wybrać z dysku
                  </p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              />
            </div>

            {error && (
              <p className="draft-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className={`btn-fitte btn-primary w-full bg-fitte-brown-dark text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  !file ? "opacity-50 cursor-not-allowed" : "hover:opacity-95"
                }`}
                disabled={!file || isProcessing}
                onClick={handleGenerate}
              >
                <span>Analizuj z Fitte AI</span>
                <span className="btn-icon">✦</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddItemModal;
