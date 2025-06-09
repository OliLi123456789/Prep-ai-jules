import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // useLocation might not be needed here unless for nav-based auto-start
import QuizPlayer from './QuizPlayer'; // Import the new component
import './TestPage.css';

const TestPage = () => {
  const navigate = useNavigate();
  // const location = useLocation(); // Currently not used for auto-start in TestPage

  const [selectedTestType, setSelectedTestType] = useState('');
  const [showTestTypeSelection, setShowTestTypeSelection] = useState(true);
  const [quizKey, setQuizKey] = useState(0); // Used to force re-mount of QuizPlayer

  // Placeholder data for test types
  const testTypes = [
    "SAT Full Test (Sample)", 
    "ACT Full Test (Sample)", 
    "SAT Math Section (Sample)",
    // Add more structured test types if backend can handle them
    // e.g., { id: "sat_full", name: "SAT Full Test (Sample)", numQuestions: 154, topic: "Mixed", subTopic: "Mixed" }
  ];
  const MOCK_NUM_QUESTIONS_FOR_ANY_TEST = 3; // All sample tests will have 3 questions for now

  const handleTestTypeChange = (event) => {
    setSelectedTestType(event.target.value);
  };

  const handleStartTest = () => {
    if (!selectedTestType) {
      alert('Please select a test type.');
      return;
    }
    setShowTestTypeSelection(false);
    setQuizKey(prevKey => prevKey + 1); // Increment key to remount QuizPlayer
  };

  const handleQuizCompletion = (results) => {
    console.log("TestPage: QuizPlayer finished.", results);
    // TestPage specific logic after QuizPlayer is done (e.g. save results differently)
    // QuizPlayer already handles its own results screen.
  };

  // const handleExitQuizPlayer = () => {
  //   setShowTestTypeSelection(true);
  // }

  if (!showTestTypeSelection) {
    // Determine apiParams based on selectedTestType
    // This is a simplified example; in a real app, test structures would be more detailed
    const apiParams = {
      topic: "Mixed", // Placeholder, as test type implies content
      subTopic: selectedTestType, // Pass the selected test type string as subTopic for now
      numQuestions: MOCK_NUM_QUESTIONS_FOR_ANY_TEST,
      testType: selectedTestType // This is the main identifier for the backend
    };

    return (
      <QuizPlayer
        key={quizKey}
        quizTitle={`${selectedTestType}`}
        apiParams={apiParams}
        showImmediateFeedback={false} // Key difference for Test mode
        confettiOnComplete={true} // Or false for a more serious test setting
        onQuizComplete={handleQuizCompletion}
        // onExit={handleExitQuizPlayer}
        pageSpecificClassName="test-page-container"
      />
    );
  }

  // Initial Test Type Selection view
  return (
    <div className="page-container test-page-container">
      <h1 className="page-title">Take a Test</h1>
      <div className="card">
        <div className="form-group">
          <label htmlFor="test-type-select">Choose a Test Type:</label>
          <select
            id="test-type-select"
            value={selectedTestType}
            onChange={handleTestTypeChange}
            className="form-control"
          >
            <option value="">-- Select Test Type --</option>
            {testTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <button
          className="button button-primary button-block"
          onClick={handleStartTest}
          disabled={!selectedTestType}
        >
          Start Test
        </button>
      </div>
    </div>
  );
};

export default TestPage;
