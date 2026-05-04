import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WardrobeProvider } from "./context/WardrobeContext";
import Sidebar from "./components/Sidebar/Sidebar";
import Assistant from "./components/Assistant/Assistant";
import Register from "./pages/Register/Register";
import Navbar from "./components/Navbar/Navbar";
import GuestPage from "./pages/GuestPage/GuestPage";
import StyleQuiz from "./pages/StyleQuiz/StyleQuiz";
import Wardrobe from "./pages/Wardrobe/Wardrobe";
import Login from "./pages/Login/Login";

import "./index.css";

function AppContent() {
  const { user, loading } = useAuth();
if (loading) {
    return <div className="flex items-center justify-center h-screen">Ładowanie stylu...</div>;
  }
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<GuestPage />} />
        <Route path="/quiz" element={<StyleQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-fitte-cream">
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ marginLeft: "320px" }}>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Assistant />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route
              path="/history"
              element={<div className="p-10">Tu będzie Historia</div>}
            /> 
            <Route
              path="/profile"
              element={<div className="p-10">Tu będzie Edycja Profilu</div>}
            />
            
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WardrobeProvider>
        <Router>
          <AppContent />
        </Router>
      </WardrobeProvider>
    </AuthProvider>
  );
}

export default App;
