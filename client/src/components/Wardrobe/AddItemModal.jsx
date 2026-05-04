import React, { useState, useRef } from "react";
import { Loader2, Upload, Sparkles, X } from "lucide-react";
import "./AddItemModal.css";

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
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleGenerate = async () => {
    if (!file) return;

    setIsProcessing(true); 

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/process-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Błąd serwera AI");

      const analysisRaw = response.headers.get("X-AI-Analysis");
      const analysisData = JSON.parse(analysisRaw);

      const imageBlob = await response.blob();
      
      const processedImageUrl = URL.createObjectURL(imageBlob);

      console.log("AI Analysis:", analysisData);
      console.log("Processed Image URL:", processedImageUrl);

 
      onAddSuccess({
        ...analysisData,
        imageBlob: imageBlob,      
        imageUrl: processedImageUrl 
      }); 

      handleClose();
      
    } catch (error) {
      console.error("AI Error:", error);
      alert("Wystąpił błąd podczas analizy AI. Sprawdź konsolę.");
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content apple-card">
        <button className="close-btn" onClick={handleClose}><X size={20} /></button>

        {isProcessing ? (
          <div className="ai-loading-state">
            <div className="ai-loader-content">
              <div className="spinner-container">
                <Loader2 className="animate-spin text-fitte-brown-dark" size={48} />
                <Sparkles className="sparkle-icon" size={24} />
              </div>
              <h3 className="font-playfair italic">Fitte AI analizuje Twoje ubranie...</h3>
              <p>Usuwamy tło i dobieramy parametry stylu</p>
              <div className="loading-bar"><div className="loading-progress"></div></div>
            </div>
          </div>
        ) : (
          <>
            <h2 className="modal-title font-playfair">Dodaj do <span className="italic">Garderoby</span></h2>

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
                  <p className="main-text">Przeciągnij i upuść zdjęcie</p>
                  <p className="sub-text">lub kliknij, aby wybrać z dysku</p>
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
                className={`btn-fitte btn-primary w-full ${!file ? "opacity-50 cursor-not-allowed" : ""}`}
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