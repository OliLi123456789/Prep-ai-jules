import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QuizPlayer from './QuizPlayer'; // Import the new component
import './PracticePage.css';

const PracticePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(0);
  const [showSelections, setShowSelections] = useState(true);
  const [pageTitleOverride, setPageTitleOverride] = useState(null);
  const [quizKey, setQuizKey] = useState(0); // Used to force re-mount of QuizPlayer

  // Placeholder data for topic selections
  const topics = {
    Math: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
    Reading: ['Main Idea', 'Inference', 'Vocabulary in Context', 'Purpose'],
    Writing: ['Grammar Usage', 'Punctuation', 'Sentence Structure', 'Rhetorical Skills'],
  };

  const handleTopicChange = (event) => {
    setSelectedTopic(event.target.value);
    setSelectedSubtopic('');
    setNumQuestions(0);
  };

  const handleSubtopicChange = (event) => {
    setSelectedSubtopic(event.target.value);
  };

  const handleNumQuestionsClick = (num) => {
    setNumQuestions(num);
  };

  // Effect to handle auto-start from navigation state (e.g., from Dashboard)
  useEffect(() => {
    if (location.state && location.state.topic && location.state.subTopic && location.state.numQuestions) {
      const { topic, subTopic, numQuestions: numQsFromState, description } = location.state;
      
      if (sessionStorage.getItem('practicePageAutoStarted') === JSON.stringify(location.state)) {
        return;
      }

      console.log("PracticePage: Received state for auto-start:", location.state);
      setSelectedTopic(topic);
      setSelectedSubtopic(subTopic);
      setNumQuestions(numQsFromState);
      if (description) {
        setPageTitleOverride(`Starting: ${description}`);
      }
      
      sessionStorage.setItem('practicePageAutoStarted', JSON.stringify(location.state));
      navigate(location.pathname, { replace: true, state: {} });

      // Directly trigger start after states are set
      setShowSelections(false);
      setQuizKey(prevKey => prevKey + 1); // Change key to force QuizPlayer remount
      
    } else {
      sessionStorage.removeItem('practicePageAutoStarted');
    }
  }, [location.state, navigate]);


  const handleStartPractice = () => {
    if (!selectedTopic || !selectedSubtopic || numQuestions === 0) {
      alert('Please select a topic, subtopic, and number of questions.');
      return;
    }
    setPageTitleOverride(null); // Clear any title from nav-based start
    setShowSelections(false);
    setQuizKey(prevKey => prevKey + 1); // Increment key to remount QuizPlayer
  };

  const handleQuizCompletion = (results) => {
    console.log("PracticePage: QuizPlayer finished.", results);
    // Could show a summary here, or offer to go back to selections
    // For now, QuizPlayer handles its own results screen.
    // To return to selection screen from PracticePage after QuizPlayer is done:
    // setShowSelections(true); // This might be triggered by a button within QuizPlayer via a prop
  };
  
  // If user exits QuizPlayer (e.g. "Back to Dashboard" or a new "Exit Quiz" button)
  // we might want to show selections again. This could be a prop function passed to QuizPlayer.
  const handleExitQuizPlayer = () => {
    setShowSelections(true);
    setPageTitleOverride(null);
    // Reset selections if desired
    // setSelectedTopic('');
    // setSelectedSubtopic('');
    // setNumQuestions(0);
  }


  if (!showSelections) {
    const apiParams = {
      topic: selectedTopic,
      subTopic: selectedSubtopic,
      numQuestions: numQuestions,
      // testType: "PRACTICE" // Optional: could add a general type for logging or backend logic
    };
    return (
      <QuizPlayer
        key={quizKey} // Force re-mount when key changes
        quizTitle={`Practice: ${selectedTopic} - ${selectedSubtopic}`}
        apiParams={apiParams}
        showImmediateFeedback={true}
        confettiOnComplete={true}
        onQuizComplete={handleQuizCompletion}
        // onExit={handleExitQuizPlayer} // Example of a prop to return to selection
        pageSpecificClassName="practice-page-container"
      />
    );
  }

  // Initial selection view
  return (
    <div className="page-container practice-page-container">
      <h1 className="page-title">{pageTitleOverride || "Practice Zone"}</h1>
      {/* Removed loading state that was specific to internal question fetching */}
      <div className="card">
        <div className="form-group">
          <label htmlFor="topic-select">Choose a Topic:</label>
          <select id="topic-select" value={selectedTopic} onChange={handleTopicChange} className="form-control">
            <option value="">-- Select Topic --</option>
            {Object.keys(topics).map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        {selectedTopic && (
          <div className="form-group">
            <label htmlFor="subtopic-select">Choose a Subtopic:</label>
            <select id="subtopic-select" value={selectedSubtopic} onChange={handleSubtopicChange} className="form-control">
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
          disabled={!selectedTopic || !selectedSubtopic || numQuestions === 0}
        >
          Start Practice
        </button>
      </div>
    </div>
  );
};

export default PracticePage;
