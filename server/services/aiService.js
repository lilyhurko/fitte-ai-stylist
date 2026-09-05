const { genAI, groq, GROQ_MODEL } = require("../config/aiClients");
const { writeLog } = require("./logger");
const { resilientOperation } = require("./resilienceService");

const getBasePrompt = (query, context, weatherType = "Clear") => {
  let opisPogody = "Słonecznie i przyjemnie";
  if (weatherType === "Rain") opisPogody = "Pada deszcz / ulewa (jest mokro)";
  if (weatherType === "Hot")
    opisPogody = "Jest bardzo gorąco, upał (powyżej 24°C)";
  if (weatherType === "Cold")
    opisPogody = "Jest zimno / chłodno (poniżej 14°C)";

  return `
Jesteś profesjonalnym osobistym stylistą mody. 

AKTUALNE WARUNKI POGODOWE:
-> Stan pogody: ${opisPogody} (Weź to bezwzględnie pod uwagę przy doborze warstw ubrań!)

INFORMACJE O UŻYTKOWNIKU I SZAFIE:
${context}

ZASADY ODPOWIEDZI (KRYTYCZNE):
1. Odpowiedz bardzo zwięźle (maksymalnie 2-3 konkretne zdania).
2. Dopasuj ubiór adekwatnie do aktualnej pogody.
3. Wybierz kompletny zestaw ubrań składający się z:
   - GÓRY i DOŁU (lub Sukienki)
   - ORAZ PASUJĄCEGO OBUWIA (butów) z listy ubrań w szafie.
4. Wybieraj ubrania i obuwie WYŁĄCZNIE z listy powyżej. Nie zmyślaj ubrań ani butów, których użytkownik nie ma w szafie.
5. Nie pisz uprzejmościowych wstępów ani podsumowań.
6. Na samym końcu odpowiedzi, w NOWEJ linii, podaj znacznik w dokładnie takim formacie:
UBRANIA: [dokładna nazwa 1]|[dokładna nazwa 2]|[dokładna nazwa 3]
Użyj DOKŁADNIE takich nazw ubrań, jakie widnieją na liście w sekcji "Ubrania w szafie" powyżej (bez odmiany przez przypadki, bez cudzysłowów). Wypisz tylko te ubrania, które faktycznie polecasz w tej odpowiedzi. Ta linia jest wyłącznie do przetworzenia maszynowego.
7. Nigdy nie proponuj bielizny ani stroju kąpielowego jako elementu stylizacji na wyjście — to nie są ubrania wierzchnie, niezależnie od okazji.

PYTANIE UŻYTKOWNIKA: ${query}
`;
};

async function askGemini(query, context, weatherType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getBasePrompt(query, context, weatherType);
    const result = await resilientOperation(
      "gemini",
      () =>
        model.generateContent(prompt, {
          timeout: 30000,
        }),
      {
        retries: 1,
      },
    );
    return result.response.text();
  } catch (error) {
    writeLog("warn", "gemini_fallback", {
      provider: "gemini",
      errorName: error.name,
    });

    return "Model Gemini jest chwilowo niedostępny.";
  }
}

async function askGroqCloud(query, context, weatherType) {
  try {
    const prompt = getBasePrompt(query, context, weatherType);
    const chatCompletion = await resilientOperation(
      "groq",
      () =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          reasoning_effort: "low",
          max_completion_tokens: 256,
        }),
      {
        retries: 0,
      },
    );
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Brak odpowiedzi ze strony modelu Groq."
    );
  } catch (error) {
    writeLog("warn", "groq_fallback", {
      provider: "groq",
      errorName: error.name,
    });

    return "Model Groq jest chwilowo niedostępny.";
  }
}

module.exports = {
  askGemini,
  askGroqCloud,
};