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
    categories: ["Sukienki", "Sandały"], 
    colors: [],
    forbiddenKeywords: ["sandał", "klapk", "siatkow"]
  },
  "Hot": {
    categories: [],
    styles: ["Classic"], 
    colors: ["czarny", "ciemnobrązowy", "granatowy"], 
    forbiddenKeywords: ["bufiast", "grub", "wełn", "skórz", "kozak", "śniegowc"]
  },
  "Cold": {
    categories: ["Sukienki", "Sandały"], 
    styles: ["Boho"],
    colors: [],
    forbiddenKeywords: ["cienki", "krótki", "jedwab", "sandał", "klapk", "letni"]
  }
};

const COLOR_HARMONIES = {
  "czarny": ["biały", "kremowy", "beżowy", "szary", "pastelowy róż"],
  "granatowy": ["biały", "beżowy", "kremowy", "ecru", "czerwony"],
  "biały": ["czarny", "granatowy", "ciemnobrązowy", "beżowy", "zielono-biały"],
  "kremowy": ["ciemnobrązowy", "czarny", "granatowy", "beżowy", "ecru"],
  "beżowy": ["ciemnobrązowy", "biały", "kremowy", "ecru"],
  "ciemnobrązowy": ["kremowy", "beżowy", "pastelowy róż", "ecru"]
};

function calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType = "Clear") {
  let score = 100;
  
  const userStyleWeights = userProfile.styleWeights ? JSON.parse(userProfile.styleWeights) : {};
  const userColorWeights = userProfile.colorWeights ? JSON.parse(userProfile.colorWeights) : {};
  const activeOccasion = eventContext?.occasion || selectedOccasion;

  if (weatherType && WEATHER_BLACKLIST[weatherType]) {
    const blacklist = WEATHER_BLACKLIST[weatherType];
    let isWeatherIncompatible = false;

    outfit.forEach(item => {
      const cat = item.category;
      const st = item.style;
      const col = item.color ? item.color.toLowerCase() : "";
      const name = item.name ? item.name.toLowerCase() : "";

      if (blacklist.categories.includes(cat) || (st && blacklist.styles.includes(st))) {
        isWeatherIncompatible = true;
      }
      if (blacklist.colors && blacklist.colors.includes(col)) {
        isWeatherIncompatible = true;
      }
      if (blacklist.forbiddenKeywords) {
        blacklist.forbiddenKeywords.forEach(keyword => {
          if (name.includes(keyword)) isWeatherIncompatible = true;
        });
      }
    });

    if (isWeatherIncompatible) {
      return {
        totalScore: -999,
        details: { message: `Zestaw niedostosowany do warunków atmosferycznych (${weatherType})` }
      };
    }
  }

  let matchingStylesCount = 0;
  if (activeOccasion && OCCASION_STYLE_MATCH[activeOccasion]) {
    const allowedStyles = OCCASION_STYLE_MATCH[activeOccasion];
    
    outfit.forEach(item => {
      if (item.style && allowedStyles.includes(item.style)) {
        score += 35; 
        matchingStylesCount++;
      } else {
        score -= 15; 
      }
    });

    if (matchingStylesCount === 0) {
      score -= 50; 
    }
  }

  if (outfit.length > 1) {
    const color1 = outfit[0].color ? outfit[0].color.toLowerCase() : "";
    const color2 = outfit[1].color ? outfit[1].color.toLowerCase() : "";
    
    let baseHarmony = false;
    if (color1 && color2) {
      const harmonia1 = COLOR_HARMONIES[color1] && COLOR_HARMONIES[color1].includes(color2);
      const harmonia2 = COLOR_HARMONIES[color2] && COLOR_HARMONIES[color2].includes(color1);
      if (harmonia1 || harmonia2 || color1 === color2) {
        score += 25;
        baseHarmony = true;
      }
    }

    if (outfit.length === 3) {
      const colorShoes = outfit[2].color ? outfit[2].color.toLowerCase() : "";
      if (colorShoes === color1 || colorShoes === color2) {
        score += 15; 
      }
    }
  }

  let preferenceScore = 0;
  outfit.forEach(item => {
    if (item.style && userStyleWeights[item.style]) {
      preferenceScore += userStyleWeights[item.style] * 12; 
    }
    if (item.color && userColorWeights[item.color]) {
      preferenceScore += userColorWeights[item.color] * 8;
    }
  });
  score += preferenceScore;

  if (eventContext) {
    const formalityTarget = eventContext.formality; 
    outfit.forEach(item => {
      if (item.style === "Minimalizm" || item.style === "Classic") {
        if (formalityTarget === "Formal") score += 20;
      }
      if (item.style === "Streetwear" && formalityTarget === "Formal") {
        score -= 40; 
      }
    });
  }

  return {
    totalScore: score,
    details: {
      styleWeights: userStyleWeights,
      colorWeights: userColorWeights,
      appliedOccasion: activeOccasion,
      appliedWeather: weatherType,
      colorScore: score >= 120 ? "Zbalansowany kolorystycznie" : "Standardowy"
    }
  };
}

function generateBestOutfits(clothes, userProfile, eventContext, selectedOccasion, weatherType = "Clear") {
  const goras = clothes.filter(c => c.category === "Góra");
  const dols = clothes.filter(c => c.filterCategory === "Dół" || c.category === "Dół");
  const sukienki = clothes.filter(c => c.category === "Sukienki");
  
  const buty = clothes.filter(c => c.category === "Buty" || c.category === "Obuwie");

  let combinations = [];

  if (buty.length === 0) {
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
  } else {
    goras.forEach(g => {
      dols.forEach(d => {
        buty.forEach(b => {
          const outfit = [g, d, b];
          const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType);
          combinations.push({ outfit, ...scoring });
        });
      });
    });

    sukienki.forEach(s => {
      buty.forEach(b => {
        const outfit = [s, b];
        const scoring = calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType);
        combinations.push({ outfit, ...scoring });
      });
    });
  }

  combinations.sort((a, b) => b.totalScore - a.totalScore);
  return combinations.slice(0, 3); 
}

module.exports = { generateBestOutfits };