import React, { useState, useEffect } from 'react';
import './AILearnPage.css'; // To be created

const AILearnPage = () => {
  const [selectedTestType, setSelectedTestType] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState('');

  const [learningModule, setLearningModule] = useState(null);
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  const [error, setError] = useState(null);
  
  // { qIndex: { selected: 'option', revealed: false, correct: false/true } }
  const [userPracticeAnswers, setUserPracticeAnswers] = useState({});

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

  const handleLoadModule = async () => {
    if (!selectedTestType || !selectedSection || !selectedSubTopic) {
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
