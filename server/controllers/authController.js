const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { prisma } = require("../config/prisma");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  AUTH_COOKIE_CLEAR_OPTIONS,
} = require("../config/auth");
const { PUBLIC_USER_SELECT } = require("../config/userSelect");
const {
  loginSchema,
  registerSchema,
  googleLoginSchema,
  requestPasswordResetSchema,
  verifyPasswordResetCodeSchema,
  resetPasswordSchema,
} = require("../validators/authValidators");
const {
  PASSWORD_RESET_CODE_TTL_MINUTES,
  sendPasswordResetCodeEmail,
} = require("../services/passwordResetEmailService");

const GOOGLE_PROVIDER = "google";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

const createSession = (res, user) => {
  const token = jwt.sign(
    {
      userId: user.id,
      sessionVersion: user.sessionVersion ?? 0,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );

  res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
};

const getActivePasswordResetCode = async (userId, now) => {
  // MongoDB rozróżnia pole null od pola nieustawionego. Wybór rekordu po
  // pobraniu ostatnich kodów zapewnia poprawne działanie w obu przypadkach.
  const resetCodes = await prisma.passwordResetCode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return resetCodes.find(
    (candidate) =>
      !candidate.usedAt && candidate.expiresAt > now && candidate.attempts < 5,
  );
};

const register = async (req, res, next) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { name, email, password, styleTags, favoriteColors } = validation.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "E-mail zajęty." });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        styleTags,
        favoriteColors,
      },
      select: PUBLIC_USER_SELECT,
    });

    createSession(res, user);
    res.json({ user });
  } catch (error) {
    error.publicMessage = "Błąd rejestracji.";
    next(error);
  }
};

const login = async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { email, password } = validation.data;

  try {
    const userWithPassword = await prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_USER_SELECT, password: true },
    });

    if (
      !userWithPassword ||
      !(await bcrypt.compare(password, userWithPassword.password))
    ) {
      return res.status(401).json({ error: "Błędne dane logowania." });
    }

    const { password: _password, ...user } = userWithPassword;

    createSession(res, user);
    res.json({ user });
  } catch (error) {
    error.publicMessage = "Błąd logowania.";
    next(error);
  }
};

const loginWithGoogle = async (req, res, next) => {
  const validation = googleLoginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: "Logowanie Google nie jest jeszcze skonfigurowane.",
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: validation.data.credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    const googleSubject = payload?.sub;
    const name = payload?.name?.trim();

    if (!payload?.email_verified || !email || !googleSubject) {
      return res.status(401).json({
        error: "Nie udało się potwierdzić konta Google.",
      });
    }

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: GOOGLE_PROVIDER,
          providerSubject: googleSubject,
        },
      },
      include: {
        user: {
          select: PUBLIC_USER_SELECT,
        },
      },
    });

    if (existingIdentity) {
      createSession(res, existingIdentity.user);
      return res.json({ user: existingIdentity.user });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: PUBLIC_USER_SELECT,
    });

    if (existingUser) {
      await prisma.authIdentity.create({
        data: {
          provider: GOOGLE_PROVIDER,
          providerSubject: googleSubject,
          email,
          userId: existingUser.id,
        },
      });

      createSession(res, existingUser);
      return res.json({ user: existingUser });
    }

    const user = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        password: await bcrypt.hash(crypto.randomUUID(), 10),
        styleTags: [],
        favoriteColors: [],
        authIdentities: {
          create: {
            provider: GOOGLE_PROVIDER,
            providerSubject: googleSubject,
            email,
          },
        },
      },
      select: PUBLIC_USER_SELECT,
    });

    createSession(res, user);
    res.status(201).json({ user });
  } catch (error) {
    error.publicMessage = "Nie udało się zalogować przez Google.";
    next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  const validation = requestPasswordResetSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const email = validation.data.email.trim().toLowerCase();

  const genericResponse = {
    success: true,
    message:
      "Jeśli konto o tym adresie istnieje, wysłaliśmy kod do zmiany hasła.",
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.json(genericResponse);
    }

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - 60 * 1000);

    const recentlyRequestedCode = await prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: cooldownStart },
      },
      select: { id: true },
    });

    if (recentlyRequestedCode) {
      return res.json(genericResponse);
    }

    await prisma.passwordResetCode.updateMany({
      where: {
        userId: user.id,
      },
      data: {
        usedAt: now,
      },
    });

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

    const resetCode = await prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(
          now.getTime() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
        ),
      },
    });

    try {
      await sendPasswordResetCodeEmail({ email, code });
    } catch (emailError) {
      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { usedAt: new Date() },
      });

      return res.json(genericResponse);
    }

    return res.json(genericResponse);
  } catch (error) {
    error.publicMessage = "Nie udało się przygotować resetu hasła.";
    next(error);
  }
};

const verifyPasswordResetCode = async (req, res, next) => {
  const validation = verifyPasswordResetCodeSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const email = validation.data.email.trim().toLowerCase();
  const { code } = validation.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    const resetCode = await getActivePasswordResetCode(user.id, new Date());

    if (!resetCode) {
      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    const isCodeValid = await bcrypt.compare(code, resetCode.codeHash);

    if (!isCodeValid) {
      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts: { increment: 1 } },
      });

      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    return res.json({
      success: true,
      message: "Kod został potwierdzony.",
    });
  } catch (error) {
    error.publicMessage = "Nie udało się potwierdzić kodu.";
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const validation = resetPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { code, newPassword } = validation.data;

  const email = validation.data.email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    const now = new Date();

    const resetCode = await getActivePasswordResetCode(user.id, now);

    if (!resetCode) {
      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    const isCodeValid = await bcrypt.compare(code, resetCode.codeHash);

    if (!isCodeValid) {
      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return res.status(400).json({
        error: "Kod jest nieprawidłowy, wykorzystany lub wygasł.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          sessionVersion: {
            increment: 1,
          },
        },
      }),
      prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: {
          usedAt: now,
        },
      }),
      prisma.passwordResetCode.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);

    return res.json({
      success: true,
      message: "Hasło zostało zmienione. Zaloguj się nowym hasłem.",
    });
  } catch (error) {
    error.publicMessage = "Nie udało się zmienić hasła.";
    next(error);
  }
};

const getSession = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      return res.status(401).json({ error: "Sesja jest nieprawidłowa." });
    }

    res.json({ user });
  } catch (error) {
    error.publicMessage = "Nie udało się sprawdzić sesji.";
    next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
  res.json({ success: true });
};

module.exports = {
  register,
  login,
  loginWithGoogle,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  getSession,
  logout,
};
