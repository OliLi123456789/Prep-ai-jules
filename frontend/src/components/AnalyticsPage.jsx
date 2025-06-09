import React, { useState, useEffect } from 'react';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch analytics data.');
        console.error("Fetch analytics error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="page-container analytics-page-container"><p className="loading-message">Loading analytics...</p></div>;
  }

  if (error) {
    return <div className="page-container analytics-page-container error-container"><p className="error-message">Error: {error}</p></div>;
  }

  if (!analyticsData) {
    return <div className="page-container analytics-page-container"><p className="alert alert-info">No analytics data available at the moment.</p></div>;
  }

  const formatScore = (score) => {
    if (score === null || typeof score === 'undefined' || score === 0) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  };

  return (
    <div className="page-container analytics-page-container">
      <h1 className="page-title">Your Analytics</h1>

      <section className="stats-section card">
        <h2 className="card-title">Overview</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Practice Sessions Completed:</span>
            <span className="stat-value">{analyticsData.practiceSessionsCompleted ?? 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tests Taken:</span>
            <span className="stat-value">{analyticsData.testsTaken ?? 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overall Practice Average:</span>
            <span className="stat-value">{formatScore(analyticsData.overallPracticeAverageScore)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Strongest Topic (Practice):</span>
            <span className="stat-value">{analyticsData.strongestTopic || 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Topic for Improvement (Practice):</span>
            <span className="stat-value">{analyticsData.topicForImprovement || 'N/A'}</span>
          </div>
        </div>
      </section>

      <section className="graph-section card">
        <h2 className="card-title">Performance Over Time (Practice)</h2>
        {analyticsData.performanceOverTime && analyticsData.performanceOverTime.length > 0 ? (
          <div className="performance-list">
            {analyticsData.performanceOverTime.map((item, index) => (
              <p key={index} style={{fontSize: '0.9rem', borderBottom: '1px solid #eee', paddingBottom:'4px', marginBottom:'4px'}}>
                Date: {new Date(item.date).toLocaleDateString()}, Score: {formatScore(item.score)}
              </p>
            ))}
          </div>
        ) : (
          <div className="graph-placeholder">
            <p>Performance Over Time Graph Placeholder</p>
            <p>(No practice performance data available or Chart.js would be integrated here)</p>
          </div>
        )}
      </section>
      
      <section className="more-analytics card">
        <h2 className="card-title">Practice Averages by Topic</h2>
        {analyticsData.averageScoresByTopic && analyticsData.averageScoresByTopic.length > 0 ? (
          analyticsData.averageScoresByTopic.map((topicStats, index) => (
            <div key={index} className="stat-item" style={{marginBottom: 'var(--spacing-unit)'}}>
              <span className="stat-label" style={{fontWeight:'bold'}}>{topicStats.topic}</span>
              <span className="stat-value" style={{fontSize: '1.1rem'}}>Avg Score: {formatScore(topicStats.averageScore)}</span>
              <small>Sessions: {topicStats.sessions}</small>
            </div>
          ))
        ) : (
          <p>No topic-specific practice data available yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Past Full Test Scores</h2>
        {analyticsData.pastTestScoresSummary && analyticsData.pastTestScoresSummary.length > 0 ? (
           analyticsData.pastTestScoresSummary.map((test, index) => (
            <div key={index} className="stat-item" style={{marginBottom: 'var(--spacing-unit)'}}>
                <span className="stat-label" style={{fontWeight:'bold'}}>{test.type} - {new Date(test.date).toLocaleDateString()}</span>
                <span className="stat-value" style={{fontSize: '1.1rem'}}>Overall: {test.overall}</span>
            </div>
           ))
        ) : (
            <p>No past full test scores recorded.</p>
        )}
      </section>
    </div>
  );
};

export default AnalyticsPage;
