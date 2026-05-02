import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const suggestedStyle = location.state?.suggestedStyle || "Minimalizm";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    styleTags: [suggestedStyle],
    favoriteColors: ["#3D2B1F", "#E8DDD0"],
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    let e = {};
    if (formData.name.length < 2) e.name = "Imię jest za krótkie";
    if (!formData.email.includes("@")) e.email = "Błędny adres email";
    if (formData.password.length < 6) e.password = "Hasło musi mieć min. 6 znaków";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const [serverError, setServerError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(""); 
    if (!validate()) return;
    
    const result = await register(formData);
    if (result.success) {
      navigate("/");
    } else {
      setServerError(result.error); 
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box register-wide">
        <h2 className="title-serif italic">Dołącz do Fitte</h2>
        <p className="auth-subtitle">Twoja szafa AI czeka na Ciebie</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {serverError && <div className="auth-error-msg">{serverError}</div>}
          
          <div className="auth-input-group">
            <label>Imię</label>
            <input 
              placeholder="Twoje imię"
              className={errors.name ? "input-error" : ""}
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="auth-input-group">
            <label>Email</label>
            <input 
              type="email"
              placeholder="twoj@email.com"
              className={errors.email ? "input-error" : ""}
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="auth-input-group">
            <label>Hasło</label>
            <input 
              type="password"
              placeholder="Min. 6 znaków"
              className={errors.password ? "input-error" : ""}
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <button type="submit" className="auth-submit-btn">Zarejestruj się</button>
        </form>

        <p className="auth-switch">
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;