const bcrypt = require("bcryptjs");
const { prisma } = require("../config/prisma");
const { changePasswordSchema } = require("../validators/authValidators");
const { updateProfileSchema } = require("../validators/profileValidators");

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, gender: true, styleTags: true, name: true },
    });
    res.json({ ...user, firstName: user.name });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać profilu.";
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });

  const { firstName, email, gender } = validation.data;
  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(400).json({ error: "E-mail zajęty." });
      }
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name: firstName, email, gender },
    });
    res.json(updatedUser);
  } catch (error) {
    error.publicMessage = "Nie udało się zaktualizować profilu.";
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });

  const { currentPassword, newPassword } = validation.data;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
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

module.exports = { getProfile, updateProfile, changePassword };
