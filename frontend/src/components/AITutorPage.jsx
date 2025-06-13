import React, { useState } from 'react';
import { tutorTopics } from '../constants/tutorTopics';
import QuizPlayer from './QuizPlayer'; // Import QuizPlayer
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import './AITutorPage.css';

// Combined Markdown and LaTeX Renderer Component (can be moved to a shared utils file)
const MarkdownWithLaTeX = ({ content }) => {
  if (!content) return null;

  const components = {
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (inline) {
        return <code className={className} {...props}>{children}</code>;
      }
      if (match && match[1] === 'latex') {
        return <BlockMath math={String(children).replace(/\n$/, '')} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
    p: ({ node, ...props }) => <p>{renderTextNodesWithLaTeX(props.children)}</p>,
    li: ({ node, ...props }) => <li>{renderTextNodesWithLaTeX(props.children)}</li>,
    h1: ({ node, ...props }) => <h1>{renderTextNodesWithLaTeX(props.children)}</h1>,
    h2: ({ node, ...props }) => <h2>{renderTextNodesWithLaTeX(props.children)}</h2>,
    h3: ({ node, ...props }) => <h3>{renderTextNodesWithLaTeX(props.children)}</h3>,
    h4: ({ node, ...props }) => <h4>{renderTextNodesWithLaTeX(props.children)}</h4>,
    td: ({ node, ...props }) => <td>{renderTextNodesWithLaTeX(props.children)}</td>,
    th: ({ node, ...props }) => <th>{renderTextNodesWithLaTeX(props.children)}</th>,
  };

  const renderTextNodesWithLaTeX = (children) => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        const parts = child.split(/(\$\$[^$]+\$\$|\$[^\$]+\$)/g);
        return parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return <BlockMath key={index} math={part.substring(2, part.length - 2)} />;
          } else if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={index} math={part.substring(1, part.length - 1)} />;
          }
          return part;
        });
      }
      return child;
    });
  };

  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>;
};


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
  // const [showPerformanceButtons, setShowPerformanceButtons] = useState(false); // Removed

  // New states for M1 answers and questions
  const [module1Answers, setModule1Answers] = useState({}); // { [questionId]: selectedOption }
  const [module1Questions, setModule1Questions] = useState([]); // Array of full question objects for M1


  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // General page error

  const NON_ADAPTIVE_SESSION_LENGTH = 5; // Define session length for non-SAT modes

  const resetAdaptiveStates = () => {
    setIsAdaptiveSatMode(false);
    setCurrentSatModule(1);
    setModule1Performance(null);
    setQuestionsAnsweredInModule(0);
    // setShowPerformanceButtons(false); // Removed
    setModule1Answers({});
    setModule1Questions([]);
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

    // If this is the very first call (not a "Next Question" or transitioning to M2 based on actual performance)
    if (!guidedPracticeData.isActive && !module1Performance) { // module1Performance is null when starting M1
      qAnsweredInModule = 0;
      setQuestionsAnsweredInModule(0);
      setModule1Answers({}); // Reset M1 answers
      setModule1Questions([]); // Reset M1 questions

      if (currentTestType === "SAT" && (currentMainCategory === "Math" || currentMainCategory === "Reading" || currentMainCategory === "Writing & Language")) {
        setIsAdaptiveSatMode(true);
        localIsAdaptiveMode = true;
        setCurrentSatModule(1);
        nextModule = 1;
        // module1Performance is already null, nextPerf will be null for M1
        // Set questionsPerModule based on category (example)
        if (currentMainCategory === "Math") {
          localQuestionsPerModule = { module1: 22, module2: 22 };
        } else { // Reading or Writing
          localQuestionsPerModule = { module1: 27, module2: 27 };
        }
        setQuestionsPerModule(localQuestionsPerModule);
      } else {
        setIsAdaptiveSatMode(false);
        localIsAdaptiveMode = false;
      }
    } else if (guidedPracticeData.isActive && !simulatedPerformance) { // This is a "Next Question" click within the current module
      qAnsweredInModule = questionsAnsweredInModule; // Current number answered before this new one
    }
    // If simulatedPerformance is passed, it's handled by finalizeModule1AndProceed which then calls this function.
    // Or, if we are proceeding to Module 2 based on calculated performance, module1Performance state is already set.
    // In that case, nextPerf will be module1Performance, nextModule will be 2, and qAnsweredInModule is reset by finalize.

    // Check for session/module completion BEFORE fetching new question
    if (localIsAdaptiveMode) {
      if (currentSatModule === 1 && qAnsweredInModule >= localQuestionsPerModule.module1) {
        finalizeModule1AndProceed(); // Calculate M1 performance and transition
        return; // finalizeModule1AndProceed will call fetchGuidedQuestion for M2
      }
      if (currentSatModule === 2 && qAnsweredInModule >= localQuestionsPerModule.module2) {
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

      if (localIsAdaptiveMode && currentSatModule === 1) {
        setModule1Questions(prev => [...prev, questionObject]); // Store M1 question
      }
      setGuidedPracticeData(prev => ({ ...prev, question: questionObject, error: null }));
      setQuestionsAnsweredInModule(questionNumberStart); // Set to the number of the question just fetched
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

  const handleAnswerSelectForModule1 = (selectedOption, questionId) => {
    // Use question_id if available, otherwise question_text as a fallback key
    const key = questionId || module1Questions.find(q => q.options.includes(selectedOption))?.question_text;
    if (key) {
      setModule1Answers(prev => ({ ...prev, [key]: selectedOption }));
    }
  };

  const finalizeModule1AndProceed = () => {
    let correctCount = 0;
    module1Questions.forEach(q => {
      const questionId = q.question_id || q.question_text; // Match key used in handleAnswerSelectForModule1
      if (module1Answers[questionId] === q.correct_answer) {
        correctCount++;
      }
    });

    const totalM1Questions = module1Questions.length;
    let perfBand = "medium"; // Default
    if (totalM1Questions > 0) {
      const percentage = correctCount / totalM1Questions;
      if (percentage < 0.4) perfBand = "low";
      else if (percentage > 0.7) perfBand = "high";
    }

    console.log(`Module 1 Performance: ${correctCount}/${totalM1Questions} -> ${perfBand}`);

    // Set states to transition to Module 2
    setModule1Performance(perfBand);
    setCurrentSatModule(2);
    setQuestionsAnsweredInModule(0); // Reset for module 2
    setGuidedPracticeData(prev => ({ ...prev, question: null, guidance: null, error: null, isActive: true })); // Keep session active for M2

    // Clear M1 specific data
    setModule1Answers({});
    setModule1Questions([]);

    // Automatically fetch the first question of Module 2
    // fetchGuidedQuestion will use the new currentSatModule (2) and module1Performance state
    fetchGuidedQuestion();
  };


  const handleStopPractice = () => {
    setGuidedPracticeData({ question: null, guidance: null, isActive: false, error: null });
    setError(null);
    resetAdaptiveStates();
    setLearningContent(null);
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
                <div className="module-intro"><em><MarkdownWithLaTeX content={learningContent.introduction} /></em></div>

                <h4>Key Concepts:</h4>
                {learningContent.key_concepts?.map((concept, index) => (
                  <div key={index} className="learning-module-item key-concept-item">
                    <p><strong>{index + 1}. {concept.concept_name}</strong></p>
                    <div><MarkdownWithLaTeX content={concept.explanation} /></div>
                    <div><em>Example: <MarkdownWithLaTeX content={concept.example} /></em></div>
                  </div>
                ))}

                {learningContent.practice_questions && learningContent.practice_questions.length > 0 && (
                    <>
                        <h4>Practice Questions from this Module:</h4>
                        {learningContent.practice_questions.map((pq, index) => (
                        <div key={index} className="learning-module-item practice-question-display">
                            <div><strong>Q{index + 1}: <MarkdownWithLaTeX content={pq.question_text} /></strong></div>
                             {/* Assuming options are simple text, if they can contain markdown/latex, apply MarkdownWithLaTeX too */}
                            <ul>{pq.options?.map((opt, i) => <li key={i}>{opt}</li>)}</ul>
                            <div><em>Correct Answer: <MarkdownWithLaTeX content={pq.correct_answer} /></em></div>
                            <div><em>Explanation: <MarkdownWithLaTeX content={pq.explanation} /></em></div>
                        </div>
                        ))}
                    </>
                )}

                <h4>Summary:</h4>
                <div><MarkdownWithLaTeX content={learningContent.summary} /></div>
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
              onClick={() => fetchGuidedQuestion()}
              className="button button-success action-button"
              disabled={
                !selectedTopicDetails?.supportsGuidance ||
                isLoading ||
                // Removed showPerformanceButtons from here as it's handled by finalizeModule1AndProceed
                (guidedPracticeData.isActive && !guidedPracticeData.question && !guidedPracticeData.error && !isAdaptiveSatMode && questionsAnsweredInModule >= NON_ADAPTIVE_SESSION_LENGTH) || // Session ended (non-adaptive)
                (guidedPracticeData.isActive && !guidedPracticeData.question && !guidedPracticeData.error && isAdaptiveSatMode && currentSatModule === 2 && questionsAnsweredInModule >= questionsPerModule.module2) // Session ended (adaptive M2)
              }
            >
              {isLoading && guidedPracticeData.isActive ? 'Loading...' :
               !guidedPracticeData.isActive ? 'Start Guided Practice' :
               (isAdaptiveSatMode && currentSatModule === 1 && questionsAnsweredInModule < questionsPerModule.module1) ? `Next Question (M1: ${questionsAnsweredInModule}/${questionsPerModule.module1})` :
               (isAdaptiveSatMode && currentSatModule === 2 && questionsAnsweredInModule < questionsPerModule.module2) ? `Next Question (M2: ${questionsAnsweredInModule}/${questionsPerModule.module2})` :
               (!isAdaptiveSatMode && questionsAnsweredInModule < NON_ADAPTIVE_SESSION_LENGTH) ? `Next Question (${questionsAnsweredInModule}/${NON_ADAPTIVE_SESSION_LENGTH})` :
               'Start Guided Practice'
              }
            </button>

            {isAdaptiveSatMode && guidedPracticeData.isActive && (
                 <p className="adaptive-mode-info">
                    SAT Adaptive Mode: Module {currentSatModule} - Question {questionsAnsweredInModule > 0 ? questionsAnsweredInModule : '1'} of {currentSatModule === 1 ? questionsPerModule.module1 : questionsPerModule.module2}
                 </p>
            )}

            {/* Performance buttons removed - logic is now internal to finalizeModule1AndProceed */}

            {/* Loading message specific to this section */}
            {guidedPracticeData.isActive && isLoading && (
              <p className="loading-message">Loading guided practice...</p>
            )}
            {/* Error specific to this section */}
            {guidedPracticeData.error && (
              <p className="error-message">{guidedPracticeData.error}</p>
            )}

            {/* Content display area */}
            {guidedPracticeData.isActive && !isLoading && (guidedPracticeData.question || guidedPracticeData.guidance) && (
              <div className="content-display-box guided-practice-display">
                {guidedPracticeData.question && (
                  <QuizPlayer
                    isStandaloneQuestion={true}
                    initialQuestion={guidedPracticeData.question}
                    showOptionPrefixes={true}
                    onAnswerSelect={(selectedOption, questionId) => {
                      if (isAdaptiveSatMode && currentSatModule === 1) {
                        handleAnswerSelectForModule1(selectedOption, questionId);
                      }
                      // For non-adaptive or M2, selection is just for display, not stored for performance calc by AITutorPage
                    }}
                    // Pass showImmediateFeedback=false to QuizPlayer if it's SAT M1
                    // This allows QuizPlayer to handle selection state without revealing answers.
                    showImmediateFeedback={!(isAdaptiveSatMode && currentSatModule === 1)}
                    pageSpecificClassName="guided-practice-question-display"
                  />
                )}

                {guidedPracticeData.guidance && (
                  <>
                    <h5 style={{marginTop: 'var(--spacing-unit) * 2'}}>Step-by-Step Guidance:</h5>
                    <div className="guidance-text"> {/* Removed whiteSpace: 'pre-wrap' to let Markdown handle it */}
                      <MarkdownWithLaTeX content={guidedPracticeData.guidance} />
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
