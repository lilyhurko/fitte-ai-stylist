import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Assistant.css';

const Assistant = () => {
  const { user } = useAuth();
  const [selectedOccasion, setSelectedOccasion] = useState('Randka');
  const [prompt, setPrompt] = useState('');

  const occasions = ["Randka", "Praca", "Casual", "Impreza", "Sport", "Podróż"];

  return (
    <main className="assistant-container ml-80 p-12 bg-fitte-cream min-h-screen">
      <header className="mb-10">
        <h2 className="font-playfair text-5xl font-light">
          Co dziś <span className="italic text-fitte-terracotta">założyć?</span>
        </h2>
        <p className="text-fitte-brown-light mt-2">Dostosuję propozycje do Twojego stylu: <strong>{user?.styleTags?.[0]}</strong></p>
      </header>

      <section className="input-card bg-white rounded-[40px] p-10 border border-fitte-sand shadow-sm">
        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">OKAZJA</span>
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
            <div className="flex gap-4 items-center text-[10px] font-bold">
              <span>MODELE:</span>
              <span className="text-green-600">GPT-4o ✓</span>
              <span className="text-green-600">Gemini ✓</span>
              <span className="text-green-600">Mistral ✓</span>
            </div>
            <button className="bg-fitte-brown-dark text-white px-10 py-3 rounded-xl hover:opacity-90 transition-all font-bold">
              Generuj →
            </button>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h3 className="font-playfair text-2xl mb-8">Propozycje z Twojej garderoby</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tu później wstawimy mapowanie po wynikach z AI */}
          {[1, 2, 3].map(card => (
            <div key={card} className="bg-white p-6 rounded-3xl border border-fitte-sand shadow-sm hover:shadow-md transition-all">
               <div className="flex justify-between text-[10px] mb-4">
                 <span className="font-bold">Mistral ✓ ★★★★☆</span>
               </div>
               <div className="grid grid-cols-3 gap-2 mb-4">
                 <div className="aspect-square bg-fitte-beige rounded-lg"></div>
                 <div className="aspect-square bg-fitte-beige rounded-lg"></div>
                 <div className="aspect-square bg-fitte-beige rounded-lg"></div>
               </div>
               <p className="text-xs text-gray-700 leading-relaxed mb-6">
                 Beżowe szerokie spodnie + zielona bluzka + złote dodatki. Idealne na {selectedOccasion.toLowerCase()}.
               </p>
               <div className="flex gap-2">
                 <button className="flex-1 bg-fitte-brown-dark text-white py-2 rounded-lg text-[10px] font-bold">Podoba mi się</button>
                 <button className="flex-1 border border-fitte-sand py-2 rounded-lg text-[10px] font-bold">Zapisz</button>
               </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Assistant;