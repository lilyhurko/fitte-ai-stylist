const OCCASION_STYLE_MATCH = {
  "Randka": ["Chic", "Romantic"], 
  "Praca": ["Classic", "Minimalizm"], 
  "Casual": ["Casual", "Streetwear", "Boho"], 
  "Impreza": ["Modern", "Streetwear", "Chic"],
  "Sport": ["Sport", "Streetwear"], 
  "Podróż": ["Casual", "Streetwear"]
};

function calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion) {
  let score = 50; 
  
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
      appliedOccasion: activeOccasion
    }
  };
}
function generateBestOutfits(clothes, userProfile, eventContext, selectedOccasion) {
  const goras = clothes.filter(c => c.category === "Góra");
  const dols = clothes.filter(c => c.category === "Dół");
  const sukienki = clothes.filter(c => c.category === "Sukienki");

  let combinations = [];

  goras.forEach(g => {
    dols.forEach(d => {
      const outfit = [g, d];
      const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion);
      combinations.push({ outfit, ...scoring });
    });
  });

  sukienki.forEach(s => {
    const outfit = [s];
    const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion);
    combinations.push({ outfit, ...scoring });
  });

  combinations.sort((a, b) => b.totalScore - a.totalScore);
  
  return combinations.slice(0, 3); 
}

module.exports = { generateBestOutfits };