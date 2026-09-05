import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWardrobe } from "../../context/WardrobeContext";
import { NavLink } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
  Sparkles,
  Shirt,
  History,
  User,
  Calendar,
  BarChart3,
  PieChart,
  CloudSun,
  Heart,
  Briefcase,
  Package,
  Plus,
  Plane,
  MapPin,
} from "lucide-react";
import { API_BASE_URL } from "../../config";
import "./Sidebar.css";

const OCCASION_STYLE_MATCH = {
  Randka: ["chic", "romantic"],
  Praca: ["classic", "minimalizm"],
};

const WEATHER_BLACKLIST = {
  Rain: {
    categories: ["sukienki"],
    styles: [],
    colors: [],
    forbiddenKeywords: ["sandał", "klapk"],
  },
  Hot: {
    categories: [],
    styles: ["classic"],
    colors: ["czarny", "ciemnobrązowy"],
    forbiddenKeywords: ["grub", "wełn", "kozak"],
  },
  Cold: {
    categories: ["sukienki"],
    styles: ["boho"],
    colors: [],
    forbiddenKeywords: ["cienki", "krótki", "letni"],
  },
};

const EMPTY_STATS = {
  styles: [],
  colors: [],
  total: 0,
  rawStyles: {},
  rawColors: {},
  datePercentage: 0,
  workPercentage: 0,
  weatherPercentage: 100,
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { clothes } = useWardrobe();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapsuleOpen, setIsCapsuleOpen] = useState(false);
  const [capsuleData, setCapsuleData] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.targetTouches[0].clientX;
      touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e) => {
      touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
      const distance = touchEndX.current - touchStartX.current;
      const isSwipeRight = distance > 70; 
      const isSwipeLeft = distance < -70; 

      if (isSwipeRight && touchStartX.current < 50 && !isOpen) {
        setIsOpen(true);
      }

      if (isSwipeLeft && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isOpen]);

  const stats = useMemo(() => {
    if (!clothes || clothes.length === 0) {
      return EMPTY_STATS;
    }

    const styleCount = {};
    const colorCount = {};

    let dateValid = 0;
    let workValid = 0;

    const currentSidebarWeather = "Hot";
    let weatherCompatibleCount = 0;

    clothes.forEach((item) => {
      const nameLower = item.name?.toLowerCase() || "";
      const colorLower = item.color?.toLowerCase() || "";
      const itemStyles = (item.style || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const stylesLower = itemStyles.map((s) => s.toLowerCase());
      const catLower = item.category?.toLowerCase() || "";

      itemStyles.forEach((st) => {
        styleCount[st] = (styleCount[st] || 0) + 1;
      });
      if (item.color)
        colorCount[item.color] = (colorCount[item.color] || 0) + 1;

      if (stylesLower.some((s) => OCCASION_STYLE_MATCH["Randka"].includes(s))) {
        dateValid++;
      }

      if (stylesLower.some((s) => OCCASION_STYLE_MATCH["Praca"].includes(s))) {
        workValid++;
      }

      const blacklist = WEATHER_BLACKLIST[currentSidebarWeather];
      let isBlacklisted = false;
      if (blacklist) {
        if (
          blacklist.categories.includes(catLower) ||
          stylesLower.some((s) => blacklist.styles.includes(s)) ||
          blacklist.colors.includes(colorLower)
        ) {
          isBlacklisted = true;
        }
        if (
          blacklist.forbiddenKeywords?.some((keyword) =>
            nameLower.includes(keyword),
          )
        ) {
          isBlacklisted = true;
        }
      }
      if (!isBlacklisted) weatherCompatibleCount++;
    });

    const topStyles = Object.entries(styleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);
    const topColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);

    return {
      styles: topStyles,
      colors: topColors,
      total: clothes.length,
      rawStyles: styleCount,
      rawColors: colorCount,
      datePercentage: Math.round((dateValid / clothes.length) * 100),
      workPercentage: Math.round((workValid / clothes.length) * 100),
      weatherPercentage: Math.round(
        (weatherCompatibleCount / clothes.length) * 100,
      ),
    };
  }, [clothes]);

  if (!user) return null;

  const handleStatsClick = () => {
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenCapsule = async () => {
    setIsOpen(false);
    setIsCapsuleOpen(true);

    const getCoordinates = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ latitude: 51.2465, longitude: 22.5684 });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () => resolve({ latitude: 51.2465, longitude: 22.5684 }),
          { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 },
        );
      });
    };

    try {
      const coords = await getCoordinates();
      const res = await fetch(
        `${API_BASE_URL}/capsule?latitude=${coords.latitude}&longitude=${coords.longitude}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (res.status === 401 || res.status === 403) {
        setIsCapsuleOpen(false);
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCapsuleData(data);
      }
    } catch (e) {
      console.error("Błąd pobierania szafy kapsułowej:", e);
    }
  };

  return (
    <>
      <button 
        className="mobile-nav-toggle touch-manipulation" 
        onClick={() => setIsOpen(true)}
        aria-label="Otwórz menu"
      >
        <Menu size={22} />
      </button>


      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button 
          className="mobile-nav-close touch-manipulation" 
          onClick={() => setIsOpen(false)}
          aria-label="Zamknij menu"
        >
          <X size={22} />
        </button>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <h1 className="logo font-playfair italic">Fitte</h1>
          </div>

          <div className="user-card">
            <div className="avatar">
              {(user.firstName || user.name || "F")?.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{user.firstName || user.name}</span>
              <span className="user-stats">
                {clothes.length} UBRAŃ W SZAFIE
              </span>
            </div>
          </div>

          <nav className="sidebar-navigation md:hidden">
            <NavLink
              to="/"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item active" : "sidebar-nav-item"
              }
            >
              <Sparkles size={18} /> <span>Asystent</span>
            </NavLink>
            <NavLink
              to="/wardrobe"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item active" : "sidebar-nav-item"
              }
            >
              <Shirt size={18} /> <span>Moja garderoba</span>
            </NavLink>
            <NavLink
              to="/calendar"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item active" : "sidebar-nav-item"
              }
            >
              <Calendar size={18} /> <span>Planer</span>
            </NavLink>
            <NavLink
              to="/history"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item active" : "sidebar-nav-item"
              }
            >
              <History size={18} /> <span>Historia</span>
            </NavLink>
            <NavLink
              to="/profile"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item active" : "sidebar-nav-item"
              }
            >
              <User size={18} /> <span>Profil</span>
            </NavLink>
          </nav>

          <div className="sidebar-section">
            <h3 className="section-title mb-2">Twój dominujący styl</h3>
            <div className="tag-cloud">
              {stats.styles.length > 0 ? (
                stats.styles.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400 italic">
                  Brak danych
                </span>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="section-title">Paleta Twojej szafy</h3>
            <div className="detected-colors">
              {stats.colors.length > 0 ? (
                stats.colors.map((color) => (
                  <div key={color} className="color-analysis-item">
                    <div
                      className="dot"
                      style={{ background: getColorCode(color) }}
                    ></div>
                    <span>{color}</span>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-gray-400 italic">
                  Brak danych
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button
            onClick={handleStatsClick}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl bg-white/60 border border-[#E8DDD0]/50 shadow-2xs hover:bg-white transition-all text-left cursor-pointer touch-manipulation"
          >
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 shrink-0">
              <CloudSun size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-fitte-brown-dark uppercase tracking-wide">
                  Dopasowanie do pogody
                </span>
                <span className="text-[11px] font-bold text-amber-700 shrink-0 ml-1">
                  {stats.weatherPercentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.weatherPercentage}%`,
                    background: "linear-gradient(90deg, #E6A23C, #F56C6C)",
                  }}
                ></div>
              </div>
            </div>
            <BarChart3 size={14} className="text-gray-300 shrink-0" />
          </button>

          <button
            onClick={handleOpenCapsule}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl bg-white/60 border border-[#E8DDD0]/50 shadow-2xs hover:bg-white transition-all text-left cursor-pointer touch-manipulation"
          >
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
              <Package size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-fitte-brown-dark uppercase tracking-wide">
                  Szafa kapsułowa
                </span>
                <span className="text-[11px] font-bold text-indigo-700 shrink-0 ml-1">
                  {Math.min(stats.total, 10)}/10
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(stats.total, 10) * 10}%`,
                    background: "linear-gradient(90deg, #818CF8, #4338CA)",
                  }}
                ></div>
              </div>
            </div>
            <BarChart3 size={14} className="text-gray-300 shrink-0" />
          </button>

          <hr className="footer-line" />
          <button onClick={logout} className="logout-btn touch-manipulation">
            <LogOut size={20} />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>

      <StatsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stats={stats}
      />
      <CapsuleModal
        isOpen={isCapsuleOpen}
        onClose={() => setIsCapsuleOpen(false)}
        data={capsuleData}
        onDataChange={setCapsuleData}
        allClothes={clothes}
      />
    </>
  );
};

const StatsModal = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content apple-card max-w-lg w-[90%] max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn absolute top-4 right-4 p-2 text-gray-400 hover:text-black transition-colors touch-manipulation"
          onClick={onClose}
        >
          <X size={22} />
        </button>

        <h2 className="font-playfair text-xl md:text-2xl mb-1">
          Wizualna struktura Twojej <span className="italic">Garderoby</span>
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Pełna analiza kolorystyczno-stylistyczna Fitte AI
        </p>

        {stats.total === 0 ? (
          <div className="text-center py-10 text-gray-400 italic">
            Garderoba jest obecnie pusta. Dodaj ubrania, aby zobaczyć analizę.
          </div>
        ) : (
          /* ВИПРАВЛЕНО: забрано max-h-[65vh] та overflow-y-auto */
          <div className="flex flex-col gap-4">
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex items-center gap-3 md:gap-4">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                <CloudSun size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="truncate">Dopasowanie do pogody</span>
                  <span className="text-amber-700 ml-2">
                    {stats.weatherPercentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${stats.weatherPercentage}%`,
                      background: "linear-gradient(90deg, #E6A23C, #F56C6C)",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 md:p-4 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <Heart size={13} /> Na randki
                </div>
                <div className="text-xl md:text-2xl font-playfair font-bold text-rose-700">
                  {stats.datePercentage}%
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.datePercentage}%`,
                      background: "linear-gradient(90deg, #FFA07A, #FF647C)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-white p-3.5 md:p-4 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600">
                  <Briefcase size={13} /> Do pracy
                </div>
                <div className="text-xl md:text-2xl font-playfair font-bold text-blue-800">
                  {stats.workPercentage}%
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.workPercentage}%`,
                      background: "linear-gradient(90deg, #5D9CEC, #4A90E2)",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <PieChart size={13} /> Dominujące kolory
              </h4>
              <div className="flex flex-col gap-2.5">
                {Object.entries(stats.rawColors)
                  .slice(0, 5)
                  .map(([colorName, count]) => {
                    const percentage = Math.round((count / stats.total) * 100);
                    const colorCode = getColorCode(colorName);

                    return (
                      <div key={colorName} className="text-xs">
                        <div className="flex justify-between text-gray-600 mb-1 font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-gray-300 shadow-2xs"
                              style={{ background: colorCode }}
                            ></div>
                            <span className="capitalize">{colorName}</span>
                          </div>
                          <span className="font-bold">{percentage}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F8F3ED] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              background: colorCode,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <BarChart3 size={13} /> Podział ze względu na Style
              </h4>
              <div className="flex flex-col gap-2.5">
                {Object.entries(stats.rawStyles).map(([styleName, count]) => {
                  const percentage = Math.round((count / stats.total) * 100);
                  return (
                    <div key={styleName} className="text-xs">
                      <div className="flex justify-between text-gray-600 mb-1 font-medium">
                        <span>{styleName}</span>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F8F3ED] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            background: "linear-gradient(90deg, #8E7A6B, #3D2B1F)",
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CapsuleModal = ({
  isOpen,
  onClose,
  data,
  onDataChange,
  allClothes = [],
}) => {
  const [items, setItems] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState("today");
  const [tripCity, setTripCity] = useState("");
  const [tripDays, setTripDays] = useState(5);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripError, setTripError] = useState("");

  useEffect(() => {
    if (data?.capsuleItems) {
      setItems(data.capsuleItems);
    } else {
      setItems([]);
    }
    setShowPicker(false);
  }, [data]);

  const combinations = useMemo(() => {
    const goras = items.filter((i) => i.category === "Góra");
    const dols = items.filter((i) => i.category === "Dół");
    const sukienki = items.filter((i) => i.category === "Sukienki");
    const buty = items.filter(
      (i) => i.category === "Buty" || i.category === "Obuwie",
    );

    const combos = [];
    if (buty.length === 0) {
      goras.forEach((g) => dols.forEach((d) => combos.push([g, d])));
      sukienki.forEach((s) => combos.push([s]));
    } else {
      goras.forEach((g) =>
        dols.forEach((d) => buty.forEach((b) => combos.push([g, d, b]))),
      );
      sukienki.forEach((s) => buty.forEach((b) => combos.push([s, b])));
    }
    return combos;
  }, [items]);

  const availableToAdd = useMemo(
    () => (allClothes || []).filter((c) => !items.some((i) => i.id === c.id)),
    [allClothes, items],
  );

  const handleRemove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const handleAdd = (cloth) => setItems((prev) => [...prev, cloth]);

  const handleGenerateTripCapsule = async () => {
    setTripError("");
    if (!tripCity.trim()) {
      setTripError("Podaj nazwę miasta.");
      return;
    }
    const daysNum = parseInt(tripDays, 10);
    if (!Number.isFinite(daysNum) || daysNum < 1) {
      setTripError("Podaj poprawną liczbę dni.");
      return;
    }

    setTripLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/capsule/trip`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city: tripCity.trim(), days: daysNum }),
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        onDataChange?.(result); 
      } else {
        setTripError(result.error || "Nie udało się wygenerować kapsuły.");
      }
    } catch (e) {
      setTripError("Błąd sieci.");
    } finally {
      setTripLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content apple-card max-w-2xl w-[90%] max-h-[88vh] overflow-y-auto p-5 md:p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-btn absolute top-3 right-3 p-2 text-gray-400 hover:text-black transition-colors touch-manipulation"
          onClick={onClose}
        >
          <X size={22} />
        </button>

        <h2 className="font-playfair text-xl md:text-2xl mb-1">
          Algorytmiczna Szafa <span className="italic">Kapsułowa</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Metoda kombinatoryczna użyteczności odzieży
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("today")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation ${
              mode === "today"
                ? "bg-[#3D2B1F] text-white"
                : "bg-white text-[#3D2B1F] border border-[#E8DDD0]"
            }`}
          >
            <CloudSun size={14} /> Dziś
          </button>
          <button
            onClick={() => setMode("trip")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation ${
              mode === "trip"
                ? "bg-[#3D2B1F] text-white"
                : "bg-white text-[#3D2B1F] border border-[#E8DDD0]"
            }`}
          >
            <Plane size={14} /> Wyjazd
          </button>
        </div>

        {mode === "trip" && (
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-[#E8DDD0]/50 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={tripCity}
                  onChange={(e) => setTripCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateTripCapsule()}
                  placeholder="Miasto, np. Rzym"
                  className="w-full bg-[#FDFBF9] border border-[#E8DDD0] rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={tripDays}
                  onChange={(e) => setTripDays(e.target.value)}
                  className="w-20 bg-[#FDFBF9] border border-[#E8DDD0] rounded-xl px-3 py-2 text-xs text-center"
                />
                <button
                  onClick={handleGenerateTripCapsule}
                  disabled={tripLoading}
                  className="flex-1 bg-[#3D2B1F] text-white px-4 py-2 rounded-xl text-xs font-bold touch-manipulation cursor-pointer"
                >
                  {tripLoading ? "..." : "Generuj"}
                </button>
              </div>
            </div>
            {tripError && <p className="text-[10px] text-red-500 mt-1">{tripError}</p>}
            
            {data?.city && mode === "trip" && (
              <div className="mt-2 pt-2 border-t border-[#E8DDD0]/30 flex flex-wrap justify-between items-center text-[10px] text-gray-500">
                <span>
                  Trasa: <strong className="text-[#3D2B1F]">{data.city}{data.country ? `, ${data.country}` : ""}</strong> ({data.days} dni)
                </span>
                {data?.weatherTypes && (
                  <div className="flex gap-1 mt-1 sm:mt-0">
                    {data.weatherTypes.map((wt) => (
                      <span key={wt} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200/50">
                        {wt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!data ? (
          <div className="text-center py-8 text-gray-400 italic text-xs">
            {mode === "trip"
              ? "Podaj miasto i liczbę dni, aby wygenerować kapsułę."
              : "Dodaj min. 5 ubrań, aby wygenerować szafę kapsułową."}
          </div>
        ) : (
          /* ВИПРАВЛЕНО: забрано max-h-[65vh] та overflow-y-auto */
          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-r from-[#8E7A6B] to-[#3D2B1F] p-4 rounded-2xl text-white shadow-sm text-center">
              <span className="text-[9px] uppercase tracking-widest opacity-70 block mb-0.5">
                Wynik Analiz
              </span>
              <div className="text-xl md:text-2xl font-playfair font-bold">
                {items.length} el. = {combinations.length} stylizacji
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Elementy bazy ({items.length})
                </h4>
                <button
                  onClick={() => setShowPicker((prev) => !prev)}
                  className="text-[10px] font-bold text-[#8E7A6B] flex items-center gap-1 touch-manipulation"
                >
                  <Plus size={12} /> {showPicker ? "Zamknij" : "Dodaj"}
                </button>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 bg-white p-3 rounded-2xl border border-[#E8DDD0]/40">
                {items.map((item) => (
                  <div key={item.id} className="relative flex flex-col items-center bg-[#FDFBF9] p-1.5 rounded-xl border border-gray-100">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 text-red-500 shadow-2xs touch-manipulation"
                    >
                      <X size={10} />
                    </button>
                    <img src={item.imageUrl} alt={item.name} className="h-12 w-12 object-contain mb-1" />
                    <span className="text-[8px] font-bold text-gray-500 truncate w-full text-center">{item.name}</span>
                  </div>
                ))}
              </div>

              {showPicker && (
                <div className="bg-white border border-[#E8DDD0]/50 rounded-2xl p-3 mt-2">
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-36 overflow-y-auto">
                    {availableToAdd.map((cloth) => (
                      <button
                        key={cloth.id}
                        onClick={() => handleAdd(cloth)}
                        className="flex flex-col items-center bg-[#FDFBF9] p-1.5 rounded-xl border border-gray-100 touch-manipulation"
                      >
                        <img src={cloth.imageUrl} alt={cloth.name} className="h-10 w-10 object-contain mb-1" />
                        <span className="text-[8px] font-bold text-gray-500 truncate w-full">{cloth.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Kombinacje zestawów ({combinations.length})
              </h4>
              <div className="flex flex-col gap-2">
                {combinations.map((outfit, index) => (
                  <div key={index} className="combinations-list-item flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#E8DDD0]/30">
                    <span className="text-[9px] font-bold text-[#8E7A6B]">#{index + 1}</span>
                    <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
                      {outfit.map((cloth) => (
                        <div key={cloth.id} className="flex items-center gap-1 bg-gray-50/50 p-1 rounded-lg border border-gray-100 shrink-0">
                          <img src={cloth.imageUrl} alt={cloth.name} className="h-6 w-6 object-contain" />
                          <span className="text-[8px] font-medium text-gray-600 max-w-[60px] truncate">{cloth.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const EXACT_COLORS = {
  czarny: "#000000",
  czarna: "#000000",
  biały: "#FFFFFF",
  biała: "#FFFFFF",
  szary: "#808080",
  szara: "#808080",
  grafitowy: "#36454F",
  grafitowa: "#36454F",
  srebrny: "#C0C0C0",
  srebrna: "#C0C0C0",
  złoty: "#FFD700",
  złota: "#FFD700",

  beżowy: "#F5F5DC",
  beżowa: "#F5F5DC",
  beż: "#F5F5DC",
  kremowy: "#FFFDD0",
  kremowa: "#FFFDD0",
  krem: "#FFFDD0",
  ecru: "#F5F2EB",
  ecrú: "#F5F2EB",
  brązowy: "#A52A2A",
  brązowa: "#A52A2A",
  ciemnobrązowy: "#5C4033",
  ciemnobrązowa: "#5C4033",
  camel: "#C19A6B",
  camelowy: "#C19A6B",
  karmelowy: "#C68E17",
  karmelowa: "#C68E17",
  cynamonowy: "#C58F5C",
  czekoladowy: "#7B3F00",
  czekoladowa: "#7B3F00",
  terrakota: "#E2725B",

  czerwony: "#FF0000",
  czerwona: "#FF0000",
  czerwień: "#FF0000",
  bordo: "#800020",
  bordowy: "#800020",
  bordowa: "#800020",
  szkarłatny: "#FF2400",
  różowy: "#FFC0CB",
  różowa: "#FFC0CB",
  "pastelowy róż": "#FFD1DC",
  "pudrowy róż": "#FFD1DC",
  fuksja: "#FF00FF",
  fuksjowy: "#FF00FF",
  amarantowy: "#E52B50",
  fioletowy: "#800080",
  fioletowa: "#800080",
  śliwkowy: "#4E3629",
  śliwkowa: "#4E3629",
  lawendowy: "#E6E6FA",
  lawendowa: "#E6E6FA",
  liliowy: "#C8A2C8",
  liliowa: "#C8A2C8",

  niebieski: "#0000FF",
  niebieska: "#0000FF",
  błękitny: "#87CEEB",
  błękitna: "#87CEEB",
  "pastelowy błękit": "#AEC6CF",
  granatowy: "#1A2E40",
  granatowa: "#1A2E40",
  morski: "#008080",
  morska: "#008080",
  turkusowy: "#40E0D0",
  turkusowa: "#40E0D0",
  lazurowy: "#007FFF",
  lazurowa: "#007FFF",
  chabrowy: "#3300CC",
  chabrowa: "#3300CC",
  indygo: "#4B0082",

  zielony: "#008000",
  zielona: "#008000",
  oliwkowy: "#808000",
  oliwkowa: "#808000",
  khaki: "#4B5320",
  miętowy: "#AAF0D1",
  miętowa: "#AAF0D1",
  szmaragdowy: "#50C878",
  szmaragdowa: "#50C878",
  "butelkowa zieleń": "#005C29",
  "butelkowy zielony": "#005C29",
  seledynowy: "#98FF98",
  seledynowa: "#98FF98",
  limonkowy: "#BFFF00",
  limonkowa: "#BFFF00",

  żółty: "#FFFF00",
  żółta: "#FFFF00",
  musztardowy: "#E1AD01",
  musztardowa: "#E1AD01",
  "pastelowy żółty": "#FDFD96",
  pomarańczowy: "#FFA500",
  pomarańczowa: "#FFA500",
  brzoskwiniowy: "#FFE5B4",
  brzoskwiniowa: "#FFE5B4",
  morelowy: "#FBCEB1",
  morelowa: "#FBCEB1",
  koralowy: "#FF7F50",
  koralowa: "#FF7F50",
};

const FUZZY_COLORS = [
  [["czarn"], "#000000"],
  [["biel", "biał"], "#FFFFFF"],
  [["krem"], "#FFFDD0"],
  [["beż"], "#F5F5DC"],
  [["ecru"], "#F5F2EB"],
  [["szar", "grafit"], "#808080"],
  [["granat"], "#1A2E40"],
  [["niebiesk"], "#0000FF"],
  [["błękit", "lazurow"], "#87CEEB"],
  [["turkus", "morsk"], "#40E0D0"],
  [["róż", "amarant"], "#FFC0CB"],
  [["fuksj"], "#FF00FF"],
  [["fiolet", "lawend", "liliow"], "#800080"],
  [["czerw", "bordo", "szkarłat"], "#FF0000"],
  [["zielon", "oliwk", "khaki"], "#008000"],
  [["mięt"], "#AAF0D1"],
  [["brąz", "camel", "karmel", "czekolad"], "#A52A2A"],
  [["żółt", "musztard"], "#FFFF00"],
  [["pomarań", "brzoskwin", "koral"], "#FFA500"],
  [["złot"], "#FFD700"],
  [["srebr"], "#C0C0C0"],
];

const getColorCode = (colorName) => {
  if (!colorName) return "#E6DFD9";
  const normalized = colorName.toLowerCase().trim();

  if (EXACT_COLORS[normalized]) return EXACT_COLORS[normalized];

  for (const [keywords, code] of FUZZY_COLORS) {
    if (keywords.some((kw) => normalized.includes(kw))) return code;
  }

  if (
    normalized.includes("wielokolor") ||
    normalized.includes("mix") ||
    normalized.includes("wzór") ||
    normalized.includes("wzorzyst")
  ) {
    return "linear-gradient(135deg, #FF0000 0%, #00FF00 50%, #0000FF 100%)";
  }

  return "#E6DFD9";
};

export default Sidebar;
