import React, { useState, useRef } from "react";
import { Upload, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import "./AddItemModal.css";

const AddItemModal = ({ isOpen, onClose, onAddSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setAiResult(null);
    }
  };

  const processImageWithAI = async () => {
    const token = sessionStorage.getItem("fitte_token");
    console.log("Mój token to:", token);

    if (!token) {
      alert("Błąd: Nie znaleziono tokena. Zaloguj się ponownie.");
      return;
    }
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch("http://localhost:5001/api/wardrobe/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAiResult({
          analysis: {
            name: data.item.name,
            category: data.item.category,
            style: data.item.style,
          },
          processedImage: data.item.imageUrl,
        });
      } else {
        alert("Błąd AI: " + data.error);
      }
    } catch (error) {
      console.error("Błąd połączenia:", error);
      alert("Nie udało się połączyć z serwerem AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setAiResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={handleClose}>
          <X size={24} />
        </button>

        <h2 className="title-serif italic mb-6">Dodaj do szafy</h2>

        {!aiResult && (
          <div className="upload-container">
            <input
              type="file"
              accept="image/*, .heic, .HEIC"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {preview ? (
              <div className="preview-box">
                {file && file.name.toLowerCase().endsWith(".heic") ? (
                  <div className="p-10 bg-gray-100 rounded-xl flex flex-col items-center">
                    <Upload size={40} className="text-fitte-brown-dark mb-2" />
                    <p className="text-sm font-medium">Zdjęcie iPhone (HEIC)</p>
                    <p className="text-xs text-gray-400">
                      Podgląd będzie dostępny po obróbce AI
                    </p>
                  </div>
                ) : (
                  <img src={preview} alt="Podgląd" className="preview-img" />
                )}

                <button
                  className="btn-primary mt-4 w-full flex-center"
                  onClick={processImageWithAI}
                  disabled={isLoading}
                >
                  {isLoading ? "AI pracuje..." : "Magiczne Usunięcie Tła"}
                </button>
              </div>
            ) : (
              <div
                className="upload-box"
                onClick={() => fileInputRef.current.click()}
              >
                <Upload size={40} className="text-gray-400 mb-3" />
                <p>Kliknij, aby wgrać zdjęcie ubrania</p>
                <span className="text-xs text-gray-400 mt-2">
                  Formaty: JPG, PNG
                </span>
              </div>
            )}
          </div>
        )}

        {aiResult && (
          <div className="ai-result-container">
            <div className="result-img-box">
              <img
                src={aiResult.processedImage}
                alt="Bez tła"
                className="result-img"
              />
              <div className="success-badge">
                <CheckCircle2 size={16} className="mr-1" /> Tło usunięte
              </div>
            </div>

            <div className="ai-tags mt-4">
              <h3 className="font-bold text-lg mb-2">
                {aiResult.analysis?.name}
              </h3>

              <div className="tag-badges">
                <span className="tag">
                  Kategoria: {aiResult.analysis?.category}
                </span>
                <span className="tag">Styl: {aiResult.analysis?.style}</span>
              </div>
            </div>

            <button
              className="btn-primary w-full mt-6"
              onClick={() => {
                onAddSuccess(aiResult);
                handleClose();
              }}
            >
              Zapisz w szafie
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddItemModal;
