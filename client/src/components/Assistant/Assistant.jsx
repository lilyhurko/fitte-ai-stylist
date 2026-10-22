import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useWardrobe } from "../../context/WardrobeContext";
import {
  ArrowRight,
  Shirt,
  Loader2,
  Sparkles,
  CircleAlert,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import "./Assistant.css";
import { API_BASE_URL } from "../../config";

const Assistant = () => {
  const { logout } = useAuth();
  const { clothes } = useWardrobe();
  const navigate = useNavigate();

  const wardrobeReadiness = useMemo(() => {
    const hasTop = clothes.some((item) => item.category === "Góra");

    const hasBottomOrDress = clothes.some(
      (item) => item.category === "Dół" || item.category === "Sukienki",
    );

    const hasShoes = clothes.some((item) => item.category === "Obuwie");

    const missingParts = [];

    if (!hasTop) missingParts.push("góry");
    if (!hasBottomOrDress) missingParts.push("dołu lub sukienki");
    if (!hasShoes) missingParts.push("obuwia");

    return {
      isEmpty: clothes.length === 0,
      isComplete: hasTop && hasBottomOrDress && hasShoes,
      missingParts,
    };
  }, [clothes]);
  const [selectedOccasion, setSelectedOccasion] = useState("Randka");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [generationError, setGenerationError] = useState("");

  const [comparisonFeedback, setComparisonFeedback] = useState({});

  const occasions = ["Randka", "Praca", "Casual", "Impreza", "Sport", "Podróż"];

  const handleGenerate = async () => {
    if (loading || (!prompt && !selectedOccasion)) return;

    if (wardrobeReadiness.isEmpty) {
      setGenerationError(
        "Dodaj przynajmniej jedno ubranie do garderoby, zanim poprosisz o propozycję.",
      );
      return;
    }

    setLoading(true);
    setGenerationError("");

    const fullQuery = `Okazja: ${selectedOccasion}. Szczegóły: ${prompt}`;

    const getCoordinates = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ latitude: 51.2465, longitude: 22.5684 });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {
            resolve({ latitude: 51.2465, longitude: 22.5684 });
          },
          { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 },
        );
      });
    };

    try {
      const coords = await getCoordinates();

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: fullQuery,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        console.warn("Sesja wygasła. Wylogowywanie...");
        logout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setGenerationError(
          data.error ||
            "Nie udało się wygenerować propozycji. Spróbuj ponownie za chwilę.",
        );
        return;
      }

      setResults(data);
      setComparisonFeedback({});
    } catch (error) {
      console.error("Błąd asystenta podczas wysyłania żądania:", error);
      setGenerationError(
        "Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleComparisonFeedback = async (comparison, feedbackType) => {
    const analysisId = results?.id || results?._id;

    if (!analysisId || comparisonFeedback[comparison.id]) return;

    try {
      if (comparison.feedbackType === "fitte") {
        const response = await fetch(
          `${API_BASE_URL}/recommendations/${comparison.recommendationId}/feedback`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              feedback: feedbackType,
              analysisId,
            }),
          },
        );

        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }

        if (!response.ok) return;
      } else {
        const response = await fetch(
          `${API_BASE_URL}/analyze/${analysisId}/feedback`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              modelType: comparison.feedbackType,
              feedback: feedbackType,
            }),
          },
        );

        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }

        if (!response.ok) return;
      }

      setComparisonFeedback((previousFeedback) => ({
        ...previousFeedback,
        [comparison.id]: feedbackType,
      }));
    } catch (error) {
      console.error("Nie udało się zapisać anonimowej oceny:", error);
    }
  };
  return (
    <main className="assistant-container">
      <header className="mb-6 mt-1">
        <h2 className="font-playfair text-3xl md:text-5xl font-light leading-tight">
          Co dziś <span className="italic text-fitte-terracotta">założyć?</span>
        </h2>
        <p className="text-fitte-brown-light text-xs md:text-sm mt-1.5">
          Dostosuję propozycje do Twojego stylu.
        </p>
      </header>
      {!wardrobeReadiness.isComplete && (
        <section className="wardrobe-assistant-hint" role="status">
          <div className="wardrobe-assistant-hint-icon">
            <Shirt size={20} aria-hidden="true" />
          </div>

          <div>
            <p className="wardrobe-assistant-hint-title">
              {wardrobeReadiness.isEmpty
                ? "Twoja garderoba jest jeszcze pusta"
                : "Możemy stworzyć propozycję, ale szafa nie jest jeszcze kompletna"}
            </p>

            <p className="wardrobe-assistant-hint-text">
              {wardrobeReadiness.isEmpty
                ? "Dodaj pierwsze ubranie, aby Fitte mogło przygotować stylizację z Twojej prawdziwej szafy."
                : `Dla pełniejszych zestawów warto dodać: ${wardrobeReadiness.missingParts.join(
                    ", ",
                  )}.`}
            </p>
          </div>

          <button
            type="button"
            className="wardrobe-assistant-hint-action"
            onClick={() => navigate("/wardrobe")}
          >
            Przejdź do szafy
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      )}

      <section className="input-card bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-10 border border-fitte-sand shadow-sm">
        <div className="mb-5">
          <span className="text-[10px] font-bold tracking-widest text-fitte-brown-dark block mb-3">
            WYBIERZ OKAZJĘ
          </span>
          <div className="flex flex-wrap gap-2">
            {occasions.map((occ) => (
              <button
                key={occ}
                onClick={() => setSelectedOccasion(occ)}
                className={`px-3.5 md:px-6 py-2 rounded-full border text-xs transition-all touch-manipulation ${
                  selectedOccasion === occ
                    ? "bg-fitte-brown-dark text-white border-fitte-brown-dark font-medium"
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
            className="w-full h-28 md:h-32 bg-fitte-cream/50 rounded-2xl p-4 border border-fitte-sand focus:outline-none focus:border-fitte-brown-light resize-none text-sm leading-relaxed"
            placeholder="Opisz szczegóły (np. idę na kolację, chcę czuć się swobodnie)..."
          />

          <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-4 mt-5">
            <div className="flex flex-wrap gap-2 md:gap-3 items-center text-[9px] font-bold opacity-50">
              <span className="w-full md:w-auto">
                AKTYWNE SILNIKI BADAWCZE:
              </span>
              <span>GEMINI 2.5</span>
              <span>•</span>
              <span>GPT-OSS 120B</span>
              <span>•</span>
              <span>FITTE ENGINE</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="generate-btn w-full md:w-auto bg-fitte-brown-dark text-white px-8 py-3.5 rounded-full hover:opacity-90 active:scale-95 transition-all font-bold flex items-center justify-center gap-2.5 text-sm shadow-sm touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Tworzę propozycje…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generuj propozycje
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <section className="generation-status" role="status" aria-live="polite">
          <Loader2 className="animate-spin" size={20} aria-hidden="true" />
          <div>
            <p className="font-semibold">Tworzę Twoje propozycje…</p>
            <p>
              Analizuję szafę, okazję i pogodę. Zwykle zajmuje to kilkanaście
              sekund.
            </p>
            {results && <p>Poprzednia rekomendacja pozostaje widoczna.</p>}
          </div>
        </section>
      )}

      {generationError && (
        <section className="generation-error" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <div>
            <p>{generationError}</p>
            <button type="button" onClick={handleGenerate}>
              <RefreshCw size={14} aria-hidden="true" /> Spróbuj ponownie
            </button>
          </div>
        </section>
      )}

      {results && (
        <section className="mt-8 md:mt-16 animate-fade-in">
          <div className="results-intro">
            <p className="results-eyebrow">PORÓWNANIE</p>
            <h3 className="font-playfair text-xl md:text-2xl">
              Która propozycja najlepiej pasuje do Ciebie?
            </h3>
            <p className="results-description">
              Oceń każdą stylizację niezależnie. Źródła propozycji są celowo
              ukryte, aby ocena dotyczyła wyłącznie jakości zestawu.
            </p>
          </div>

          <div className="results-grid">
            {results.anonymousComparisons?.map((comparison) => {
              const feedback = comparisonFeedback[comparison.id];

              return (
                <article
                  key={comparison.id}
                  className="ai-result-card anonymous-result-card"
                >
                  <div className="ai-text-content">
                    <div className="anonymous-result-label">
                      <Sparkles size={14} aria-hidden="true" />
                      {comparison.label}
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      {comparison.response}
                    </p>

                    {comparison.availability?.status === "SINGLE" && (
                      <div
                        className="recommendation-availability-note"
                        role="status"
                      >
                        {comparison.availability.message}
                      </div>
                    )}

                    {comparison.items?.length > 0 ? (
                      <div className="comparison-items">
                        {comparison.items.map((cloth) => (
                          <img
                            key={cloth.id}
                            src={cloth.imageUrl}
                            alt={cloth.name}
                            className="w-14 h-18 object-contain bg-white rounded-xl p-1 shadow-sm flex-shrink-0"
                            title={cloth.name}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="comparison-no-items">
                        Nie udało się jednoznacznie połączyć wszystkich
                        elementów propozycji z ubraniami w Twojej szafie.
                      </div>
                    )}
                  </div>

                  <div className="comparison-feedback">
                    <span className="comparison-feedback-question">
                      Czy założyłabyś tę stylizację?
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleComparisonFeedback(comparison, "LIKE")
                        }
                        disabled={Boolean(feedback)}
                        aria-label={`Polub ${comparison.label}`}
                        className={`comparison-feedback-button ${
                          feedback === "LIKE"
                            ? "comparison-feedback-button-like"
                            : ""
                        }`}
                      >
                        <ThumbsUp size={16} aria-hidden="true" />
                        Tak
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleComparisonFeedback(comparison, "DISLIKE")
                        }
                        disabled={Boolean(feedback)}
                        aria-label={`Odrzuć ${comparison.label}`}
                        className={`comparison-feedback-button ${
                          feedback === "DISLIKE"
                            ? "comparison-feedback-button-dislike"
                            : ""
                        }`}
                      >
                        <ThumbsDown size={16} aria-hidden="true" />
                        Nie
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default Assistant;
