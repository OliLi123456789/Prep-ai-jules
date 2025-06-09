import React, { useState } from 'react';
import { tutorTopics } from '../constants/tutorTopics';
import QuizPlayer from './QuizPlayer'; // Import QuizPlayer
import './AITutorPage.css';

const AITutorPage = () => {
  const [currentTestType, setCurrentTestType] = useState('');
  const [currentMainCategory, setCurrentMainCategory] = useState('');
  const [currentSubTopicKey, setCurrentSubTopicKey] = useState(''); // e.g., "Algebra"
  const [selectedTopicDetails, setSelectedTopicDetails] = useState(null); // Full subtopic object

  const [learningContent, setLearningContent] = useState(null);
  const [guidedPracticeData, setGuidedPracticeData] = useState({
    question: null,
    guidance: null,
    isActive: false,
    error: null,
  });

  // State for SAT Adaptive Flow
  const [isAdaptiveSatMode, setIsAdaptiveSatMode] = useState(false);
  const [currentSatModule, setCurrentSatModule] = useState(1); // 1 or 2
  const [module1Performance, setModule1Performance] = useState(null); // "low", "medium", "high"
  const [questionsPerModule, setQuestionsPerModule] = useState({ module1: 22, module2: 22 }); // Example for SAT Math
  const [questionsAnsweredInModule, setQuestionsAnsweredInModule] = useState(0);
  const [showPerformanceButtons, setShowPerformanceButtons] = useState(false);


  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // General page error

  const NON_ADAPTIVE_SESSION_LENGTH = 5; // Define session length for non-SAT modes

  const resetAdaptiveStates = () => {
    setIsAdaptiveSatMode(false);
    setCurrentSatModule(1);
    setModule1Performance(null);
    setQuestionsAnsweredInModule(0);
    setShowPerformanceButtons(false);
  };

  const handleTestTypeSelect = (testType) => {
    setCurrentTestType(testType);
    setCurrentMainCategory('');
    setCurrentSubTopicKey('');
    setSelectedTopicDetails(null);
    setLearningContent(null);
    setGuidedPracticeData({ question: null, guidance: null, isActive: false, error: null });
    setError(null);
    resetAdaptiveStates();
  };

  const handleMainCategorySelect = (mainCategory) => {
    setCurrentMainCategory(mainCategory);
    setCurrentSubTopicKey('');
    setSelectedTopicDetails(null);
    setLearningContent(null);
    setGuidedPracticeData({ question: null, guidance: null, isActive: false, error: null });
    setError(null);
    resetAdaptiveStates();
  };

  const handleSubTopicSelect = (subTopicKey) => {
    setCurrentSubTopicKey(subTopicKey);
    const details = tutorTopics[currentTestType]?.categories?.[currentMainCategory]?.subTopics?.[subTopicKey];
    setSelectedTopicDetails(details || null);
    setLearningContent(null);
    setGuidedPracticeData({ question: null, guidance: null, isActive: false, error: null });
    setError(null);
    resetAdaptiveStates();
  };

  const handleLearnTopic = async () => {
    if (!selectedTopicDetails || !selectedTopicDetails.supportsLearn) return;

    console.log("Requesting Learning Content for:", currentTestType, currentMainCategory, currentSubTopicKey);
    setIsLoading(true);
    setError(null);
    setLearningContent(null); // Clear previous content
    setGuidedPracticeData(null); // Clear other section's content

    try {
      const response = await fetch('/api/ai-learn-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: currentTestType,
          section: currentMainCategory,
          subTopic: currentSubTopicKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setLearningContent(data);
    } catch (err) {
      setError(err.message || "Failed to load learning content.");
      console.error("Fetch AI Learn Topic error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Renamed from handleStartGuidedPractice to fetchGuidedQuestion
  const fetchGuidedQuestion = async (simulatedPerformance = null) => {
    if (!selectedTopicDetails || !selectedTopicDetails.supportsGuidance) return;

    let qAnsweredInModule = questionsAnsweredInModule;
    let nextModule = currentSatModule;
    let nextPerf = module1Performance;
    let localIsAdaptiveMode = isAdaptiveSatMode;
    let localQuestionsPerModule = questionsPerModule;

    // If this is the very first call (not a "Next Question" or simulated performance call)
    if (!guidedPracticeData.isActive && !simulatedPerformance) {
      qAnsweredInModule = 0; // Reset for new session
      setQuestionsAnsweredInModule(0);
      if (currentTestType === "SAT" && (currentMainCategory === "Math" || currentMainCategory === "Reading" || currentMainCategory === "Writing & Language")) {
        setIsAdaptiveSatMode(true);
        localIsAdaptiveMode = true;
        setCurrentSatModule(1);
        nextModule = 1;
        setModule1Performance(null); // Clear previous M1 performance
        nextPerf = null;
        setShowPerformanceButtons(false);
        // Set questionsPerModule based on category (example)
        if (currentMainCategory === "Math") {
          localQuestionsPerModule = { module1: 22, module2: 22 };
        } else { // Reading or Writing
          localQuestionsPerModule = { module1: 27, module2: 27 };
        }
        setQuestionsPerModule(localQuestionsPerModule);
      } else {
        setIsAdaptiveSatMode(false); // Ensure it's off for non-adaptive
        localIsAdaptiveMode = false;
      }
    } else if (!simulatedPerformance && guidedPracticeData.isActive) {
      // This is a "Next Question" click
      qAnsweredInModule++;
    }


    if (simulatedPerformance) { // Transitioning to Module 2
      nextModule = 2;
      nextPerf = simulatedPerformance;
      qAnsweredInModule = 0; // Reset for Module 2
      setShowPerformanceButtons(false);
      setCurrentSatModule(2);
      setModule1Performance(simulatedPerformance);
      setQuestionsAnsweredInModule(0);
    }

    // Check for session/module completion BEFORE fetching new question
    if (localIsAdaptiveMode) {
      if (nextModule === 1 && qAnsweredInModule >= localQuestionsPerModule.module1) {
        setShowPerformanceButtons(true);
        setGuidedPracticeData(prev => ({ ...prev, question: null, guidance: null, error: null, isActive: true })); // Keep active to show buttons
        setIsLoading(false);
        return;
      }
      if (nextModule === 2 && qAnsweredInModule >= localQuestionsPerModule.module2) {
        setGuidedPracticeData(prev => ({ ...prev, isActive: false, question: null, guidance: "SAT adaptive session complete!", error: null }));
        setIsLoading(false);
        resetAdaptiveStates();
        return;
      }
    } else if (guidedPracticeData.isActive && qAnsweredInModule >= NON_ADAPTIVE_SESSION_LENGTH) {
        setGuidedPracticeData(prev => ({ ...prev, isActive: false, question: null, guidance: "Practice session complete!", error: null }));
        setIsLoading(false);
        return;
    }

    console.log("Fetching Guided Question for:", currentTestType, currentMainCategory, currentSubTopicKey, `Module: ${nextModule}`, `Q#: ${qAnsweredInModule + 1}`);
    setIsLoading(true);
    setError(null);
    setLearningContent(null);
    // Clear previous guidance, keep question until new one loads, or clear both
    setGuidedPracticeData(prev => ({ ...prev, guidance: null, isActive: true, error: null }));


    let questionObject = null;
    const questionNumberStart = qAnsweredInModule + 1;
    const totalQuestionsInCurrentModule = nextModule === 1 ? localQuestionsPerModule.module1 : localQuestionsPerModule.module2;

    const apiPayload = {
      testType: currentTestType,
      topic: currentMainCategory,
      subTopic: currentSubTopicKey,
      numQuestions: 1,
      ...(localIsAdaptiveMode && {
        module: nextModule,
        totalQuestionsInModule: totalQuestionsInCurrentModule,
        questionNumberStart: questionNumberStart,
        ...(nextModule === 2 && nextPerf && { module1Performance: nextPerf }),
      }),
    };

    try {
      console.log("Fetching question with payload:", apiPayload);
      const qResponse = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      const qData = await qResponse.json();
      if (!qResponse.ok || qData.error) {
        throw new Error(qData.message || `Failed to generate question. Status: ${qResponse.status}`);
      }
      if (!qData || qData.length === 0) {
        throw new Error("No question generated for this topic/difficulty.");
      }
      questionObject = qData[0];
      setGuidedPracticeData(prev => ({ ...prev, question: questionObject, error: null }));
      setQuestionsAnsweredInModule(qAnsweredInModule + 1); // Update state after successful fetch
    } catch (err) {
      console.error("Fetch question error:", err);
      setGuidedPracticeData(prev => ({ ...prev, isActive: false, error: err.message }));
      setIsLoading(false);
      return;
    }

    if (questionObject) {
      try {
        const sResponse = await fetch('/api/get-guided-solution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: questionObject.question_text,
            options: questionObject.options,
            correctAnswer: questionObject.correct_answer,
            topic: currentMainCategory,
            subTopic: currentSubTopicKey,
          }),
        });
        const sData = await sResponse.json();
        if (!sResponse.ok || sData.error) {
          throw new Error(sData.message || "Failed to get guidance.");
        }
        setGuidedPracticeData(prev => ({ ...prev, guidance: sData.guidance, error: null }));
      } catch (err) {
        console.error("Fetch guidance error:", err);
        setGuidedPracticeData(prev => ({ ...prev, guidance: null, error: err.message }));
      }
    }
    setIsLoading(false);
  };

  const handleStopPractice = () => {
    setGuidedPracticeData({ question: null, guidance: null, isActive: false, error: null });
    setError(null);
    resetAdaptiveStates(); // This will also reset questionsAnsweredInModule
    setLearningContent(null); // Clear learning content as well
  };

  const getSelectionPath = () => {
    if (!currentTestType) return "Please select a Test Type.";
    if (!currentMainCategory) return `Current Selection: ${currentTestType}`;
    if (!currentSubTopicKey) return `Current Selection: ${currentTestType} > ${currentMainCategory}`;
    return `Current Selection: ${currentTestType} > ${currentMainCategory} > ${currentSubTopicKey}`;
  };

  return (
    <div className="page-container ai-tutor-page-container">
      <h1 className="page-title">AI Tutor</h1>

      <div className="card topic-selection-area">
        <h2 className="card-title">Choose Your Topic</h2>

        {/* Test Type Selection */}
        <div className="selection-level">
          <h3 className="selection-level-title">1. Select Test Type:</h3>
          <div className="button-group">
            {Object.keys(tutorTopics).map(testType => (
              <button
                key={testType}
                onClick={() => handleTestTypeSelect(testType)}
                className={`button selection-button ${currentTestType === testType ? 'active' : ''}`}
              >
                {testType}
              </button>
            ))}
          </div>
        </div>

        {/* Main Category Selection */}
        {currentTestType && tutorTopics[currentTestType]?.categories && (
          <div className="selection-level">
            <h3 className="selection-level-title">2. Select Main Category:</h3>
            <div className="button-group">
              {Object.keys(tutorTopics[currentTestType].categories).map(mainCat => (
                <button
                  key={mainCat}
                  onClick={() => handleMainCategorySelect(mainCat)}
                  className={`button selection-button ${currentMainCategory === mainCat ? 'active' : ''}`}
                >
                  {mainCat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-Topic Selection */}
        {currentMainCategory && tutorTopics[currentTestType]?.categories?.[currentMainCategory]?.subTopics && (
          <div className="selection-level">
            <h3 className="selection-level-title">3. Select Specific Topic:</h3>
            <div className="button-group">
              {Object.keys(tutorTopics[currentTestType].categories[currentMainCategory].subTopics).map(subKey => (
                <button
                  key={subKey}
                  onClick={() => handleSubTopicSelect(subKey)}
                  className={`button selection-button ${currentSubTopicKey === subKey ? 'active' : ''}`}
                >
                  {subKey}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="current-selection-display">
          <p>{getSelectionPath()}</p>
          {selectedTopicDetails?.description && <p className="topic-description"><em>{selectedTopicDetails.description}</em></p>}
        </div>
      </div>

      {isLoading && <p className="loading-message">Loading...</p>}
      {error && <p className="error-message">{error}</p>}

      {selectedTopicDetails && (
        <div className="actions-and-content-area">
          <div className="action-section learn-topic-section card">
            <h3 className="card-title section-title">Learn this Topic</h3>
            <button
              onClick={handleLearnTopic}
              className="button button-primary action-button"
              disabled={!selectedTopicDetails.supportsLearn || isLoading}
            >
              {isLoading && selectedTopicDetails.supportsLearn ? 'Loading Learning Module...' : 'Learn this Topic'}
            </button>
            {learningContent && !isLoading && !error && (
              <div className="content-display-box learn-content-display">
                <h3>{learningContent.title}</h3>
                <p className="module-intro"><em>{learningContent.introduction}</em></p>

                <h4>Key Concepts:</h4>
                {learningContent.key_concepts?.map((concept, index) => (
                  <div key={index} className="learning-module-item key-concept-item">
                    <p><strong>{index + 1}. {concept.concept_name}</strong></p>
                    <p>{concept.explanation}</p>
                    <p><em>Example: {concept.example}</em></p>
                  </div>
                ))}

                {learningContent.practice_questions && learningContent.practice_questions.length > 0 && (
                    <>
                        <h4>Practice Questions from this Module:</h4>
                        {learningContent.practice_questions.map((pq, index) => (
                        <div key={index} className="learning-module-item practice-question-display">
                            <p><strong>Q{index + 1}: {pq.question_text}</strong></p>
                            <ul>{pq.options?.map((opt, i) => <li key={i}>{opt}</li>)}</ul>
                            <p><em>Correct Answer: {pq.correct_answer}</em></p>
                            <p><em>Explanation: {pq.explanation}</em></p>
                        </div>
                        ))}
                    </>
                )}

                <h4>Summary:</h4>
                <p>{learningContent.summary}</p>
              </div>
            )}
             {/* Display this message if learningContent is null and not loading and no error */}
            {!learningContent && !isLoading && !error && selectedTopicDetails.supportsLearn && (
              <p className="content-placeholder-message">Select a topic and click 'Learn this Topic' to see content.</p>
            )}
          </div>

          <div className="action-section guided-practice-section card">
            <h3 className="card-title section-title">Practice with Guidance</h3>
            <button
              onClick={() => fetchGuidedQuestion()} // Main action button
              className="button button-success action-button"
              disabled={
                !selectedTopicDetails?.supportsGuidance ||
                isLoading ||
                showPerformanceButtons ||
                (guidedPracticeData.isActive && !guidedPracticeData.question && !guidedPracticeData.error) // Prevent multiple clicks if already active but no question yet (e.g. session complete message shown)
              }
            >
              {isLoading && guidedPracticeData.isActive ? 'Loading...' :
               showPerformanceButtons ? 'Awaiting Performance Input...' :
               !guidedPracticeData.isActive ? 'Start Guided Practice' :
               isAdaptiveSatMode && currentSatModule === 1 && questionsAnsweredInModule < questionsPerModule.module1 ? `Next Question (M1: ${questionsAnsweredInModule}/${questionsPerModule.module1})` :
               isAdaptiveSatMode && currentSatModule === 2 && questionsAnsweredInModule < questionsPerModule.module2 ? `Next Question (M2: ${questionsAnsweredInModule}/${questionsPerModule.module2})` :
               !isAdaptiveSatMode && questionsAnsweredInModule < NON_ADAPTIVE_SESSION_LENGTH ? `Next Question (${questionsAnsweredInModule}/${NON_ADAPTIVE_SESSION_LENGTH})` :
               'Start Guided Practice' // Default or after completion
              }
            </button>

            {isAdaptiveSatMode && guidedPracticeData.isActive && !showPerformanceButtons && (
                 <p className="adaptive-mode-info">
                    SAT Adaptive Mode: Module {currentSatModule} - Question {questionsAnsweredInModule > 0 ? questionsAnsweredInModule : '1'} of {currentSatModule === 1 ? questionsPerModule.module1 : questionsPerModule.module2}
                 </p>
            )}

            {showPerformanceButtons && isAdaptiveSatMode && (
              <div className="performance-simulation-buttons card">
                <h4>Module 1 Complete! Simulate Performance for Module 2:</h4>
                <button className="button button-outline-primary" onClick={() => fetchGuidedQuestion("low")}>Low Performance</button>
                <button className="button button-outline-primary" onClick={() => fetchGuidedQuestion("medium")}>Medium Performance</button>
                <button className="button button-outline-primary" onClick={() => fetchGuidedQuestion("high")}>High Performance</button>
              </div>
            )}

            {/* Loading message specific to this section if not covered by main isLoading */}
            {guidedPracticeData.isActive && isLoading && !showPerformanceButtons && (
              <p className="loading-message">Loading guided practice...</p>
            )}
            {/* Error specific to this section */}
            {guidedPracticeData.error && !showPerformanceButtons && (
              <p className="error-message">{guidedPracticeData.error}</p>
            )}

            {/* Content display area */}
            {guidedPracticeData.isActive && !isLoading && !showPerformanceButtons && (guidedPracticeData.question || guidedPracticeData.guidance) && (
              <div className="content-display-box guided-practice-display">
                {guidedPracticeData.question && (
                  <QuizPlayer
                    isStandaloneQuestion={true}
                    initialQuestion={guidedPracticeData.question}
                    showOptionPrefixes={true}
                    pageSpecificClassName="guided-practice-question-display"
                  />
                )}

                {guidedPracticeData.guidance && (
                  <>
                    <h5 style={{marginTop: 'var(--spacing-unit) * 2'}}>Step-by-Step Guidance:</h5>
                    <div className="guidance-text" style={{ whiteSpace: 'pre-wrap' }}>
                      {guidedPracticeData.guidance}
                    </div>
                  </>
                )}
                 <button
                    onClick={handleStopPractice}
                    className="button button-danger"
                    style={{marginTop: '15px', display: 'block', marginLeft: 'auto', marginRight: 'auto'}}
                >
                    Stop Practice
                </button>
              </div>
            )}
            {/* Placeholder message if the section is not active and not loading/error */}
            {!guidedPracticeData.isActive && !isLoading && !guidedPracticeData.error && selectedTopicDetails.supportsGuidance && (
                 <p className="content-placeholder-message">Select a topic and click 'Start Guided Practice' to begin.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorPage;
