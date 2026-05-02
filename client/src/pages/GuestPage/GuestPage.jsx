import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./GuestPage.css";

const GuestPage = () => {
  const navigate = useNavigate();
  const featuresRef = useRef(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="guest-container">
      <header className="guest-nav">
        <h1 className="logo font-playfair italic">Fitte</h1>
        <nav className="nav-auth-group">
          <button
            onClick={() => navigate("/login")}
            className="btn-fitte btn-secondary"
          >
            <span>Zaloguj się</span>
            <span className="btn-icon"></span>
          </button>
          <button
            onClick={() => navigate("/register")}
            className="btn-fitte btn-primary"
          >
            <span>Zarejestruj się</span>
            <span className="btn-icon"></span>
          </button>
        </nav>
      </header>

      <main className="hero-section">
        <h2 className="hero-title font-playfair">
          Twoja szafa w zasięgu{" "}
          <span className="italic text-fitte-terracotta">
            sztucznej inteligencji
          </span>
        </h2>
        <p className="hero-subtitle">
          Fitte to inteligentny system zarządzania garderobą, który wykorzystuje
          <strong> zaawansowaną analizę obrazu</strong> oraz modele{" "}
          <strong>LLM</strong>, aby tworzyć personalizowane stylizacje
          dopasowane do Twojego stylu.
        </p>

        <div className="cta-group">
          <button onClick={() => navigate("/quiz")} className="btn-fitte btn-primary">
            Odkryj swój styl
          </button>
          <button onClick={scrollToFeatures} className="btn-fitte btn-secondary">
            Dowiedz się jak to działa
          </button>
        </div>
      </main>

      <section ref={featuresRef} className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h3>Personalizacja RAG</h3>
          <p>
            Wykorzystujemy technologię Retrieval-Augmented Generation, aby
            system proponował zestawy wyłącznie z Twoich realnych ubrań.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Multimodalna Analiza</h3>
          <p>
            Nasze AI nie tylko widzi ubranie, ale rozumie jego kontekst, okazję
            oraz sposób, w jaki współgra z resztą Twojej kolekcji.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3>Kalkulator Stylu</h3>
          <p>
            Przejdź przez nasz inteligentny quiz, aby zdefiniować parametry
            swojego stylu i otrzymać rekomendacje szyte na miarę.
          </p>
        </div>
      </section>
    </div>
  );
};

export default GuestPage;
