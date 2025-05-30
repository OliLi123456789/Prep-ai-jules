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
  // questionAttempted is implicitly handled by checking if userAnswers[currentQuestionIndex] exists

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
      if (!response.ok) { /* ... (error handling as before) */
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.length > 0) {
        setQuestions(data);
        setCurrentQuestionIndex(0);
        setShowSelections(false);
        setSessionStartTime(Date.now()); // Start timer
        setTimeElapsed(0);
      } else { /* ... (error handling as before) */
         setError('No questions received or empty array returned.');
      }
    } catch (err) { /* ... (error handling as before) */
      setError(err.message || 'Failed to fetch questions.');
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
  if (isLoading) { /* ... (as before) */ 
    return <div className="practice-page-container"><p className="loading-message">Loading questions...</p></div>;
  }
  if (error) { /* ... (as before, but use handleStopPractice for the button) */
    return (
      <div className="practice-page-container error-container">
        <p className="error-message">Error: {error}</p>
        <button onClick={handleStopPractice} className="return-button">Try Again</button>
      </div>
    );
  }

  if (showResults) {
    const percentage = questions.length > 0 ? Math.round((currentScore / questions.length) * 100) : 0;
    return (
      <div className="practice-page-container results-screen">
        <Confetti recycle={false} numberOfPieces={300} />
        <h1 className="page-title">Practice Complete!</h1>
        <p className="results-score">You got {currentScore} out of {questions.length} correct ({percentage}%)</p>
        <p className="results-time">Total time: {formatTime(timeElapsed)}</p>
        <div className="results-actions">
          <button onClick={handlePracticeAgain} className="action-button">Practice Again</button>
          <button onClick={handleBackToDashboard} className="action-button secondary">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!showSelections && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const attemptedAnswer = userAnswers[currentQuestionIndex];

    return (
      <div className="practice-page-container question-display-area">
        <div className="session-info">
            <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
            <p className="timer">Time: {formatTime(timeElapsed)}</p>
        </div>
        <p className="target-time-info">Target time per question: 1 min 30 secs (Static)</p>
        
        <div className="question-text">
          <p>{currentQuestion.question_text}</p>
          {/* ... (visual asset rendering as before) ... */}
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
            let buttonClass = 'option-button';
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

        <div className="navigation-buttons">
          <button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
            Previous
          </button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer}>Finish</button>
          ) : (
            <button onClick={handleNextQuestion} disabled={!attemptedAnswer}>Next</button>
          )}
        </div>
        <button onClick={handleStopPractice} className="return-button full-width-button stop-practice-button">
          Stop Practice
        </button>
      </div>
    );
  }

  // Initial selection view (mostly as before, but ensure `handleStartPractice` is called)
  return (
    <div className="practice-page-container">
      <h1 className="page-title">Practice Zone</h1>
      {/* ... (Topic, Subtopic, NumQuestions selections as before, ensure they call handleStartPractice) ... */}
       <div className="selection-group">
        <label htmlFor="topic-select">Choose a Topic:</label>
        <select id="topic-select" value={selectedTopic} onChange={handleTopicChange} disabled={!showSelections}>
          <option value="">-- Select Topic --</option>
          {Object.keys(topics).map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </div>

      {selectedTopic && (
        <div className="selection-group">
          <label htmlFor="subtopic-select">Choose a Subtopic:</label>
          <select id="subtopic-select" value={selectedSubtopic} onChange={handleSubtopicChange} disabled={!selectedTopic || !showSelections}>
            <option value="">-- Select Subtopic --</option>
            {topics[selectedTopic]?.map(subtopic => (
              <option key={subtopic} value={subtopic}>{subtopic}</option>
            ))}
          </select>
        </div>
      )}

      {selectedSubtopic && (
         <div className="selection-group">
            <label>Number of Questions:</label>
            <div className="question-buttons">
                {[5, 10, 15].map(num => ( // Assuming backend can handle these counts
                    <button 
                        key={num}
                        onClick={() => handleNumQuestionsClick(num)}
                        className={numQuestions === num ? 'active' : ''}
                        disabled={!showSelections}
                    >
                        {num} Questions
                    </button>
                ))}
            </div>
        </div>
      )}
      
      <button 
        className="start-practice-button" 
        onClick={handleStartPractice} // This is the key part
        disabled={!selectedTopic || !selectedSubtopic || numQuestions === 0 || !showSelections}
      >
        Start Practice
      </button>
    </div>
  );
};

export default PracticePage;
