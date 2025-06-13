import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css'; // Styles for App component
import Header from './components/Header';
import Testimonials from './components/Testimonials';
import Dashboard from './components/Dashboard';
import PracticePage from './components/PracticePage';
import TestPage from './components/TestPage';
import SettingsPage from './components/SettingsPage';
import AnalyticsPage from './components/AnalyticsPage';
import AITutorPage from './components/AITutorPage'; // Import AITutorPage
import AILearnPage from './components/AILearnPage'; // Import AILearnPage

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="App">
        <Header onLogin={handleLogin} onLogout={handleLogout} isLoggedIn={isLoggedIn} />
        <main>
          <Routes>
            {isLoggedIn ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/tests" element={<TestPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/ai-tutor" element={<AITutorPage />} /> {/* Add AITutorPage route */}
                <Route path="/ai-learn" element={<AILearnPage />} /> {/* Add AILearnPage route */}
                <Route path="*" element={<Navigate to="/" />} /> {/* Redirect to dashboard if logged in and path unknown */}
              </>
            ) : (
              <>
                <Route path="/" element={
                  <>
                    <div className="main-content-area">
                      <Testimonials />
                    </div>
                    <section className="hero-section">
                      <h2>Welcome to Your Personalized Prep Journey!</h2>
                      <p>Master the SAT & ACT with AI-powered insights and tailored study plans.</p>
                      <GetStartedButton />
                    </section>
                  </>
                } />
                {/* For any other path when not logged in, redirect to homepage or show a specific login prompt page */}
                {/* For now, this also means /practice etc. will show homepage if not logged in */}
                <Route path="*" element={<Navigate to="/" />} /> 
              </>
            )}
          </Routes>
        </main>
        <footer className="app-footer">
          <p>&copy; 2024 AI Prep Zone. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
