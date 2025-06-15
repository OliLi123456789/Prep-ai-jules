import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  differenceInCalendarDays // Added for test date calculation
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core'; // Direct import for useDraggable/Droppable
// Sortable utilities are not strictly needed if just moving from one list to another distinct one.
// If reordering within the same day's list was needed, then Sortable would be more relevant.
import './Dashboard.css';

// Draggable Task Item Component
const DraggableTaskItem = ({ task, originalDateString }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.taskId,
    data: { taskDetails: task, originalDate: originalDateString }, // Pass full task and its original date
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  return (
    <li 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="task-item draggable-task-item" // Add draggable class for potential specific styling
      data-task-type={task.type.replace('_', '-')} // For styling based on type if needed
    >
      <span className="drag-handle">⠿</span> {/* Optional drag handle */}
      <span className="task-checkbox">☐</span>
      <span className={`task-type-badge task-type-${task.type.replace('_', '-')}`}>{task.type.replace('_', ' ')}</span>
      <span className="task-description">{task.description}</span>
    </li>
  );
};


const Dashboard = () => {
  const navigate = useNavigate();
  // const userName = "User"; // To be replaced by profileData
  // const testDateInfo = "XX days till your test"; // To be replaced by profileData

  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [calendarPlan, setCalendarPlan] = useState(null); // Stores { startDate, endDate, dailyTasks: [] }
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState(null);

  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Drag if moved 5px
    useSensor(KeyboardSensor)
  );

  const [suggestedPracticeLinkState, setSuggestedPracticeLinkState] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoadingProfile(true);
      setProfileError(null); // Reset profile error
      try {
        const response = await fetch('/api/get-profile-data');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch profile data.');
        }
        const data = await response.json();
        setProfileData(data);
      } catch (err) {
        setProfileError(err.message);
        console.error("Fetch profile error:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData(); // Fetch profile on mount

    const fetchCalendarPlan = async () => {
      setIsLoadingCalendar(true);
      setCalendarError(null);
      try {
        const response = await fetch('/api/ai-calendar-plan');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCalendarPlan(data);
        if (data && data.startDate) {
          const planStartDate = parseISO(data.startDate);
          setCurrentDisplayMonth(startOfMonth(planStartDate));
          setSelectedDate(planStartDate);
        } else {
          setCurrentDisplayMonth(startOfMonth(new Date()));
          setSelectedDate(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch calendar plan:", error);
        setCalendarError(error.message || "Failed to load study plan.");
      } finally {
        setIsLoadingCalendar(false);
      }
    };
    fetchCalendarPlan();
  }, []);

  const tasksByDate = useMemo(() => {
    // ... (remains the same) ...
    if (!calendarPlan || !calendarPlan.dailyTasks) return {};
    return calendarPlan.dailyTasks.reduce((acc, daySchedule) => {
      acc[daySchedule.date] = daySchedule.tasks; 
      return acc;
    }, {});
  }, [calendarPlan]);

  const handleTaskClick = (task) => {
    // ... (navigation logic remains the same) ...
    console.log("Dashboard Task clicked:", task);
    let targetPath = '';
    const stateToPass = { 
      topic: task.topic, 
      subTopic: task.subTopic, 
      numQuestions: task.length, 
      description: task.description 
    };
    if (task.type === 'practice') targetPath = '/practice';
    else if (task.type === 'ai_tutor_learn') targetPath = '/ai-learn';
    else if (task.type === 'full_test' || task.type === 'full_section') {
      targetPath = '/tests'; 
      stateToPass.testTypeIdentifier = task.description; 
      alert(`Navigation to ${targetPath} for ${task.description} - auto-start for this type is not yet implemented.`);
      return; 
    } else { console.warn("Unknown task type:", task.type); return; }
    if (targetPath) navigate(targetPath, { state: stateToPass });
  };

  // --- DnD handleDragEnd ---
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) { // active.id is taskId, over.id is dateString
      const taskId = active.id;
      const originalDate = active.data.current?.originalDate; // Date string from DraggableTaskItem
      const newDate = over.id; // Date string from DroppableDayCell
      const taskDetails = active.data.current?.taskDetails;

      if (!taskId || !originalDate || !newDate || !taskDetails) {
        console.error("DragEnd: Missing data", { taskId, originalDate, newDate, taskDetails });
        setCalendarError("Could not move task: essential data missing.");
        return;
      }
      if (originalDate === newDate) return; // No change if dropped on the same day

      // Optimistic UI Update
      setCalendarPlan(currentPlan => {
        if (!currentPlan) return null;
        let newDailyTasks = currentPlan.dailyTasks.map(daySchedule => {
          let newTasks = [...daySchedule.tasks];
          // Remove from original date
          if (daySchedule.date === originalDate) {
            newTasks = newTasks.filter(task => task.taskId !== taskId);
          }
          return { ...daySchedule, tasks: newTasks };
        }).filter(daySchedule => daySchedule.tasks.length > 0 || daySchedule.date === newDate); // Keep newDate even if empty initially

        let newDayExists = newDailyTasks.find(ds => ds.date === newDate);
        if (newDayExists) {
          newDailyTasks = newDailyTasks.map(ds => 
            ds.date === newDate ? { ...ds, tasks: [...ds.tasks, taskDetails] } : ds
          );
        } else {
          newDailyTasks.push({
            date: newDate,
            dayName: format(parseISO(newDate), 'EEEE'), // Ensure dayName is correct
            tasks: [taskDetails]
          });
          newDailyTasks.sort((a,b) => compareAsc(parseISO(a.date), parseISO(b.date)));
        }
        return { ...currentPlan, dailyTasks: newDailyTasks };
      });
      
      // API Call
      try {
        const response = await fetch('/api/update-calendar-task-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, originalDate, newDate }),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.message || "Failed to save task reschedule.");
        }
        // If backend returns the updated plan, can re-set it, or trust optimistic update for now
        // setCalendarPlan(result.updatedPlan); 
        console.log("Task rescheduled successfully on backend.");
      } catch (err) {
        setCalendarError(`Failed to save reschedule: ${err.message}. Reverting UI.`); // Use calendarError
        console.error("Update task day error:", err);
        fetchCalendarPlan();
      }
    }
  };

  const handleFetchAndStartAISuggestion = async () => {
    setIsLoadingSuggestion(true);
    setSuggestionError(null);
    setSuggestedPracticeLinkState(null);
    try {
      const response = await fetch('/api/ai-suggested-practice', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch AI suggestion.');
      }
      const suggestionData = await response.json();
      // Ensure the structure matches what PracticePage expects for auto-start
      // It expects: description, topic, subTopic, numQuestions.
      // apiParams should contain testType, topic, subTopic.
      // The backend now sends: description, apiParams, numQuestions, adaptive.
      const navigationState = {
          description: suggestionData.description,
          topic: suggestionData.apiParams.topic, // from nested apiParams
          subTopic: suggestionData.apiParams.subTopic, // from nested apiParams
          numQuestions: suggestionData.numQuestions,
          // PracticePage will derive adaptive status from its config matched by description
          // or it can be explicitly passed if needed.
          // For now, relying on description matching in PracticePage for full config.
      };
      setSuggestedPracticeLinkState(navigationState); // Store for navigation
      navigate('/practice', { state: navigationState });

    } catch (err) {
      setSuggestionError(err.message);
      console.error("Fetch AI suggestion error:", err);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };
  
  // --- Droppable Day Cell (Simplified for renderCalendarGrid) ---
  const DroppableDayCell = ({ day, monthStart, tasksForDay }) => {
    const formattedDateKey = format(day, 'yyyy-MM-dd');
    const { isOver, setNodeRef: droppableRef } = useDroppable({
      id: formattedDateKey,
      data: { date: formattedDateKey } // Pass date string as data
    });
  
    return (
      <div
        ref={droppableRef}
        className={`calendar-day-cell ${
          !isSameMonth(day, monthStart) ? 'not-current-month' : ''
        } ${isSameDay(day, selectedDate) ? 'selected-day' : ''} ${
          tasksForDay.length > 0 && isSameMonth(day, monthStart) ? 'has-tasks' : ''
        } ${isOver ? 'droppable-over' : ''}`} // Highlight when droppable is over
        onClick={() => isSameMonth(day, monthStart) && setSelectedDate(day)} // Only allow selecting current month days
      >
        <span className="day-number">{format(day, 'd')}</span>
        {tasksForDay.length > 0 && isSameMonth(day, monthStart) && (
          <span className="task-indicator">{tasksForDay.length}</span>
        )}
      </div>
    );
  };

  const renderCalendarGrid = () => {
    // ... (setup logic: monthStart, monthEnd, startDate, endDate, days, dayNames) ...
    const monthStart = startOfMonth(currentDisplayMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const daysInGrid = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="calendar-grid">
        <div className="calendar-header">
          {dayNames.map(day => <div key={day} className="calendar-day-name">{day}</div>)}
        </div>
        {daysInGrid.map((day, index) => {
          const formattedDateKey = format(day, 'yyyy-MM-dd');
          const tasksForDay = tasksByDate[formattedDateKey] || [];
          return <DroppableDayCell key={index} day={day} monthStart={monthStart} tasksForDay={tasksForDay} />;
        })}
      </div>
    );
  };
  
  const renderSelectedDayTasks = () => {
    // ... (logic remains largely the same, but use DraggableTaskItem) ...
    const formattedDateKey = format(selectedDate, 'yyyy-MM-dd');
    const tasks = tasksByDate[formattedDateKey] || [];
    return (
      <div className="selected-day-tasks card">
        <h3 className="card-title tasks-for-date-title">
          Tasks for: {format(selectedDate, 'MMMM d, yyyy')} ({format(selectedDate, 'EEEE')})
        </h3>
        {tasks.length > 0 ? (
          <ul className="tasks-list">
            {tasks.map((task) => (
              // Original clickable li for navigation:
              // <li key={task.taskId} className="task-item" onClick={() => handleTaskClick(task)}>
              // Use DraggableTaskItem here
              <DraggableTaskItem key={task.taskId} task={task} originalDateString={formattedDateKey} />
            ))}
          </ul>
        ) : (
          <p className="no-tasks-message">
            {calendarPlan && selectedDate >= parseISO(calendarPlan.startDate) && selectedDate <= parseISO(calendarPlan.endDate) 
              ? "Rest day! No tasks scheduled." 
              : "No tasks scheduled for this day."}
          </p>
        )}
      </div>
    );
  };

  const displayUserName = profileData?.name || "User";
  let displayTestDateInfo = "Test information not available.";
  if (profileData?.testDetails?.testType && profileData?.testDetails?.testDate) {
    const testDate = parseISO(profileData.testDetails.testDate);
    const daysRemaining = differenceInCalendarDays(testDate, new Date());
    const formattedDate = format(testDate, 'MMMM d, yyyy');
    if (daysRemaining < 0) {
      displayTestDateInfo = `Your ${profileData.testDetails.testType} test was on ${formattedDate}. Time to update or add a new one!`;
    } else if (daysRemaining === 0) {
      displayTestDateInfo = `Your ${profileData.testDetails.testType} test is TODAY! Good luck!`;
    } else {
      displayTestDateInfo = `Your next ${profileData.testDetails.testType} test is in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (on ${formattedDate}).`;
    }
  } else if (profileData?.testDetails?.testType) {
    displayTestDateInfo = `Your ${profileData.testDetails.testType} test date is not set. Update it in Settings!`;
  }


  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="page-container dashboard-container">
        <div className="dashboard-header">
          {isLoadingProfile ? (
            <h1 className="page-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-unit)' }}>Loading profile...</h1>
          ) : profileError ? (
            <p className="error-message">Error loading profile: {profileError}</p>
          ) : (
            <>
              <h1 className="page-title" style={{ textAlign: 'left', marginBottom: 'var(--spacing-unit)' }}>Welcome back, {displayUserName}!</h1>
              <p className="test-date-reminder">{displayTestDateInfo}</p>
            </>
          )}
        </div>

        <div className="card dashboard-section study-plan-section">
          <h2 className="card-title">AI Suggested Study Plan</h2>
          {isLoadingCalendar && <p className="loading-message">Loading study plan...</p>}
          {calendarError && <p className="error-message">Error: {calendarError} </p>} {/* Displays calendar fetch or DnD errors */}
          
          {calendarPlan && !isLoadingCalendar && !calendarError && (
            <div className="calendar-view">
              <div className="calendar-navigation">
                <button className="button button-secondary button-sm" onClick={() => setCurrentDisplayMonth(subMonths(currentDisplayMonth, 1))}>&lt; Prev</button>
                <h3>{format(currentDisplayMonth, 'MMMM yyyy')}</h3>
                <button className="button button-secondary button-sm" onClick={() => setCurrentDisplayMonth(addMonths(currentDisplayMonth, 1))}>Next &gt;</button>
              </div>
              {renderCalendarGrid()}
              {renderSelectedDayTasks()} {/* This will now contain draggable items */}
            </div>
          )}
          {!calendarPlan && !isLoadingCalendar && !calendarError && (
              <div className="study-plan-placeholder alert alert-info">
                   <p>No study plan available. Check back later or ensure your profile settings are complete!</p>
            </div>
        )}
      </div>

      <div className="card dashboard-section practice-section">
        <h2 className="card-title">Practice Zone</h2>
        <p>Ready to improve your skills? Pick a topic and start practicing!</p>
         <button
           className="button button-success ai-practice-button"
           onClick={handleFetchAndStartAISuggestion}
           disabled={isLoadingSuggestion}
         >
           {isLoadingSuggestion ? 'Fetching Suggestion...' : 'Start AI Suggested Practice'}
         </button>
         {suggestionError && <p className="error-message" style={{marginTop: '10px'}}>{suggestionError}</p>}
      </div>
    </div>
  );
};

export default Dashboard;
