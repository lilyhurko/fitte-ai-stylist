const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

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
  assert.match(setCookie, new RegExp(`${AUTH_COOKIE_NAME}=`));

  return setCookie.split(";")[0];
};

test("rejestracja, sesja i logowanie korzystają z testowej bazy", async () => {
  const uniquePart = `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const email =
    `integration-${uniquePart}@example.com`;
  const password = "BezpieczneHaslo123!";

  let server;

  await prisma.user.deleteMany({
    where: { email },
  });

  try {
    server = await startServer();

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const registerResponse = await fetch(
      `${baseUrl}/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Użytkownik integracyjny",
          email,
          password,
          styleTags: ["Classic"],
          favoriteColors: ["czarny"],
        }),
      },
    );

    assert.equal(registerResponse.status, 200);

    const registerResult =
      await registerResponse.json();

    assert.equal(registerResult.user.email, email);
    assert.equal(
      Object.hasOwn(registerResult.user, "password"),
      false,
    );

    const registerCookie = getCookie(
      registerResponse,
    );

    const databaseUser =
      await prisma.user.findUnique({
        where: { email },
      });

    assert.ok(databaseUser);
    assert.notEqual(databaseUser.password, password);
    assert.equal(
      await bcrypt.compare(
        password,
        databaseUser.password,
      ),
      true,
    );

    const sessionResponse = await fetch(
      `${baseUrl}/session`,
      {
        headers: {
          Cookie: registerCookie,
        },
      },
    );

    assert.equal(sessionResponse.status, 200);

    const sessionResult =
      await sessionResponse.json();

    assert.equal(sessionResult.user.id, databaseUser.id);
    assert.equal(
      Object.hasOwn(sessionResult.user, "password"),
      false,
    );

    const wrongLoginResponse = await fetch(
      `${baseUrl}/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: "NieprawidloweHaslo",
        }),
      },
    );

    assert.equal(wrongLoginResponse.status, 401);

    const loginResponse = await fetch(
      `${baseUrl}/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    assert.equal(loginResponse.status, 200);
    getCookie(loginResponse);

    const loginResult = await loginResponse.json();

    assert.equal(loginResult.user.email, email);
    assert.equal(
      Object.hasOwn(loginResult.user, "password"),
      false,
    );
  } finally {
    if (server) {
      await stopServer(server);
    }

    await prisma.user.deleteMany({
      where: { email },
    });

    await prisma.$disconnect();
  }
});