import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import "./History.css";
import { API_BASE_URL } from "../../config";

const History = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  async function fetchHistory() {
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
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchHistory, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

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

  const feedbackView = {
    LIKE: {
      label: "Oceniono: Tak",
      className: "text-emerald-700 bg-emerald-50 border-emerald-100",
      Icon: ThumbsUp,
    },
    DISLIKE: {
      label: "Oceniono: Nie",
      className: "text-rose-700 bg-rose-50 border-rose-100",
      Icon: ThumbsDown,
    },
    PENDING: {
      label: "Bez oceny",
      className: "text-gray-500 bg-gray-50 border-gray-200",
      Icon: Sparkles,
    },
  };

  return (
    <main className="history-container p-4 md:p-10 bg-fitte-cream min-h-screen w-full max-w-full overflow-x-hidden">
      <header className="mb-6 md:mb-12">
        <h2 className="font-playfair text-2xl md:text-4xl mb-1 md:mb-2 leading-tight">
          Historia <span className="italic">Analiz</span>
        </h2>
        <p className="text-gray-400 text-xs md:text-sm">
          Przeglądaj archiwalne zapytania, anonimowe propozycje i zapisane
          oceny.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-fitte-brown-dark italic text-xs md:text-sm">
          Wczytuję Twoje archiwalne stylizacje...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-white rounded-[24px] md:rounded-[30px] p-8 md:p-12 text-center border border-fitte-sand/30 shadow-sm max-w-2xl mx-auto mt-6">
          <MessageSquare
            className="mx-auto text-fitte-sand mb-3 md:mb-4"
            size={36}
          />
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
                    <div className="history-ai-grid grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {item.anonymousComparisons?.map((comparison) => {
                        const feedback =
                          feedbackView[comparison.feedback] ||
                          feedbackView.PENDING;
                        const FeedbackIcon = feedback.Icon;

                        return (
                          <article
                            key={comparison.id}
                            className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-fitte-sand/20 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-fitte-sand/10">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-fitte-brown-dark bg-fitte-cream px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Sparkles size={11} /> {comparison.label}
                                </span>
                                <span
                                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${feedback.className}`}
                                >
                                  <FeedbackIcon size={10} aria-hidden="true" />
                                  {feedback.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                                {comparison.response ||
                                  "Nie udało się zapisać odpowiedzi."}
                              </p>
                            </div>
                            {comparison.items?.length > 0 && (
                              <div className="flex gap-1.5 bg-fitte-sand/10 p-2 rounded-xl justify-center items-center border border-fitte-sand/20 mt-auto overflow-x-auto">
                                {comparison.items.map((cloth) => (
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
                          </article>
                        );
                      })}
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
