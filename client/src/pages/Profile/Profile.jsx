import React, { useState, useEffect } from "react";
import { Save, Key, CheckCircle, AlertCircle } from "lucide-react";
import "./Profile.css";
import { API_BASE_URL } from "../../config";

const Profile = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    gender: "Kobieta",
    styleTags: [],
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
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const token = sessionStorage.getItem("fitte_token");
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const goraFormularza = {
          firstName: data.firstName || data.name || "",
          email: data.email || "",
          gender: data.gender || "Kobieta",
          styleTags:
            typeof data.styleTags === "string"
              ? JSON.parse(data.styleTags)
              : data.styleTags || [],
        };

        setFormData(goraFormularza);

        const storedUser = JSON.parse(
          sessionStorage.getItem("fitte_user") || "{}",
        );
        if (
          storedUser.name !== goraFormularza.firstName ||
          storedUser.gender !== goraFormularza.gender
        ) {
          storedUser.name = goraFormularza.firstName;
          storedUser.gender = goraFormularza.gender;
          storedUser.styleTags = JSON.stringify(goraFormularza.styleTags);
          sessionStorage.setItem("fitte_user", JSON.stringify(storedUser));
        }
      }
    } catch (error) {
      console.error("Nie udało się pobrać profilu:", error);
    }
  };

  const handleSaveProfile = async () => {
    setLoadingProfile(true);
    setProfileMessage({ type: "", text: "" });
    const token = sessionStorage.getItem("fitte_token");

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
          sessionStorage.getItem("fitte_user") || "{}",
        );
        storedUser.name = formData.firstName;
        storedUser.gender = formData.gender;
        sessionStorage.setItem("fitte_user", JSON.stringify(storedUser));

        setTimeout(() => {
          window.location.reload();
        }, 1000);
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
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Nowe hasła nie są identyczne!",
      });
      return;
    }

    setLoadingPassword(true);
    setPasswordMessage({ type: "", text: "" });
    const token = sessionStorage.getItem("fitte_token");

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
    <main className="profile-container p-12 bg-fitte-cream min-h-screen">
      <header className="mb-8">
        <h2 className="font-playfair text-5xl font-light">
          Twój <span className="italic text-fitte-terracotta">Profil</span>
        </h2>
        <p className="text-fitte-brown-light mt-2">
          Zarządzaj swoimi danymi i bezpieczeństwem konta.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <section className="bg-white rounded-[40px] p-10 border border-fitte-sand shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-playfair text-xl mb-4 text-fitte-brown-dark">
              Dane osobowe
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-2">
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
                />
              </div>
              <div className="flex flex-col gap-2">
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
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                PŁEĆ (DLA AI)
              </label>
              <div className="flex gap-3">
                {["Kobieta", "Mężczyzna", "Inna"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`px-5 py-2 rounded-full border text-xs font-medium transition-all ${
                      formData.gender === g
                        ? "bg-fitte-brown-dark text-white border-fitte-brown-dark"
                        : "bg-transparent border-fitte-sand text-fitte-brown-dark"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-fitte-brown-dark">
                PREFEROWANY STYL
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.styleTags.length > 0 ? (
                  formData.styleTags.map((tag) => (
                    <span key={tag} className="tag-pill text-[10px]">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Brak tagów. Wypełnij quiz.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {profileMessage.text && (
              <div
                className={`flex items-center gap-2 text-xs mb-4 ${profileMessage.type === "success" ? "text-green-600" : "text-red-500"}`}
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
              onClick={handleSaveProfile}
              disabled={loadingProfile}
              className="w-full bg-fitte-brown-dark text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <Save size={18} />
              {loadingProfile ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-[40px] p-10 border border-fitte-sand shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="font-playfair text-xl mb-4 text-fitte-brown-dark">
              Bezpieczeństwo
            </h3>

            <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-2">
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
                placeholder="Min. 6 znaków"
              />
            </div>

            <div className="flex flex-col gap-2">
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
                className={`flex items-center gap-2 text-xs mb-4 ${passwordMessage.type === "success" ? "text-green-600" : "text-red-500"}`}
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
              className="w-full bg-transparent border-2 border-fitte-brown-dark text-fitte-brown-dark py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-fitte-brown-dark hover:text-white transition-all"
            >
              <Key size={18} />
              {loadingPassword ? "Przetwarzanie..." : "Zresetuj hasło"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Profile;
