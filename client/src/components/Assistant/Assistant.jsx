import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2, Star, Sparkles, Brain, Monitor, ThumbsUp, ThumbsDown } from "lucide-react";
import "./Assistant.css";
import { API_BASE_URL } from "../../config";

const Assistant = () => {
  const { user } = useAuth();
  const [selectedOccasion, setSelectedOccasion] = useState("Randka");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); 

  const occasions = ["Randka", "Praca", "Casual", "Impreza", "Sport", "Podróż"];

  const handleGenerate = async () => {
    if (!prompt && !selectedOccasion) return;

    setLoading(true);
    setResults(null);
    setFeedbackStatus(null); 
    
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

  const handleRate = async (modelType, score) => {
    const token = sessionStorage.getItem("fitte_token");
    const analysisId = results._id || results.id;
    
    if (!analysisId) {
      console.error("Brak poprawnego identyfikatora analizy do wystawienia oceny.");
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/analyze/${analysisId}/rate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelType, score }),
      });
      setResults((prev) => ({ ...prev, [`${modelType}Score`]: score }));
    } catch (error) {
      console.error("Błąd oceniania:", error);
    }
  };

  const handleFeedback = async (feedbackType) => {
    if (!results?.recommendationId) {
      alert("Brak powiązanego identyfikatora rekomendacji do przesłania feedbacku.");
      return;
    }

    const token = sessionStorage.getItem("fitte_token");

    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${results.recommendationId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback: feedbackType }), // Przekazuje 'LIKE' lub 'DISLIKE'
      });

      if (response.ok) {
        setFeedbackStatus(feedbackType === "LIKE" ? "LIKED" : "DISLIKED");
      }
    } catch (error) {
      console.error("Błąd podczas wysyłania informacji zwrotnej:", error);
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
                  <Sparkles size={18} />
                  Generuj propozycje
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
            <div className="ai-result-card bg-white p-6 md:p-8 rounded-3xl border border-fitte-sand">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase">
                  <Sparkles size={14} /> Gemini 2.5 Flash
                </div>
                <Rating
                  stars={results.geminiScore}
                  onRate={(s) => handleRate("gemini", s)}
                />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {results.geminiResponse}
              </p>
            </div>

            <div className="ai-result-card bg-white p-6 md:p-8 rounded-3xl border border-fitte-sand">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase">
                  <Monitor size={14} /> Llama 3.3 (Cloud)
                </div>
                <Rating
                  stars={results.mistralScore}
                  onRate={(s) => handleRate("mistral", s)}
                />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {results.mistralResponse}
              </p>
            </div>

            <div className="ai-result-card bg-fitte-brown-dark text-white p-6 md:p-8 rounded-3xl shadow-xl transform md:scale-105 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-fitte-beige font-bold text-[10px] uppercase">
                    <Brain size={14} /> Fitte AI (Hybrid RAG)
                  </div>
                  <Rating
                    stars={results.ragScore}
                    onRate={(s) => handleRate("rag", s)}
                    isDark
                  />
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
                      onClick={() => handleFeedback("LIKE")}
                      disabled={feedbackStatus !== null}
                      className={`p-2 rounded-xl transition-all ${
                        feedbackStatus === "LIKED"
                          ? "bg-green-600 text-white scale-105"
                          : "bg-white/10 text-white hover:bg-white/20"
                      } disabled:cursor-not-allowed`}
                      title="Podoba mi się, podbij wagi ubrań"
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button
                      onClick={() => handleFeedback("DISLIKE")}
                      disabled={feedbackStatus !== null}
                      className={`p-2 rounded-xl transition-all ${
                        feedbackStatus === "DISLIKED"
                          ? "bg-red-600 text-white scale-105"
                          : "bg-white/10 text-white hover:bg-white/20"
                      } disabled:cursor-not-allowed`}
                      title="Nie mój styl, obniż wagi ubrań"
                    >
                      <ThumbsDown size={16} />
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

const Rating = ({ stars, onRate, isDark }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={14}
        onClick={() => onRate(s)}
        className={`cursor-pointer transition-colors ${
          s <= (stars || 0)
            ? "fill-current text-yellow-500"
            : isDark
            ? "text-white/20"
            : "text-gray-200"
        }`}
      />
    ))}
  </div>
);

export default Assistant;