const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "fitte-test-jwt-secret";

const { prisma } = require("../config/prisma");
const { authenticateToken } = require("../middleware/authenticate");
const {
  getWardrobe,
  updateCloth,
  deleteCloth,
} = require("../controllers/wardrobeController");
const { AUTH_COOKIE_NAME } = require("../config/auth");
const { getHistory } = require("../controllers/historyController");
const { getEvents } = require("../controllers/eventController");
const {
  saveAnalysisFeedback,
  saveRecommendationFeedback,
} = require("../controllers/feedbackController");
const USER_A_ID = "64b000000000000000000001";
const USER_B_ID = "64b000000000000000000002";

const TEST_CLOTHES = [
  {
    id: "64c000000000000000000001",
    userId: USER_A_ID,
    name: "Ubranie użytkownika A",
  },
  {
    id: "64c000000000000000000002",
    userId: USER_B_ID,
    name: "Ubranie użytkownika B",
  },
];

const TEST_ANALYSES = [
  {
    id: "64d000000000000000000001",
    userId: USER_A_ID,
    query: "Analiza użytkownika A",
    geminiResponse: "",
    groqResponse: "",
    fitteResponse: "",
    recommendations: [],
    createdAt: new Date("2026-01-01T10:00:00Z"),
  },
  {
    id: "64d000000000000000000002",
    userId: USER_B_ID,
    query: "Analiza użytkownika B",
    geminiResponse: "",
    groqResponse: "",
    fitteResponse: "",
    recommendations: [],
    createdAt: new Date("2026-01-02T10:00:00Z"),
  },
];

const TEST_EVENTS = [
  {
    id: "64e000000000000000000001",
    userId: USER_A_ID,
    title: "Wydarzenie użytkownika A",
    date: new Date("2026-10-01T10:00:00Z"),
    occasion: "Casual",
    formality: "Casual",
    outfitIds: [],
    locationName: null,
    latitude: null,
    longitude: null,
    timezone: "Europe/Warsaw",
  },
  {
    id: "64e000000000000000000002",
    userId: USER_B_ID,
    title: "Wydarzenie użytkownika B",
    date: new Date("2026-10-02T10:00:00Z"),
    occasion: "Casual",
    formality: "Casual",
    outfitIds: [],
    locationName: null,
    latitude: null,
    longitude: null,
    timezone: "Europe/Warsaw",
  },
];
const RECOMMENDATION_A_ID = "64f000000000000000000001";
const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "5m" });

const startTestServer = async () => {
  const app = express();

  app.use(cookieParser());
  app.use(express.json());

  app.get("/api/wardrobe", authenticateToken, getWardrobe);

  app.patch("/api/wardrobe/:id", authenticateToken, updateCloth);

  app.delete("/api/wardrobe/:id", authenticateToken, deleteCloth);

  app.get("/api/history", authenticateToken, getHistory);

  app.get("/api/events", authenticateToken, getEvents);
  app.post(
    "/api/analyze/:id/feedback",
    authenticateToken,
    saveAnalysisFeedback,
  );

  app.post(
    "/api/recommendations/:id/feedback",
    authenticateToken,
    saveRecommendationFeedback,
  );
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
};

const stopTestServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

test("autoryzacja izoluje szafy dwóch użytkowników", async () => {
  const originalFindMany = prisma.cloth.findMany;

  prisma.cloth.findMany = async ({ where }) =>
    TEST_CLOTHES.filter((cloth) => cloth.userId === where.userId);

  const server = await startTestServer();
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/api/wardrobe`;

  try {
    const unauthorizedResponse = await fetch(endpoint);

    assert.equal(unauthorizedResponse.status, 401);

    const userAResponse = await fetch(endpoint, {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${createToken(USER_A_ID)}`,
      },
    });

    const userBResponse = await fetch(endpoint, {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${createToken(USER_B_ID)}`,
      },
    });

    assert.equal(userAResponse.status, 200);
    assert.equal(userBResponse.status, 200);

    const userAResult = await userAResponse.json();
    const userBResult = await userBResponse.json();

    assert.deepEqual(
      userAResult.clothes.map((cloth) => cloth.userId),
      [USER_A_ID],
    );

    assert.deepEqual(
      userBResult.clothes.map((cloth) => cloth.userId),
      [USER_B_ID],
    );

    assert.equal(
      userAResult.clothes.some((cloth) => cloth.userId === USER_B_ID),
      false,
    );

    assert.equal(
      userBResult.clothes.some((cloth) => cloth.userId === USER_A_ID),
      false,
    );
  } finally {
    prisma.cloth.findMany = originalFindMany;
    await stopTestServer(server);
  }
});

test("użytkownik nie może edytować ani usuwać cudzego ubrania", async () => {
  const originalFindFirst = prisma.cloth.findFirst;
  const originalUpdate = prisma.cloth.update;

  let updateWasCalled = false;

  prisma.cloth.findFirst = async ({ where }) =>
    TEST_CLOTHES.find(
      (cloth) => cloth.id === where.id && cloth.userId === where.userId,
    ) || null;

  prisma.cloth.update = async ({ where, data }) => {
    updateWasCalled = true;

    return {
      ...TEST_CLOTHES.find((cloth) => cloth.id === where.id),
      ...data,
    };
  };

  const server = await startTestServer();
  const { port } = server.address();
  const endpoint =
    `http://127.0.0.1:${port}/api/wardrobe/` + TEST_CLOTHES[0].id;

  const userBCookie = `${AUTH_COOKIE_NAME}=${createToken(USER_B_ID)}`;

  try {
    const updateResponse = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        Cookie: userBCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Próba przejęcia ubrania",
      }),
    });

    assert.equal(updateResponse.status, 403);
    assert.equal(updateWasCalled, false);

    const deleteResponse = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Cookie: userBCookie,
      },
    });

    assert.equal(deleteResponse.status, 404);
    assert.equal(
      TEST_CLOTHES.some(
        (cloth) =>
          cloth.id === TEST_CLOTHES[0].id && cloth.userId === USER_A_ID,
      ),
      true,
    );
  } finally {
    prisma.cloth.findFirst = originalFindFirst;
    prisma.cloth.update = originalUpdate;
    await stopTestServer(server);
  }
});

