import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Save, Key, CheckCircle, AlertCircle } from "lucide-react";
import "./Profile.css";
import { API_BASE_URL } from "../../config";

const Profile = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.name || "",
    email: user?.email || "",
    gender: user?.gender || "Kobieta",
    styleTags:
      typeof user?.styleTags === "string"
        ? JSON.parse(user.styleTags || "[]")
        : user?.styleTags || [],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || user.name || prev.firstName,
        email: user.email || prev.email,
        gender: user.gender || prev.gender,
        styleTags:
          typeof user.styleTags === "string"
            ? JSON.parse(user.styleTags || "[]")
            : user.styleTags || prev.styleTags,
      }));
    }
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    const token = localStorage.getItem("fitte_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        const fetchedData = {
          firstName: data.firstName || data.name || "",
          email: data.email || "",
          gender: data.gender || "Kobieta",
          styleTags:
            typeof data.styleTags === "string"
              ? JSON.parse(data.styleTags || "[]")
              : data.styleTags || [],
        };

        setFormData(fetchedData);

        const storedUser = JSON.parse(
          localStorage.getItem("fitte_user") || "{}",
        );
        storedUser.name = fetchedData.firstName;
        storedUser.email = fetchedData.email;
        storedUser.gender = fetchedData.gender;
        storedUser.styleTags = JSON.stringify(fetchedData.styleTags);
        localStorage.setItem("fitte_user", JSON.stringify(storedUser));
      }
    } catch (error) {
      console.error("Nie udało się pobrać profilu:", error);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();

    setLoadingProfile(true);
    setProfileMessage({ type: "", text: "" });
    const token = localStorage.getItem("fitte_token");

    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        setProfileMessage({
          type: "success",
          text: "Profil zaktualizowany pomyślnie!",
        });

        const storedUser = JSON.parse(
          localStorage.getItem("fitte_user") || "{}",
        );
        storedUser.name = formData.firstName;
        storedUser.email = formData.email;
        storedUser.gender = formData.gender;
        localStorage.setItem("fitte_user", JSON.stringify(storedUser));

        await fetchProfileData();
      } else {
        setProfileMessage({
          type: "error",
          text: data.error || "Wystąpił błąd.",
        });
      }
    } catch (error) {
      setProfileMessage({ type: "error", text: "Błąd połączenia z serwerem." });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "Nowe hasło musi mieć minimum 8 znaków.",
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Nowe hasła nie są identyczne!",
      });
      return;
    }

    setLoadingPassword(true);
    setPasswordMessage({ type: "", text: "" });
    const token = localStorage.getItem("fitte_token");

    try {
      const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({
          type: "success",
          text: "Hasło zostało zmienione!",
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordMessage({
          type: "error",
          text: data.error || "Błąd zmiany hasła.",
        });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Błąd serwera." });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <main className="profile-container p-4 md:p-12 bg-fitte-cream min-h-screen w-full max-w-full overflow-x-hidden">
      <header className="mb-6 md:mb-8">
        <h2 className="font-playfair text-2xl md:text-5xl font-light leading-tight">
          Twój <span className="italic text-fitte-terracotta">Profil</span>
        </h2>
        <p className="text-fitte-brown-light text-xs md:text-sm mt-1">
          Zarządzaj swoimi danymi i bezpieczeństwem konta.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-5xl w-full">
        <section className="profile-card bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-10 border border-fitte-sand shadow-sm flex flex-col justify-between w-full">
          <div className="space-y-4 md:space-y-6">
            <h3 className="font-playfair text-lg md:text-xl text-fitte-brown-dark">
              Dane osobowe
            </h3>

            <div className="grid grid-cols-1 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                  IMIĘ
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="profile-input"
                  placeholder="Twoje imię"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                  ADRES E-MAIL
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="profile-input"
                  placeholder="twoj@email.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                PŁEĆ (DLA AI)
              </label>
              <div className="flex flex-wrap gap-2">
                {["Kobieta", "Mężczyzna", "Inna"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`gender-btn touch-manipulation ${
                      formData.gender === g
                        ? "gender-btn-active"
                        : "bg-transparent text-fitte-brown-dark"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                PREFEROWANY STYL
              </label>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {formData.styleTags.length > 0 ? (
                  formData.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="tag-pill text-[9px] md:text-[10px]"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Brak tagów.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {profileMessage.text && (
              <div
                className={`flex items-center gap-1.5 text-xs mb-3 ${
                  profileMessage.type === "success"
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircle size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {profileMessage.text}
              </div>
            )}
            <button
              onClick={(e) => handleSaveProfile(e)}
              disabled={loadingProfile}
              className="w-full bg-fitte-brown-dark text-white py-3 md:py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs md:text-sm shadow-sm touch-manipulation cursor-pointer"
            >
              <Save size={16} />
              {loadingProfile ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        </section>

        <section className="profile-card bg-white rounded-[24px] md:rounded-[40px] p-5 md:p-10 border border-fitte-sand shadow-sm flex flex-col justify-between w-full">
          <div className="space-y-3.5 md:space-y-5">
            <h3 className="font-playfair text-lg md:text-xl text-fitte-brown-dark">
              Bezpieczeństwo
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                OBECNE HASŁO
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="profile-input"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                NOWE HASŁO
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="profile-input"
                placeholder="Min. 8 znaków"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                POWTÓRZ NOWE HASŁO
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="profile-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="mt-6">
            {passwordMessage.text && (
              <div
                className={`flex items-center gap-1.5 text-xs mb-3 ${
                  passwordMessage.type === "success"
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {passwordMessage.text}
              </div>
            )}
            <button
              onClick={handleChangePassword}
              disabled={
                loadingPassword ||
                !passwordData.currentPassword ||
                !passwordData.newPassword
              }
              className="w-full bg-transparent border-2 border-fitte-brown-dark text-fitte-brown-dark py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-fitte-brown-dark hover:text-white transition-all text-xs md:text-sm touch-manipulation cursor-pointer"
            >
              <Key size={16} />
              {loadingPassword ? "Przetwarzanie..." : "Zresetuj hasło"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Profile;
