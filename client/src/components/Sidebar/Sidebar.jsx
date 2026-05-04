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

  if (!user) return null;

  const initialTags = typeof user.styleTags === 'string' ? JSON.parse(user.styleTags) : user.styleTags;


  return (
    <aside className="sidebar">
      {/* Grupa górna - elementy będą blisko siebie */}
      <div className="sidebar-content">
        <h1 className="logo font-playfair italic">Fitte</h1>
        
        <div className="user-card">
          <div className="avatar">{user.name?.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-stats">{clothes.length} UBRAŃ W SZAFIE</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Twój dominujący styl</h3>
          <div className="tag-cloud">
            {stats.styles.map(tag => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Paleta Twojej szafy</h3>
          <div className="detected-colors">
            {stats.colors.map(color => (
              <div key={color} className="color-analysis-item">
                <div className="dot" style={{ backgroundColor: getColorCode(color) }}></div>
                <span>{color}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Preferencje z quizu</h3>
          <div className="quiz-tags">
             {/* Mapowanie tagów z quizu */}
             <span className="quiz-tag">#Minimalizm</span>
          </div>
        </div>
      </div>

      {/* Grupa dolna - margin-top: auto wypchnie ją na dół */}
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
    'pastelowy róż': '#FFD1DC'
  };
  return colors[colorName.toLowerCase()] || '#CCCCCC';
  
};

export default Sidebar;