test("historia i wydarzenia są izolowane pomiędzy użytkownikami", async () => {
  const originalAnalysisFindMany = prisma.analysis.findMany;
  const originalEventFindMany = prisma.event.findMany;
  const originalUserFindUnique = prisma.user.findUnique;
  const originalClothFindMany = prisma.cloth.findMany;

  prisma.analysis.findMany = async ({ where }) =>
    TEST_ANALYSES.filter((analysis) => analysis.userId === where.userId);

  prisma.event.findMany = async ({ where }) =>
    TEST_EVENTS.filter((event) => event.userId === where.userId);

  prisma.user.findUnique = async ({ where }) => ({
    id: where.id,
    styleWeights: {},
    colorWeights: {},
  });

  prisma.cloth.findMany = async ({ where }) =>
    TEST_CLOTHES.filter((cloth) => cloth.userId === where.userId);

  const server = await startTestServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const userACookie = `${AUTH_COOKIE_NAME}=${createToken(USER_A_ID)}`;
  const userBCookie = `${AUTH_COOKIE_NAME}=${createToken(USER_B_ID)}`;

  try {
    const [historyAResponse, historyBResponse] = await Promise.all([
      fetch(`${baseUrl}/history`, {
        headers: { Cookie: userACookie },
      }),
      fetch(`${baseUrl}/history`, {
        headers: { Cookie: userBCookie },
      }),
    ]);

    assert.equal(historyAResponse.status, 200);
    assert.equal(historyBResponse.status, 200);

    const historyA = await historyAResponse.json();
    const historyB = await historyBResponse.json();

    assert.deepEqual(
      historyA.map((analysis) => analysis.userId),
      [USER_A_ID],
    );

    assert.deepEqual(
      historyB.map((analysis) => analysis.userId),
      [USER_B_ID],
    );

    const [eventsAResponse, eventsBResponse] = await Promise.all([
      fetch(`${baseUrl}/events`, {
        headers: { Cookie: userACookie },
      }),
      fetch(`${baseUrl}/events`, {
        headers: { Cookie: userBCookie },
      }),
    ]);

    assert.equal(eventsAResponse.status, 200);
    assert.equal(eventsBResponse.status, 200);

    const eventsA = await eventsAResponse.json();
    const eventsB = await eventsBResponse.json();

    assert.deepEqual(
      eventsA.events.map((event) => event.userId),
      [USER_A_ID],
    );

    assert.deepEqual(
      eventsB.events.map((event) => event.userId),
      [USER_B_ID],
    );
  } finally {
    prisma.analysis.findMany = originalAnalysisFindMany;
    prisma.event.findMany = originalEventFindMany;
    prisma.user.findUnique = originalUserFindUnique;
    prisma.cloth.findMany = originalClothFindMany;

    await stopTestServer(server);
  }
});
test("użytkownik nie może ocenić cudzej analizy ani rekomendacji", async () => {
  const originalAnalysisUpdateMany = prisma.analysis.updateMany;
  const originalRecommendationFindFirst = prisma.outfitRecommendation.findFirst;

  let analysisFeedbackApplied = false;

  prisma.analysis.updateMany = async ({ where }) => {
    const ownsAnalysis =
      where.id === TEST_ANALYSES[0].id && where.userId === USER_A_ID;

    if (ownsAnalysis) {
      analysisFeedbackApplied = true;
    }

    return {
      count: ownsAnalysis ? 1 : 0,
    };
  };

  prisma.outfitRecommendation.findFirst = async ({ where }) => {
    const ownsRecommendation =
      where.id === RECOMMENDATION_A_ID && where.userId === USER_A_ID;

    if (!ownsRecommendation) {
      return null;
    }

    return {
      id: RECOMMENDATION_A_ID,
      userId: USER_A_ID,
      clothIds: [TEST_CLOTHES[0].id],
      status: "PENDING",
    };
  };

  const server = await startTestServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const userBCookie = `${AUTH_COOKIE_NAME}=${createToken(USER_B_ID)}`;

  try {
    const analysisResponse = await fetch(
      `${baseUrl}/analyze/${TEST_ANALYSES[0].id}/feedback`,
      {
        method: "POST",
        headers: {
          Cookie: userBCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelType: "gemini",
          feedback: "LIKE",
        }),
      },
    );

    assert.equal(analysisResponse.status, 404);
    assert.equal(analysisFeedbackApplied, false);

    const recommendationResponse = await fetch(
      `${baseUrl}/recommendations/${RECOMMENDATION_A_ID}/feedback`,
      {
        method: "POST",
        headers: {
          Cookie: userBCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback: "LIKE",
          analysisId: TEST_ANALYSES[0].id,
        }),
      },
    );

    assert.equal(recommendationResponse.status, 404);
  } finally {
    prisma.analysis.updateMany = originalAnalysisUpdateMany;
    prisma.outfitRecommendation.findFirst = originalRecommendationFindFirst;

    await stopTestServer(server);
  }
});
