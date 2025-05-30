import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const userName = "User"; // Static name for now
  const testDateInfo = "XX days till your test"; // Placeholder

  const [calendarPlan, setCalendarPlan] = useState(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);

  useEffect(() => {
    const fetchCalendarPlan = async () => {
      setIsLoadingCalendar(true);
      setCalendarError(null);
      try {
        const response = await fetch('/api/ai-calendar-plan');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCalendarPlan(data.plan); // Assuming backend returns { plan: [...] }
      } catch (error) {
        console.error("Failed to fetch calendar plan:", error);
        setCalendarError(error.message || "Failed to load study plan.");
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    fetchCalendarPlan();
  }, []);

  const handleTaskClick = (task) => {
    console.log("Task clicked:", { 
      topic: task.topic, 
      subTopic: task.subTopic, 
      numQuestions: task.numQuestions 
    });
    // Future: navigate to PracticePage with these details
  };

  return (
    <div className="page-container dashboard-container"> {/* Use page-container */}
      <div className="dashboard-header"> {/* Keep specific header styling for now */}
        <h1 className="page-title" style={{textAlign: 'left', marginBottom: 'var(--spacing-unit)'}} >Welcome back, {userName}!</h1> {/* Use page-title, override alignment */}
        <p className="test-date-reminder">{testDateInfo}</p>
      </div>

      <div className="card dashboard-section study-plan-section"> {/* Use card */}
        <h2 className="card-title">AI Suggested Study Plan</h2> {/* Use card-title */}
        {isLoadingCalendar && <p className="loading-message">Loading study plan...</p>} {/* Uses global style */}
        {calendarError && <p className="error-message">Error: {calendarError}</p>} {/* Uses global style */}
        {calendarPlan && !isLoadingCalendar && !calendarError && (
          <div className="calendar-plan-display">
            {calendarPlan.map((dayPlan) => (
              <div key={dayPlan.day} className="calendar-day">
                <h3>{dayPlan.day}</h3>
                <ul className="tasks-list">
                  {dayPlan.tasks.map((task) => (
                    <li key={task.id} className="task-item" onClick={() => handleTaskClick(task)}>
                      <span className="task-checkbox">☐</span>
                      <span className="task-description">{task.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!calendarPlan && !isLoadingCalendar && !calendarError && (
            <div className="study-plan-placeholder alert alert-info"> {/* Use alert for placeholder info */}
                 <p>No study plan available at the moment. Future updates will populate this based on your settings and progress!</p>
            </div>
        )}
      </div>

      <div className="card dashboard-section practice-section"> {/* Use card */}
        <h2 className="card-title">Practice Zone</h2> {/* Use card-title */}
        <p>Ready to improve your skills? Pick a topic and start practicing!</p>
        {/* Button to navigate to practice page can be added here later if desired */}
        {/* e.g., <button className="button button-success" onClick={() => navigate('/practice')}>Go to Practice</button> */}
         <button className="button button-success ai-practice-button">AI Suggested Practice</button> {/* Use global button */}
      </div>
    </div>
  );
};

export default Dashboard;
