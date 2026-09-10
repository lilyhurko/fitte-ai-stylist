const { prisma } = require("../config/prisma");
const { groq, GROQ_MODEL } = require("../config/aiClients");
const { generateBestOutfits } = require("../outfitEngine");
const { writeLog } = require("./logger");
const { resilientOperation } = require("./resilienceService");
const {
  FITTE_ALGORITHM_VERSION,
  FITTE_EXPLANATION_PROMPT_VERSION,
  FITTE_EXPLANATION_CONFIG,
  RECENT_RECOMMENDATION_LIMIT,
  REPETITION_PENALTIES,
  QUALITY_POOL_MAX_SCORE_GAP,
} = require("../config/algorithm");
const {
  createSelectionSeed,
  selectCandidateFromPool,
} = require("./recommendationSelectionService");
const {
  getRecommendationAvailability,
} = require("./recommendationAvailabilityService");

async function askFitteEngine(
  query,
  clothes,
  user,
  currentEvent,
  selectedOccasion,
  weatherType,
) {
  try {
    const recommendationHistory = await prisma.outfitRecommendation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_RECOMMENDATION_LIMIT,
      select: {
        id: true,
        clothIds: true,
        createdAt: true,
      },
    });
    const topRecommendations = generateBestOutfits(
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
      recommendationHistory,
    );
    const recommendationAvailability = getRecommendationAvailability(
      topRecommendations.length,
    );

    if (topRecommendations.length === 0) {
      return {
        explanation: recommendationAvailability.message,
        recommendationId: null,
        fitteItems: [],
        algorithmVersion: FITTE_ALGORITHM_VERSION,
        recommendationAvailability,
      };
    }

    const selectionSeed = createSelectionSeed();

    const { candidate: bestSet, selectionIndex } = selectCandidateFromPool(
      topRecommendations,
      selectionSeed,
    );
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
    let explanationModel = null;

    try {
      const chatCompletion = await resilientOperation(
        "groq",
        () =>
          groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: explanationPrompt }],
            temperature: FITTE_EXPLANATION_CONFIG.temperature,
            reasoning_effort: FITTE_EXPLANATION_CONFIG.reasoningEffort,
            max_completion_tokens: FITTE_EXPLANATION_CONFIG.maxCompletionTokens,
          }),
        {
          retries: 0,
        },
      );
      const generatedExplanation = chatCompletion.choices[0]?.message?.content;

      if (generatedExplanation) {
        explanation = generatedExplanation;
        explanationModel = GROQ_MODEL;
      }
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

        algorithmVersion: FITTE_ALGORITHM_VERSION,
        explanationModel,
        promptVersion: FITTE_EXPLANATION_PROMPT_VERSION,
        selectionSeed,

        contextSnapshot: {
          recommendationAvailability,
          selectedCandidateIndex: selectionIndex,
          qualityPool: topRecommendations.map((candidate, index) => ({
            index,
            clothIds: candidate.outfit.map((item) => item.id),
            totalScore: candidate.totalScore,
          })),
          recentRecommendations: recommendationHistory.map(
            (recommendation) => ({
              id: recommendation.id,
              clothIds: recommendation.clothIds,
              createdAt: recommendation.createdAt.toISOString(),
            }),
          ),
          selectedOccasion,
          appliedOccasion: bestSet.details.appliedOccasion || null,
          weatherType,
          event: currentEvent
            ? {
                id: currentEvent.id,
                title: currentEvent.title,
                occasion: currentEvent.occasion,
                formality: currentEvent.formality,
                date: currentEvent.date
                  ? new Date(currentEvent.date).toISOString()
                  : null,
              }
            : null,
        },

        generationConfig: {
          explanation: FITTE_EXPLANATION_CONFIG,
          recommendation: {
            recentRecommendationLimit: RECENT_RECOMMENDATION_LIMIT,
            repetitionPenalties: REPETITION_PENALTIES,
            qualityPoolMaxScoreGap: QUALITY_POOL_MAX_SCORE_GAP,
            qualityPoolSize: topRecommendations.length,
            selectionStrategy: "sha256-seeded-index",
          },
        },
      },
    });

    return {
      explanation,
      recommendationId: newRec.id,
      fitteItems: bestSet.outfit,
      algorithmVersion: FITTE_ALGORITHM_VERSION,
      recommendationAvailability,
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
      algorithmVersion: FITTE_ALGORITHM_VERSION,
      recommendationAvailability: null,
    };
  }
}

module.exports = {
  askFitteEngine,
};
