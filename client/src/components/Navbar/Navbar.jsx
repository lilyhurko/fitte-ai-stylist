import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, Shirt, Calendar, History, User } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          end
        >
          <Sparkles className="nav-icon" size={20} />
          <span>Asystent</span>
        </NavLink>

        <NavLink 
          to="/wardrobe" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Shirt className="nav-icon" size={20} />
          <span>Szafa</span>
        </NavLink>

        <NavLink 
          to="/calendar" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <Calendar className="nav-icon" size={20} />
          <span>Planer</span>
        </NavLink>

        <NavLink 
          to="/history" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <History className="nav-icon" size={20} />
          <span>Historia</span>
        </NavLink>

        <NavLink 
          to="/profile" 
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
        >
          <User className="nav-icon" size={20} />
          <span>Profil</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;