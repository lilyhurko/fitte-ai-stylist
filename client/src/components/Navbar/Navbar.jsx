import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          Asystent
        </NavLink>
        <NavLink to="/wardrobe" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          Moja garderoba
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          Historia
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          Profil
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;