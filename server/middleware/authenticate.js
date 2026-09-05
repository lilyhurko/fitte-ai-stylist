const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLEAR_OPTIONS,
} = require("../config/auth");

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Brak autoryzacji" });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
      return res.status(401).json({ error: "Sesja wygasła" });
    }

    req.user = decoded;
    next();
  });
};

module.exports = {
  authenticateToken,
};