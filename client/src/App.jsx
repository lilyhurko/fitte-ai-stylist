import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import { AuthProvider, useAuth } from './context/AuthContext'; 
import Sidebar from './components/Sidebar/Sidebar';
import Assistant from './components/Assistant/Assistant'; 
import Register from './components/Register/Register'; 
import Navbar from './components/Navbar/Navbar'; 
import GuestPage from './pages/GuestPage/GuestPage'; 
import './index.css'; 

const Wardrobe = () => <div className="p-10 text-fitte-brown-dark font-playfair text-3xl">Twoja Garderoba</div>;

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<GuestPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-fitte-cream">
      <Sidebar /> 
      
      <div className="flex-1 flex flex-col" style={{ marginLeft: '320px' }}>
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Assistant />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/history" element={<div className="p-10">Tu będzie Historia</div>} />
            <Route path="/profile" element={<div className="p-10">Tu będzie Edycja Profilu</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider> 
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;