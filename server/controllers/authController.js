const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/prisma");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  AUTH_COOKIE_CLEAR_OPTIONS,
} = require("../config/auth");
const { PUBLIC_USER_SELECT } = require("../config/userSelect");
const { loginSchema, registerSchema } = require("../validators/authValidators");

const register = async (req, res, next) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

  const { name, email, password, styleTags, favoriteColors } = validation.data;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "E-mail zajęty." });

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
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    res.json({ user });
  } catch (error) {
    error.publicMessage = "Błąd rejestracji.";
    next(error);
  }
};

const login = async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

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
      return res.status(401).json({ error: "Błędne dane logowania" });
    }
    const token = jwt.sign({ userId: userWithPassword.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    const { password: _password, ...user } = userWithPassword;
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    res.json({ user });
  } catch (error) {
    error.publicMessage = "Błąd logowania.";
    next(error);
  }
};

const getSession = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user)
      return res.status(401).json({ error: "Sesja jest nieprawidłowa." });
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

module.exports = { register, login, getSession, logout };
