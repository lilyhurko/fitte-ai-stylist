import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WardrobeProvider } from "./context/WardrobeContext";
import { CalendarProvider } from "./context/CalendarContext";
import { NotificationProvider } from "./context/NotificationContext";

import Sidebar from "./components/Sidebar/Sidebar";
import Navbar from "./components/Navbar/Navbar";
import Assistant from "./components/Assistant/Assistant";
import NotificationContainer from "./components/Notifications/NotificationContainer";

import GuestPage from "./pages/GuestPage/GuestPage";
import StyleQuiz from "./pages/StyleQuiz/StyleQuiz";
import Wardrobe from "./pages/Wardrobe/Wardrobe";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Profile from "./pages/Profile/Profile";
import History from "./pages/History/History";
import Calendar from "./pages/Calendar/Calendar";

import "./index.css";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Ładowanie stylu...
      </div>
    );
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

      <div className="flex flex-1 flex-col main-content">
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Assistant />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <WardrobeProvider>
          <CalendarProvider>
            <Router>
              <AppContent />
              <NotificationContainer />
            </Router>
          </CalendarProvider>
        </WardrobeProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
