const test = require("node:test");
const assert = require("node:assert/strict");

require("../helpers/testEnvironment");

const passwordResetEmailService = require("../../services/passwordResetEmailService");
const emailVerificationService = require("../../services/emailVerificationService");

const sentResetCodes = [];
const sentVerificationCodes = [];

passwordResetEmailService.sendPasswordResetCodeEmail = async (data) => {
  sentResetCodes.push(data);
  return { id: "test-reset-email" };
};

emailVerificationService.sendEmailVerificationCodeEmail = async (data) => {
  sentVerificationCodes.push(data);
  return { id: "test-verification-email" };
};

const { app } = require("../../app");
const { prisma } = require("../../config/prisma");
const { AUTH_COOKIE_NAME } = require("../../config/auth");

const startServer = () =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
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

test("weryfikacja e-maila i reset hasła są jednorazowe, a zmiana e-maila cofa weryfikację", async () => {
  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const initialEmail = `security-${uniquePart}@example.com`;
  const newEmail = `security-new-${uniquePart}@example.com`;
  const initialPassword = "PoczatkoweHaslo123!";
  const newPassword = "NoweHaslo123!";

  let server;

  try {
    server = await startServer();

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const registerResponse = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Użytkownik testowy",
        email: initialEmail,
        password: initialPassword,
        styleTags: [],
        favoriteColors: [],
      }),
    });

    assert.equal(registerResponse.status, 200);
    const cookie = getCookie(registerResponse);

    const sendVerificationResponse = await fetch(
      `${baseUrl}/email-verification/request`,
      {
        method: "POST",
        headers: { Cookie: cookie },
      },
    );

    assert.equal(sendVerificationResponse.status, 200);
    assert.equal(sentVerificationCodes.length, 1);

    const verificationCode = sentVerificationCodes[0].code;

    const verifyEmailResponse = await fetch(
      `${baseUrl}/email-verification/verify`,
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode }),
      },
    );

    assert.equal(verifyEmailResponse.status, 200);

    const verifiedUser = await prisma.user.findUnique({
      where: { email: initialEmail },
    });

    assert.ok(verifiedUser.emailVerifiedAt);

    const repeatedVerificationResponse = await fetch(
      `${baseUrl}/email-verification/verify`,
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode }),
      },
    );

    assert.equal(repeatedVerificationResponse.status, 200);

    const updateEmailResponse = await fetch(`${baseUrl}/profile`, {
      method: "PATCH",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Użytkownik testowy",
        email: newEmail,
        gender: "Kobieta",
      }),
    });

    assert.equal(updateEmailResponse.status, 200);

    const userWithNewEmail = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    assert.equal(userWithNewEmail.emailVerifiedAt, null);

    const requestResetResponse = await fetch(`${baseUrl}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });

    assert.equal(requestResetResponse.status, 200);
    assert.equal(sentResetCodes.length, 1);

    const resetCode = sentResetCodes[0].code;

    const resetResponse = await fetch(`${baseUrl}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        code: resetCode,
        newPassword,
        confirmPassword: newPassword,
      }),
    });

    assert.equal(resetResponse.status, 200);

    const repeatedResetResponse = await fetch(`${baseUrl}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        code: resetCode,
        newPassword,
        confirmPassword: newPassword,
      }),
    });

    assert.equal(repeatedResetResponse.status, 400);

    const oldPasswordLoginResponse = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: initialPassword,
      }),
    });

    assert.equal(oldPasswordLoginResponse.status, 401);

    const newPasswordLoginResponse = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
      }),
    });

    assert.equal(newPasswordLoginResponse.status, 200);
  } finally {
    if (server) {
      await stopServer(server);
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [initialEmail, newEmail],
        },
      },
    });

    await prisma.$disconnect();
  }
});
