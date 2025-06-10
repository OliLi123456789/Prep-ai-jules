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
    console.log("PracticePage: QuizPlayer finished.", results);
    // TODO: Potentially show a modal or message here before resetting to selections.
    // For now, upon completion, QuizPlayer shows its own results, and user can navigate back.
    // If we want PracticePage to take over after QuizPlayer's own results screen:
    // setShowSelections(true); // This would bring user back to selection screen.
  };
  
  // const handleExitQuizPlayer = () => { // If QuizPlayer had an "Exit" button
  //   setShowSelections(true);
  //   setPageTitleOverride(null);
  //   setSelectedPracticeTestType('');
  //   setSelectedPracticeCategoryKey('');
  //   setSelectedPracticeConfig(null);
  // }

  if (!showSelections && selectedPracticeConfig) {
    let apiParamsForQuiz = { ...selectedPracticeConfig.apiParams };
    let numQuestionsForQuiz = selectedPracticeConfig.numQuestions;

    if (selectedPracticeConfig.isAdaptive) {
      // For the first module of an adaptive SAT section
      apiParamsForQuiz.module = 1;
      apiParamsForQuiz.totalQuestionsInModule = selectedPracticeConfig.questionsPerModule.module1;
      // For practice, we might want to let user pick number of questions for the first module, up to total.
      // Or just use the configured number for the module. For simplicity, using configured number.
      numQuestionsForQuiz = selectedPracticeConfig.questionsPerModule.module1;
      apiParamsForQuiz.numQuestions = numQuestionsForQuiz;
    } else {
      // For non-adaptive, numQuestions is already in apiParams or from selectedPracticeConfig.numQuestions
      apiParamsForQuiz.numQuestions = numQuestionsForQuiz;
    }

    return (
      <QuizPlayer
        key={quizKey}
        quizTitle={selectedPracticeConfig.title}
        apiParams={apiParamsForQuiz}
        showImmediateFeedback={true} // Practice mode usually has immediate feedback
        confettiOnComplete={true}
        onQuizComplete={handleQuizCompletion}
        // onExit={handleExitQuizPlayer}
        pageSpecificClassName="practice-page-container"
        // Props for SAT adaptivity (will be used by QuizPlayer if apiParams.testType is SAT and isAdaptive is true)
        isSatAdaptiveModule1={selectedPracticeConfig.isAdaptive && selectedPracticeConfig.apiParams?.testType === "SAT"} // Pass if it's module 1
        satSectionType={selectedPracticeConfig.satSectionType || null} // e.g. "Math" or "Reading & Writing"
        questionsPerModule={selectedPracticeConfig.questionsPerModule || null}
      />
    );
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
