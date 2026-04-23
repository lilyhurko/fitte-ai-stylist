import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth(); 

  if (!user) return null;

  return (
    <aside className="sidebar">
      <h1 className="logo font-playfair italic">Fitte</h1>
      
      <div className="user-card bg-fitte-beige/30 p-4 rounded-2xl flex items-center gap-3 mb-10">
        <div className="avatar w-12 h-12 rounded-full bg-fitte-sand"></div>
        <div className="user-info">
          <span className="user-name font-bold block">{user.name}</span>
          <span className="user-stats text-xs text-gray-500">{user.stats || "Nowy profil"}</span>
        </div>
      </div>

      <div className="sidebar-section mb-8">
        <h3 className="section-title text-xs font-bold uppercase tracking-wider mb-4">Mój styl</h3>
        <div className="tag-cloud flex flex-wrap gap-2">
          {user.styleTags?.map(tag => (
            <span key={tag} className="tag px-3 py-1 rounded-full text-[10px] bg-fitte-brown-dark text-white">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="sidebar-section mb-8">
        <h3 className="section-title text-xs font-bold uppercase tracking-wider mb-4">Moje kolory</h3>
        <div className="color-dots flex gap-2">
          {user.favoriteColors?.map(color => (
            <div key={color} className="dot w-5 h-5 rounded-full border border-fitte-sand" style={{ backgroundColor: color }}></div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title text-xs font-bold uppercase tracking-wider mb-4">Ostatnie zapytania</h3>
        <ul className="recent-list text-xs space-y-3">
          {user.recentQueries?.length > 0 ? (
            user.recentQueries.map(q => (
              <li key={q.id} className="flex justify-between text-gray-600">
                {q.text} <span className="text-[10px] text-gray-400">{q.date}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-400 italic">Brak zapytań</li>
          )}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;