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
      // Should not happen if selection is from the list, but as a fallback
      return <p className="error-message">Error: Selected test configuration not found.</p>;
    }

    // For this subtask, if it's a full test, we launch QuizPlayer with the first section's config.
    // QuizPlayer will be enhanced later (Step 7) to manage the multi-section sequence.
    let sectionConfigToLaunch = testConfig;
    if (testConfig.isFullTest && testConfig.sections && testConfig.sections.length > 0) {
      sectionConfigToLaunch = testConfig.sections[0]; // Launch first section
      console.log(`Starting full test "${testConfig.name}" with first section: "${sectionConfigToLaunch.name}"`);
    } else if (testConfig.isSingleSectionTest) {
      // For single section tests that might be adaptive (like SAT Math Section Sample)
      // The sectionConfigToLaunch is the testConfig itself, which has adaptive props.
      console.log(`Starting single section test: "${testConfig.name}"`);
    }

    let apiParamsForQuiz = { ...sectionConfigToLaunch.apiParams };
    let numQuestionsForQuiz = sectionConfigToLaunch.numQuestions;

    if (sectionConfigToLaunch.isAdaptive) {
      apiParamsForQuiz.module = 1; // Always start with module 1
      apiParamsForQuiz.totalQuestionsInModule = sectionConfigToLaunch.questionsPerModule.module1;
      numQuestionsForQuiz = sectionConfigToLaunch.questionsPerModule.module1; // Full first module
      apiParamsForQuiz.numQuestions = numQuestionsForQuiz;
    } else {
      apiParamsForQuiz.numQuestions = numQuestionsForQuiz;
    }

    return (
      <QuizPlayer
        key={quizKey}
        quizTitle={testConfig.name} // Use the main test name as title
        apiParams={apiParamsForQuiz}
        showImmediateFeedback={false} // Tests always have feedback deferred
        confettiOnComplete={false} // Usually no confetti for formal tests
        onQuizComplete={handleQuizCompletion}
        // onExit={handleExitQuizPlayer}
        pageSpecificClassName="test-page-container"
        // SAT adaptive props (will be used by QuizPlayer if testType is SAT and isAdaptive is true)
        isSatAdaptiveModule1={sectionConfigToLaunch.isAdaptive && sectionConfigToLaunch.apiParams?.testType === "SAT"}
        satSectionType={sectionConfigToLaunch.satSectionType || null}
        questionsPerModule={sectionConfigToLaunch.questionsPerModule || null}
      />
    );
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
