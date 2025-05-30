import React, { useState, useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { useNavigate } from 'react-router-dom'; // For "Back to Dashboard"
import Confetti from 'react-confetti';
import './PracticePage.css';

const PracticePage = () => {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSelections, setShowSelections] = useState(true);

  // New state for practice session
  const [userAnswers, setUserAnswers] = useState({}); // Stores { qIndex: { selected: 'option', correct: true/false } }
  const [currentScore, setCurrentScore] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  // New state for Review Mode
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

  const navigate = useNavigate();
  const timerIntervalRef = useRef(null);

  // Placeholder data
  const topics = {
    Math: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
    Reading: ['Main Idea', 'Inference', 'Vocabulary in Context', 'Purpose'],
    Writing: ['Grammar Usage', 'Punctuation', 'Sentence Structure', 'Rhetorical Skills'],
  };

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
    setSelectedSubtopic(''); // Reset subtopic when topic changes
    setNumQuestions(0); // Reset questions
  };

  const handleSubtopicChange = (event) => {
    setSelectedSubtopic(event.target.value);
  };

  const handleNumQuestionsClick = (num) => {
    setNumQuestions(num);
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
    return () => clearInterval(timerIntervalRef.current); // Cleanup on unmount or when conditions change
  }, [sessionStartTime, showResults]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  // --- API Call & Practice Start ---
  const handleStartPractice = async () => {
    // ... (validation as before)
    if (!selectedTopic || !selectedSubtopic || numQuestions === 0) {
      alert('Please select a topic, subtopic, and number of questions.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setCurrentScore(0);
    setShowResults(false);

    try {
      const response = await fetch('/api/generate-questions', { /* ... (fetch options as before) */
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic, subTopic: selectedSubtopic, numQuestions: numQuestions,
        }),
      });
      
      const data = await response.json(); // Attempt to parse JSON first

      if (!response.ok) {
        // If response is not OK, data should contain the error object from backend
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      // Handle cases where response is OK, but data might indicate an issue (e.g. AI returned empty array)
      // or if backend error structure was missed by !response.ok (less likely with current backend)
      if (!data || (Array.isArray(data) && data.length === 0) || data.error) {
        if (data && data.message) {
             setError(data.message);
        } else if (Array.isArray(data) && data.length === 0) {
            setError('The AI generated no questions for this selection.');
        } else {
            setError('Received unexpected data structure from server.');
        }
        return; // Stop further processing
      }
      
      // Success case: response is OK and data is a non-empty array of questions
      setQuestions(data);
      setCurrentQuestionIndex(0);
      setShowSelections(false);
      setSessionStartTime(Date.now()); // Start timer
      setTimeElapsed(0);
      // setError(null); // Ensure error is cleared on success
    } catch (err) { 
      // This catch block will now handle network errors, JSON parsing errors if response wasn't JSON,
      // or the error thrown from (!response.ok) block.
      setError(err.message || 'An unknown error occurred while fetching questions.');
      console.error("Fetch error:", err);
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
    } else { // Last question, trigger finish
      setShowResults(true);
      setSessionStartTime(null); // Stop timer by clearing start time
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  // --- Reset/Stop ---
  const resetPracticeState = () => {
    setShowSelections(true);
    setShowResults(false);
    setQuestions([]);
    setUserAnswers({});
    setCurrentScore(0);
    setSessionStartTime(null);
    setTimeElapsed(0);
    setSelectedTopic('');
    setSelectedSubtopic('');
    setNumQuestions(0);
    setError(null);
    setCurrentQuestionIndex(0);
    clearInterval(timerIntervalRef.current);
  };

  const handleStopPractice = () => { // Renamed from handleReturnToSelections for clarity
    resetPracticeState();
  };
  
  const handlePracticeAgain = () => {
    resetPracticeState();
  };

  const handleBackToDashboard = () => {
    resetPracticeState();
    navigate('/dashboard');
  };


  // --- Render Logic ---
  if (isLoading) { 
    return <div className="page-container practice-page-container"><p className="loading-message">Loading questions...</p></div>;
  }
  if (error) { 
    return (
      <div className="page-container practice-page-container error-container">
        <p className="error-message">Error: {error}</p> {/* error-message will compose alert-danger */}
        <button onClick={handleStopPractice} className="button button-primary">Try Again</button>
      </div>
    );
  }

  if (showResults) {
    const percentage = questions.length > 0 ? Math.round((currentScore / questions.length) * 100) : 0;
    return (
      <div className="page-container practice-page-container results-screen">
        <Confetti recycle={false} numberOfPieces={300} width={window.innerWidth} height={window.innerHeight} />
        <h1 className="page-title">Practice Complete!</h1>
        <p className="results-score">You got {currentScore} out of {questions.length} correct ({percentage}%)</p>
        <p className="results-time">Total time: {formatTime(timeElapsed)}</p>
        <div className="results-actions">
          <button onClick={() => { setIsReviewMode(true); setReviewQuestionIndex(0); }} className="button button-info">Review Answers</button>
          <button onClick={handlePracticeAgain} className="button button-primary">Practice Again</button>
          <button onClick={handleBackToDashboard} className="button button-secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isReviewMode && questions.length > 0) {
    const reviewQ = questions[reviewQuestionIndex];
    const userAnswerForReview = userAnswers[reviewQuestionIndex];

    return (
      <div className="page-container practice-page-container review-mode-area card">
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
  
  if (!showSelections && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const attemptedAnswer = userAnswers[currentQuestionIndex];

    return (
      <div className="page-container practice-page-container question-display-area">
        <div className="session-info card"> 
            <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
            <p className="timer">Time: {formatTime(timeElapsed)}</p>
        </div>
        <p className="target-time-info">Target time per question: 1 min 30 secs (Static)</p>
        
        <div className="question-content card"> {/* Added card for question content */}
          <div className="question-text">
            <p>{currentQuestion.question_text}</p>
            {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'latex' && (
              <div className="visual-asset latex-asset">
                <BlockMath math={currentQuestion.visual_assets.data} />
              </div>
            )}
            {currentQuestion.visual_assets && currentQuestion.visual_assets.type === 'svg' && (
              <div 
                className="visual-asset svg-asset" 
                dangerouslySetInnerHTML={{ __html: currentQuestion.visual_assets.data }} 
              />
            )}
          </div>

          <div className="options-list">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = 'button option-button'; {/* Base classes */}
              if (attemptedAnswer) {
                if (option === attemptedAnswer.selected) {
                  buttonClass += attemptedAnswer.correct ? ' selected correct' : ' selected incorrect';
                } else if (option === currentQuestion.correct_answer) {
                  buttonClass += ' correct-unselected'; // Show correct if user picked wrong
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

          {attemptedAnswer && (
            <div className="explanation-area">
              <h4>Explanation:</h4>
              <p>{currentQuestion.explanation}</p>
            </div>
          )}
        </div> {/* End of question-content card */}


        <div className="navigation-buttons">
          <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} className="button button-secondary">
            Previous
          </button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-success">Finish</button>
          ) : (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer} className="button button-primary">Next</button>
          )}
        </div>
        <button onClick={handleStopPractice} className="button button-danger button-block stop-practice-button">
          Stop Practice
        </button>
      </div>
    );
  }

  // Initial selection view
  return (
    <div className="page-container practice-page-container">
      <h1 className="page-title">Practice Zone</h1>
      <div className="card"> {/* Wrap selection area in a card */}
        <div className="form-group">
          <label htmlFor="topic-select">Choose a Topic:</label>
          <select id="topic-select" value={selectedTopic} onChange={handleTopicChange} disabled={!showSelections} className="form-control">
            <option value="">-- Select Topic --</option>
            {Object.keys(topics).map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        {selectedTopic && (
          <div className="form-group">
            <label htmlFor="subtopic-select">Choose a Subtopic:</label>
            <select id="subtopic-select" value={selectedSubtopic} onChange={handleSubtopicChange} disabled={!selectedTopic || !showSelections} className="form-control">
              <option value="">-- Select Subtopic --</option>
              {topics[selectedTopic]?.map(subtopic => (
                <option key={subtopic} value={subtopic}>{subtopic}</option>
              ))}
            </select>
          </div>
        )}

        {selectedSubtopic && (
          <div className="form-group">
              <label>Number of Questions:</label>
              <div className="question-buttons">
                  {[5, 10, 15].map(num => (
                      <button 
                          key={num}
                          onClick={() => handleNumQuestionsClick(num)}
                          className={`button button-outline-primary ${numQuestions === num ? 'active' : ''}`}
                          disabled={!showSelections}
                      >
                          {num} Questions
                      </button>
                  ))}
              </div>
          </div>
        )}
        
        <button 
          className="button button-success button-block" 
          onClick={handleStartPractice}
          disabled={!selectedTopic || !selectedSubtopic || numQuestions === 0 || !showSelections}
        >
          Start Practice
        </button>
      </div> {/* End of card for selection */}
    </div>
  );
};

export default PracticePage;
