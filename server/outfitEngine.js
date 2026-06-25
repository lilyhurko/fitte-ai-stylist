function calculateOutfitScore(outfit, userProfile, eventContext) {
  let score = 50; 
  
  const userStyleWeights = userProfile.styleWeights ? JSON.parse(userProfile.styleWeights) : {};
  const userColorWeights = userProfile.colorWeights ? JSON.parse(userProfile.colorWeights) : {};

  outfit.forEach(item => {
    if (item.style && userStyleWeights[item.style]) {
      score += userStyleWeights[item.style] * 10;
    }
  });

  outfit.forEach(item => {
    if (item.color && userColorWeights[item.color]) {
      score += userColorWeights[item.color] * 5;
    }
  });
  const colors = outfit.map(i => i.color?.toLowerCase());
  if (colors.includes('czarny') && (colors.includes('biały') || colors.includes('kremowy'))) {
    score += 15;
  }

  if (eventContext) {
    const formalityTarget = eventContext.formality; 
    outfit.forEach(item => {
      if (item.style === "Minimalizm" || item.style === "Classic") {
        if (formalityTarget === "Formal") score += 15;
      }
      if (item.style === "Streetwear" && formalityTarget === "Formal") {
        score -= 20; 
      }
    });
  }

  return {
    totalScore: score,
    details: {
      styleWeights: userStyleWeights,
      colorWeights: userColorWeights
    }
  };
}

function generateBestOutfits(clothes, userProfile, eventContext) {
  const goras = clothes.filter(c => c.category === "Góra");
  const dols = clothes.filter(c => c.category === "Dół");
  const sukienki = clothes.filter(c => c.category === "Sukienki");

  let combinations = [];

  goras.forEach(g => {
    dols.forEach(d => {
      const outfit = [g, d];
      const scoring = calculateOutfitScore(outfit, userProfile, eventContext);
      combinations.push({ outfit, ...scoring });
    });
  });

  sukienki.forEach(s => {
    const outfit = [s];
    const scoring = calculateOutfitScore(outfit, userProfile, eventContext);
    combinations.push({ outfit, ...scoring });
  });

  combinations.sort((a, b) => b.totalScore - a.totalScore);
  
  return combinations.slice(0, 3); 
}

module.exports = { generateBestOutfits };