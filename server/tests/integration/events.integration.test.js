const test = require("node:test");
const assert = require("node:assert/strict");

require("../helpers/testEnvironment");

const { app } = require("../../app");
const { prisma } = require("../../config/prisma");
const {
  AUTH_COOKIE_NAME,
} = require("../../config/auth");

const startServer = () =>
  new Promise((resolve) => {
    const server = app.listen(
      0,
      "127.0.0.1",
      () => resolve(server),
    );
  });

const stopServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const getCookie = (response) => {
  const setCookie = response.headers.get("set-cookie");

  assert.ok(setCookie);
  assert.match(
    setCookie,
    new RegExp(`${AUTH_COOKIE_NAME}=`),
  );

  return setCookie.split(";")[0];
};

const registerUser = async (
  baseUrl,
  email,
  name,
) => {
  const response = await fetch(
    `${baseUrl}/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password: "BezpieczneHaslo123!",
        styleTags: ["Classic"],
        favoriteColors: ["czarny"],
      }),
    },
  );

  assert.equal(response.status, 200);

  const result = await response.json();

  return {
    user: result.user,
    cookie: getCookie(response),
  };
};

test("wydarzenie jest zapisywane w bazie i izolowane między użytkownikami", async () => {
  const uniquePart = `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const emailA =
    `event-a-${uniquePart}@example.com`;
  const emailB =
    `event-b-${uniquePart}@example.com`;

  let server;
  let userA;
  let userB;
  let createdEventId;

  try {
    server = await startServer();

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const accountA = await registerUser(
      baseUrl,
      emailA,
      "Użytkownik A",
    );

    const accountB = await registerUser(
      baseUrl,
      emailB,
      "Użytkownik B",
    );

    userA = accountA.user;
    userB = accountB.user;

    const createResponse = await fetch(
      `${baseUrl}/events`,
      {
        method: "POST",
        headers: {
          Cookie: accountA.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Testowe wydarzenie A",
          date: "2030-06-15T12:00",
          occasion: "Praca",
          formality: "Formal",
          timezone: "Europe/Warsaw",
          outfitIds: [],
        }),
      },
    );

    assert.equal(createResponse.status, 200);

    const createResult =
      await createResponse.json();

    createdEventId = createResult.event.id;

    const databaseEvent =
      await prisma.event.findUnique({
        where: { id: createdEventId },
      });

    assert.ok(databaseEvent);
    assert.equal(databaseEvent.userId, userA.id);
    assert.equal(
      databaseEvent.title,
      "Testowe wydarzenie A",
    );

    const eventsAResponse = await fetch(
      `${baseUrl}/events`,
      {
        headers: {
          Cookie: accountA.cookie,
        },
      },
    );

    const eventsBResponse = await fetch(
      `${baseUrl}/events`,
      {
        headers: {
          Cookie: accountB.cookie,
        },
      },
    );

    assert.equal(eventsAResponse.status, 200);
    assert.equal(eventsBResponse.status, 200);

    const eventsA = await eventsAResponse.json();
    const eventsB = await eventsBResponse.json();

    assert.equal(
      eventsA.events.some(
        (event) => event.id === createdEventId,
      ),
      true,
    );

    assert.equal(
      eventsB.events.some(
        (event) => event.id === createdEventId,
      ),
      false,
    );

    const foreignDeleteResponse = await fetch(
      `${baseUrl}/events/${createdEventId}`,
      {
        method: "DELETE",
        headers: {
          Cookie: accountB.cookie,
        },
      },
    );

    assert.equal(foreignDeleteResponse.status, 404);

    const eventAfterForeignDelete =
      await prisma.event.findUnique({
        where: { id: createdEventId },
      });

    assert.ok(eventAfterForeignDelete);

    const ownerDeleteResponse = await fetch(
      `${baseUrl}/events/${createdEventId}`,
      {
        method: "DELETE",
        headers: {
          Cookie: accountA.cookie,
        },
      },
    );

    assert.equal(ownerDeleteResponse.status, 200);

    const deletedEvent =
      await prisma.event.findUnique({
        where: { id: createdEventId },
      });

    assert.equal(deletedEvent, null);
  } finally {
    if (createdEventId) {
      await prisma.event.deleteMany({
        where: { id: createdEventId },
      });
    }

    const userIds = [userA?.id, userB?.id].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.event.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        email: { in: [emailA, emailB] },
      },
    });

    if (server) {
      await stopServer(server);
    }

    await prisma.$disconnect();
  }
});