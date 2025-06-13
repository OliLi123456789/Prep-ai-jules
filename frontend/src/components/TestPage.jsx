import React, { useState } from 'react'; // useEffect removed as it's not used currently
import { useNavigate } from 'react-router-dom';
import QuizPlayer from './QuizPlayer';
import { testConfigurations, getTestConfigById } from '../constants/practiceTestConfigs';
import './TestPage.css';

const TestPage = () => {
  const navigate = useNavigate();

  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedTestConfig, setSelectedTestConfig] = useState(null);

  // State for multi-section orchestration
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionResults, setSectionResults] = useState([]);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [currentQuizKey, setCurrentQuizKey] = useState(Date.now().toString()); // Use string for key
  const [quizPlayerVisible, setQuizPlayerVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // To show messages like "Saving...", "Saved!", "Failed."


  const handleTestTypeChange = (event) => {
    setSelectedTestId(event.target.value);
    // Reset dependent states if test selection changes before starting
    if (quizPlayerVisible || isTestComplete || currentSectionIndex > 0) {
      handleResetTestState();
    }
  };

  const handleResetTestState = () => {
    setSelectedTestId('');
    setSelectedTestConfig(null);
    setCurrentSectionIndex(0);
    setSectionResults([]);
    setIsTestComplete(false);
    setQuizPlayerVisible(false);
    setCurrentQuizKey(Date.now().toString());
  };


  const handleStartTest = () => {
    if (!selectedTestId) {
      alert('Please select a test.');
      return;
    }
    const config = getTestConfigById(selectedTestId);
    if (!config) {
      alert('Selected test configuration not found.');
      return;
    }
    setSelectedTestConfig(config);
    setCurrentSectionIndex(0);
    setSectionResults([]);
    setIsTestComplete(false);
    setQuizPlayerVisible(true);
    setCurrentQuizKey(`${config.id}_${0}_${Date.now()}`);
  };

  const handleQuizComplete = (result) => {
    const currentSectionConfig = selectedTestConfig.sections[currentSectionIndex];
    const resultWithSectionInfo = {
      ...result,
      sectionId: currentSectionConfig.id,
      sectionName: currentSectionConfig.name,
      testType: currentSectionConfig.apiParams?.testType,
      topic: currentSectionConfig.apiParams?.topic,
    };
    const updatedResults = [...sectionResults, resultWithSectionInfo];
    setSectionResults(updatedResults);

    if (currentSectionIndex < selectedTestConfig.sections.length - 1) {
      // More sections remaining
      // No need to increment currentSectionIndex here, handleNextSection will do it.
      setQuizPlayerVisible(false); // Show interim screen
    } else {
      // All sections completed
      setIsTestComplete(true);
      setQuizPlayerVisible(false);
      // TODO: In Plan Step 2, save aggregated results to mockUserData.json via API
      // For now, we can call handleSaveFullTestResult if we want to auto-save.
      // Or add a button to trigger it.
      console.log("Test Complete! All section results:", updatedResults);
      // Example: handleSaveFullTestResult(updatedResults); // Auto-save on completion
    }
  };

  const aggregateTestResults = (completedSectionResults, testConfig) => {
    if (!testConfig || !completedSectionResults || completedSectionResults.length === 0) return null;

    let totalCorrectAnswers = 0;
    let totalPossibleQuestions = 0;
    let totalTimeForAllSections = 0;

    const sectionsData = completedSectionResults.map(sr => {
      let sectionCorrect = 0;
      let sectionPossible = 0;

      if (sr.isAdaptiveSatSession) {
        sectionCorrect = (sr.module1Score || 0) + (sr.module2Score || 0);
        sectionPossible = (sr.totalQuestionsM1 || 0) + (sr.totalQuestionsM2 || 0);
      } else {
        sectionCorrect = sr.score || 0;
        sectionPossible = sr.totalQuestions || 0;
      }

      totalCorrectAnswers += sectionCorrect;
      totalPossibleQuestions += sectionPossible;
      totalTimeForAllSections += sr.timeElapsed || 0;

      return {
        sectionName: sr.sectionName || 'Unknown Section',
        score: sectionCorrect,
        totalQuestions: sectionPossible,
        correctAnswers: sectionCorrect, // Alias for clarity
        percentage: sectionPossible > 0 ? (sectionCorrect / sectionPossible) * 100 : 0,
        timeTaken: sr.timeElapsed || 0,
      };
    });

    const overallPercentage = totalPossibleQuestions > 0 ? (totalCorrectAnswers / totalPossibleQuestions) * 100 : 0;
    // Simple overall score string, can be more sophisticated
    const overallScoreString = `${totalCorrectAnswers}/${totalPossibleQuestions} (${overallPercentage.toFixed(1)}%)`;

    return {
      testId: testConfig.id,
      testName: testConfig.name,
      date: new Date().toISOString(),
      overallScore: overallScoreString,
      totalCorrect: totalCorrectAnswers,
      totalPossible: totalPossibleQuestions,
      overallPercentage: overallPercentage,
      totalTime: totalTimeForAllSections,
      sections: sectionsData,
      isMultiSection: true,
    };
  };

  const handleSaveFullTestResult = async () => {
    if (!selectedTestConfig || sectionResults.length === 0) {
      alert("No results to save or test config missing.");
      return;
    }
    setSaveStatus("Saving...");
    const aggregatedResult = aggregateTestResults(sectionResults, selectedTestConfig);
    if (!aggregatedResult) {
      setSaveStatus("Failed to aggregate results.");
      return;
    }

    try {
      // Fetch current profile data
      const profileResponse = await fetch('/api/get-profile-data');
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to fetch profile data before saving test results.');
      }
      const profileData = await profileResponse.json();

      // Add new test result
      const updatedPastScores = [...(profileData.pastScores || []), aggregatedResult];
      const updatedProfileData = { ...profileData, pastScores: updatedPastScores };

      // Save updated profile data
      const saveResponse = await fetch('/api/save-profile-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfileData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save test results.');
      }
      setSaveStatus("Test results saved successfully!");
    } catch (error) {
      console.error("Error saving full test result:", error);
      setSaveStatus(`Error: ${error.message}`);
    }
  };

  const handleNextSection = () => {
    if (!selectedTestConfig || currentSectionIndex >= selectedTestConfig.sections.length - 1) {
      // Should not happen if button is shown correctly, but good guard
      setIsTestComplete(true); // Mark as complete if trying to go beyond last section
      setQuizPlayerVisible(false);
      return;
    }
    const nextIndex = currentSectionIndex + 1;
    setCurrentSectionIndex(nextIndex);
    setQuizPlayerVisible(true);
    setCurrentQuizKey(`${selectedTestConfig.id}_${nextIndex}_${Date.now()}`);
  };


  // UI Rendering Logic
  if (quizPlayerVisible && selectedTestConfig && selectedTestConfig.sections && currentSectionIndex < selectedTestConfig.sections.length) {
    const sectionConfigToLaunch = selectedTestConfig.sections[currentSectionIndex];
    const baseApiParamsForQuiz = { ...sectionConfigToLaunch.apiParams };

    let quizPlayerProps = {
      key: currentQuizKey,
      quizTitle: `${selectedTestConfig.name} - ${sectionConfigToLaunch.name || `Section ${currentSectionIndex + 1}`}`,
      showImmediateFeedback: false,
      confettiOnComplete: false,
      onQuizComplete: handleQuizComplete,
      pageSpecificClassName: "test-page-container",
      baseApiParams: baseApiParamsForQuiz,
      // navigateToOnExit: "/tests", // Or handle via a specific exit function
    };

    if (sectionConfigToLaunch.isAdaptive && sectionConfigToLaunch.apiParams?.testType === "SAT") {
      quizPlayerProps.isAdaptiveSat = true;
      quizPlayerProps.satSectionType = sectionConfigToLaunch.satSectionType;
      quizPlayerProps.questionsPerModule = sectionConfigToLaunch.questionsPerModule;
    } else {
      quizPlayerProps.isAdaptiveSat = false;
      if (!baseApiParamsForQuiz.numQuestions && sectionConfigToLaunch.numQuestions) {
        baseApiParamsForQuiz.numQuestions = sectionConfigToLaunch.numQuestions;
      }
      quizPlayerProps.apiParams = baseApiParamsForQuiz;
    }
    return <QuizPlayer {...quizPlayerProps} />;
  }

  if (!quizPlayerVisible && !isTestComplete && sectionResults.length > 0 && selectedTestConfig && sectionResults.length < selectedTestConfig.sections.length) {
    // Interim screen between sections
    const lastResult = sectionResults[sectionResults.length - 1];
    return (
      <div className="page-container test-page-container interim-screen card">
        <h1 className="page-title">{selectedTestConfig.name}</h1>
        <h2>Section Complete: {lastResult.sectionName}</h2>
        {/* Basic score display from last section */}
        <p>Score: {lastResult.isAdaptiveSatSession ?
                   `M1: ${lastResult.module1Score}/${lastResult.totalQuestionsM1}, M2: ${lastResult.module2Score}/${lastResult.totalQuestionsM2}`
                   : `${lastResult.score}/${lastResult.totalQuestions}`}
        </p>
        <button onClick={handleNextSection} className="button button-primary button-lg">
          Start Next Section: {selectedTestConfig.sections[currentSectionIndex + 1]?.name || `Section ${currentSectionIndex + 2}`}
        </button>
      </div>
    );
  }

  if (!quizPlayerVisible && isTestComplete) {
    // Final summary screen
    return (
      <div className="page-container test-page-container results-summary-screen card">
        <h1 className="page-title">Test Complete: {selectedTestConfig?.name}</h1>
        <h2>Overall Results:</h2>
        {sectionResults.map((result, index) => (
          <div key={index} className="section-result-summary">
            <h3>{result.sectionName || `Section ${index + 1}`}</h3>
            <p>Score: {result.isAdaptiveSatSession ?
                       `M1: ${result.module1Score}/${result.totalQuestionsM1} (Perf: ${result.module1PerformanceBand}), M2: ${result.module2Score}/${result.totalQuestionsM2}`
                       : `${result.score}/${result.totalQuestions}`}
            </p>
            <p>Time: {result.timeElapsed ? `${Math.floor(result.timeElapsed / 60)}m ${result.timeElapsed % 60}s` : 'N/A'}</p>
          </div>
        ))}
        <button onClick={handleSaveFullTestResult} className="button button-success button-lg" disabled={saveStatus === "Saving..." || saveStatus === "Test results saved successfully!"}>
          {saveStatus === "Saving..." ? "Saving..." : saveStatus === "Test results saved successfully!" ? "Saved!" : "Save Test Result"}
        </button>
        {saveStatus && <p className={`save-status-message ${saveStatus.startsWith("Error") ? 'error-message' : 'success-message'}`}>{saveStatus}</p>}
        <button onClick={handleResetTestState} className="button button-secondary button-lg" style={{marginTop: '10px'}}>
          Back to Test Selection
        </button>
      </div>
    );
  }

  // Default: Test Type Selection Screen
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
