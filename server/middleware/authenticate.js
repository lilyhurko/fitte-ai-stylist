const jwt = require("jsonwebtoken");
const { prisma } = require("../config/prisma");
const {
  JWT_SECRET,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLEAR_OPTIONS,
} = require("../config/auth");

const clearInvalidSession = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
};

const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    clearInvalidSession(res);

    return res
      .status(401)
      .json({ error: "Sesja wygasła lub jest nieprawidłowa." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        sessionVersion: true,
      },
    });

    const tokenSessionVersion = decoded.sessionVersion ?? 0;

    if (!user || (user.sessionVersion ?? 0) !== tokenSessionVersion) {
      clearInvalidSession(res);

      return res.status(401).json({
        error: "Sesja wygasła. Zaloguj się ponownie.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    error.publicMessage = "Nie udało się zweryfikować sesji.";
    next(error);
  }
};

module.exports = {
  authenticateToken,
};
