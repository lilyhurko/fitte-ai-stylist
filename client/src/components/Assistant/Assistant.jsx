import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Loader2,
  Sparkles,
  Brain,
  Monitor,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import "./Assistant.css";
import { API_BASE_URL } from "../../config";

const Assistant = () => {
  const { user } = useAuth();
  const [selectedOccasion, setSelectedOccasion] = useState("Randka");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [geminiFeedback, setGeminiFeedback] = useState(null);
  const [llamaFeedback, setLlamaFeedback] = useState(null);
  const [ragFeedback, setRagFeedback] = useState(null);

  const occasions = ["Randka", "Praca", "Casual", "Impreza", "Sport", "Podróż"];

  const handleGenerate = async () => {
    if (!prompt && !selectedOccasion) return;

    setLoading(true);
    setResults(null);

    setGeminiFeedback(null);
    setLlamaFeedback(null);
    setRagFeedback(null);

    const token = sessionStorage.getItem("fitte_token");
    const fullQuery = `Okazja: ${selectedOccasion}. Szczegóły: ${prompt}`;

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: fullQuery }),
      });

      const data = await response.json();
      if (response.ok) {
        setResults(data);
      }
    } catch (error) {
      console.error("Błąd asystenta:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelFeedback = async (modelType, feedbackType) => {
    const token = sessionStorage.getItem("fitte_token");
    const analysisId = results._id || results.id;

    if (!analysisId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/analyze/${analysisId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modelType, feedback: feedbackType }),
        },
      );

      if (response.ok) {
        if (modelType === "gemini") setGeminiFeedback(feedbackType);
        if (modelType === "llama") setLlamaFeedback(feedbackType);
      }
    } catch (error) {
      console.error(`Błąd feedbacku dla ${modelType}:`, error);
    }
  };

  const handleRagFeedback = async (feedbackType) => {
    if (!results?.recommendationId) return;

    const token = sessionStorage.getItem("fitte_token");
    const analysisId = results.id || results._id;

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/${results.recommendationId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feedback: feedbackType,
            analysisId: analysisId,
          }),
        },
      );

      if (response.ok) {
        setRagFeedback(feedbackType);
      }
    } catch (error) {
      console.error("Błąd feedbacku RAG:", error);
    }
  };
  return (
    <main className="assistant-container pt-4 px-4 md:px-12 pb-12 min-h-screen">
      <header className="mb-6 mt-2">
        <h2 className="font-playfair text-3xl md:text-5xl font-light">
          Co dziś <span className="italic text-fitte-terracotta">założyć?</span>
        </h2>
        <p className="text-fitte-brown-light text-xs md:text-sm mt-2">
          Dostosuję propozycje do Twojego stylu.
        </p>
      </header>

      <section className="input-card bg-white rounded-[30px] md:rounded-[40px] p-6 md:p-10 border border-fitte-sand shadow-sm">
        <div className="mb-6">
          <span className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
            WYBIERZ OKAZJĘ
          </span>
          <div className="flex flex-wrap gap-2 md:gap-3 mt-4">
            {occasions.map((occ) => (
              <button
                key={occ}
                onClick={() => setSelectedOccasion(occ)}
                className={`px-4 md:px-6 py-2 rounded-full border text-xs transition-all ${
                  selectedOccasion === occ
                    ? "bg-fitte-brown-dark text-white border-fitte-brown-dark"
                    : "bg-transparent border-fitte-sand text-fitte-brown-dark hover:border-fitte-brown-dark"
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-fitte-cream/50 rounded-2xl p-4 md:p-6 border border-fitte-sand focus:outline-none focus:border-fitte-brown-light resize-none text-sm"
            placeholder="Opisz szczegóły (np. idę na kolację, chcę czuć się swobodnie)..."
          />

          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-6">
            <div className="flex flex-wrap gap-3 items-center text-[9px] font-bold opacity-50">
              <span>AKTYWNE SILNIKI BADAWCZE:</span>
              <span>GEMINI 2.5</span>
              <span>LLAMA 3.3 (70B)</span>
              <span>FITTE HYBRID RAG</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="generate-btn w-full md:w-auto bg-fitte-brown-dark text-white px-10 py-3.5 rounded-full hover:opacity-90 transition-all font-bold flex items-center justify-center gap-2.5 text-sm shadow-sm"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Sparkles size={18} /> Generuj propozycje
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {results && (
        <section className="mt-12 md:mt-16 animate-fade-in">
          <h3 className="font-playfair text-xl md:text-2xl mb-6 md:mb-8">
            Porównanie inteligentnych propozycji
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="ai-result-card bg-white p-6 md:p-8 rounded-3xl border border-fitte-sand flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase mb-4">
                  <Sparkles size={14} /> Gemini 2.5 Flash
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {results.geminiResponse}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-fitte-sand/40 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 tracking-wider uppercase">
                  Trafiona stylizacja?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModelFeedback("gemini", "LIKE")}
                    disabled={geminiFeedback !== null}
                    className={`p-2 rounded-xl border transition-all ${geminiFeedback === "LIKE" ? "bg-green-50 text-green-600 border-green-200 scale-105" : "bg-white text-gray-400 hover:text-fitte-brown-dark border-gray-100"}`}
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <button
                    onClick={() => handleModelFeedback("gemini", "DISLIKE")}
                    disabled={geminiFeedback !== null}
                    className={`p-2 rounded-xl border transition-all ${geminiFeedback === "DISLIKE" ? "bg-red-50 text-red-600 border-red-200 scale-105" : "bg-white text-gray-400 hover:text-fitte-brown-dark border-gray-100"}`}
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="ai-result-card bg-white p-6 md:p-8 rounded-3xl border border-fitte-sand flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase mb-4">
                  <Monitor size={14} /> Llama 3.3 (Cloud)
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {results.mistralResponse}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-fitte-sand/40 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 tracking-wider uppercase">
                  Trafiona stylizacja?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModelFeedback("llama", "LIKE")}
                    disabled={llamaFeedback !== null}
                    className={`p-2 rounded-xl border transition-all ${llamaFeedback === "LIKE" ? "bg-green-50 text-green-600 border-green-200 scale-105" : "bg-white text-gray-400 hover:text-fitte-brown-dark border-gray-100"}`}
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <button
                    onClick={() => handleModelFeedback("llama", "DISLIKE")}
                    disabled={llamaFeedback !== null}
                    className={`p-2 rounded-xl border transition-all ${llamaFeedback === "DISLIKE" ? "bg-red-50 text-red-600 border-red-200 scale-105" : "bg-white text-gray-400 hover:text-fitte-brown-dark border-gray-100"}`}
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* KOLUMNA 3: FITTE AI (HYBRID RAG) */}
            <div className="ai-result-card bg-fitte-brown-dark text-white p-6 md:p-8 rounded-3xl shadow-xl transform md:scale-105 flex flex-col justify-between min-h-[390px]">
              <div>
                <div className="flex items-center gap-2 text-fitte-beige font-bold text-[10px] uppercase mb-4">
                  <Brain size={14} /> Fitte AI (Hybrid RAG)
                </div>
                <p className="text-sm text-fitte-beige/90 leading-relaxed font-medium">
                  {results.ragResponse}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-fitte-beige/60 tracking-wider uppercase">
                    Czy to udana stylizacja?
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRagFeedback("LIKE")}
                      disabled={ragFeedback !== null}
                      className={`p-2 rounded-xl transition-all ${ragFeedback === "LIKE" ? "bg-green-600 text-white scale-105" : "bg-white/10 text-white hover:bg-white/20"}`}
                    >
                      <ThumbsUp size={15} />
                    </button>
                    <button
                      onClick={() => handleRagFeedback("DISLIKE")}
                      disabled={ragFeedback !== null}
                      className={`p-2 rounded-xl transition-all ${ragFeedback === "DISLIKE" ? "bg-red-600 text-white scale-105" : "bg-white/10 text-white hover:bg-white/20"}`}
                    >
                      <ThumbsDown size={15} />
                    </button>
                  </div>
                </div>
                <div className="text-[9px] uppercase tracking-widest opacity-60">
                  Deterministyczna analiza garderoby adaptacyjnej
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default Assistant;
