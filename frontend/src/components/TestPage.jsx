import React, { useState } from 'react';
import './TestPage.css';

const TestPage = () => {
  const [selectedTestType, setSelectedTestType] = useState('');

  // Placeholder data for test types
  const testTypes = [
    "SAT Full Test",
    "ACT Full Test",
    "SAT Math Section",
    "SAT Reading Section",
    "SAT Writing & Language Section",
    "ACT English Section",
    "ACT Math Section",
    "ACT Reading Section",
    "ACT Science Section",
  ];

  const handleTestTypeChange = (event) => {
    setSelectedTestType(event.target.value);
  };

  const handleStartTest = () => {
    if (selectedTestType) {
      console.log('Starting test:', selectedTestType);
      // Navigation to actual test interface would happen here
    } else {
      alert('Please select a test type.');
    }
  };

  return (
    <div className="test-page-container">
      <h1 className="page-title">Take a Test</h1>

      <div className="selection-group">
        <label htmlFor="test-type-select">Choose a Test Type:</label>
        <select id="test-type-select" value={selectedTestType} onChange={handleTestTypeChange}>
          <option value="">-- Select Test Type --</option>
          {testTypes.map(testType => (
            <option key={testType} value={testType}>{testType}</option>
          ))}
        </select>
      </div>
      
      <button 
        className="start-test-button" 
        onClick={handleStartTest}
        disabled={!selectedTestType}
      >
        Start Test
      </button>
    </div>
  );
};

export default TestPage;
