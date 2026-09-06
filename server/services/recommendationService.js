const { prisma } = require("../config/prisma");
const { groq, GROQ_MODEL } = require("../config/aiClients");
const { generateBestOutfits } = require("../outfitEngine");
const { writeLog } = require("./logger");
const { resilientOperation } = require("./resilienceService");

async function askFitteEngine(
  query,
  clothes,
  user,
  currentEvent,
  selectedOccasion,
  weatherType,
) {
  try {
    const topRecommendations = generateBestOutfits(
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
    );

    if (!topRecommendations || topRecommendations.length === 0) {
      return {
        explanation:
          "System Fitte: Brak wystarczającej liczby ubrań do stworzenia rekomendacji.",
        recommendationId: null,
        fitteItems: [],
      };
    }

    const bestSet = topRecommendations[0];
    const itemsDescription = bestSet.outfit
      .map((i) => `${i.name} (Styl: ${i.style}, Kolor: ${i.color})`)
      .join(" oraz ");

    const aktywnaOkazja = currentEvent ? currentEvent.title : selectedOccasion;

    const explanationPrompt = `
      Jesteś warstwą wyjaśniającą systemu rekomendacji Fitte AI.
      Algorytm wybrał dla użytkownika zestaw ubrań: ${itemsDescription}.
      Zapytanie użytkownika: "${query}"
      Okazja: ${aktywnaOkazja}.

      Napisz maksymalnie 1-2 bardzo krótkie, konkretne zdania uzasadniające, dlaczego ten zestaw pasuje do okazji: ${aktywnaOkazja}. 
      Nie wspominaj o innych wydarzeniach z kalendarza, jeśli nie są bezpośrednio związane z zapytaniem: "${query}".
      Odpowiedz wyłącznie czystym uzasadnieniem bez powitań, po polsku.
    `;

    let explanation =
      "Zestaw został najlepiej oceniony pod kątem okazji, pogody i Twoich preferencji.";
    try {
      const chatCompletion = await resilientOperation(
        "groq",
        () =>
          groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: explanationPrompt }],
            temperature: 0.2,
            reasoning_effort: "low",
            max_completion_tokens: 256,
          }),
        {
          retries: 0,
        },
      );
      explanation = chatCompletion.choices[0]?.message?.content || explanation;
    } catch (explanationError) {
      writeLog("warn", "groq_explanation_fallback", {
        provider: "groq",
        model: GROQ_MODEL,
        errorName: explanationError.name,
      });
    }
    const newRec = await prisma.outfitRecommendation.create({
      data: {
        userId: user.id,
        clothIds: bestSet.outfit.map((i) => i.id),
        score: bestSet.totalScore,
        scoreDetails: bestSet.details,
        explanation,
      },
    });

    return {
      explanation,
      recommendationId: newRec.id,
      fitteItems: bestSet.outfit,
    };
  } catch (error) {
    writeLog("warn", "fitte_engine_fallback", {
      provider: "fitte-engine",
      errorName: error.name,
    });

    return {
      explanation: "Nie udało się przygotować rekomendacji Fitte.",
      recommendationId: null,
      fitteItems: [],
    };
  }
}

module.exports = {
  askFitteEngine,
};
