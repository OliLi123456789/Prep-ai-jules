import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QuizPlayer from './QuizPlayer';
import { practiceSections } from '../constants/practiceTestConfigs'; // Import new config
import './PracticePage.css';

const PracticePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedPracticeTestType, setSelectedPracticeTestType] = useState(''); // e.g., "SAT", "ACT", "General"
  const [selectedPracticeCategoryKey, setSelectedPracticeCategoryKey] = useState(''); // e.g., "Math", "Algebra Basics"

  // This will store the full config object for the selected practice section
  const [selectedPracticeConfig, setSelectedPracticeConfig] = useState(null);

  const [showSelections, setShowSelections] = useState(true);
  const [pageTitleOverride, setPageTitleOverride] = useState(null);
  const [quizKey, setQuizKey] = useState(0);

  const handlePracticeTestTypeChange = (event) => {
    setSelectedPracticeTestType(event.target.value);
    setSelectedPracticeCategoryKey('');
    setSelectedPracticeConfig(null);
  };

  const handlePracticeCategoryChange = (event) => {
    const categoryKey = event.target.value;
    setSelectedPracticeCategoryKey(categoryKey);
    if (categoryKey && practiceSections[selectedPracticeTestType]?.categories?.[categoryKey]) {
      setSelectedPracticeConfig(practiceSections[selectedPracticeTestType].categories[categoryKey]);
    } else {
      setSelectedPracticeConfig(null);
    }
  };

  // Auto-start logic from Dashboard/AITutorPage
   useEffect(() => {
    if (location.state && location.state.topic && location.state.subTopic && location.state.numQuestions && location.state.description) {
      // This auto-start logic is more geared towards the old structure.
      // For practiceSections, the `topic` from dashboard might be `currentMainCategory` (e.g. "Math")
      // and `subTopic` from dashboard might be `currentSubTopicKey` (e.g. "Algebra: Linear Equations")
      // We need to find a matching config in `practiceSections`.
      // This is a simplified approach for now: if description matches a title, use that.
      const { description } = location.state;
      let foundConfig = null;
      let foundTestType = '';
      let foundCategoryKey = '';

      for (const testType in practiceSections) {
        for (const catKey in practiceSections[testType].categories) {
          if (practiceSections[testType].categories[catKey].title === description) {
            foundConfig = practiceSections[testType].categories[catKey];
            foundTestType = testType;
            foundCategoryKey = catKey;
            break;
          }
        }
        if (foundConfig) break;
      }
      
      if (foundConfig && sessionStorage.getItem('practicePageAutoStarted') !== JSON.stringify(location.state)) {
        console.log("PracticePage: Auto-starting with config:", foundConfig);
        setSelectedPracticeTestType(foundTestType);
        setSelectedPracticeCategoryKey(foundCategoryKey);
        setSelectedPracticeConfig(foundConfig);
        setPageTitleOverride(`Starting: ${foundConfig.title}`);

        sessionStorage.setItem('practicePageAutoStarted', JSON.stringify(location.state));
        navigate(location.pathname, { replace: true, state: {} });

        setShowSelections(false);
        setQuizKey(prevKey => prevKey + 1);
      } else if (!foundConfig) {
        console.warn("PracticePage: Auto-start state received, but no matching practice config found for description:", description);
        sessionStorage.removeItem('practicePageAutoStarted');
      }
    } else {
      sessionStorage.removeItem('practicePageAutoStarted');
    }
  }, [location.state, navigate]);


  const handleStartPractice = () => {
    if (!selectedPracticeConfig) {
      alert('Please select a practice area.');
      return;
    }
    setPageTitleOverride(null);
    setShowSelections(false);
    setQuizKey(prevKey => prevKey + 1);
  };

  const handleQuizCompletion = (results) => {
    console.log("PracticePage: QuizPlayer finished. Raw results object:", results);

    // Helper to format time, assuming results.timeElapsed is in seconds
    const formatTimeDisplay = (totalSeconds) => {
        if (totalSeconds === null || typeof totalSeconds === 'undefined') return 'N/A';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    };

    if (results.isAdaptiveSatSession) { // Check for the new flag from QuizPlayer
      console.log("--- Adaptive SAT Practice Results ---");
      console.log("  Module 1 Performance Band:", results.module1PerformanceBand);
      console.log("  Module 1 Score:", results.module1Score, "/", results.totalQuestionsModule1);
      console.log("  Module 2 Score:", results.module2Score, "/", results.totalQuestionsModule2);

      const totalCorrect = (results.module1Score || 0) + (results.module2Score || 0);
      const totalPossible = (results.totalQuestionsModule1 || 0) + (results.totalQuestionsModule2 || 0);
      if (totalPossible > 0) {
        console.log("  Overall Score:", totalCorrect, "/", totalPossible, `(${(totalCorrect / totalPossible * 100).toFixed(1)}%)`);
      }
    } else {
      console.log("--- Standard Practice Results ---");
      console.log("  Score:", results.score, "/", results.totalQuestions);
    }
    console.log("  Time Elapsed:", formatTimeDisplay(results.timeElapsed));

    // Optionally, bring user back to selection screen after a delay or button click
    // For now, QuizPlayer handles its own results screen. This log is for verification.
    // setTimeout(() => setShowSelections(true), 5000); // Example: return to selections after 5s
  };
  
  // const handleExitQuizPlayer = () => { // If QuizPlayer had an "Exit" button
  //   setShowSelections(true);
  //   setPageTitleOverride(null);
  //   setSelectedPracticeTestType('');
  //   setSelectedPracticeCategoryKey('');
  //   setSelectedPracticeConfig(null);
  // }

  if (!showSelections && selectedPracticeConfig) {
    // Determine base API params from the selected config
    const baseApiParamsForQuiz = { ...selectedPracticeConfig.apiParams };
    let quizPlayerProps = {
      key: quizKey,
      quizTitle: selectedPracticeConfig.title,
      showImmediateFeedback: !selectedPracticeConfig.isAdaptive, // Immediate feedback OFF for adaptive, ON otherwise
      confettiOnComplete: true,
      onQuizComplete: handleQuizCompletion,
      pageSpecificClassName: "practice-page-container",
      baseApiParams: baseApiParamsForQuiz, // Pass the base params
    };

    if (selectedPracticeConfig.isAdaptive && selectedPracticeConfig.apiParams?.testType === "SAT") {
      // SAT Adaptive Mode specific props
      quizPlayerProps.isAdaptiveSat = true;
      quizPlayerProps.satSectionType = selectedPracticeConfig.satSectionType;
      quizPlayerProps.questionsPerModule = selectedPracticeConfig.questionsPerModule;
      // QuizPlayer's useEffect will construct the specific apiParams for Module 1 using baseApiParams
      // No need to pass numQuestions directly in apiParams here as QuizPlayer handles it for adaptive
    } else {
      // Non-Adaptive or other types of practice
      quizPlayerProps.isAdaptiveSat = false;
      // For non-adaptive, QuizPlayer's useEffect will use baseApiParams and expect numQuestions within it or from a default.
      // Ensure numQuestions from config is part of baseApiParams if not already.
      if (!baseApiParamsForQuiz.numQuestions && selectedPracticeConfig.numQuestions) {
        baseApiParamsForQuiz.numQuestions = selectedPracticeConfig.numQuestions;
      }
       quizPlayerProps.apiParams = baseApiParamsForQuiz; // For non-adaptive, pass apiParams directly
    }

    return <QuizPlayer {...quizPlayerProps} />;
  }

  const availableCategories = selectedPracticeTestType ? Object.keys(practiceSections[selectedPracticeTestType].categories) : [];

  return (
    <div className="page-container practice-page-container">
      <h1 className="page-title">{pageTitleOverride || "Practice Zone"}</h1>
      <div className="card">
        <div className="form-group">
          <label htmlFor="practice-test-type-select">Select Type:</label>
          <select id="practice-test-type-select" value={selectedPracticeTestType} onChange={handlePracticeTestTypeChange} className="form-control">
            <option value="">-- Select Type --</option>
            {Object.keys(practiceSections).map(typeKey => (
              <option key={typeKey} value={typeKey}>{typeKey}</option>
            ))}
          </select>
        </div>

        {selectedPracticeTestType && (
          <div className="form-group">
            <label htmlFor="practice-category-select">Select Section/Category:</label>
            <select id="practice-category-select" value={selectedPracticeCategoryKey} onChange={handlePracticeCategoryChange} className="form-control" disabled={availableCategories.length === 0}>
              <option value="">-- Select Section/Category --</option>
              {availableCategories.map(catKey => (
                <option key={catKey} value={catKey}>
                  {practiceSections[selectedPracticeTestType].categories[catKey].title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Number of questions selection could be re-added here for "General" practice types if desired */}
        {/* For now, numQuestions is derived from config */}

        {selectedPracticeConfig && selectedPracticeConfig.isAdaptive && selectedPracticeConfig.apiParams?.testType === "SAT" && (
          <p className="adaptive-session-note">
            Note: This will be a two-module adaptive practice session. Your performance on Module 1 will determine the difficulty of Module 2.
          </p>
        )}

        <button
          className="button button-success button-block"
          onClick={handleStartPractice}
          disabled={!selectedPracticeConfig}
        >
          Start Practice
        </button>
      </div>
    </div>
  );
};

export default PracticePage;
