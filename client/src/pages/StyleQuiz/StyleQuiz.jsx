import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StyleQuiz.css';

const questions = [
  {
    id: 1,
    category: "Paleta",
    question: "W jakich barwach Twoja dusza czuje się najpewniej?",
    options: [
      { label: "Quiet Luxury", sub: "Beże, śmietanka, szarości", value: "Minimalizm", colors: ["#F7F3EE", "#E8DDD0", "#C9B8A4"] },
      { label: "Deep Earth", sub: "Czekolada, terakota, oliwka", value: "Boho", colors: ["#3D2B1F", "#C17F5A", "#4B5320"] },
      { label: "Midnight Elegance", sub: "Czerń, granat, grafit", value: "Classic", colors: ["#1A1A1A", "#000033", "#2F2F2F"] },
      { label: "Soft Muse", sub: "Pudrowy róż, szałwia, błękit", value: "Romantic", colors: ["#FADADD", "#B2AC88", "#F0F8FF"] }
    ]
  },
  {
    id: 2,
    category: "Sylwetka",
    question: "Która linia kroju definiuje Twój charakter?",
    options: [
      { label: "Architektoniczna", sub: "Ostre cięcia, oversize, forma", value: "Modern" },
      { label: "Sensualna", sub: "Podkreślona talia, lejące tkaniny", value: "Chic" },
      { label: "Swobodna", sub: "Miękkie linie, komfort, warstwy", value: "Casual" },
      { label: "Posągowa", sub: "Dopasowanie, symetria, rygor", value: "Classic" }
    ]
  },
  {
    id: 3,
    category: "Materiały",
    question: "Dotyk której tkaniny sprawia Ci największą przyjemność?",
    options: [
      { label: "Szlachetny Jedwab", sub: "Chłód, połysk, delikatność", value: "Chic" },
      { label: "Surowy Len", sub: "Tekstura, natura, oddech", value: "Boho" },
      { label: "Gęsta Wełna", sub: "Ciepło, struktura, jakość", value: "Minimalizm" },
      { label: "Techniczny Nylon", sub: "Nowoczesność, funkcja, połysk", value: "Modern" }
    ]
  },
  {
    id: 4,
    category: "Inspiracja",
    question: "Gdzie Twoje oczy szukają piękna?",
    options: [
      { label: "Modernizm", sub: "Mniej znaczy więcej", value: "Minimalizm" },
      { label: "Vintage Vogue", sub: "Klasyka lat 90.", value: "Classic" },
      { label: "Etniczne Echo", sub: "Wzory, rzemiosło, historia", value: "Boho" },
      { label: "Cyber Punk", sub: "Futuryzm i technologia", value: "Modern" }
    ]
  },
  {
    id: 5,
    category: "Akcesoria",
    question: "Dopełnieniem Twojego wizerunku jest...",
    options: [
      { label: "Zegarek z historią", value: "Classic" },
      { label: "Wyrazista biżuteria", value: "Chic" },
      { label: "Jedwabna apaszka", value: "Romantic" },
      { label: "Designerskie okulary", value: "Modern" }
    ]
  },
  {
    id: 6,
    category: "Vibe",
    question: "Gdybyś miała opisać swój styl jednym słowem...",
    options: [
      { label: "Wyrafinowany", value: "Minimalizm" },
      { label: "Wolny", value: "Boho" },
      { label: "Ponadczasowy", value: "Classic" },
      { label: "Awangardowy", value: "Modern" }
    ]
  }
];

const StyleQuiz = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const navigate = useNavigate();

  const handleOptionClick = (value) => {
    const newAnswers = [...answers, value];
    if (currentStep < questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentStep(currentStep + 1);
    } else {
      const counts = {};
      newAnswers.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
      const result = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      
      navigate('/register', { state: { suggestedStyle: result } });
    }
  };

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="quiz-page bg-fitte-cream">
      <div className="quiz-header">
        <h1 className="quiz-logo font-playfair italic">Fitte</h1>
        <div className="quiz-progress-container">
          <div className="quiz-progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="quiz-container">
        <div className="quiz-content">
          <header className="question-header">
            <span className="category-label">{questions[currentStep].category}</span>
            <h2 className="quiz-question font-playfair">{questions[currentStep].question}</h2>
          </header>
          
          <div className="options-layout">
            {questions[currentStep].options.map((option, idx) => (
              <button 
                key={idx} 
                onClick={() => handleOptionClick(option.value)}
                className="luxury-option"
              >
                <div className="option-info">
                  <span className="option-label font-playfair">{option.label}</span>
                  {option.sub && <span className="option-sub">{option.sub}</span>}
                </div>
                {option.colors && (
                  <div className="option-colors">
                    {option.colors.map(c => <div key={c} className="color-dot" style={{backgroundColor: c}}></div>)}
                  </div>
                )}
                <div className="hover-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="quiz-footer">
        <p>Krok {currentStep + 1} z {questions.length}</p>
      </div>
    </div>
  );
};

export default StyleQuiz;