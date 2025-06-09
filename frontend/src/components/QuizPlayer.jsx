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
  // navigateToOnExit = "/dashboard" // Could be a prop
}) => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
    // Start the quiz as soon as the component mounts with valid apiParams
    // This replaces the individual handleStartPractice/handleStartTest from the parent
    handleStartQuiz();
  }, [apiParams]); // Re-fetch if apiParams change (e.g. new quiz selected)

  useEffect(() => {
    if (sessionStartTime && !showResults) {
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
    if (!apiParams || apiParams.numQuestions <= 0) {
      setError("Invalid quiz parameters provided.");
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
    if (userAnswers[currentQuestionIndex] && showImmediateFeedback) return; // Already answered (for practice mode)
    if (userAnswers[currentQuestionIndex] && !showImmediateFeedback) return; // Already answered (for test mode - allow change until section submitted? No, typical tests lock in answer)


    const currentQuestion = questions[currentQuestionIndex];
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
  if (isLoading) {
    return <div className={`page-container ${pageSpecificClassName}`}><p className="loading-message">Loading quiz...</p></div>;
  }
  if (error) {
    return (
      <div className={`page-container ${pageSpecificClassName} error-container`}>
        <p className="error-message">Error: {error}</p>
        {/* Consider a button to navigate back or try again, passed via props? */}
        <button onClick={() => navigate(-1)} className="button button-primary">Go Back</button>
      </div>
    );
  }

  if (showResults) {
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
          {/* "Practice Again" or "Take Another Test" would typically be handled by the parent component
              by re-rendering QuizPlayer or changing its props, or navigating.
              For simplicity, a "Back to Dashboard" is provided here.
          */}
          <button onClick={() => navigate("/dashboard")} className="button button-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isReviewMode && questions.length > 0) {
    const reviewQ = questions[reviewQuestionIndex];
    const userAnswerForReview = userAnswers[reviewQuestionIndex];
    return (
      <div className={`page-container ${pageSpecificClassName} review-mode-area card`}>
        <h2 className="card-title">Reviewing Question {reviewQuestionIndex + 1} of {questions.length}</h2>
        <div className="question-text">
          <p>{reviewQ.question_text}</p>
          {reviewQ.visual_assets && reviewQ.visual_assets.type === 'latex' && (
            <div className="visual-asset latex-asset"><BlockMath math={reviewQ.visual_assets.data} /></div>
          )}
          {reviewQ.visual_assets && reviewQ.visual_assets.type === 'svg' && (
            <div className="visual-asset svg-asset" dangerouslySetInnerHTML={{ __html: reviewQ.visual_assets.data }} />
          )}
        </div>
        <div className="options-list quiz-options-container is-review-mode">
          {reviewQ.options.map((option) => {
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
                {option}
                {isActualCorrect && !isSelectedByPlayer && <span className="feedback-icon icon-correct"> ✔ Correct Answer</span>}
                {isSelectedByPlayer && wasPlayerCorrectIfSelected && <span className="feedback-icon icon-correct"> ✓ Your pick</span>}
                {isSelectedByPlayer && !wasPlayerCorrectIfSelected && (
                  <span className="feedback-icon icon-incorrect"> ✗ Your pick</span>
                )}
              </button>
            );
          })}
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
    // This state could occur if API call is successful but returns empty or error was handled by setting empty questions
    return <div className={`page-container ${pageSpecificClassName}`}><p className="loading-message">No questions available for this quiz.</p></div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const attemptedAnswer = userAnswers[currentQuestionIndex]; // This is where immediate feedback is decided

  return (
    <div className={`page-container ${pageSpecificClassName} question-display-area`}>
      <div className="session-info card">
        <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
        <p className="timer">Time: {formatTime(timeElapsed)}</p>
      </div>
      {/* <p className="target-time-info">Target time per question: 1 min 30 secs (Static)</p> */}

      <div className="question-content card">
        <div className="question-text">
          <p>{currentQuestion.question_text}</p>
          {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'latex' && (
            <div className="visual-asset latex-asset"><BlockMath math={currentQuestion.visual_assets.data} /></div>
          )}
          {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'svg' && (
            <div className="visual-asset svg-asset" dangerouslySetInnerHTML={{ __html: currentQuestion.visual_assets.data }} />
          )}
        </div>

        <div className={`options-list quiz-options-container ${showImmediateFeedback && attemptedAnswer ? 'answers-revealed' : ''}`}>
          {currentQuestion.options.map((option) => {
            let buttonClass = 'button quiz-option-button';
            if (attemptedAnswer && showImmediateFeedback) {
              const isActualCorrect = option === currentQuestion.correct_answer;
              const isSelectedByPlayer = option === attemptedAnswer.selected;
              if (isSelectedByPlayer) {
                buttonClass += ' is-selected';
                buttonClass += attemptedAnswer.correct ? ' is-revealed-correct' : ' is-revealed-incorrect';
              } else if (isActualCorrect) {
                buttonClass += ' is-revealed-correct';
              }
            } else if (attemptedAnswer && !showImmediateFeedback && option === attemptedAnswer.selected) {
                // Test mode: only show 'is-selected-pending' or a generic 'is-selected'
                // The existing 'is-selected' with box-shadow from App.css might be enough if `font-weight: bold` is removed or overridden
                 buttonClass += ' is-selected-pending'; // Or a more neutral 'is-selected-for-test'
            } else if (!attemptedAnswer && userAnswers[currentQuestionIndex]?.selected === option) {
                // This is for test mode if we allow changing answers before final submit and want to mark current selection
                 buttonClass += ' is-selected-pending';
            }

            return (
              <button key={option} className={buttonClass} onClick={() => handleOptionSelect(option)} disabled={showImmediateFeedback && !!attemptedAnswer}>
                {option}
              </button>
            );
          })}
        </div>

        {showImmediateFeedback && attemptedAnswer && (
          <div className="explanation-area">
            <h4>Explanation:</h4>
            <p>{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      <div className="navigation-buttons">
        <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} className="button button-secondary">Previous</button>
        {currentQuestionIndex === questions.length - 1 ? (
          <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-success">Finish</button>
        ) : (
          <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-primary">Next</button>
        )}
      </div>
      {/* Stop Quiz button could be added by parent or here if needed, e.g., navigate(-1) or a specific prop function */}
    </div>
  );
};

export default QuizPlayer;
