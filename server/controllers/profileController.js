const bcrypt = require("bcryptjs");
const { prisma } = require("../config/prisma");
const { changePasswordSchema } = require("../validators/authValidators");
const {
  updateProfileSchema,
  deleteAccountSchema,
} = require("../validators/profileValidators");
const { PUBLIC_USER_SELECT } = require("../config/userSelect");
const {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLEAR_OPTIONS,
} = require("../config/auth");
const {
  deleteUserAccountWithDependencies,
} = require("../services/deletionService");

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: PUBLIC_USER_SELECT,
    });
    res.json({ ...user, firstName: user.name });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać profilu.";
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

  const {
    firstName,
    email,
    gender,
    defaultLocationName,
    defaultLatitude,
    defaultLongitude,
  } = validation.data;
  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(400).json({ error: "E-mail zajęty." });
      }
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: firstName,
        email,
        gender,
        defaultLocationName,
        defaultLatitude,
        defaultLongitude,
      },
      select: PUBLIC_USER_SELECT,
    });
    res.json(updatedUser);
  } catch (error) {
    error.publicMessage = "Nie udało się zaktualizować profilu.";
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

  const { currentPassword, newPassword } = validation.data;
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: "Błędne hasło." });
    }
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    res.json({ success: true, message: "Hasło zmienione." });
  } catch (error) {
    error.publicMessage = "Nie udało się zmienić hasła.";
    next(error);
  }
};
const deleteAccount = async (req, res, next) => {
  const validation = deleteAccountSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (
      !user ||
      !(await bcrypt.compare(validation.data.password, user.password))
    ) {
      return res.status(401).json({
        error: "Nieprawidłowe hasło.",
      });
    }

    const deleted = await deleteUserAccountWithDependencies({
      userId: user.id,
      requestId: req.requestId,
    });

    if (!deleted) {
      return res.status(404).json({
        error: "Nie znaleziono konta.",
      });
    }

    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);

    res.json({
      success: true,
      message: "Konto i wszystkie powiązane dane zostały usunięte.",
    });
  } catch (error) {
    error.publicMessage = "Nie udało się usunąć konta.";
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
