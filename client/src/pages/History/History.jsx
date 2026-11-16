import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Search,
  X,
} from "lucide-react";
import "./History.css";
import { API_BASE_URL } from "../../config";

const History = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;

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

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return historyItems;

    return historyItems.filter((item) =>
      (item.query || "").toLowerCase().includes(query),
    );
  }, [historyItems, searchQuery]);

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((firstItem, secondItem) => {
      const firstDate = new Date(firstItem.createdAt || 0).getTime();
      const secondDate = new Date(secondItem.createdAt || 0).getTime();

      return sortBy === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [filteredHistory, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedHistory.length / ITEMS_PER_PAGE),
  );

  const activePage = Math.min(currentPage, totalPages);

  const paginatedHistory = useMemo(() => {
    const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
    return sortedHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activePage, sortedHistory]);

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

      {historyItems.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Szukaj w opisach analiz..."
              className="w-full rounded-full border border-fitte-sand/50 bg-white py-2 pl-9 pr-8 text-xs shadow-2xs outline-none transition-colors focus:border-fitte-brown-dark"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-fitte-brown-dark"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-fitte-brown-dark">
            Sortuj:
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-fitte-sand bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-fitte-brown-dark"
            >
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
            </select>
          </label>
        </div>
      )}

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
      ) : sortedHistory.length === 0 ? (
        <div className="bg-white rounded-[24px] p-8 text-center border border-fitte-sand/30 shadow-sm max-w-2xl mx-auto mt-6">
          <p className="text-fitte-brown-dark font-medium text-sm">
            Nie znaleziono analiz dla podanej frazy.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="mt-3 text-xs font-bold text-fitte-brown-dark hover:underline"
          >
            Wyczyść wyszukiwanie
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:space-y-4 max-w-6xl w-full">
            {paginatedHistory.map((item) => {
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
                                    <FeedbackIcon
                                      size={10}
                                      aria-hidden="true"
                                    />
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
          {sortedHistory.length > ITEMS_PER_PAGE && (
            <nav
              className="mt-8 flex items-center justify-center gap-3"
              aria-label="Strony historii analiz"
            >
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                disabled={activePage === 1}
                className="rounded-lg border border-fitte-sand bg-white px-3 py-2 text-xs font-bold text-fitte-brown-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Poprzednia
              </button>

              <span className="text-xs text-gray-500">
                Strona {activePage} z {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, activePage + 1))
                }
                disabled={activePage === totalPages}
                className="rounded-lg border border-fitte-sand bg-white px-3 py-2 text-xs font-bold text-fitte-brown-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Następna
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
};

export default History;
