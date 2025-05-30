import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const userName = "User"; // Static name for now
  const testDateInfo = "XX days till your test"; // Placeholder

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome back, {userName}!</h1>
        <p className="test-date-reminder">{testDateInfo}</p>
      </div>

      <div className="dashboard-section study-plan-section">
        <h2>AI Suggested Study Plan</h2>
        <div className="study-plan-placeholder">
          {/* This could be a calendar component or a list of tasks later */}
          <p>AI Suggested Study Plan Calendar Placeholder</p>
        </div>
      </div>

      <div className="dashboard-section practice-section">
        <h2>Practice Zone</h2>
        <p>Ready to improve your skills?</p>
        <button className="ai-practice-button">AI Suggested Practice</button>
      </div>

      {/* We can add more sections later, e.g., for progress tracking, settings, etc. */}
    </div>
  );
};

export default Dashboard;
