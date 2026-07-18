import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWardrobe } from "../../context/WardrobeContext";
import { NavLink } from "react-router-dom";
import { LogOut, Menu, X, Sparkles, Shirt, History, User, Calendar, BarChart3, PieChart, CloudSun, Heart, Briefcase, Package } from "lucide-react";
import "./Sidebar.css";

const OCCASION_STYLE_MATCH = {
  "Randka": ["chic", "romantic"],
  "Praca": ["classic", "minimalizm"]
};

const WEATHER_BLACKLIST = {
  "Rain": { categories: ["sukienki"], styles: [], colors: [], forbiddenKeywords: ["sandał", "klapk"] },
  "Hot": { categories: [], styles: ["classic"], colors: ["czarny", "ciemnobrązowy"], forbiddenKeywords: ["grub", "wełn", "kozak"] },
  "Cold": { categories: ["sukienki"], styles: ["boho"], colors: [], forbiddenKeywords: ["cienki", "krótki", "letni"] }
};

const EMPTY_STATS = {
  styles: [],
  colors: [],
  total: 0,
  rawStyles: {},
  rawColors: {},
  datePercentage: 0,
  workPercentage: 0,
  weatherPercentage: 100
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { clothes } = useWardrobe();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapsuleOpen, setIsCapsuleOpen] = useState(false);
  const [capsuleData, setCapsuleData] = useState(null);

  const stats = useMemo(() => {
    if (!clothes || clothes.length === 0) {
      return EMPTY_STATS;
    }

    const styleCount = {};
    const colorCount = {};

    let dateValid = 0;
    let workValid = 0;

    const currentSidebarWeather = "Hot"; // TODO: podłączyć realny WeatherContext zamiast sztywnej wartości
    let weatherCompatibleCount = 0;

    clothes.forEach((item) => {
      const nameLower = item.name?.toLowerCase() || "";
      const colorLower = item.color?.toLowerCase() || "";
      const styleLower = item.style?.toLowerCase() || "";
      const catLower = item.category?.toLowerCase() || "";

      if (item.style) styleCount[item.style] = (styleCount[item.style] || 0) + 1;
      if (item.color) colorCount[item.color] = (colorCount[item.color] || 0) + 1;

      if (OCCASION_STYLE_MATCH["Randka"].includes(styleLower)) {
        dateValid++;
      }

      if (OCCASION_STYLE_MATCH["Praca"].includes(styleLower)) {
        workValid++;
      }

      const blacklist = WEATHER_BLACKLIST[currentSidebarWeather];
      let isBlacklisted = false;
      if (blacklist) {
        if (blacklist.categories.includes(catLower) || blacklist.styles.includes(styleLower) || blacklist.colors.includes(colorLower)) {
          isBlacklisted = true;
        }
        if (blacklist.forbiddenKeywords?.some((keyword) => nameLower.includes(keyword))) {
          isBlacklisted = true;
        }
      }
      if (!isBlacklisted) weatherCompatibleCount++;
    });

    const topStyles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
    const topColors = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]);

    return {
      styles: topStyles,
      colors: topColors,
      total: clothes.length,
      rawStyles: styleCount,
      rawColors: colorCount,
      datePercentage: Math.round((dateValid / clothes.length) * 100),
      workPercentage: Math.round((workValid / clothes.length) * 100),
      weatherPercentage: Math.round((weatherCompatibleCount / clothes.length) * 100)
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
    const token = sessionStorage.getItem("fitte_token");
    if (!token) {
      console.error("Brak tokena — sesja wygasła lub nieprawidłowa.");
      setIsCapsuleOpen(false);
      logout();
      return;
    }
    try {
      const res = await fetch("http://localhost:5001/api/capsule", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        console.error("Sesja wygasła, wylogowuję.");
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
      <button className="mobile-nav-toggle" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>

      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <h1 className="logo font-playfair italic">Fitte</h1>
          </div>

          <div className="user-card">
            <div className="avatar">{(user.firstName || user.name || "F")?.charAt(0)}</div>
            <div className="user-info">
              <span className="user-name">{user.firstName || user.name}</span>
              <span className="user-stats">{clothes.length} UBRAŃ W SZAFIE</span>
            </div>
          </div>

          <nav className="sidebar-navigation md:hidden">
            <NavLink to="/" onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}><Sparkles size={18} /> <span>Asystent</span></NavLink>
            <NavLink to="/wardrobe" onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}><Shirt size={18} /> <span>Moja garderoba</span></NavLink>
            <NavLink to="/calendar" onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}><Calendar size={18} /> <span>Planer</span></NavLink>
            <NavLink to="/history" onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}><History size={18} /> <span>Historia</span></NavLink>
            <NavLink to="/profile" onClick={() => setIsOpen(false)} className={({ isActive }) => isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}><User size={18} /> <span>Profil</span></NavLink>
          </nav>

          <div className="sidebar-section">
            <h3 className="section-title mb-2">Twój dominujący styl</h3>
            <div className="tag-cloud">
              {stats.styles.length > 0 ? (
                stats.styles.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)
              ) : (
                <span className="text-[11px] text-gray-400 italic">Brak danych</span>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="section-title">Paleta Twojej szafy</h3>
            <div className="detected-colors">
              {stats.colors.length > 0 ? (
                stats.colors.map((color) => (
                  <div key={color} className="color-analysis-item">
                    <div className="dot" style={{ background: getColorCode(color) }}></div>
                    <span>{color}</span>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-gray-400 italic">Brak danych</span>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button
            onClick={handleStatsClick}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl bg-white/60 border border-[#E8DDD0]/50 shadow-sm hover:bg-white hover:shadow-md transition-all text-left cursor-pointer"
          >
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 shrink-0">
              <CloudSun size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-fitte-brown-dark uppercase tracking-wide">Dopasowanie do pogody</span>
                <span className="text-[11px] font-bold text-amber-700 shrink-0 ml-1">{stats.weatherPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.weatherPercentage}%`,
                    background: "linear-gradient(90deg, #E6A23C, #F56C6C)"
                  }}
                ></div>
              </div>
            </div>
            <BarChart3 size={14} className="text-gray-300 shrink-0" />
          </button>

          <button
            onClick={handleOpenCapsule}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-2xl bg-white/60 border border-[#E8DDD0]/50 shadow-sm hover:bg-white hover:shadow-md transition-all text-left cursor-pointer"
          >
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
              <Package size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[10px] font-bold text-fitte-brown-dark uppercase tracking-wide">Szafa kapsułowa</span>
                <span className="text-[11px] font-bold text-indigo-700 shrink-0 ml-1">{Math.min(stats.total, 10)}/10</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(stats.total, 10) * 10}%`,
                    background: "linear-gradient(90deg, #818CF8, #4338CA)"
                  }}
                ></div>
              </div>
            </div>
            <BarChart3 size={14} className="text-gray-300 shrink-0" />
          </button>

          <hr className="footer-line" />
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>

      <StatsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} stats={stats} />
      <CapsuleModal isOpen={isCapsuleOpen} onClose={() => setIsCapsuleOpen(false)} data={capsuleData} />
    </>
  );
};

const StatsModal = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content apple-card max-w-lg w-[90%] p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]">
        <button className="close-btn absolute top-5 right-5 text-gray-400 hover:text-black transition-colors" onClick={onClose}>
          <X size={22} />
        </button>

        <h2 className="font-playfair text-2xl mb-1">
          Wizualna struktura Twojej <span className="italic">Garderoby</span>
        </h2>
        <p className="text-xs text-gray-400 mb-6">Pełna analiza kolorystyczno-stylistyczna Fitte AI</p>

        {stats.total === 0 ? (
          <div className="text-center py-10 text-gray-400 italic">Garderoba jest obecnie pusta. Dodaj ubrania, aby zobaczyć analizę.</div>
        ) : (
          <div className="flex flex-col gap-5 max-h-[68vh] overflow-y-auto pr-1">

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <CloudSun size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Dopasowanie do obecnej pogody</span>
                  <span className="text-amber-700">{stats.weatherPercentage}% szafy</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${stats.weatherPercentage}%`,
                      background: "linear-gradient(90deg, #E6A23C, #F56C6C)"
                    }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Ubrania spełniające aktualne kryteria termiczne i osłonowe.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                  <Heart size={14} /> Na randki
                </div>
                <div className="text-2xl font-playfair font-bold text-rose-700">{stats.datePercentage}%</div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.datePercentage}%`,
                      background: "linear-gradient(90deg, #FFA07A, #FF647C)"
                    }}
                  ></div>
                </div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">Styl Romantic & Chic</span>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E8DDD0]/40 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <Briefcase size={14} /> Do pracy
                </div>
                <div className="text-2xl font-playfair font-bold text-blue-800">{stats.workPercentage}%</div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.workPercentage}%`,
                      background: "linear-gradient(90deg, #5D9CEC, #4A90E2)"
                    }}
                  ></div>
                </div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider">Styl Classic & Minimal</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                <PieChart size={14} /> Dominujące kolory w szafie
              </h4>
              <div className="flex flex-col gap-3">
                {Object.entries(stats.rawColors).slice(0, 5).map(([colorName, count]) => {
                  const percentage = Math.round((count / stats.total) * 100);
                  const colorCode = getColorCode(colorName);

                  const isLightColor = colorCode === "#FFFFFF" || colorCode === "#FFFDD0" || colorCode === "#F5F2EB" || colorCode === "#F5F5DC";

                  return (
                    <div key={colorName} className="text-xs">
                      <div className="flex justify-between text-gray-600 mb-1 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-gray-300 shadow-sm" style={{ background: colorCode }}></div>
                          <span className="capitalize">{colorName}</span>
                        </div>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#F8F3ED] rounded-full overflow-hidden border border-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            background: colorCode,
                            borderRight: isLightColor ? "2px solid #D1C7BD" : "none",
                            boxShadow: isLightColor ? "inset 0 0 4px rgba(0,0,0,0.05)" : "none"
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DDD0]/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                <BarChart3 size={14} /> Podział ze względu na Style
              </h4>
              <div className="flex flex-col gap-3">
                {Object.entries(stats.rawStyles).map(([styleName, count]) => {
                  const percentage = Math.round((count / stats.total) * 100);
                  return (
                    <div key={styleName} className="text-xs">
                      <div className="flex justify-between text-gray-600 mb-1 font-medium">
                        <span>{styleName}</span>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F8F3ED] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            background: "linear-gradient(90deg, #8E7A6B, #3D2B1F)"
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

const CapsuleModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content apple-card max-w-2xl w-[90%] p-8 bg-[#FDFBF9] rounded-[32px] relative shadow-2xl animate-fade-in text-[#3D2B1F]">
        <button className="close-btn absolute top-5 right-5 text-gray-400 hover:text-black transition-colors" onClick={onClose}>
          <X size={22} />
        </button>

        <h2 className="font-playfair text-2xl mb-1">
          Algorytmiczna Szafa <span className="italic">Kapsułowa</span>
        </h2>
        <p className="text-xs text-gray-400 mb-6">Metoda kombinatoryczna maksymalizacji użyteczności odzieży</p>

        {!data || !data.capsuleItems || data.capsuleItems.length === 0 ? (
          <div className="text-center py-10 text-gray-400 italic">Dodaj minimum 5 ubrań (w tym buty, góry i doły), aby wygenerować szafę kapsułową.</div>
        ) : (
          <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">

            <div className="bg-gradient-to-r from-[#8E7A6B] to-[#3D2B1F] p-5 rounded-2xl text-white shadow-sm text-center">
              <span className="text-[10px] uppercase tracking-widest opacity-70 block mb-1">Wynik Analizy Kombinatorycznej</span>
              <div className="text-3xl font-playfair font-bold">
                {data.capsuleItems.length} elementów = {data.totalCombinations} unikalnych stylizacji
              </div>
              <p className="text-[10px] opacity-80 mt-1 max-w-md mx-auto">
                Algorytm wyselekcjonował najbardziej kompatybilne ubrania bazowe, z których wygenerował niezależne, niepowtarzalne zestawy modowe.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Wybrane elementy bazy ({data.capsuleItems.length}/10)</h4>
              <div className="grid grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-[#E8DDD0]/40">
                {data.capsuleItems.map((item) => (
                  <div key={item.id} className="flex flex-col items-center text-center bg-[#FDFBF9] p-2 rounded-xl border border-gray-100 shadow-2xs">
                    <img src={item.imageUrl} alt={item.name} className="h-14 w-14 object-contain mb-1" />
                    <span className="text-[8px] font-bold text-gray-500 truncate w-full">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Przykładowe matematyczne kombinacje zestawów</h4>
              <div className="flex flex-col gap-2">
                {data.combinations.slice(0, 5).map((outfit, index) => (
                  <div key={index} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-[#E8DDD0]/30 shadow-2xs">
                    <div className="text-[10px] font-bold text-[#8E7A6B] min-w-[60px]">Zestaw #{index + 1}</div>
                    <div className="flex gap-2">
                      {outfit.map((cloth) => (
                        <div key={cloth.id} className="flex items-center gap-1 bg-gray-50/50 px-2 py-1 rounded-lg border border-gray-100">
                          <img src={cloth.imageUrl} alt={cloth.name} className="h-6 w-6 object-contain" />
                          <span className="text-[9px] font-medium text-gray-600 max-w-[80px] truncate">{cloth.name}</span>
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
  "czarny": "#000000", "czarna": "#000000",
  "biały": "#FFFFFF", "biała": "#FFFFFF",
  "szary": "#808080", "szara": "#808080",
  "grafitowy": "#36454F", "grafitowa": "#36454F",
  "srebrny": "#C0C0C0", "srebrna": "#C0C0C0",
  "złoty": "#FFD700", "złota": "#FFD700",

  "beżowy": "#F5F5DC", "beżowa": "#F5F5DC", "beż": "#F5F5DC",
  "kremowy": "#FFFDD0", "kremowa": "#FFFDD0", "krem": "#FFFDD0",
  "ecru": "#F5F2EB", "ecrú": "#F5F2EB",
  "brązowy": "#A52A2A", "brązowa": "#A52A2A",
  "ciemnobrązowy": "#5C4033", "ciemnobrązowa": "#5C4033",
  "camel": "#C19A6B", "camelowy": "#C19A6B",
  "karmelowy": "#C68E17", "karmelowa": "#C68E17",
  "cynamonowy": "#C58F5C",
  "czekoladowy": "#7B3F00", "czekoladowa": "#7B3F00",
  "terrakota": "#E2725B",

  "czerwony": "#FF0000", "czerwona": "#FF0000", "czerwień": "#FF0000",
  "bordo": "#800020", "bordowy": "#800020", "bordowa": "#800020",
  "szkarłatny": "#FF2400",
  "różowy": "#FFC0CB", "różowa": "#FFC0CB",
  "pastelowy róż": "#FFD1DC", "pudrowy róż": "#FFD1DC",
  "fuksja": "#FF00FF", "fuksjowy": "#FF00FF",
  "amarantowy": "#E52B50",
  "fioletowy": "#800080", "fioletowa": "#800080",
  "śliwkowy": "#4E3629", "śliwkowa": "#4E3629",
  "lawendowy": "#E6E6FA", "lawendowa": "#E6E6FA",
  "liliowy": "#C8A2C8", "liliowa": "#C8A2C8",

  "niebieski": "#0000FF", "niebieska": "#0000FF",
  "błękitny": "#87CEEB", "błękitna": "#87CEEB", "pastelowy błękit": "#AEC6CF",
  "granatowy": "#1A2E40", "granatowa": "#1A2E40",
  "morski": "#008080", "morska": "#008080",
  "turkusowy": "#40E0D0", "turkusowa": "#40E0D0",
  "lazurowy": "#007FFF", "lazurowa": "#007FFF",
  "chabrowy": "#3300CC", "chabrowa": "#3300CC",
  "indygo": "#4B0082",

  "zielony": "#008000", "zielona": "#008000",
  "oliwkowy": "#808000", "oliwkowa": "#808000",
  "khaki": "#4B5320",
  "miętowy": "#AAF0D1", "miętowa": "#AAF0D1",
  "szmaragdowy": "#50C878", "szmaragdowa": "#50C878",
  "butelkowa zieleń": "#005C29", "butelkowy zielony": "#005C29",
  "seledynowy": "#98FF98", "seledynowa": "#98FF98",
  "limonkowy": "#BFFF00", "limonkowa": "#BFFF00",

  "żółty": "#FFFF00", "żółta": "#FFFF00",
  "musztardowy": "#E1AD01", "musztardowa": "#E1AD01",
  "pastelowy żółty": "#FDFD96",
  "pomarańczowy": "#FFA500", "pomarańczowa": "#FFA500",
  "brzoskwiniowy": "#FFE5B4", "brzoskwiniowa": "#FFE5B4",
  "morelowy": "#FBCEB1", "morelowa": "#FBCEB1",
  "koralowy": "#FF7F50", "koralowa": "#FF7F50"
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
  [["srebr"], "#C0C0C0"]
];

const getColorCode = (colorName) => {
  if (!colorName) return "#E6DFD9";
  const normalized = colorName.toLowerCase().trim();

  if (EXACT_COLORS[normalized]) return EXACT_COLORS[normalized];

  for (const [keywords, code] of FUZZY_COLORS) {
    if (keywords.some((kw) => normalized.includes(kw))) return code;
  }

  if (normalized.includes("wielokolor") || normalized.includes("mix") || normalized.includes("wzór") || normalized.includes("wzorzyst")) {
    return "linear-gradient(135deg, #FF0000 0%, #00FF00 50%, #0000FF 100%)";
  }

  return "#E6DFD9";
};

export default Sidebar;