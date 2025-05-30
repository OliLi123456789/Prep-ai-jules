import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation and useNavigate
import './AILearnPage.css'; 

const AILearnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedTestType, setSelectedTestType] = useState('');
  const [selectedSection, setSelectedSection] = useState(''); // This corresponds to 'topic' from Dashboard state
  const [selectedSubTopic, setSelectedSubTopic] = useState('');

  const [learningModule, setLearningModule] = useState(null);
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  const [error, setError] = useState(null);
  const [userPracticeAnswers, setUserPracticeAnswers] = useState({});
  const [pageTitleOverride, setPageTitleOverride] = useState(null);

  // const [userPracticeAnswers, setUserPracticeAnswers] = useState({}); // Already defined above

  // Predefined topic structure
  const topicSelections = {
    SAT: {
      Math: ["Algebra", "Geometry", "Problem Solving and Data Analysis", "Advanced Math"],
      Reading: ["Information and Ideas", "Craft and Structure", "Synthesis"],
      Writing: ["Standard English Conventions", "Expression of Ideas"],
    },
    ACT: {
      English: ["Production of Writing", "Knowledge of Language", "Conventions of Standard English"],
      Math: ["Preparing for Higher Math", "Integrating Essential Skills", "Modeling"],
      Reading: ["Key Ideas and Details", "Craft and Structure", "Integration of Knowledge and Ideas"],
      Science: ["Interpretation of Data", "Scientific Investigation", "Evaluation of Models, Inferences, and Experimental Results"],
    },
  };

  // Effect to handle auto-load from navigation state
  useEffect(() => {
    if (location.state && location.state.topic && location.state.subTopic) { // 'topic' from nav state is 'section' here
      const { topic: sectionFromState, subTopic: subTopicFromState, description } = location.state;

      // Prevent re-processing if already processed this navigation state
      if (sessionStorage.getItem('aiLearnPageAutoStarted') === JSON.stringify(location.state)) {
        return;
      }
      
      console.log("AILearnPage: Received state for auto-load:", location.state);

      let inferredTestType = '';
      for (const testType in topicSelections) {
        if (topicSelections[testType][sectionFromState]) {
          inferredTestType = testType;
          break;
        }
      }

      if (inferredTestType) {
        setSelectedTestType(inferredTestType);
        setSelectedSection(sectionFromState);
        setSelectedSubTopic(subTopicFromState);
        if (description) {
          setPageTitleOverride(`Loading Module: ${description}`);
        }
        
        sessionStorage.setItem('aiLearnPageAutoStarted', JSON.stringify(location.state));
        navigate(location.pathname, { replace: true, state: {} }); // Clear state
      } else {
        console.warn("AILearnPage: Could not infer testType for auto-load with section:", sectionFromState);
        sessionStorage.removeItem('aiLearnPageAutoStarted');
      }
    } else {
        sessionStorage.removeItem('aiLearnPageAutoStarted');
    }
  }, [location.state, navigate]);


  // Effect to auto-load module when selections are valid and potentially set by navigation
  useEffect(() => {
    // Check if this effect should run: selections are valid, not loading, and it's an auto-start scenario
    if (selectedTestType && selectedSection && selectedSubTopic && 
        !isLoadingModule && !learningModule && // Only if not already loaded/loading
        location.state && location.state.topic // And if location.state *was* just processed (now cleared)
                                               // This condition is tricky. The original sessionStorage flag is better.
                                               // Let's re-evaluate: this effect should run if selections are complete,
                                               // and the trigger was the completion of those selections (potentially by previous effect)
       ) {
        // A better way to check if it was an auto-start is if the sessionStorage flag was just set.
        // However, since sessionStorage is set *before* state updates are guaranteed,
        // we rely on these states being set, then call handleLoadModule.
        // The previous effect already cleared location.state.
        // We only want to auto-load if these states were set by the *navigation event*.
        // The `sessionStorage.getItem('aiLearnPageAutoStarted')` check in the *first* effect tries to prevent reruns.
        // This second effect needs to reliably know it's an auto-start.
        // The simplest is to check if the component just mounted AND has these states.
        // For this specific flow, we assume if these are set and no module yet, it's due to nav.
        
        // Check if the *reason* these are set is because sessionStorage was just populated.
        // This is a bit indirect. A direct flag passed between effects is not standard.
        // The key is the first effect sets the states and clears location.state.
        // This effect will then pick up the changed states.
        // We need to ensure it only automatically calls handleLoadModule for the navigation case.
        
        // If the selections are complete AND we are in the initial state of this page load (no module yet, not loading)
        // AND the sessionStorage flag indicates we *just* processed a navigation state:
        if (sessionStorage.getItem('aiLearnPageProcessedNav') === "true") {
            console.log("AILearnPage: Auto-loading module due to state change from navigation.");
            handleLoadModule();
            setPageTitleOverride(null); // Clear override after attempting to load
            sessionStorage.removeItem('aiLearnPageProcessedNav'); // Consume the flag
        }
    }
  }, [selectedTestType, selectedSection, selectedSubTopic, isLoadingModule, learningModule]);
  
  // Update the first useEffect to set a flag that this second useEffect can consume
  // This is better than relying on timing or indirect checks.
  useEffect(() => {
    if (location.state && location.state.topic && location.state.subTopic) {
      const { topic: sectionFromState, subTopic: subTopicFromState, description } = location.state;
      if (JSON.stringify(location.state) === sessionStorage.getItem('aiLearnPageAutoStarted')) return;

      console.log("AILearnPage: Processing navigation state:", location.state);
      let inferredTestType = '';
      for (const testType in topicSelections) {
        if (topicSelections[testType][sectionFromState]) {
          inferredTestType = testType;
          break;
        }
      }
      if (inferredTestType) {
        setSelectedTestType(inferredTestType);
        setSelectedSection(sectionFromState);
        setSelectedSubTopic(subTopicFromState);
        if (description) setPageTitleOverride(`Loading Module: ${description}`);
        
        sessionStorage.setItem('aiLearnPageAutoStarted', JSON.stringify(location.state));
        sessionStorage.setItem('aiLearnPageProcessedNav', "true"); // Flag for the next effect
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        console.warn("AILearnPage: Could not infer testType for auto-load with section:", sectionFromState);
        sessionStorage.removeItem('aiLearnPageAutoStarted');
        sessionStorage.removeItem('aiLearnPageProcessedNav');
      }
    } else {
      sessionStorage.removeItem('aiLearnPageAutoStarted');
      // Do not remove aiLearnPageProcessedNav here, it should be consumed by the other effect.
      // Or remove it if we are sure there's no pending auto-load.
      if (sessionStorage.getItem('aiLearnPageProcessedNav') !== "true") { // Only remove if not about to be used
          sessionStorage.removeItem('aiLearnPageProcessedNav');
      }
    }
  }, [location.state, navigate]);


  const handleLoadModule = async () => {
    if (!selectedTestType || !selectedSection || !selectedSubTopic) {
      // This alert might be redundant if button is disabled, but good for programmatic calls
      alert("Please make all selections (Test Type, Section, and Sub-Topic).");
      return;
    }
    setIsLoadingModule(true);
    setError(null);
    setLearningModule(null);
    setUserPracticeAnswers({}); // Reset answers for new module

    try {
      const response = await fetch('/api/ai-learn-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: selectedTestType,
          section: selectedSection,
          subTopic: selectedSubTopic,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setLearningModule(data);
    } catch (err) {
      setError(err.message || "Failed to load learning module.");
      console.error("Fetch AI Learn Module error:", err);
    } finally {
      setIsLoadingModule(false);
    }
  };
  
  const handlePracticeOptionSelect = (qIndex, option) => {
    setUserPracticeAnswers(prev => ({
      ...prev,
      [qIndex]: { ...prev[qIndex], selected: option, revealed: false } // Keep revealed false until checked
    }));
  };

  const handleCheckPracticeAnswer = (qIndex) => {
    const question = learningModule?.practice_questions[qIndex];
    const userAnswer = userPracticeAnswers[qIndex];
    if (!question || !userAnswer || !userAnswer.selected) return;

    const isCorrect = userAnswer.selected === question.correct_answer;
    setUserPracticeAnswers(prev => ({
      ...prev,
      [qIndex]: { ...prev[qIndex], revealed: true, correct: isCorrect }
    }));
  };


  return (
    <div className="page-container ai-learn-page-container">
      <h1 className="page-title">AI Learning Modules</h1>

      <div className="card selection-area">
        <h2 className="card-title">Select a Topic to Learn</h2>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="testType">Test Type:</label>
            <select id="testType" className="form-control" value={selectedTestType} onChange={e => { setSelectedTestType(e.target.value); setSelectedSection(''); setSelectedSubTopic(''); }}>
              <option value="">-- Select Test Type --</option>
              {Object.keys(topicSelections).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="section">Section:</label>
            <select id="section" className="form-control" value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedSubTopic(''); }} disabled={!selectedTestType}>
              <option value="">-- Select Section --</option>
              {selectedTestType && topicSelections[selectedTestType] && Object.keys(topicSelections[selectedTestType]).map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="subTopic">Sub-Topic:</label>
            <select id="subTopic" className="form-control" value={selectedSubTopic} onChange={e => setSelectedSubTopic(e.target.value)} disabled={!selectedSection}>
              <option value="">-- Select Sub-Topic --</option>
              {selectedSection && topicSelections[selectedTestType]?.[selectedSection]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
        </div>
        <button className="button button-primary load-module-button" onClick={handleLoadModule} disabled={isLoadingModule || !selectedTestType || !selectedSection || !selectedSubTopic}>
          {isLoadingModule ? 'Loading Module...' : 'Load Learning Module'}
        </button>
      </div>

      {isLoadingModule && <p className="loading-message">Generating your learning module, please wait...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {learningModule && !isLoadingModule && !error && (
        <div className="learning-module card">
          <h2 className="card-title module-title">{learningModule.title}</h2>
          
          <section className="module-section introduction-section">
            <h3>Introduction</h3>
            <p>{learningModule.introduction}</p>
          </section>

          <section className="module-section key-concepts-section">
            <h3>Key Concepts</h3>
            {learningModule.key_concepts.map((concept, index) => (
              <div key={index} className="key-concept">
                <h4>{index + 1}. {concept.concept_name}</h4>
                <p className="concept-explanation"><strong>Explanation:</strong> {concept.explanation}</p>
                <p className="concept-example"><strong>Example:</strong> {concept.example}</p>
              </div>
            ))}
          </section>

          <section className="module-section practice-questions-section">
            <h3>Practice Questions</h3>
            {learningModule.practice_questions.map((pq, index) => (
              <div key={index} className="practice-question-item">
                <p className="pq-text"><strong>Question {index + 1}:</strong> {pq.question_text}</p>
                <div className="options-list pq-options">
                  {pq.options.map((option, optIndex) => (
                    <button 
                      key={optIndex}
                      className={`button option-button pq-option 
                                  ${userPracticeAnswers[index]?.selected === option ? 'selected' : ''}
                                  ${(userPracticeAnswers[index]?.revealed && userPracticeAnswers[index]?.selected === option && userPracticeAnswers[index]?.correct) ? 'correct' : ''}
                                  ${(userPracticeAnswers[index]?.revealed && userPracticeAnswers[index]?.selected === option && !userPracticeAnswers[index]?.correct) ? 'incorrect' : ''}
                                  ${(userPracticeAnswers[index]?.revealed && option === pq.correct_answer && userPracticeAnswers[index]?.selected !== option) ? 'correct-unselected' : ''}
                                `}
                      onClick={() => handlePracticeOptionSelect(index, option)}
                      disabled={userPracticeAnswers[index]?.revealed}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {!userPracticeAnswers[index]?.revealed && (
                  <button className="button button-sm button-outline-primary check-answer-button" onClick={() => handleCheckPracticeAnswer(index)} disabled={!userPracticeAnswers[index]?.selected}>
                    Check Answer
                  </button>
                )}
                {userPracticeAnswers[index]?.revealed && (
                  <div className="explanation-area pq-explanation">
                    <p><strong>Your Answer:</strong> {userPracticeAnswers[index].selected} ({userPracticeAnswers[index].correct ? "Correct" : "Incorrect"})</p>
                    <p><strong>Correct Answer:</strong> {pq.correct_answer}</p>
                    <p><strong>Explanation:</strong> {pq.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="module-section summary-section">
            <h3>Summary</h3>
            <p>{learningModule.summary}</p> {/* Assuming summary is a paragraph, or map if array of bullets */}
          </section>
        </div>
      )}
    </div>
  );
};

export default AILearnPage;
