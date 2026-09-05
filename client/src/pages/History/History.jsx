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
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        credentials: "include",
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("pl-PL", options);
  };

  return (
    <main className="history-container p-4 md:p-10 bg-fitte-cream min-h-screen w-full max-w-full overflow-x-hidden">
      <header className="mb-6 md:mb-12">
        <h2 className="font-playfair text-2xl md:text-4xl mb-1 md:mb-2 leading-tight">
          Historia <span className="italic">Analiz</span>
        </h2>
        <p className="text-gray-400 text-xs md:text-sm">
          Przeglądaj swoje archiwalne zapytania i generowane przez AI propozycje
          stylizacji.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-fitte-brown-dark italic text-xs md:text-sm">
          Wczytuję Twoje archiwalne stylizacje...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-white rounded-[24px] md:rounded-[30px] p-8 md:p-12 text-center border border-fitte-sand/30 shadow-sm max-w-2xl mx-auto mt-6">
          <MessageSquare className="mx-auto text-fitte-sand mb-3 md:mb-4" size={36} />
          <p className="text-fitte-brown-dark font-medium mb-1 text-sm md:text-base">
            Brak zapisanych analiz
          </p>
          <p className="text-gray-400 text-xs">
            Przejdź do zakładki Asystent i wygeneruj swoją pierwszą propozycję!
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4 max-w-6xl w-full">
          {historyItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`history-card bg-white rounded-2xl md:rounded-3xl border transition-all ${
                  isExpanded
                    ? "border-fitte-brown-dark shadow-sm"
                    : "border-fitte-sand/30 hover:border-fitte-sand"
                }`}
              >
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="history-card-header p-4 md:p-6 flex items-start md:items-center justify-between cursor-pointer select-none touch-manipulation"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] md:text-xs whitespace-nowrap bg-fitte-cream/50 px-2.5 py-1 rounded-lg w-fit">
                      <Calendar size={12} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="query-text font-medium text-fitte-brown-dark text-xs md:text-sm truncate pr-2 flex-1">
                      "{item.query}"
                    </p>
                  </div>
                  <div className="text-fitte-brown-dark ml-2 shrink-0 pt-0.5 md:pt-0">
                    {isExpanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-fitte-sand/20 p-4 md:p-6 bg-[#faf8f5]/50 rounded-b-2xl md:rounded-b-3xl space-y-4 md:space-y-6">
                    <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-fitte-sand/20 text-xs">
                      <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-fitte-brown-dark/70 mb-1.5 text-[10px] md:text-xs">
                        <Shirt size={13} />
                        <span>Stan szafy i dane wejściowe</span>
                      </div>
                      <pre className="font-sans text-gray-500 whitespace-pre-wrap leading-relaxed text-[10px] md:text-xs max-h-32 overflow-y-auto">
                        {item.contextUsed || "Brak zarejestrowanego kontekstu."}
                      </pre>
                    </div>

                    <div className="history-ai-grid grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-fitte-sand/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-fitte-sand/10">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Sparkles size={11} /> Gemini 2.5
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                            {item.geminiResponse || "Model nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.geminiItems && item.geminiItems.length > 0 && (
                          <div className="flex gap-1.5 bg-fitte-sand/10 p-2 rounded-xl justify-center items-center border border-fitte-sand/20 mt-auto overflow-x-auto">
                            {item.geminiItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-10 h-14 md:w-12 md:h-16 object-contain bg-white rounded-lg p-1 shadow-2xs shrink-0"
                                title={cloth.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-fitte-sand/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-fitte-sand/10">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Monitor size={11} /> GPT-OSS 120B
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                            {item.mistralResponse || "Model nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.llamaItems && item.llamaItems.length > 0 && (
                          <div className="flex gap-1.5 bg-fitte-sand/10 p-2 rounded-xl justify-center items-center border border-fitte-sand/20 mt-auto overflow-x-auto">
                            {item.llamaItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-10 h-14 md:w-12 md:h-16 object-contain bg-white rounded-lg p-1 shadow-2xs shrink-0"
                                title={cloth.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-fitte-brown-dark rounded-xl md:rounded-2xl p-4 md:p-5 text-white flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-fitte-cream bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Sparkles size={10} /> FITTE AI (RAG)
                            </span>
                          </div>
                          <p className="text-xs text-fitte-cream/90 leading-relaxed whitespace-pre-wrap font-light mb-3">
                            {item.ragResponse || "System RAG nie zwrócił odpowiedzi."}
                          </p>
                        </div>
                        {item.ragItems && item.ragItems.length > 0 && (
                          <div className="flex gap-1.5 bg-white/10 p-2 rounded-xl justify-center items-center backdrop-blur-sm border border-white/5 mt-auto overflow-x-auto">
                            {item.ragItems.map((cloth) => (
                              <img
                                key={cloth.id}
                                src={cloth.imageUrl}
                                alt={cloth.name}
                                className="w-10 h-14 md:w-12 md:h-16 object-contain bg-white rounded-lg p-1 shadow-2xs shrink-0"
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
