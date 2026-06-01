import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWardrobe } from "../../context/WardrobeContext";
import { NavLink } from "react-router-dom";
import { LogOut, Menu, X, Sparkles, Shirt, History, User, Calendar } from "lucide-react";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { clothes } = useWardrobe();
  const [isOpen, setIsOpen] = useState(false);

  const stats = useMemo(() => {
    if (!clothes || clothes.length === 0) return { styles: [], colors: [] };

    const styleCount = {};
    const colorCount = {};

    clothes.forEach((item) => {
      if (item.style)
        styleCount[item.style] = (styleCount[item.style] || 0) + 1;
      if (item.color)
        colorCount[item.color] = (colorCount[item.color] || 0) + 1;
    });

    const topStyles = Object.entries(styleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);

    const topColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    return { styles: topStyles, colors: topColors };
  }, [clothes]);

  const initialTags = useMemo(() => {
    if (!user?.styleTags) return [];
    try {
      return typeof user.styleTags === "string"
        ? JSON.parse(user.styleTags)
        : user.styleTags;
    } catch (e) {
      console.error("Błąd parsowania styleTags w Sidebarze:", e);
      return [];
    }
  }, [user?.styleTags]);

  if (!user) return null;

  return (
    <>
      <button className="mobile-nav-toggle" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="mobile-nav-close" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>

        <div className="sidebar-content">
          <h1 className="logo font-playfair italic">Fitte</h1>

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
            <h3 className="section-title">Twój dominujący styl</h3>
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
          <hr className="footer-line" />
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const getColorCode = (colorName) => {
  if (!colorName) return "#E6DFD9";
  const normalized = colorName.toLowerCase().trim();
  const exactColors = {
    czarny: "#000000",
    czarna: "#000000",
    biały: "#FFFFFF",
    biała: "#FFFFFF",
    beżowy: "#F5F5DC",
    beżowa: "#F5F5DC",
    beż: "#F5F5DC",
    kremowy: "#FFFDD0",
    kremowa: "#FFFDD0",
    krem: "#FFFDD0",
    szary: "#808080",
    szara: "#808080",
    grafitowy: "#36454F",
    srebrny: "#C0C0C0",
    czerwień: "#FF0000",
    czerwony: "#FF0000",
    czerwona: "#FF0000",
    różowy: "#FFC0CB",
    różowa: "#FFC0CB",
    "pastelowy róż": "#FFD1DC",
    "pudrowy róż": "#FFD1DC",
    fuksja: "#FF00FF",
    fioletowy: "#800080",
    śliwkowy: "#4E3629",
    niebieski: "#0000FF",
    błękitny: "#87CEEB",
    granatowy: "#1A2E40",
    morski: "#008080",
    turkusowy: "#40E0D0",
    zielony: "#008000",
    zielona: "#008000",
    oliwkowy: "#808000",
    khaki: "#4B5320",
    miętowy: "#AAF0D1",
    żółty: "#FFFF00",
    żółta: "#FFFF00",
    pomarańczowy: "#FFA500",
    brązowy: "#A52A2A",
    brązowa: "#A52A2A",
    terrakota: "#E2725B",
    camel: "#C19A6B",
    złoty: "#FFD700",
  };
  if (exactColors[normalized]) return exactColors[normalized];
  if (normalized.includes("czarn")) return "#000000";
  if (normalized.includes("biel") || normalized.includes("biał"))
    return "#FFFFFF";
  if (normalized.includes("krem")) return "#FFFDD0";
  if (normalized.includes("beż")) return "#F5F5DC";
  if (normalized.includes("szar") || normalized.includes("grafit"))
    return "#808080";
  if (normalized.includes("granat")) return "#1A2E40";
  if (normalized.includes("niebiesk") || normalized.includes("błękit"))
    return "#87CEEB";
  if (normalized.includes("róż")) return "#FFC0CB";
  if (normalized.includes("fiolet")) return "#800080";
  if (normalized.includes("czerw")) return "#FF0000";
  if (normalized.includes("zielon") || normalized.includes("oliwk"))
    return "#008000";
  if (normalized.includes("brąz")) return "#A52A2A";
  if (normalized.includes("żółt")) return "#FFFF00";
  if (normalized.includes("pomarań")) return "#FFA500";
  if (normalized.includes("złot")) return "#FFD700";
  if (normalized.includes("-") || normalized.includes(" i ")) {
    const parts = normalized.split(/[- ]+/);
    const firstColor = getColorCode(parts[0]);
    const secondColor = getColorCode(parts[parts.length - 1]);
    if (firstColor !== "#E6DFD9" && secondColor !== "#E6DFD9") {
      return `linear-gradient(135deg, ${firstColor} 50%, ${secondColor} 50%)`;
    }
  }
  return "#E6DFD9";
};

export default Sidebar;
