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
} = require("../validators/authValidators");

const GOOGLE_PROVIDER = "google";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

const createSession = (res, user) => {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
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
        // Zachowujemy wymagalność hasła w obecnym modelu.
        // Użytkownik może później ustawić własne hasło przez reset hasła.
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
  getSession,
  logout,
};
