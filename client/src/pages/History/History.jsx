import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Shirt,
  Monitor,
} from "lucide-react";
import "./History.css";
import { API_BASE_URL } from '../../config';

const History = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = sessionStorage.getItem("fitte_token");
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setHistoryItems(data);
      }
    } catch (error) {
      console.error("Nie udało się pobrać historii:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("pl-PL", options);
  };

  return (
    <main className="history-container p-10 bg-fitte-cream min-h-screen">
      <header className="mb-12">
        <h2 className="font-playfair text-4xl mb-2">
          Historia <span className="italic">Analiz</span>
        </h2>
        <p className="text-gray-400 text-sm">
          Przeglądaj swoje archiwalne zapytania i generowane przez AI propozycje
          stylizacji wraz z podglądem ubrań z szafy.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-fitte-brown-dark italic text-sm">
          Wczytuję Twoje archiwalne stylizacje...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-white rounded-[30px] p-12 text-center border border-fitte-sand/30 shadow-sm max-w-2xl mx-auto mt-10">
          <MessageSquare className="mx-auto text-fitte-sand mb-4" size={40} />
          <p className="text-fitte-brown-dark font-medium mb-1">
            Brak zapisanych analiz
          </p>
          <p className="text-gray-400 text-xs">
            Przejdź do zakładki Asystent i wygeneruj swoją pierwszą propozycję!
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-6xl">
          {historyItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`history-card bg-white rounded-3xl border transition-all duration-3xl ${
                  isExpanded
                    ? "border-fitte-brown-dark shadow-sm"
                    : "border-fitte-sand/30 hover:border-fitte-sand"
                }`}
              >
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-6 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-gray-400 text-xs whitespace-nowrap bg-fitte-cream/50 px-3 py-1.5 rounded-xl">
                      <Calendar size={14} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="font-medium text-fitte-brown-dark text-sm truncate pr-4 flex-1">
                      "{item.query}"
                    </p>
                  </div>
                  <div className="text-fitte-brown-dark ml-2">
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-fitte-sand/20 p-6 bg-[#faf8f5]/50 rounded-b-3xl space-y-6">
                    <div className="bg-white rounded-2xl p-4 border border-fitte-sand/20 text-xs">
                      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-fitte-brown-dark/70 mb-2">
                        <Shirt size={14} />
                        <span>
                          Stan szafy i dane wejściowe podczas zapytania
                        </span>
                      </div>
                      <pre className="font-sans text-gray-500 whitespace-pre-wrap leading-relaxed">
                        {item.contextUsed || "Brak zarejestrowanego kontekstu."}
                      </pre>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* GEMINI COLUMN */}
                      <div className="bg-white rounded-2xl p-5 border border-fitte-sand/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-fitte-sand/10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Sparkles size={12} /> Gemini 2.5
                            </span>
                          </div>
                          <p className="text-xs text-fitte-brown-dark leading-relaxed whitespace-pre-wrap mb-4">
                            {item.geminiResponse || "Model nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.geminiItems && item.geminiItems.length > 0 && (
                          <div className="flex gap-2 bg-fitte-sand/10 p-2 rounded-xl justify-center items-center border border-fitte-sand/20 mt-auto">
                            {item.geminiItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-12 h-16 object-contain bg-white rounded-lg p-1 shadow-xs"
                                title={cloth.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* LLAMA COLUMN */}
                      <div className="bg-white rounded-2xl p-5 border border-fitte-sand/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-fitte-sand/10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Monitor size={12} /> Llama 3.3 (Cloud)
                            </span>
                          </div>
                          <p className="text-xs text-fitte-brown-dark leading-relaxed whitespace-pre-wrap mb-4">
                            {item.mistralResponse || "Model nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.llamaItems && item.llamaItems.length > 0 && (
                          <div className="flex gap-2 bg-fitte-sand/10 p-2 rounded-xl justify-center items-center border border-fitte-sand/20 mt-auto">
                            {item.llamaItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-12 h-16 object-contain bg-white rounded-lg p-1 shadow-xs"
                                title={cloth.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* HYBRID RAG COLUMN */}
                      <div className="bg-fitte-brown-dark rounded-2xl p-5 text-white flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-fitte-cream bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Sparkles size={10} /> FITTE AI (RAG)
                            </span>
                          </div>
                          <p className="text-xs text-fitte-cream/90 leading-relaxed whitespace-pre-wrap font-light mb-4">
                            {item.ragResponse || "System RAG nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.ragItems && item.ragItems.length > 0 && (
                          <div className="flex gap-2 bg-white/10 p-2 rounded-xl justify-center items-center backdrop-blur-sm border border-white/5 mt-auto">
                            {item.ragItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-12 h-16 object-contain bg-white rounded-lg p-1 shadow-xs"
                                title={cloth.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default History;