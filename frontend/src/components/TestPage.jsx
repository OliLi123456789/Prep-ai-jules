import React, { useState, useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import './TestPage.css'; // Ensure this CSS file is adapted or created

const TestPage = () => {
  const [selectedTestType, setSelectedTestType] = useState('');
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { qIndex: { selected: 'option', correct: true/false } }
  const [currentScore, setCurrentScore] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTestTypeSelection, setShowTestTypeSelection] = useState(true);

  // New state for Review Mode
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  const navigate = useNavigate();
  const timerIntervalRef = useRef(null);

  // Placeholder data for test types - adapt as needed
  const testTypes = [
    "SAT Full Test (Sample)", 
    "ACT Full Test (Sample)", 
    "SAT Math Section (Sample)",
  ];

  const handleTestTypeChange = (event) => {
    setSelectedTestType(event.target.value);
  };

  // --- Timer Effect ---
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

  // --- API Call & Test Start ---
  const handleStartTest = async () => {
    if (!selectedTestType) {
      alert('Please select a test type.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setCurrentScore(0);
    setShowResults(false);
    
    // For now, let's always request 3 questions for any test type from our placeholder backend
    const MOCK_NUM_QUESTIONS_FOR_TEST = 3; 

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: selectedTestType, // Pass the selected test type
          topic: "Mixed", // Placeholder as backend doesn't use this yet for test type
          subTopic: "Mixed", // Placeholder
          numQuestions: MOCK_NUM_QUESTIONS_FOR_TEST 
        }),
      });

      const data = await response.json(); // Attempt to parse JSON first

      if (!response.ok) {
        // If response is not OK, data should contain the error object from backend
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      // Handle cases where response is OK, but data might indicate an issue
      if (!data || (Array.isArray(data) && data.length === 0) || data.error) {
        if (data && data.message) {
             setError(data.message);
        } else if (Array.isArray(data) && data.length === 0) {
            setError('The AI generated no questions for this test type.');
        } else {
            setError('Received unexpected data structure from server for this test type.');
        }
        return; // Stop further processing
      }

      // Success case
      setQuestions(data);
      setCurrentQuestionIndex(0);
      setShowTestTypeSelection(false);
      setSessionStartTime(Date.now());
      setTimeElapsed(0);
      // setError(null); // Ensure error is cleared on success
    } catch (err) {
      setError(err.message || 'An unknown error occurred while fetching test questions.');
      console.error("Fetch error for test:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Answer Selection ---
  const handleOptionSelect = (option) => {
    if (userAnswers[currentQuestionIndex]) return; // Already answered

    const isCorrect = option === questions[currentQuestionIndex].correct_answer;
    if (isCorrect) {
      setCurrentScore(prevScore => prevScore + 1);
    }
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [currentQuestionIndex]: { selected: option, correct: isCorrect },
    }));
  };

  // --- Navigation ---
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setShowResults(true);
      setSessionStartTime(null); // Stop timer
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  // --- Reset/Stop ---
  const resetTestState = () => {
    setShowTestTypeSelection(true);
    setShowResults(false);
    setQuestions([]);
    setUserAnswers({});
    setCurrentScore(0);
    setSessionStartTime(null);
    setTimeElapsed(0);
    setSelectedTestType('');
    setError(null);
    setCurrentQuestionIndex(0);
    clearInterval(timerIntervalRef.current);
  };

  const handleStopTest = () => {
    resetTestState();
  };
  
  const handleTakeAnotherTest = () => {
    resetTestState();
  };

  const handleBackToDashboard = () => {
    resetTestState();
    navigate('/dashboard');
  };
  
  const handleReviewTest = () => {
      alert("Test review feature coming soon!");
      // Potentially set a new state for review mode, or navigate to a review route
  };


  // --- Render Logic ---
  if (isLoading) {
    return <div className="page-container test-page-container"><p className="loading-message">Loading test questions...</p></div>;
  }
  if (error) {
    return (
      <div className="page-container test-page-container error-container">
        <p className="error-message">Error: {error}</p>
        <button onClick={handleStopTest} className="button button-primary">Select Another Test</button>
      </div>
    );
  }

  if (showResults) {
    const percentage = questions.length > 0 ? Math.round((currentScore / questions.length) * 100) : 0;
    return (
      <div className="page-container test-page-container results-screen">
        <Confetti recycle={false} numberOfPieces={400} width={window.innerWidth} height={window.innerHeight}/>
        <h1 className="page-title">Test Complete!</h1>
        <p className="results-score">You got {currentScore} out of {questions.length} correct ({percentage}%)</p>
        <p className="results-time">Total time: {formatTime(timeElapsed)}</p>
        <div className="results-actions">
          {/* Modified handleReviewTest to setIsReviewMode(true) */}
          <button onClick={() => { setIsReviewMode(true); setReviewQuestionIndex(0); }} className="button button-info">Review Test</button>
          <button onClick={handleTakeAnotherTest} className="button button-primary">Take Another Test</button>
          <button onClick={handleBackToDashboard} className="button button-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isReviewMode && questions.length > 0) {
    const reviewQ = questions[reviewQuestionIndex];
    const userAnswerForReview = userAnswers[reviewQuestionIndex];

    return (
      <div className="page-container test-page-container review-mode-area card">
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
        <div className="options-list review-options">
          {reviewQ.options.map((option, index) => {
            let buttonClass = 'button option-button disabled-option'; // Base for review
            const isCorrectAnswer = option === reviewQ.correct_answer;
            const isUserSelectedAnswer = userAnswerForReview && option === userAnswerForReview.selected;

            if (isCorrectAnswer) buttonClass += ' review-correct-answer';
            if (isUserSelectedAnswer) {
              buttonClass += userAnswerForReview.correct ? ' review-user-correct' : ' review-user-incorrect';
            }
            return (
              <button key={index} className={buttonClass} disabled>
                {option}
                {isCorrectAnswer && <span className="feedback-icon"> ✔ Correct</span>}
                {isUserSelectedAnswer && !userAnswerForReview.correct && isCorrectAnswer && <span className="feedback-icon"> (Your pick was different)</span>}
                {isUserSelectedAnswer && !userAnswerForReview.correct && !isCorrectAnswer && <span className="feedback-icon"> ✗ Your pick</span>}
                {isUserSelectedAnswer && userAnswerForReview.correct && <span className="feedback-icon"> ✓ Your pick</span>}
              </button>
            );
          })}
        </div>
        {/* Explanation is now shown in review mode for tests as well */}
        <div className="explanation-area review-explanation">
          <h4>Explanation:</h4>
          <p>{reviewQ.explanation}</p>
        </div>
        <div className="navigation-buttons">
          <button 
            onClick={() => setReviewQuestionIndex(i => i - 1)} 
            disabled={reviewQuestionIndex === 0}
            className="button button-secondary"
          >
            Previous
          </button>
          <button 
            onClick={() => setReviewQuestionIndex(i => i + 1)} 
            disabled={reviewQuestionIndex === questions.length - 1}
            className="button button-primary"
          >
            Next
          </button>
        </div>
        <button onClick={() => setIsReviewMode(false)} className="button button-info button-block">Exit Review</button>
      </div>
    );
  }

  if (!showTestTypeSelection && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const attemptedAnswer = userAnswers[currentQuestionIndex];

    return (
      <div className="page-container test-page-container question-display-area">
        <div className="session-info card">
          <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
          <p className="timer">Time: {formatTime(timeElapsed)}</p>
        </div>
        
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

          <div className="options-list">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = 'button option-button';
              if (attemptedAnswer) {
                if (option === attemptedAnswer.selected) {
                  buttonClass += attemptedAnswer.correct ? ' selected correct' : ' selected incorrect';
                } else if (attemptedAnswer && option === currentQuestion.correct_answer) {
                  // As per prompt, show immediate feedback for now
                  buttonClass += ' correct-unselected'; 
                }
              }
              return (
                <button 
                  key={index} 
                  className={buttonClass}
                  onClick={() => handleOptionSelect(option)}
                  disabled={!!attemptedAnswer}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div> {/* End of question-content card */}


        {/* NO EXPLANATION DURING TEST */}

        <div className="navigation-buttons">
          <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} className="button button-secondary">
            Previous
          </button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-success">Finish Test</button>
          ) : (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-primary">Next</button>
          )}
        </div>
        <button onClick={handleStopTest} className="button button-danger button-block stop-test-button">
          Stop Test
        </button>
      </div>
    );
  }

  // Initial Test Type Selection view
  return (
    <div className="page-container test-page-container">
      <h1 className="page-title">Take a Test</h1>
      <div className="card"> {/* Wrap selection in a card */}
        <div className="form-group">
          <label htmlFor="test-type-select">Choose a Test Type:</label>
          <select 
            id="test-type-select" 
            value={selectedTestType} 
            onChange={handleTestTypeChange} 
            disabled={!showTestTypeSelection}
            className="form-control"
          >
            <option value="">-- Select Test Type --</option>
            {testTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="button button-primary button-block" 
          onClick={handleStartTest}
          disabled={!selectedTestType || !showTestTypeSelection}
        >
          Start Test
        </button>
      </div> {/* End of card for selection */}
    </div>
  );
};

export default TestPage;
