import React from 'react';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  // Placeholder data - in a real app, this would come from state or props
  const stats = {
    practiceSessionsCompleted: 0,
    testsTaken: 0,
    overallAverageScore: 'N/A',
    strongestSubject: 'N/A',
    areaForImprovement: 'N/A',
  };

  return (
    <div className="page-container analytics-page-container"> {/* Use page-container */}
      <h1 className="page-title">Your Analytics</h1>

      <section className="stats-section card"> {/* Already using card */}
        <h2 className="card-title">Overview</h2> {/* Use card-title */}
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Practice Sessions Completed:</span>
            <span className="stat-value">{stats.practiceSessionsCompleted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tests Taken:</span>
            <span className="stat-value">{stats.testsTaken}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overall Average Score:</span>
            <span className="stat-value">{stats.overallAverageScore}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Strongest Subject:</span>
            <span className="stat-value">{stats.strongestSubject}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Area for Improvement:</span>
            <span className="stat-value">{stats.areaForImprovement}</span>
          </div>
        </div>
      </section>

      <section className="graph-section card"> {/* Already using card */}
        <h2 className="card-title">Performance Over Time</h2> {/* Use card-title */}
        <div className="graph-placeholder">
          <p>Performance Over Time Graph Placeholder</p>
          <p>(Chart.js, Recharts, or other library would be integrated here)</p>
        </div>
      </section>
      
      <section className="more-analytics card"> {/* Already using card */}
          <h2 className="card-title">More Detailed Analytics</h2> {/* Use card-title */}
          <p>Further breakdowns by subject, topic, and question type will be available here soon.</p>
      </section>
    </div>
  );
};

export default AnalyticsPage;
