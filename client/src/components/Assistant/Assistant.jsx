import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Star, Sparkles, Brain, Monitor } from 'lucide-react';
import './Assistant.css';

const Assistant = () => {
  const { user } = useAuth();
  const [selectedOccasion, setSelectedOccasion] = useState('Randka');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const occasions = ["Randka", "Praca", "Casual", "Impreza", "Sport", "Podróż"];

  const handleGenerate = async () => {
    if (!prompt && !selectedOccasion) return;
    setLoading(true);
    const token = sessionStorage.getItem("fitte_token");

    const fullQuery = `Okazja: ${selectedOccasion}. Szczegóły: ${prompt}`;

    try {
      const response = await fetch("http://localhost:5001/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: fullQuery }),
      });

      const data = await response.json();
      if (response.ok) setResults(data);
    } catch (error) {
      console.error("Błąd asystenta:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (modelType, score) => {
    const token = sessionStorage.getItem("fitte_token");
    try {
      await fetch(`http://localhost:5001/api/analyze/${results.id}/rate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modelType, score }),
      });
      setResults(prev => ({ ...prev, [`${modelType}Score`]: score }));
    } catch (error) {
      console.error("Błąd oceniania:", error);
    }
  };

  return (
    <main className="assistant-container ml-80 p-12 bg-fitte-cream min-h-screen">
      <header className="mb-10">
        <h2 className="font-playfair text-5xl font-light">
          Co dziś <span className="italic text-fitte-terracotta">założyć?</span>
        </h2>
        <p className="text-fitte-brown-light mt-2">Dostosuję propozycje do Twojego stylu.</p>
      </header>

      <section className="input-card bg-white rounded-[40px] p-10 border border-fitte-sand shadow-sm">
        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">WYBIERZ OKAZJĘ</span>
          <div className="flex flex-wrap gap-3 mt-4">
            {occasions.map(occ => (
              <button 
                key={occ}
                onClick={() => setSelectedOccasion(occ)}
                className={`px-6 py-2 rounded-full border text-xs transition-all ${
                  selectedOccasion === occ 
                  ? 'bg-fitte-brown-dark text-white border-fitte-brown-dark' 
                  : 'bg-transparent border-fitte-sand text-fitte-brown-dark hover:border-fitte-brown-dark'
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
            className="w-full h-32 bg-fitte-cream/50 rounded-2xl p-6 border border-fitte-sand focus:outline-none focus:border-fitte-brown-light resize-none"
            placeholder="Opisz szczegóły (np. idę na kolację, chcę czuć się swobodnie)..."
          />
          <div className="flex justify-between items-center mt-6">
            <div className="flex gap-4 items-center text-[10px] font-bold opacity-50">
              <span>AKTYWNE SILNIKI:</span>
              <span>GPT-4o (RAG)</span>
              <span>GEMINI</span>
              <span>MISTRAL</span>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="bg-fitte-brown-dark text-white px-10 py-3 rounded-xl hover:opacity-90 transition-all font-bold flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Generuj propozycje →"}
            </button>
          </div>
        </div>
      </section>

      {results && (
        <section className="mt-16 animate-fade-in">
          <h3 className="font-playfair text-2xl mb-8">Porównanie inteligentnych propozycji</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* KARTA GEMINI */}
            <div className="ai-result-card bg-white p-8 rounded-3xl border border-fitte-sand">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase">
                    <Sparkles size={14} /> Gemini 1.5
                 </div>
                 <Rating stars={results.geminiScore} onRate={(s) => handleRate('gemini', s)} />
               </div>
               <p className="text-sm text-gray-700 leading-relaxed">{results.geminiResponse}</p>
            </div>

            {/* KARTA MISTRAL */}
            <div className="ai-result-card bg-white p-8 rounded-3xl border border-fitte-sand">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase">
                    <Monitor size={14} /> Mistral (Local)
                 </div>
                 <Rating stars={results.mistralScore} onRate={(s) => handleRate('mistral', s)} />
               </div>
               <p className="text-sm text-gray-700 leading-relaxed">{results.mistralResponse}</p>
            </div>

            {/* KARTA RAG - WYRÓŻNIONA */}
            <div className="ai-result-card bg-fitte-brown-dark text-white p-8 rounded-3xl shadow-xl transform scale-105">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2 text-fitte-beige font-bold text-[10px] uppercase">
                    <Brain size={14} /> Fitte AI (RAG)
                 </div>
                 <Rating stars={results.ragScore} onRate={(s) => handleRate('rag', s)} isDark />
               </div>
               <p className="text-sm text-fitte-beige/90 leading-relaxed font-medium">
                 {results.ragResponse}
               </p>
               <div className="mt-6 pt-6 border-t border-white/10 text-[9px] uppercase tracking-widest opacity-60">
                 Analiza Twojej garderoby zakończona
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
    {[1, 2, 3, 4, 5].map(s => (
      <Star 
        key={s} 
        size={14} 
        onClick={() => onRate(s)}
        className={`cursor-pointer transition-colors ${s <= (stars || 0) ? 'fill-current text-yellow-500' : isDark ? 'text-white/20' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

export default Assistant;