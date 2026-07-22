const OCCASION_STYLE_MATCH = {
  "Randka": ["Chic", "Romantic"],
  "Praca": ["Classic", "Minimalizm"],
  "Casual": ["Casual", "Streetwear", "Boho"],
  "Impreza": ["Modern", "Streetwear", "Chic"],
  "Sport": ["Sport", "Streetwear"],
  "Podróż": ["Casual", "Streetwear"]
};

const OCCASION_KEYWORDS = {
  "Randka": ["sukien", "elegan", "satyn", "koronk", "obcas"],
  "Praca": ["marynark", "koszul", "garnitur", "biznes", "klasyczn"],
  "Casual": ["jeans", "t-shirt", "sneakers", "bluz", "codzien"],
  "Impreza": ["cekin", "błyszcz", "satyn", "wieczorow", "glamour"],
  "Sport": ["sportow", "dresow", "legginsy", "termoaktyw", "sneakers"],
  "Podróż": ["wygodn", "sportow", "praktyczn", "casual"]
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

// Ubranie może mieć teraz kilka stylów naraz, zapisanych jako "Classic, Romantic" — ta funkcja
// zamienia to na tablicę do porównań, zamiast traktować cały string jako jedną wartość.
function parseStyles(item) {
  if (!item || !item.style) return [];
  return String(item.style)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function calculateOutfitScore(outfit, userProfile, eventContext, selectedOccasion, weatherType = "Clear") {
  let score = 100;

  const userStyleWeights = userProfile?.styleWeights
    ? (typeof userProfile.styleWeights === "string" ? JSON.parse(userProfile.styleWeights) : userProfile.styleWeights)
    : {};
  const userColorWeights = userProfile?.colorWeights
    ? (typeof userProfile.colorWeights === "string" ? JSON.parse(userProfile.colorWeights) : userProfile.colorWeights)
    : {};
  const activeOccasion = eventContext?.occasion || selectedOccasion;

  if (weatherType && WEATHER_BLACKLIST[weatherType]) {
    const blacklist = WEATHER_BLACKLIST[weatherType];
    let hardVeto = false;
    let weatherStylePenalty = 0;

    outfit.forEach(item => {
      const cat = item.category;
      const itemStyles = parseStyles(item);
      const col = item.color ? item.color.toLowerCase() : "";
      const name = item.name ? item.name.toLowerCase() : "";

      // Kategoria, kolor i słowa kluczowe to obiektywnie złe dopasowanie do pogody (np. sandały w deszczu) — twarde weto.
      if (blacklist.categories && blacklist.categories.includes(cat)) {
        hardVeto = true;
      }
      if (blacklist.colors && blacklist.colors.includes(col)) {
        hardVeto = true;
      }
      if (blacklist.forbiddenKeywords) {
        blacklist.forbiddenKeywords.forEach(keyword => {
          if (name.includes(keyword)) hardVeto = true;
        });
      }

      // Styl to za mało precyzyjny sygnał, żeby całkowicie eliminować zestaw (np. "Classic" bywa też lekkie ubrania
      // biurowe) — więc to tylko kara punktowa, nie automatyczna dyskwalifikacja. Wystarczy, że JEDEN z kilku
      // przypisanych stylów trafi na czarną listę.
      if (blacklist.styles && itemStyles.some(st => blacklist.styles.includes(st))) {
        weatherStylePenalty += 45;
      }
    });

    if (hardVeto) {
      return {
        totalScore: -999,
        details: { message: `Zestaw niedostosowany do warunków atmosferycznych (${weatherType})` }
      };
    }

    score -= weatherStylePenalty;
  }

  let matchingStylesCount = 0;
  if (activeOccasion && OCCASION_STYLE_MATCH[activeOccasion]) {
    const allowedStyles = OCCASION_STYLE_MATCH[activeOccasion];
    const occasionKeywords = OCCASION_KEYWORDS[activeOccasion] || [];

    outfit.forEach(item => {
      const nameLower = item.name ? item.name.toLowerCase() : "";
      const itemStyles = parseStyles(item);
      const styleMatches = itemStyles.some(st => allowedStyles.includes(st));

      if (styleMatches) {
        score += 40;
        matchingStylesCount++;
      } else {
        score -= 25;
      }

      if (occasionKeywords.some(keyword => nameLower.includes(keyword))) {
        score += 10;
      }
    });

    if (matchingStylesCount === 0) {
      score -= 70;
    }
  }

  if (outfit.length > 1) {
    const color1 = outfit[0].color ? outfit[0].color.toLowerCase() : "";
    const color2 = outfit[1].color ? outfit[1].color.toLowerCase() : "";

    if (color1 && color2) {
      const harmonia1 = COLOR_HARMONIES[color1] && COLOR_HARMONIES[color1].includes(color2);
      const harmonia2 = COLOR_HARMONIES[color2] && COLOR_HARMONIES[color2].includes(color1);
      if (harmonia1 || harmonia2 || color1 === color2) {
        score += 25;
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
    parseStyles(item).forEach(st => {
      if (userStyleWeights[st]) {
        preferenceScore += userStyleWeights[st] * 12;
      }
    });
    if (item.color && userColorWeights[item.color]) {
      preferenceScore += userColorWeights[item.color] * 8;
    }
  });
  score += preferenceScore;

  if (eventContext) {
    const formalityTarget = eventContext.formality;
    outfit.forEach(item => {
      const itemStyles = parseStyles(item);
      if (itemStyles.includes("Minimalizm") || itemStyles.includes("Classic")) {
        if (formalityTarget === "Formal") score += 20;
      }
      if (itemStyles.includes("Streetwear") && formalityTarget === "Formal") {
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
  const dols = clothes.filter(c => c.category === "Dół");
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

module.exports = {
  generateBestOutfits,
  calculateOutfitScore,
  parseStyles,
  OCCASION_STYLE_MATCH,
  OCCASION_KEYWORDS,
  WEATHER_BLACKLIST,
  COLOR_HARMONIES
};