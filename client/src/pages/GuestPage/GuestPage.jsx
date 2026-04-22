import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GuestPage.css';

const GuestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="guest-container">
      <nav className="guest-nav">
        <h1 className="logo font-playfair italic">Fitte</h1>
        <button onClick={() => navigate('/register')} className="btn-outline">Zaloguj się</button>
      </nav>

      <main className="hero-section">
        <h2 className="hero-title font-playfair">
          Twoja szafa w zasięgu <span className="italic text-fitte-terracotta">sztucznej inteligencji</span>
        </h2>
        <p className="hero-subtitle">
          Fitte analizuje Twoje ubrania i dobiera idealne stylizacje przy użyciu zaawansowanych modeli językowych. 
          Oszczędź czas i zawsze wyglądaj świetnie.
        </p>
        
        <div className="cta-group">
          <button onClick={() => navigate('/register')} className="btn-primary">
            Rozpocznij przygodę
          </button>
          <button className="btn-secondary">Dowiedz się jak to działa</button>
        </div>
      </main>

      <section className="features-grid">
        <div className="feature-card">
          <h3>Personalizacja RAG</h3>
          <p>Nasz system zna każdy element Twojej garderoby i proponuje tylko to, co naprawdę masz w szafie.</p>
        </div>
        <div className="feature-card">
          <h3>Analiza Porównawcza</h3>
          <p>Wykorzystujemy moc GPT-4, Gemini i Mistral, aby dostarczyć Ci najbardziej trafne rekomendacje.</p>
        </div>
        <div className="feature-card">
          <h3>Twój Cyfrowy Styl</h3>
          <p>Zdefiniuj swój styl poprzez nasz inteligentny kalkulator i ciesz się modą na nowo.</p>
        </div>
      </section>
    </div>
  );
};

export default GuestPage;