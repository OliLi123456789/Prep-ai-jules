import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // useLocation removed as not used
import QuizPlayer from './QuizPlayer';
import { testConfigurations, getTestConfigById } from '../constants/practiceTestConfigs'; // Import new config
import './TestPage.css';

const TestPage = () => {
  const navigate = useNavigate();

  const [selectedTestId, setSelectedTestId] = useState(''); // Store the ID of the selected test
  const [showTestTypeSelection, setShowTestTypeSelection] = useState(true);
  const [quizKey, setQuizKey] = useState(0);

  const handleTestTypeChange = (event) => {
    setSelectedTestId(event.target.value);
  };

  const handleStartTest = () => {
    if (!selectedTestId) {
      alert('Please select a test.');
      return;
    }
    setShowTestTypeSelection(false);
    setQuizKey(prevKey => prevKey + 1);
  };

  const handleQuizCompletion = (results) => {
    console.log("TestPage: QuizPlayer finished.", results);
    // Potentially navigate to a more detailed results page or show summary here
    // For now, QuizPlayer handles its own results screen. To return to selection:
    // setShowTestTypeSelection(true);
  };

  // const handleExitQuizPlayer = () => {
  //   setShowTestTypeSelection(true);
  //   setSelectedTestId('');
  // }

  if (!showTestTypeSelection && selectedTestId) {
    const testConfig = getTestConfigById(selectedTestId);
    if (!testConfig) {
      return <p className="error-message">Error: Selected test configuration not found.</p>;
    }

    let sectionConfigToLaunch = testConfig;
    if (testConfig.isFullTest && testConfig.sections && testConfig.sections.length > 0) {
      sectionConfigToLaunch = testConfig.sections[0];
      console.log(`Starting full test "${testConfig.name}" with first section: "${sectionConfigToLaunch.name}"`);
    } else if (testConfig.isSingleSectionTest) {
      console.log(`Starting single section test: "${testConfig.name}"`);
    }

    const baseApiParamsForQuiz = { ...sectionConfigToLaunch.apiParams };
    let quizPlayerProps = {
      key: quizKey,
      quizTitle: testConfig.name,
      showImmediateFeedback: false, // Always false for tests
      confettiOnComplete: false,
      onQuizComplete: handleQuizCompletion,
      pageSpecificClassName: "test-page-container",
      baseApiParams: baseApiParamsForQuiz,
    };

    if (sectionConfigToLaunch.isAdaptive && sectionConfigToLaunch.apiParams?.testType === "SAT") {
      quizPlayerProps.isAdaptiveSat = true;
      quizPlayerProps.satSectionType = sectionConfigToLaunch.satSectionType;
      quizPlayerProps.questionsPerModule = sectionConfigToLaunch.questionsPerModule;
      // QuizPlayer's useEffect will construct specific apiParams for Module 1 using baseApiParams
    } else {
      quizPlayerProps.isAdaptiveSat = false;
      // For non-adaptive tests, ensure numQuestions is in baseApiParams
      if (!baseApiParamsForQuiz.numQuestions && sectionConfigToLaunch.numQuestions) {
        baseApiParamsForQuiz.numQuestions = sectionConfigToLaunch.numQuestions;
      }
      quizPlayerProps.apiParams = baseApiParamsForQuiz; // Pass apiParams directly for non-adaptive
    }

    return <QuizPlayer {...quizPlayerProps} />;
  }

  return (
    <div className="page-container test-page-container">
      <h1 className="page-title">Take a Test</h1>
      <div className="card">
        <div className="form-group">
          <label htmlFor="test-type-select">Choose a Test:</label>
          <select
            id="test-type-select"
            value={selectedTestId}
            onChange={handleTestTypeChange}
            className="form-control"
          >
            <option value="">-- Select Test --</option>
            {testConfigurations.map(test => (
              <option key={test.id} value={test.id}>{test.name}</option>
            ))}
          </select>
        </div>
        
        <button
          className="button button-primary button-block"
          onClick={handleStartTest}
          disabled={!selectedTestId}
        >
          Start Test
        </button>
      </div>
    </div>
  );
};

export default TestPage;
