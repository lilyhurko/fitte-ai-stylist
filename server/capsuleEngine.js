const {
  calculateOutfitScore,
  parseStyles,
  OCCASION_STYLE_MATCH,
  WEATHER_BLACKLIST
} = require("./outfitEngine");

const NEUTRAL_COLORS = ["czarny", "biały", "kremowy", "beżowy", "szary", "granatowy"];


const isHardWeatherVetoed = (item, weatherType) => {
  const blacklist = WEATHER_BLACKLIST[weatherType];
  if (!blacklist) return false;

  const col = item.color ? item.color.toLowerCase() : "";
  const name = item.name ? item.name.toLowerCase() : "";

  if (blacklist.categories && blacklist.categories.includes(item.category)) return true;
  if (blacklist.colors && blacklist.colors.includes(col)) return true;
  if (blacklist.forbiddenKeywords && blacklist.forbiddenKeywords.some(k => name.includes(k))) return true;

  return false;
};

const scoreVersatility = (item, userProfile = {}) => {
  let score = 0;
  const itemStyles = parseStyles(item);

  const occasions = Object.keys(OCCASION_STYLE_MATCH);
  const matchingOccasions = occasions.filter(
    (occ) => itemStyles.some((st) => OCCASION_STYLE_MATCH[occ].includes(st))
  );
  score += matchingOccasions.length * 20;

  if (NEUTRAL_COLORS.includes(item.color?.toLowerCase())) {
    score += 10;
  }

  const styleWeights = userProfile?.styleWeights
    ? (typeof userProfile.styleWeights === "string" ? JSON.parse(userProfile.styleWeights) : userProfile.styleWeights)
    : {};
  const colorWeights = userProfile?.colorWeights
    ? (typeof userProfile.colorWeights === "string" ? JSON.parse(userProfile.colorWeights) : userProfile.colorWeights)
    : {};

  itemStyles.forEach((st) => {
    if (styleWeights[st]) score += styleWeights[st] * 8;
  });
  if (item.color && colorWeights[item.color]) score += colorWeights[item.color] * 5;

  return score;
};

function generateCapsuleWardrobe(clothes, userProfile = {}, weatherType = "Clear") {
  if (!clothes || clothes.length < 5) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  const weatherSafe = clothes.filter((c) => !isHardWeatherVetoed(c, weatherType));

  const pool = weatherSafe.length >= 5 ? weatherSafe : clothes;

  const goras = pool.filter((c) => c.category === "Góra");
  const dols = pool.filter((c) => c.category === "Dół");
  const sukienki = pool.filter((c) => c.category === "Sukienki");
  const buty = pool.filter((c) => c.category === "Buty" || c.category === "Obuwie");

  const byVersatility = (a, b) => scoreVersatility(b, userProfile) - scoreVersatility(a, userProfile);

  const selectedGoras = [...goras].sort(byVersatility).slice(0, 4);
  const selectedDols = [...dols].sort(byVersatility).slice(0, 3);
  const selectedSukienki = [...sukienki].sort(byVersatility).slice(0, 1);
  const selectedButy = [...buty].sort(byVersatility).slice(0, 2);

  const capsuleItems = [...selectedGoras, ...selectedDols, ...selectedSukienki, ...selectedButy];

  let rawCombos = [];

  selectedGoras.forEach((g) => {
    selectedDols.forEach((d) => {
      selectedButy.forEach((b) => {
        rawCombos.push([g, d, b]);
      });
    });
  });

  selectedSukienki.forEach((s) => {
    selectedButy.forEach((b) => {
      rawCombos.push([s, b]);
    });
  });


  const occasions = Object.keys(OCCASION_STYLE_MATCH);
  const scoredCombos = rawCombos
    .map((outfit) => {
      let best = { score: -Infinity, occasion: null };
      occasions.forEach((occ) => {
        const { totalScore } = calculateOutfitScore(outfit, userProfile, null, occ, weatherType);
        if (totalScore > best.score) best = { score: totalScore, occasion: occ };
      });
      return { outfit, ...best };
    })
    .filter((c) => c.score > -500);

  const byOccasion = {};
  scoredCombos.forEach((c) => {
    if (!byOccasion[c.occasion]) byOccasion[c.occasion] = [];
    byOccasion[c.occasion].push(c);
  });
  Object.values(byOccasion).forEach((list) => list.sort((a, b) => b.score - a.score));


  const diversified = [];
  const usedKeys = new Set();

  Object.values(byOccasion).forEach((list) => {
    list.slice(0, 3).forEach((c) => {
      const key = c.outfit.map((i) => i.id).join(",");
      if (!usedKeys.has(key)) {
        diversified.push(c);
        usedKeys.add(key);
      }
    });
  });

  scoredCombos
    .sort((a, b) => b.score - a.score)
    .forEach((c) => {
      if (diversified.length >= 30) return;
      const key = c.outfit.map((i) => i.id).join(",");
      if (!usedKeys.has(key)) {
        diversified.push(c);
        usedKeys.add(key);
      }
    });

  diversified.sort((a, b) => b.score - a.score);

  return {
    capsuleItems,
    totalCombinations: rawCombos.length,
    combinations: diversified.slice(0, 30).map((c) => c.outfit)
  };
}

module.exports = { generateCapsuleWardrobe };