function findMatchingClothes(llmResponse, clothes) {
  if (!llmResponse || !clothes || clothes.length === 0) return [];

  const text = llmResponse.toLowerCase();
  const matched = [];
  const categorySynonyms = {
    gora: ["top", "koszul", "t-shirt", "bluzk", "marynark", "kimono", "żakiet", "kardigan"],
    dol: ["spodn", "jeans", "dżins", "nogawk", "szort", "spodenk", "spódnic"],
    buty: ["buty", "sneakers", "mule", "obcas", "sandał", "szpilk", "obuwie"],
    sukienka: ["sukienk", "tunik", "suknia"],
  };
  const colorSynonyms = {
    kremowy: ["kremow", "beżow", "bial", "biał", "ecru"],
    beżowy: ["beżow", "kremow", "ecru", "piaskow"],
    biały: ["biał", "biel", "kremow", "ecru"],
    czarny: ["czarn", "ciemn", "grafit"],
    niebieski: ["niebiesk", "błękit", "jeans", "granat", "dżins"],
  };

  clothes.forEach((cloth) => {
    const nameLower = cloth.name ? cloth.name.toLowerCase() : "";
    const categoryLower = cloth.category ? cloth.category.toLowerCase() : "";
    const colorLower = cloth.color ? cloth.color.toLowerCase() : "";
    const isDress = categoryLower.includes("sukienk") || nameLower.includes("sukienk");
    const isTop = categoryLower.includes("góra") || ["koszul", "t-shirt", "top", "marynark", "kardigan"].some((value) => nameLower.includes(value));
    const isBottom = categoryLower.includes("dół") || ["spodn", "jeans", "dżins", "szort", "spodenk"].some((value) => nameLower.includes(value));
    const isShoes = categoryLower.includes("buty") || categoryLower.includes("obuwie") || ["sneakers", "mule", "szpilk"].some((value) => nameLower.includes(value));
    const categoryMatch =
      (isDress && categorySynonyms.sukienka.some((value) => text.includes(value))) ||
      (isTop && categorySynonyms.gora.some((value) => text.includes(value))) ||
      (isBottom && categorySynonyms.dol.some((value) => text.includes(value))) ||
      (isShoes && categorySynonyms.buty.some((value) => text.includes(value)));

    if (!categoryMatch) return;

    let baseColor = colorLower;
    if (baseColor === "wykryty przez ai" || !baseColor) {
      if (nameLower.includes("czarn")) baseColor = "czarny";
      else if (nameLower.includes("biał") || nameLower.includes("biel")) baseColor = "biały";
      else if (nameLower.includes("krem")) baseColor = "kremowy";
      else if (nameLower.includes("beż")) baseColor = "beżowy";
      else if (nameLower.includes("zielon")) baseColor = "zielony";
      else if (nameLower.includes("róż")) baseColor = "różowy";
    }

    const expectedPhrases = colorSynonyms[baseColor] || [baseColor];
    let colorMatch = expectedPhrases.some((phrase) => text.includes(phrase));
    if (text.includes("róż") && (nameLower.includes("zielon") || colorLower.includes("zielon"))) colorMatch = false;
    if (text.includes("zielon") && (nameLower.includes("róż") || colorLower.includes("róż"))) colorMatch = false;

    const nameKeywordMatch = nameLower
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .some((word) => text.includes(word.slice(0, -1)));

    if (colorMatch || nameKeywordMatch) matched.push(cloth);
  });

  return matched
    .filter((item, index, items) =>
      items.findIndex((candidate) => candidate.id === item.id || candidate._id === item._id) === index,
    )
    .slice(0, 3);
}

const normalizeForMatch = (value) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[`'"()]/g, "")
    .trim();

function extractMarkedItems(rawText, clothes) {
  if (!rawText) return { cleanText: rawText || "", items: [] };
  const timeMatch = rawText.match(/\s*\(Czas:\s*\d+ms\)\s*$/i);
  const timeSuffix = timeMatch ? timeMatch[0] : "";
  const withoutTime = timeMatch ? rawText.slice(0, timeMatch.index) : rawText;
  const markerRegex = /\n?[ \t]*UBRANIA:\s*([^\n]*)/i;
  const match = withoutTime.match(markerRegex);

  if (!match || !clothes || clothes.length === 0) {
    return { cleanText: rawText.trim(), items: [] };
  }

  const cleanText = (withoutTime.replace(markerRegex, "").trim() + timeSuffix).trim();
  const rawNames = match[1].split("|").map(normalizeForMatch).filter(Boolean);
  const items = [];

  rawNames.forEach((target) => {
    const found =
      clothes.find((cloth) => normalizeForMatch(cloth.name) === target) ||
      clothes.find((cloth) =>
        normalizeForMatch(cloth.name).includes(target) || target.includes(normalizeForMatch(cloth.name)),
      );
    if (found && !items.some((item) => item.id === found.id)) items.push(found);
  });

  return { cleanText, items: items.slice(0, 4) };
}

function resolveMatchedItems(rawText, clothes) {
  const { cleanText, items } = extractMarkedItems(rawText, clothes);
  return items.length > 0
    ? { cleanText, items }
    : { cleanText, items: findMatchingClothes(cleanText, clothes) };
}

const generateContextString = (clothes, user) => {
  const gender = user?.gender || "osoba";
  const styles = user?.styleTags || "brak sprecyzowanego stylu";
  let context = `Użytkownik to ${gender}. Preferowany styl: ${styles}. \n`;
  if (!clothes || clothes.length === 0) return context + "Szafa jest obecnie pusta.";
  context += "Ubrania w szafie:\n";
  context += clothes
    .map((cloth) => `- ${cloth.name} (Kategoria: ${cloth.category}, Kolor: ${cloth.color}, Styl: ${cloth.style})`)
    .join("\n");
  return context;
};

module.exports = { findMatchingClothes, extractMarkedItems, resolveMatchedItems, generateContextString };
