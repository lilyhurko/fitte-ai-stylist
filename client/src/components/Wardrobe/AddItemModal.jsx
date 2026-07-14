import React, { useState, useRef } from "react";
import { Loader2, Upload, Sparkles, X } from "lucide-react";
import "./AddItemModal.css";
import { API_BASE_URL } from "../../config"; 

const AddItemModal = ({ isOpen, onClose, onAddSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleClose = () => {
    if (isProcessing) return; 
    setFile(null);
    setPreview(null);
    onClose();
  };

  const handleGenerate = async () => {
    if (!file || isProcessing) return; 

    setIsProcessing(true);
    const token = sessionStorage.getItem("fitte_token");

    const formData = new FormData();
    formData.append("image", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // Zwiększamy do 90s ze względu na Hugging Face

    try {
      const response = await fetch(`${API_BASE_URL}/wardrobe/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Connection": "keep-alive"
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.status === 400 && !response.ok) {
        console.warn("Wykryto zdublowane zapytanie sieciowe (Retry), ignoruję błąd strumienia.");
        return; 
      }

      const data = await response.json();

      if (response.ok && data.success) {
        onAddSuccess(data.item); 
        handleClose();
      } else {
        console.error("Backend AI Error:", data.error);
        if (data.item || response.status === 200) {
          handleClose();
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log("Timeout Hugging Face - proces jest kontynuowany na serwerze.");
        handleClose();
      } else {
        console.error("Błąd krytyczny sieci:", error);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal-content apple-card">
        {!isProcessing && (
          <button className="close-btn" onClick={handleClose}>
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
              <p className="text-xs text-gray-400">Usuwamy tło i dobieramy parametry stylu</p>
              <div className="loading-bar">
                <div className="loading-progress"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h2 className="modal-title font-playfair text-2xl mb-2">
              Dodaj do <span className="italic">Garderoby</span>
            </h2>

            <div
              className={`drop-zone ${isDragging ? "dragging" : ""} ${preview ? "has-image" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="image-preview" />
              ) : (
                <div className="drop-zone-content">
                  <div className="upload-icon-circle">
                    <Upload size={32} />
                  </div>
                  <p className="main-text text-sm font-bold">Przeciągnij i upuść zdjęcie</p>
                  <p className="sub-text text-xs text-gray-400">lub kliknij, aby wybrać z dysku</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
                accept="image/*"
              />
            </div>

            <div className="modal-actions">
              <button
                className={`btn-fitte btn-primary w-full bg-fitte-brown-dark text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${!file ? "opacity-50 cursor-not-allowed" : "hover:opacity-95"}`}
                disabled={!file}
                onClick={handleGenerate}
              >
                <span>Generuj z Fitte AI</span>
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