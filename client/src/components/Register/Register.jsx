import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const suggestedStyle = location.state?.suggestedStyle || "Minimalizm";
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    styleTags: ["Minimalizm"],
    favoriteColors: ["#3D2B1F", "#E8DDD0"],
  });

 const handleSubmit = (e) => {
  e.preventDefault();
  register(formData); 
  navigate('/'); 
};

  return (
    <div className="register-container">
      <div className="register-box">
        <h2 className="title-serif italic">Witaj w Fitte</h2>
        <p className="subtitle">Stwórz swój profil stylu, aby zacząć</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Imię</label>
            <input
              type="text"
              required
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              required
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <label>Twój wiodący styl</label>
            <select
              onChange={(e) =>
                setFormData({ ...formData, styleTags: [e.target.value] })
              }
            >
              <option value="Minimalizm">Minimalizm</option>
              <option value="Boho">Boho</option>
              <option value="Classic">Classic</option>
              <option value="Streetwear">Streetwear</option>
            </select>
          </div>

          <button
            type="submit"
            className="generate-btn"
            style={{ width: "100%", marginTop: "20px" }}
          >
            Zarejestruj się
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
