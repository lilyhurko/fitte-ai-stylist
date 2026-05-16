import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWardrobe } from '../../context/WardrobeContext';
import { LogOut } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth(); 
  const { clothes } = useWardrobe();

  const stats = useMemo(() => {
    if (!clothes || clothes.length === 0) return { styles: [], colors: [] };

    const styleCount = {};
    const colorCount = {};

    clothes.forEach(item => {
      if (item.style) styleCount[item.style] = (styleCount[item.style] || 0) + 1;
      if (item.color) colorCount[item.color] = (colorCount[item.color] || 0) + 1;
    });

    const topStyles = Object.entries(styleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const topColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    return { styles: topStyles, colors: topColors };
  }, [clothes]);

  const initialTags = useMemo(() => {
    if (!user?.styleTags) return [];
    try {
      return typeof user.styleTags === 'string' ? JSON.parse(user.styleTags) : user.styleTags;
    } catch (e) {
      console.error("Błąd parsowania styleTags w Sidebarze:", e);
      return [];
    }
  }, [user?.styleTags]);

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <h1 className="logo font-playfair italic">Fitte</h1>
        
        <div className="user-card">
          <div className="avatar">{(user.firstName || user.name || 'F')?.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{user.firstName || user.name}</span>
            <span className="user-stats">{clothes.length} UBRAŃ W SZAFIE</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Twój dominujący styl</h3>
          <div className="tag-cloud">
            {stats.styles.length > 0 ? (
              stats.styles.map(tag => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))
            ) : (
              <span className="text-[11px] text-gray-400 italic">Brak danych</span>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Paleta Twojej szafy</h3>
          <div className="detected-colors">
            {stats.colors.length > 0 ? (
              stats.colors.map(color => (
                <div key={color} className="color-analysis-item">
                  <div className="dot" style={{ backgroundColor: getColorCode(color) }}></div>
                  <span>{color}</span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-gray-400 italic">Brak danych</span>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Preferencje z quizu</h3>
          <div className="quiz-tags">
             {initialTags.map(tag => (
               <span key={tag} className="quiz-tag">#{tag}</span>
             ))}
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
  );
};

const getColorCode = (colorName) => {
  const colors = {
    'czarny': '#000000',
    'biały': '#FFFFFF',
    'czerwony': '#FF0000',
    'niebieski': '#0000FF',
    'beżowy': '#F5F5DC',
    'szary': '#808080',
    'granatowy': '#000080',
    'różowy': '#FFC0CB',
    'zielony': '#008000',
    'brązowy': '#A52A2A',
    'granatowy': '#1A2E40'
  };
  return colors[colorName.toLowerCase()] || '#CCCCCC';
};

export default Sidebar;