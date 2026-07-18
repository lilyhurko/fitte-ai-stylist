const { getColorCode } = require("./outfitEngine"); 

function generateCapsuleWardrobe(clothes, season = "Hot") {
  if (!clothes || clothes.length < 5) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  const goras = clothes.filter(c => c.category === "Góra");
  const dols = clothes.filter(c => c.category === "Dół");
  const sukienki = clothes.filter(c => c.category === "Sukienki");
  const buty = clothes.filter(c => c.category === "Buty" || c.category === "Obuwie");

  // 2. Selekcja ubrań o najwyższej kompatybilności (maksymalnie 10 elementów)
  // Wybieramy ubrania najbardziej uniwersalne stylistycznie (np. Minimalizm, Classic, Casual)
  const scoreItem = (item) => {
    let score = 0;
    if (["Minimalizm", "Classic", "Casual"].includes(item.style)) score += 20;
    if (["czarny", "biały", "kremowy", "beżowy", "szary"].includes(item.color?.toLowerCase())) score += 15;
    return score;
  };

  const selectedGoras = goras.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 4);
  const selectedDols = dols.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 3);
  const selectedSukienki = sukienki.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 1);
  const selectedButy = buty.sort((a, b) => scoreItem(b) - scoreItem(a)).slice(0, 2);

  const capsuleItems = [...selectedGoras, ...selectedDols, ...selectedSukienki, ...selectedButy];

  // 3. Generowanie matematycznych kombinacji (Kombinatoryka zestawów)
  let combinations = [];

  // Kombinacje: Góra + Dół + Buty
  selectedGoras.forEach(g => {
    selectedDols.forEach(d => {
      selectedButy.forEach(b => {
        combinations.push([g, d, b]);
      });
    });
  });

  // Kombinacje: Sukienka + Buty
  selectedSukienki.forEach(s => {
    selectedButy.forEach(b => {
      combinations.push([s, b]);
    });
  });

  return {
    capsuleItems,
    totalCombinations: combinations.length,
    combinations: combinations.slice(0, 30) // Zwracamy przykładowe kombinacje
  };
}

module.exports = { generateCapsuleWardrobe };