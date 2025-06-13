import React, { useState, useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css'; // Ensure KaTeX CSS is imported
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import './QuizPlayer.css'; // To be created

// Combined Markdown and LaTeX Renderer Component (can be moved to a shared utils file if used elsewhere)
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


// Default props can be defined here or in the consuming component
const QuizPlayer = ({
  quizTitle = "Quiz",
  questionApiEndpoint = '/api/generate-questions',
  apiParams = { topic: "General", subTopic: "Mixed", numQuestions: 5 }, // Default API params
  showImmediateFeedback = true, // True for practice, false for test
  onQuizComplete = (results) => console.log("Quiz Complete:", results),
  confettiOnComplete = true,
  pageSpecificClassName = "quiz-player-page-container", // Generic default
  isStandaloneQuestion = false,
  initialQuestion = null,
  showOptionPrefixes = true,
  // isSatAdaptiveModule1 prop is removed, QuizPlayer now manages SAT adaptive flow internally via isAdaptiveSat
  onAnswerSelect = null,

  // New props for SAT adaptive mode:
  isAdaptiveSat = false, // If true, enables SAT adaptive mode
  satSectionType = null, // E.g., "Math", "ReadingAndWriting" - for context
  questionsPerModule = null, // E.g., { module1: 22, module2: 22 }
  baseApiParams = {}, // Base params (testType, topic, subTopic) from parent for fetching questions

  // navigateToOnExit = "/dashboard"
}) => {
  const navigate = useNavigate();

  // Initialize questions state based on mode
  const [questions, setQuestions] = useState(isStandaloneQuestion && initialQuestion ? [initialQuestion] : []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Always 0 for standalone
  // userAnswers stores { [qIndex]: { selectedOption: "Option A", correct?: true/false } }
  const [userAnswers, setUserAnswers] = useState({});
  const [currentScore, setCurrentScore] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  // Internal SAT Adaptive State
  const [currentSatInternalModule, setCurrentSatInternalModule] = useState(1);
  const [module1PerformanceBand, setModule1PerformanceBand] = useState(null);
  const [questionsAnsweredInCurrentModule, setQuestionsAnsweredInCurrentModule] = useState(0);
  const [isTransitioningModules, setIsTransitioningModules] = useState(false);
  const [module1ScoreForDisplay, setModule1ScoreForDisplay] = useState(null); // To store M1 score for results screen

  const timerIntervalRef = useRef(null);

  // Centralized function to fetch questions
  const fetchQuestionsForModule = async (moduleParams) => {
    setIsLoading(true);
    setError(null);
    // setQuestions([]); // Clear questions immediately before fetch if preferred

    try {
      const response = await fetch(questionApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleParams),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
      if (data.error || !Array.isArray(data) || data.length === 0) {
        setError(data.message || data.error || 'AI generated no questions for this module.');
        setQuestions([]); // Ensure questions are empty on error
        return;
      }
      setQuestions(data);
      if (!isStandaloneQuestion && (!isAdaptiveSat || currentSatInternalModule === 1)) { // Start timer only for M1 or non-adaptive
        setSessionStartTime(Date.now());
      }
    } catch (err) {
      setError(err.message || 'An unknown error occurred while fetching questions.');
      console.error("QuizPlayer fetch error:", err);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStandaloneQuestion && initialQuestion) {
      setQuestions([initialQuestion]);
      setCurrentQuestionIndex(0);
      setIsLoading(false);
      if (initialQuestion.selectedOption && initialQuestion.isCorrect !== undefined) {
        setUserAnswers({ 0: { selectedOption: initialQuestion.selectedOption, correct: initialQuestion.isCorrect } });
      }
    } else if (!isStandaloneQuestion) {
      // Initial setup for a quiz session (adaptive or non-adaptive)
      setCurrentSatInternalModule(1);
      setModule1PerformanceBand(null);
      setQuestionsAnsweredInCurrentModule(0);
      setIsTransitioningModules(false);
      setUserAnswers({});
      setCurrentScore(0); // Reset score for the current module being started/restarted
      setTimeElapsed(0); // Reset timer
      setShowResults(false);
      setIsReviewMode(false);

      let initialApiParams;
      if (isAdaptiveSat) {
        initialApiParams = {
          ...baseApiParams, // from props, e.g. { testType: "SAT", topic: "Math" }
          module: 1,
          numQuestions: questionsPerModule.module1,
          totalQuestionsInModule: questionsPerModule.module1,
        };
      } else {
        initialApiParams = { ...baseApiParams, numQuestions: apiParams.numQuestions }; // Use original apiParams for non-adaptive
      }
      fetchQuestionsForModule(initialApiParams);
    }
  }, [apiParams, isStandaloneQuestion, initialQuestion, quizTitle, isAdaptiveSat]); // quizTitle change might signify new quiz instance

  useEffect(() => {
    if (sessionStartTime && !showResults && !isStandaloneQuestion && !isTransitioningModules) {
      timerIntervalRef.current = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [sessionStartTime, showResults]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  // This replaces handleStartQuiz for initial load, now handled by useEffect.
  // This function is now only for starting module 2.
  const startModule2 = async () => {
    if (!isAdaptiveSat || currentSatInternalModule !== 2 || !module1PerformanceBand) return;

    setIsTransitioningModules(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({}); // Reset answers for Module 2
    setCurrentScore(0);   // Reset score for Module 2
    // Timer for M2 can be handled by resetting sessionStartTime or a new M2-specific timer state if needed.
    // For simplicity, let's assume timer continues or resets based on sessionStartTime logic.
    // setSessionStartTime(Date.now()); // If timer should reset for M2

    const paramsForModule2 = {
      ...baseApiParams, // from props
      module: 2,
      module1Performance: module1PerformanceBand,
      numQuestions: questionsPerModule.module2,
      totalQuestionsInModule: questionsPerModule.module2,
    };
    fetchQuestionsForModule(paramsForModule2);
  };

  const handleOptionSelect = (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionId = currentQuestion.question_id || currentQuestionIndex; // Prefer question_id, fallback to index

    if (isStandaloneQuestion) {
      // In standalone mode, primarily used by AITutorPage for guided practice.
      // Allow selection, store it locally for visual feedback, and notify parent.
      // No scoring or immediate feedback logic within QuizPlayer for this mode.
      setUserAnswers(prevAnswers => ({
        ...prevAnswers,
        [currentQuestionIndex]: { selectedOption: option },
      }));
      if (onAnswerSelect) {
        onAnswerSelect(option, questionId);
      }
      return;
    }

    // Full Quiz Mode Logic:
    if (showImmediateFeedback) {
      // If immediate feedback is shown, don't allow changing answer once made
      // (if correct status is already set, it means it was answered)
      if (userAnswers[currentQuestionIndex]?.correct !== undefined) {
         return;
      }
      const isCorrect = option === currentQuestion.correct_answer;
      let newScore = currentScore;
      if (isCorrect) {
        newScore += 1;
      }
      setCurrentScore(newScore);
      setUserAnswers(prevAnswers => ({
        ...prevAnswers,
        [currentQuestionIndex]: { selectedOption: option, correct: isCorrect },
      }));
      if (onAnswerSelect) { // Also notify parent in full quiz mode if callback provided
        onAnswerSelect(option, questionId);
      }
    } else {
      // Test mode (showImmediateFeedback is false): allow changing selection
      // Score is not updated here. It will be calculated at the end of the quiz.
      setUserAnswers(prevAnswers => ({
        ...prevAnswers,
        [currentQuestionIndex]: { selectedOption: option }, // Only store selected option
      }));
      if (onAnswerSelect) {
        onAnswerSelect(option, questionId);
      }
    }
  };

  const calculatePerformance = () => {
    let correctCount = 0;
    const totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
      const question = questions[i];
      const answer = userAnswers[i];
      if (answer && answer.selectedOption === question.correct_answer) {
        correctCount++;
      }
    }

    const score = correctCount;
    let performanceBand = null;

    // Calculate performance band ONLY if it's SAT Module 1
    if (isAdaptiveSat && currentSatInternalModule === 1) {
      const percentage = totalQuestions > 0 ? (score / totalQuestions) : 0;
      if (percentage < 0.4) {
        performanceBand = "low";
      } else if (percentage <= 0.7) {
        performanceBand = "medium";
      } else {
        performanceBand = "high";
      }
    }
    return { score, totalQuestions, performanceBand };
  };

  const handleNextQuestion = () => {
    if (isStandaloneQuestion) return;

    setQuestionsAnsweredInCurrentModule(prev => prev + 1);
    const nextQIndex = currentQuestionIndex + 1;

    if (isAdaptiveSat) {
      if (currentSatInternalModule === 1 && (questionsAnsweredInCurrentModule + 1) >= questionsPerModule.module1) {
        const resultsM1 = calculatePerformance(); // Score for Module 1
        setModule1PerformanceBand(resultsM1.performanceBand);
        setModule1ScoreForDisplay(resultsM1.score); // Store M1 score for display
        setCurrentSatInternalModule(2);
        setQuestionsAnsweredInCurrentModule(0); // Reset for M2
        setCurrentQuestionIndex(0); // Reset for M2
        setUserAnswers({}); // Clear answers for M2
        setIsTransitioningModules(true);
        // Don't fetch next question yet; user clicks "Proceed to Module 2"
        return;
      }
      if (currentSatInternalModule === 2 && (questionsAnsweredInCurrentModule + 1) >= questionsPerModule.module2) {
        const resultsM2 = calculatePerformance(); // Score for Module 2
        setCurrentScore(resultsM2.score); // This is M2 score
        setShowResults(true);
        if (onQuizComplete) {
          onQuizComplete({
            isAdaptiveSatSession: true, // Add this flag
            module1PerformanceBand: module1PerformanceBand,
            module1Score: module1ScoreForDisplay,
            totalQuestionsM1: questionsPerModule.module1,
            module2Score: resultsM2.score,
            totalQuestionsM2: questionsPerModule.module2,
            timeElapsed: timeElapsed,
          });
        }
        return;
      }
    }

    // Standard quiz progression or moving to next question in current module
    if (nextQIndex < questions.length) {
      setCurrentQuestionIndex(nextQIndex);
    } else { // End of a non-adaptive quiz, or an unexpected end
      setSessionStartTime(null);
      const finalResults = calculatePerformance(); // Should be for the current set of questions
      setCurrentScore(finalResults.score);
      setShowResults(true);
      if (onQuizComplete) {
        onQuizComplete({
          isAdaptiveSatSession: false, // Explicitly false for non-adaptive
          score: finalResults.score,
          totalQuestions: finalResults.totalQuestions,
          timeElapsed: timeElapsed,
          performanceBand: finalResults.performanceBand, // Will be null if not SAT M1
        });
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  // This function might be called by a "Try Again" or "Start New Quiz" button passed from parent
  // or handled by parent re-rendering QuizPlayer with new/same props.
  // For now, QuizPlayer auto-starts. Parent can unmount/remount to restart.

  // --- Render Logic ---
  if (isLoading && !isStandaloneQuestion && !isTransitioningModules) {
    return <div className={`page-container ${pageSpecificClassName}`}><p className="loading-message">Loading quiz...</p></div>;
  }
  if (error && !isStandaloneQuestion && !isTransitioningModules) {
    return (
      <div className={`page-container ${pageSpecificClassName} error-container`}>
        <p className="error-message">Error: {error}</p>
        <button onClick={() => navigate(-1)} className="button button-primary">Go Back</button>
      </div>
    );
  }

  if (isTransitioningModules && isAdaptiveSat) {
    return (
      <div className={`page-container ${pageSpecificClassName} transition-screen`}>
        <h2 className="card-title">Module 1 Complete</h2>
        <p>Your performance in Module 1: <strong>{module1PerformanceBand?.toUpperCase()}</strong></p>
        <p>The difficulty of Module 2 will be adjusted based on this performance.</p>
        <button onClick={startModule2} className="button button-primary button-lg">
          Proceed to Module 2
        </button>
      </div>
    );
  }

  if (showResults && !isStandaloneQuestion) {
    let scoreForDisplay = currentScore; // This is M2 score if adaptive, or total if not
    let totalQuestionsForDisplay = questions.length; // M2 length if adaptive, or total if not
    let resultMessage = `You got ${scoreForDisplay} out of ${totalQuestionsForDisplay} correct`;

    if(isAdaptiveSat && module1ScoreForDisplay !== null) {
      const overallCorrect = module1ScoreForDisplay + scoreForDisplay;
      const overallTotal = questionsPerModule.module1 + questionsPerModule.module2;
      const overallPercentage = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0;
      resultMessage = `Module 1: ${module1ScoreForDisplay}/${questionsPerModule.module1} (Performance: ${module1PerformanceBand?.toUpperCase()}).
                       Module 2: ${scoreForDisplay}/${questionsPerModule.module2}.
                       Overall: ${overallCorrect}/${overallTotal} (${overallPercentage}%)`;
    } else if (questions.length > 0) {
        const percentage = Math.round((scoreForDisplay / totalQuestionsForDisplay) * 100);
        resultMessage += ` (${percentage}%)`;
    }

    return (
      <div className={`page-container ${pageSpecificClassName} results-screen`}>
        {confettiOnComplete && <Confetti recycle={false} numberOfPieces={300} width={window.innerWidth} height={window.innerHeight} />}
        <h1 className="page-title">{quizTitle} Complete!</h1>
        <p className="results-score" style={{whiteSpace: 'pre-line'}}>{resultMessage}</p>
        <p className="results-time">Total time: {formatTime(timeElapsed)}</p>
        <div className="results-actions">
          {/* Review mode needs to be adapted for two modules if isAdaptiveSat */}
          {questions.length > 0 && (
            <button
              onClick={() => {
                setIsReviewMode(true);
                // For now, review mode shows current 'questions' (i.e. Module 2 if adaptive)
                // A more complex review would allow switching between M1 and M2 questions.
                setReviewQuestionIndex(0);
              }}
              className="button button-info"
            >
              Review Answers {isAdaptiveSat ? "(Module 2)" : ""}
            </button>
          )}
          <button onClick={() => navigate("/dashboard")} className="button button-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isReviewMode && !isStandaloneQuestion && questions.length > 0) {
    const reviewQ = questions[reviewQuestionIndex];
    const userAnswerForReview = userAnswers[reviewQuestionIndex]; // Now { selectedOption, correct? }
    const reviewOptionPrefix = (idx) => showOptionPrefixes ? String.fromCharCode(65 + idx) + "." : "";

    return (
      <div className={`page-container ${pageSpecificClassName} review-mode-area card`}>
        <h2 className="card-title">Reviewing Question {reviewQuestionIndex + 1} of {questions.length}</h2>
        <div className="quiz-question-area">
          <div className="question-stem-container">
            <p>{reviewQ.question_text}</p>
            {reviewQ.visual_assets && reviewQ.visual_assets.type === 'latex' && (
              <div className="visual-asset latex-asset"><BlockMath math={reviewQ.visual_assets.data} /></div>
            )}
            {reviewQ.visual_assets && reviewQ.visual_assets.type === 'svg' && (
              <div className="visual-asset svg-asset" dangerouslySetInnerHTML={{ __html: reviewQ.visual_assets.data }} />
            )}
          </div>
          <div className="quiz-options-container is-review-mode answers-revealed"> {/* Ensure answers-revealed for review */}
            {reviewQ.options.map((option, idx) => {
              const isActualCorrect = option === reviewQ.correct_answer;
              // userAnswerForReview.correct might not exist if showImmediateFeedback was false during quiz
              // For review, we need to determine correctness now if not already stored.
              const isSelectedByPlayer = userAnswerForReview && option === userAnswerForReview.selectedOption;
              const playerWasCorrect = isSelectedByPlayer && (userAnswerForReview.correct !== undefined ? userAnswerForReview.correct : isActualCorrect);

              let buttonClass = 'button quiz-option-button';
              if (isActualCorrect) buttonClass += ' is-revealed-correct';
              if (isSelectedByPlayer) {
                buttonClass += ' is-selected';
                if (!playerWasCorrect) buttonClass += ' is-revealed-incorrect';
                // If playerWasCorrect, is-revealed-correct already handles the visual
              }
              return (
                <button key={option} className={buttonClass} disabled>
                  {showOptionPrefixes && <span className="option-prefix">{reviewOptionPrefix(idx)}</span>}
                  <span className="option-text">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="explanation-area review-explanation">
          <h4>Explanation:</h4>
          <MarkdownWithLaTeX content={reviewQ.explanation} />
        </div>
        <div className="navigation-buttons">
          <button onClick={() => setReviewQuestionIndex(i => i - 1)} disabled={reviewQuestionIndex === 0} className="button button-secondary">Previous</button>
          <button onClick={() => setReviewQuestionIndex(i => i + 1)} disabled={reviewQuestionIndex === questions.length - 1} className="button button-primary">Next</button>
        </div>
        <button onClick={() => setIsReviewMode(false)} className="button button-info button-block">Exit Review</button>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
     if (isStandaloneQuestion && isLoading) { // Specific loading for standalone if initialQuestion is fetched async by parent
        return <div className={`page-container ${pageSpecificClassName}`}><p className="loading-message">Loading question...</p></div>;
     }
    return <div className={`page-container ${pageSpecificClassName}`}><p className="alert alert-info">No questions available.</p></div>;
  }

  // Logic for both full quiz mode and standalone question display
  const currentQuestion = questions[currentQuestionIndex];
  const currentAttempt = userAnswers[currentQuestionIndex]; // currentAttempt is { selectedOption, correct? }
  const optionPrefix = (idx) => showOptionPrefixes ? String.fromCharCode(65 + idx) + "." : "";

  let optionsContainerClasses = "quiz-options-container";
  if (isStandaloneQuestion) {
    // For standalone, we might want to show it as if it's in review mode, or just plain.
    // If initialQuestion contains selectedOption and correct answer, it can be styled.
    // For now, let's assume it's for display, potentially highlighting a correct answer if provided.
    optionsContainerClasses += " is-review-mode answers-revealed";
  } else if (showImmediateFeedback && currentAttempt) {
    optionsContainerClasses += " answers-revealed";
  }
  // No special class for showImmediateFeedback=false before attempt, options are just default.

  return (
    <div className={`page-container ${pageSpecificClassName} ${isStandaloneQuestion ? 'standalone-question-view' : 'quiz-mode-view'}`}>
      {!isStandaloneQuestion && (
        <div className="session-info card">
          <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
          <p className="timer">Time: {formatTime(timeElapsed)}</p>
        </div>
      )}

      <div className="quiz-question-area">
        <div className="question-stem-container">
          <p>{currentQuestion.question_text}</p>
          {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'latex' && (
            <div className="visual-asset latex-asset"><BlockMath math={currentQuestion.visual_assets.data} /></div>
          )}
          {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'svg' && (
            <div className="visual-asset svg-asset" dangerouslySetInnerHTML={{ __html: currentQuestion.visual_assets.data }} />
          )}
        </div>

        <div className={optionsContainerClasses}>
          {currentQuestion.options.map((option, idx) => {
            let buttonClass = 'button quiz-option-button';
            const isActualCorrect = option === currentQuestion.correct_answer;

            if (isStandaloneQuestion) {
              // If initialQuestion has info on what was selected or what is correct, use it
              const initialAttempt = userAnswers[0] || {}; // Standalone always uses index 0
              if (initialAttempt.selectedOption === option) {
                buttonClass += ' is-selected';
                if (initialAttempt.correct === true) buttonClass += ' is-revealed-correct';
                else if (initialAttempt.correct === false) buttonClass += ' is-revealed-incorrect';
              } else if (isActualCorrect && (initialQuestion.showCorrect || initialAttempt.selectedOption)) {
                // Show correct if specified, or if user made a selection (implying answers revealed)
                 buttonClass += ' is-revealed-correct';
              }
            } else { // Full quiz interactive mode
              if (currentAttempt) { // An answer has been made for this question
                const isSelectedByPlayer = option === currentAttempt.selectedOption;
                if (showImmediateFeedback) {
                  if (isSelectedByPlayer) {
                    buttonClass += ' is-selected';
                    buttonClass += currentAttempt.correct ? ' is-revealed-correct' : ' is-revealed-incorrect';
                  } else if (isActualCorrect) {
                    buttonClass += ' is-revealed-correct';
                  }
                } else { // Test mode (showImmediateFeedback is false)
                  if (isSelectedByPlayer) {
                    buttonClass += ' is-selected-pending'; // Neutral selection indicator
                  }
                }
              }
              // No 'else' needed here: if no attempt, buttons are default styled.
            }

            return (
              <button
                key={option}
                className={buttonClass}
                onClick={() => handleOptionSelect(option)}
                disabled={isStandaloneQuestion || (showImmediateFeedback && !!currentAttempt)}
              >
                {showOptionPrefixes && <span className="option-prefix">{optionPrefix(idx)}</span>}
                <span className="option-text">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showImmediateFeedback && currentAttempt && !isStandaloneQuestion && (
        <div className="explanation-area">
          <h4>Explanation:</h4>
          <MarkdownWithLaTeX content={currentQuestion.explanation} />
        </div>
      )}

      {!isStandaloneQuestion && (
        <div className="navigation-buttons">
          <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || !!userAnswers[currentQuestionIndex-1] && !showImmediateFeedback} className="button button-secondary">Previous</button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={handleNextQuestion} disabled={!currentAttempt} className="button button-success">Finish</button>
          ) : (
            <button onClick={handleNextQuestion} disabled={!currentAttempt} className="button button-primary">Next</button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;
