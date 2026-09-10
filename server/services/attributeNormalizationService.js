const STYLE_ALIASES = Object.freeze({
  minimalizm: "Minimalizm",
  minimalistyczny: "Minimalizm",
  minimalistyczna: "Minimalizm",
  minimalistyczne: "Minimalizm",

  classic: "Classic",
  klasyczny: "Classic",
  klasyczna: "Classic",
  klasyczne: "Classic",

  casual: "Casual",
  codzienny: "Casual",
  codzienna: "Casual",
  codzienne: "Casual",

  streetwear: "Streetwear",
  boho: "Boho",

  romantic: "Romantic",
  romantyczny: "Romantic",
  romantyczna: "Romantic",
  romantyczne: "Romantic",

  chic: "Chic",

  modern: "Modern",
  nowoczesny: "Modern",
  nowoczesna: "Modern",
  nowoczesne: "Modern",

  sport: "Sport",
  sportowy: "Sport",
  sportowa: "Sport",
  sportowe: "Sport",
});

const COLOR_ALIASES = Object.freeze({
  bialy: "biały",
  biala: "biały",
  biale: "biały",

  czarny: "czarny",
  czarna: "czarny",
  czarne: "czarny",

  bezowy: "beżowy",
  bezowa: "beżowy",
  bezowe: "beżowy",

  kremowy: "kremowy",
  kremowa: "kremowy",
  kremowe: "kremowy",
  ecru: "ecru",

  granatowy: "granatowy",
  granatowa: "granatowy",
  granatowe: "granatowy",

  szary: "szary",
  szara: "szary",
  szare: "szary",

  czerwony: "czerwony",
  czerwona: "czerwony",
  czerwone: "czerwony",

  rozowy: "różowy",
  rozowa: "różowy",
  rozowe: "różowy",

  "pastelowy roz": "pastelowy róż",
  "pastelowa roz": "pastelowy róż",

  ciemnobrazowy: "ciemnobrązowy",
  ciemnobrazowa: "ciemnobrązowy",

  zielony: "zielony",
  zielona: "zielony",
  zielone: "zielony",

  niebieski: "niebieski",
  niebieska: "niebieski",
  niebieskie: "niebieski",

  blekitny: "błękitny",
  blekitna: "błękitny",
  blekitne: "błękitny",

  zolty: "żółty",
  zolta: "żółty",
  zolte: "żółty",

  bordowy: "bordowy",
  bordowa: "bordowy",
  bordowe: "bordowy",
});

function normalizeAttributeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ");
    
}

function normalizeStyleName(value) {
  const key = normalizeAttributeKey(value);

  return STYLE_ALIASES[key] || key;
}

function normalizeStyleNames(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,;/|]/)
        .map(normalizeStyleName)
        .filter(Boolean),
    ),
  ];
}

function normalizeColorName(value) {
  const key = normalizeAttributeKey(value);

  return COLOR_ALIASES[key] || key;
}

module.exports = {
  normalizeAttributeKey,
  normalizeStyleName,
  normalizeStyleNames,
  normalizeColorName,
};