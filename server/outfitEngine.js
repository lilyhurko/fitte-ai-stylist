const OCCASION_STYLE_MATCH = {
  "Randka": ["Chic", "Romantic"], 
  "Praca": ["Classic", "Minimalizm"], 
  "Casual": ["Casual", "Streetwear", "Boho"], 
  "Impreza": ["Modern", "Streetwear", "Chic"],
  "Sport": ["Sport", "Streetwear"], 
  "Podróż": ["Casual", "Streetwear"]
};

const WEATHER_BLACKLIST = {
  "Rain": {
    categories: ["Sukienki"], 
    styles: []
  },
  "Hot": {
    categories: [],
    styles: ["Classic"] 
  },
  "Cold": {
    categories: ["Sukienki"], 
    styles: ["Boho"]
  }
};

function calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType = "Clear") {
  let score = 50; 
  
  if (weatherType && WEATHER_BLACKLIST[weatherType]) {
    const blacklist = WEATHER_BLACKLIST[weatherType];
    let czyUbranieZablokowane = false;

    outfit.forEach(item => {
      const cat = item.category;
      const st = item.style;
      
      if (blacklist.categories.includes(cat) || (st && blacklist.styles.includes(st))) {
        czyUbranieZablokowane = true;
      }
    });

    if (czyUbranieZablokowane) {
      return {
        totalScore: -999,
        details: { message: `Zestaw odrzucony: nieadekwatny do pogody (${weatherType})` }
      };
    }
  }
  
  const userStyleWeights = userProfile.styleWeights ? JSON.parse(userProfile.styleWeights) : {};
  const userColorWeights = userProfile.colorWeights ? JSON.parse(userProfile.colorWeights) : {};

  const activeOccasion = eventContext?.occasion || selectedOccasion;
  let contextMultiplier = 1.0;

  if (activeOccasion && OCCASION_STYLE_MATCH[activeOccasion]) {
    const allowedStyles = OCCASION_STYLE_MATCH[activeOccasion];
    
    outfit.forEach(item => {
      if (item.style && allowedStyles.includes(item.style)) {
        score += 40; 
      } else {
        score -= 100; 
        contextMultiplier = 0.1; 
      }
    });
  }

  let preferenceScore = 0;
  outfit.forEach(item => {
    if (item.style && userStyleWeights[item.style]) {
      preferenceScore += userStyleWeights[item.style] * 1.5; 
    }
    if (item.color && userColorWeights[item.color]) {
      preferenceScore += userColorWeights[item.color] * 1.0;
    }
  });

  score += (preferenceScore * contextMultiplier);

  const colors = outfit.map(i => i.color?.toLowerCase());
  if (colors.includes('czarny') && (colors.includes('biały') || colors.includes('kremowy'))) {
    score += 10;
  }

  if (eventContext) {
    const formalityTarget = eventContext.formality; 
    outfit.forEach(item => {
      if (item.style === "Minimalizm" || item.style === "Classic") {
        if (formalityTarget === "Formal") score += 15;
      }
      if (item.style === "Streetwear" && formalityTarget === "Formal") {
        score -= 25; 
      }
    });
  }

  return {
    totalScore: score,
    details: {
      styleWeights: userStyleWeights,
      colorWeights: userColorWeights,
      appliedOccasion: activeOccasion,
      appliedWeather: weatherType
    }
  };
}

function generateBestOutfits(clothes, userProfile, eventContext, selectedOccasion, weatherType = "Clear") {
  const goras = clothes.filter(c => c.category === "Góra");
  const dols = clothes.filter(c => c.category === "Dół");
  const sukienki = clothes.filter(c => c.category === "Sukienki");

  let combinations = [];

  goras.forEach(g => {
    dols.forEach(d => {
      const outfit = [g, d];
      const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType);
      combinations.push({ outfit, ...scoring });
    });
  });

  sukienki.forEach(s => {
    const outfit = [s];
    const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType);
    combinations.push({ outfit, ...scoring });
  });

  combinations.sort((a, b) => b.totalScore - a.totalScore);
  
  return combinations.slice(0, 3); 
}

module.exports = { generateBestOutfits };