import React, { useState, useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import './QuizPlayer.css'; // To be created

// Default props can be defined here or in the consuming component
const QuizPlayer = ({
  quizTitle = "Quiz",
  questionApiEndpoint = '/api/generate-questions',
  apiParams = { topic: "General", subTopic: "Mixed", numQuestions: 5 }, // Default API params
  showImmediateFeedback = true, // True for practice, false for test
  onQuizComplete = (results) => console.log("Quiz Complete:", results),
  confettiOnComplete = true,
  pageSpecificClassName = "quiz-player-page-container", // Generic default
  isStandaloneQuestion = false, // New prop for single question display mode
  initialQuestion = null, // New prop for the question to display
  showOptionPrefixes = true, // Whether to show A, B, C, D
  // navigateToOnExit = "/dashboard"
}) => {
  const navigate = useNavigate();

  // Initialize questions state based on mode
  const [questions, setQuestions] = useState(isStandaloneQuestion && initialQuestion ? [initialQuestion] : []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Always 0 for standalone
  const [userAnswers, setUserAnswers] = useState({});
  const [currentScore, setCurrentScore] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (!isStandaloneQuestion) {
      // Start the quiz as soon as the component mounts with valid apiParams
      handleStartQuiz();
    } else if (initialQuestion) {
      // For standalone, if initialQuestion is provided, set it up
      setQuestions([initialQuestion]);
      setCurrentQuestionIndex(0);
      // Potentially set userAnswers if initialQuestion includes selection/correctness info for display
      if (initialQuestion.selectedOption && initialQuestion.isCorrect !== undefined) {
         setUserAnswers({ 0: { selected: initialQuestion.selectedOption, correct: initialQuestion.isCorrect } });
      } else if (initialQuestion.correct_answer && initialQuestion.options?.includes(initialQuestion.correct_answer)) {
        // If we want to show the correct answer by default in standalone display mode
        // setUserAnswers({ 0: { selected: initialQuestion.correct_answer, correct: true } });
      }
      setIsLoading(false); // Not loading from API in this mode
    }
  }, [apiParams, isStandaloneQuestion, initialQuestion]);

  useEffect(() => {
    if (sessionStartTime && !showResults && !isStandaloneQuestion) { // Timer only for full quiz mode
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

  const handleStartQuiz = async () => {
    if (isStandaloneQuestion) return; // Don't fetch if displaying a single question

    if (!apiParams || apiParams.numQuestions <= 0) {
      setError("Invalid quiz parameters provided.");
      setIsLoading(false); // Ensure loading is stopped
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setCurrentScore(0);
    setShowResults(false);
    setIsReviewMode(false);
    setCurrentQuestionIndex(0);
    setTimeElapsed(0);

    try {
      const response = await fetch(questionApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiParams),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `HTTP error! Status: ${response.status}`);
      if (!data || (Array.isArray(data) && data.length === 0) || data.error) {
        setError(data.message || 'AI generated no questions for this selection.');
        return;
      }
      setQuestions(data);
      setSessionStartTime(Date.now());
    } catch (err) {
      setError(err.message || 'An unknown error occurred while fetching questions.');
      console.error("QuizPlayer fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option) => {
    if (isStandaloneQuestion) return; // No interaction in standalone display mode

    const currentQuestion = questions[currentQuestionIndex];
    // Allow re-selection only if immediate feedback is not shown (test mode before submission)
    // For this version, if an answer exists for the current question, don't allow change.
    if (userAnswers[currentQuestionIndex]) return;

    const isCorrect = option === currentQuestion.correct_answer;

    let newScore = currentScore;
    if (isCorrect && (!userAnswers[currentQuestionIndex] || !userAnswers[currentQuestionIndex].isCorrect)) { // only add score if not previously answered correctly
        newScore +=1;
    } else if (!isCorrect && userAnswers[currentQuestionIndex]?.isCorrect) { // if changing from correct to incorrect
        newScore -=1;
    }
    setCurrentScore(newScore);

    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [currentQuestionIndex]: { selected: option, correct: isCorrect },
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setSessionStartTime(null); // Stop timer
      setShowResults(true);
      if (onQuizComplete) {
        onQuizComplete({
          score: currentScore,
          totalQuestions: questions.length,
          timeElapsed: timeElapsed // final timeElapsed value
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
  if (isLoading && !isStandaloneQuestion) { // Only show full page loader for actual quiz loading
    return <div className={`page-container ${pageSpecificClassName}`}><p className="loading-message">Loading quiz...</p></div>;
  }
  if (error && !isStandaloneQuestion) { // Only show full page error for actual quiz loading errors
    return (
      <div className={`page-container ${pageSpecificClassName} error-container`}>
        <p className="error-message">Error: {error}</p>
        <button onClick={() => navigate(-1)} className="button button-primary">Go Back</button>
      </div>
    );
  }

  if (showResults && !isStandaloneQuestion) {
    const percentage = questions.length > 0 ? Math.round((currentScore / questions.length) * 100) : 0;
    return (
      <div className={`page-container ${pageSpecificClassName} results-screen`}>
        {confettiOnComplete && <Confetti recycle={false} numberOfPieces={300} width={window.innerWidth} height={window.innerHeight} />}
        <h1 className="page-title">{quizTitle} Complete!</h1>
        <p className="results-score">You got {currentScore} out of {questions.length} correct ({percentage}%)</p>
        <p className="results-time">Total time: {formatTime(timeElapsed)}</p>
        <div className="results-actions">
          {questions.length > 0 && (
            <button onClick={() => { setIsReviewMode(true); setReviewQuestionIndex(0); }} className="button button-info">Review Answers</button>
          )}
          <button onClick={() => navigate("/dashboard")} className="button button-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isReviewMode && !isStandaloneQuestion && questions.length > 0) {
    const reviewQ = questions[reviewQuestionIndex];
    const userAnswerForReview = userAnswers[reviewQuestionIndex];
    // Determine option prefix for review mode
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
          <div className="quiz-options-container is-review-mode">
            {reviewQ.options.map((option, idx) => {
              const isActualCorrect = option === reviewQ.correct_answer;
              const isSelectedByPlayer = userAnswerForReview && option === userAnswerForReview.selected;
              const wasPlayerCorrectIfSelected = isSelectedByPlayer && userAnswerForReview.correct;

              let buttonClass = 'button quiz-option-button';
              if (isActualCorrect) buttonClass += ' is-revealed-correct';
              if (isSelectedByPlayer) {
                buttonClass += ' is-selected';
                if (!wasPlayerCorrectIfSelected) buttonClass += ' is-revealed-incorrect';
              }
              return (
                <button key={option} className={buttonClass} disabled>
                  {showOptionPrefixes && <span className="option-prefix">{reviewOptionPrefix(idx)}</span>}
                  <span className="option-text">{option}</span>
                  {/* Feedback icons can be part of the text or separate elements if needed */}
                </button>
              );
            })}
          </div>
        </div>
        <div className="explanation-area review-explanation">
          <h4>Explanation:</h4>
          <p>{reviewQ.explanation}</p>
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
  const attemptedAnswer = userAnswers[currentQuestionIndex];
  const optionPrefix = (idx) => showOptionPrefixes ? String.fromCharCode(65 + idx) + "." : "";


  // Standalone question display mode adjustments
  let optionsContainerClasses = "quiz-options-container";
  if (isStandaloneQuestion) {
    optionsContainerClasses += " is-review-mode answers-revealed"; // Treat as if answers are revealed, disable interaction
  } else if (showImmediateFeedback && attemptedAnswer) {
    optionsContainerClasses += " answers-revealed";
  }


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
                // For standalone, highlight correct if provided, and selected if provided
                if (initialQuestion?.correct_answer === option) buttonClass += ' is-revealed-correct';
                if (initialQuestion?.selectedOption === option) {
                    buttonClass += ' is-selected';
                    if (initialQuestion?.isCorrect === false) buttonClass += ' is-revealed-incorrect';
                    // if true, is-revealed-correct already handles it
                }
            } else if (attemptedAnswer) { // Full quiz mode with an attempt
              const isSelectedByPlayer = option === attemptedAnswer.selected;
              if (showImmediateFeedback) {
                if (isSelectedByPlayer) {
                  buttonClass += ' is-selected';
                  buttonClass += attemptedAnswer.correct ? ' is-revealed-correct' : ' is-revealed-incorrect';
                } else if (isActualCorrect) {
                  buttonClass += ' is-revealed-correct'; // Show correct answer if user was wrong
                }
              } else { // Test mode - no immediate feedback, only show selection
                if (isSelectedByPlayer) buttonClass += ' is-selected-pending';
              }
            }
            // No 'else if (!attemptedAnswer && userAnswers[currentQuestionIndex]?.selected === option)'
            // because that state is covered by `is-selected-pending` if `!showImmediateFeedback`
            // or by immediate feedback if `showImmediateFeedback`

            return (
              <button
                key={option}
                className={buttonClass}
                onClick={() => handleOptionSelect(option)}
                disabled={isStandaloneQuestion || (showImmediateFeedback && !!attemptedAnswer)}
              >
                {showOptionPrefixes && <span className="option-prefix">{optionPrefix(idx)}</span>}
                <span className="option-text">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showImmediateFeedback && attemptedAnswer && !isStandaloneQuestion && (
        <div className="explanation-area">
          <h4>Explanation:</h4>
          <p>{currentQuestion.explanation}</p>
        </div>
      )}

      {!isStandaloneQuestion && (
        <div className="navigation-buttons">
          <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} className="button button-secondary">Previous</button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-success">Finish</button>
          ) : (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-primary">Next</button>
          )}
        </div>
      )}
      {/* Stop Quiz button could be added by parent or here if needed */}
    </div>
  );
};

export default QuizPlayer;
