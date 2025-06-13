import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

const initialProfileData = {
  name: '',
  testDetails: {
    testType: 'SAT', // Default to SAT
    testDate: '',
    goalScore: { overall: '', math: '', reading: '', writing: '', english: '', science: '' },
  },
  pastScores: [],
  // Assuming apiKey might be part of userPreferences or a top-level field in mockUserData.json
  // For this example, let's assume it's a top-level field in profileData from backend
  apiKey: '', 
  userPreferences: { preferredSectionLengths: [], dailyStudyTimeMinutesAvg: '' },
};

const initialNewPastScore = {
    type: 'SAT', // Default to SAT, can be changed by user
    date: '',
    overall: '',
    subScores: { math: '', readingWriting: '', english: '', reading: '', science: '' }, // Standardized subScore keys
    isOfficial: true,
    testName: '', // For user-defined names like "Practice Test #1"
};

const SettingsPage = () => {
  const [profileData, setProfileData] = useState(initialProfileData);
  const [newPastScore, setNewPastScore] = useState(initialNewPastScore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/get-profile-data');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch profile data.');
        }
        // Ensure all nested structures exist before setting
        setProfileData(prev => ({
          ...initialProfileData, // Start with defaults to ensure structure
          ...data,
          testDetails: { ...initialProfileData.testDetails, ...(data.testDetails || {}) },
          userPreferences: { ...initialProfileData.userPreferences, ...(data.userPreferences || {})},
          pastScores: data.pastScores || [],
          apiKey: data.apiKey || '', // Ensure apiKey is handled
        }));
      } catch (err) {
        setError(err.message);
        console.error("Fetch profile error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e, path) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || '' : value;
    
    setSuccessMessage('');
    setError(null);

    setProfileData(prev => {
      const keys = path ? path.split('.') : [name];
      let current = { ...prev };
      let nested = current;
      for (let i = 0; i < keys.length - 1; i++) {
        nested[keys[i]] = { ...nested[keys[i]] };
        nested = nested[keys[i]];
      }
      nested[keys[keys.length - 1]] = val;
      return current;
    });
  };
  
  const handleNewPastScoreChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || '' : value;

    if (name.startsWith("subScore_")) {
        const subScoreKey = name.split("_")[1];
        setNewPastScore(prev => ({
            ...prev,
            subScores: { ...prev.subScores, [subScoreKey]: val }
        }));
    } else {
        setNewPastScore(prev => ({ ...prev, [name]: val }));
        // If type changes, reset subScores to avoid carrying over irrelevant fields
        if (name === "type") {
            setNewPastScore(prev => ({
                ...prev,
                subScores: initialNewPastScore.subScores // Reset to blank structure
            }));
        }
    }
  };

  const handleAddPastScore = () => {
    if ((!newPastScore.type && !newPastScore.testName) || !newPastScore.date || !newPastScore.overall) {
        alert("Please provide at least a name/type, date, and overall score for the past score.");
        return;
    }
    const scoreToAdd = {
        ...newPastScore,
        scoreId: `${(newPastScore.testName || newPastScore.type).toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        // Ensure subScores are relevant or cleaned if necessary, though current logic handles this via type change
    };
    setProfileData(prev => ({
      ...prev,
      pastScores: [...prev.pastScores, scoreToAdd],
    }));
    setNewPastScore(initialNewPastScore); // Reset form
  };

  const handleRemovePastScore = (scoreIdToRemove) => {
    setProfileData(prev => ({
      ...prev,
      pastScores: prev.pastScores.filter(score => (score.scoreId || score.testId) !== scoreIdToRemove),
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage('');
    try {
      const response = await fetch('/api/save-profile-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save profile.');
      }
      setSuccessMessage(data.message || "Profile saved successfully!");
    } catch (err) {
      setError(err.message);
      console.error("Save profile error:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading && !profileData.name) { // Show full page loading only on initial load
      return <div className="page-container"><p className="loading-message">Loading profile...</p></div>;
  }

  return (
    <div className="page-container settings-page-container">
      <h1 className="page-title">User Profile & Settings</h1>
      <form onSubmit={handleSaveProfile} className="settings-form">
        
        {/* Personal Info */}
        <div className="card">
          <h2 className="card-title">Personal Information</h2>
          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input type="text" id="name" name="name" value={profileData.name} onChange={(e) => handleInputChange(e, 'name')} className="form-control" />
          </div>
        </div>

        {/* Test Configuration */}
        <div className="card">
          <h2 className="card-title">Primary Test Configuration</h2>
          <div className="form-group">
            <label htmlFor="testType">Preferred Test Type:</label>
            <select id="testType" name="testType" value={profileData.testDetails.testType} onChange={(e) => handleInputChange(e, 'testDetails.testType')} className="form-control">
              <option value="SAT">SAT</option>
              <option value="ACT">ACT</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="testDate">Your Next Test Date:</label>
            <input type="date" id="testDate" name="testDate" value={profileData.testDetails.testDate} onChange={(e) => handleInputChange(e, 'testDetails.testDate')} className="form-control"/>
          </div>
        </div>

        {/* Goal Scores */}
        <div className="card">
          <h2 className="card-title">Goal Scores ({profileData.testDetails.testType})</h2>
          <div className="form-group">
            <label htmlFor="goalOverall">Overall Goal:</label>
            <input type="number" id="goalOverall" name="overall" value={profileData.testDetails.goalScore.overall} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.overall')} className="form-control"/>
          </div>
          {profileData.testDetails.testType === 'SAT' && (
            <>
              <div className="form-group"><label htmlFor="goalMath">Math Goal (SAT):</label><input type="number" id="goalMath" name="math" value={profileData.testDetails.goalScore.math} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.math')} className="form-control"/></div>
              <div className="form-group"><label htmlFor="goalReading">Reading Goal (SAT):</label><input type="number" id="goalReading" name="reading" value={profileData.testDetails.goalScore.reading} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.reading')} className="form-control"/></div>
              <div className="form-group"><label htmlFor="goalWriting">Writing Goal (SAT):</label><input type="number" id="goalWriting" name="writing" value={profileData.testDetails.goalScore.writing} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.writing')} className="form-control"/></div>
            </>
          )}
          {profileData.testDetails.testType === 'ACT' && (
            <>
              <div className="form-group"><label htmlFor="goalMathACT">Math Goal (ACT):</label><input type="number" id="goalMathACT" name="math" value={profileData.testDetails.goalScore.math} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.math')} className="form-control"/></div>
              <div className="form-group"><label htmlFor="goalEnglishACT">English Goal (ACT):</label><input type="number" id="goalEnglishACT" name="english" value={profileData.testDetails.goalScore.english} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.english')} className="form-control"/></div>
              <div className="form-group"><label htmlFor="goalReadingACT">Reading Goal (ACT):</label><input type="number" id="goalReadingACT" name="reading" value={profileData.testDetails.goalScore.reading} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.reading')} className="form-control"/></div>
              <div className="form-group"><label htmlFor="goalScienceACT">Science Goal (ACT):</label><input type="number" id="goalScienceACT" name="science" value={profileData.testDetails.goalScore.science} onChange={(e) => handleInputChange(e, 'testDetails.goalScore.science')} className="form-control"/></div>
            </>
          )}
        </div>
        
        {/* Past Scores */}
        <div className="card">
            <h2 className="card-title">Past Scores</h2>
            <div className="past-scores-list">
                {profileData.pastScores.length === 0 && <p>No past scores added yet.</p>}
                {profileData.pastScores.map((score, index) => (
                    <div key={score.scoreId || score.testId || index} className="past-score-item">
                        <span>
                            <strong>{score.testName || score.type}</strong>
                            ({new Date(score.date).toLocaleDateString()}):
                            Overall: {score.overallScore || score.overall}
                            {score.isMultiSection && score.sections && ` (${score.sections.length} sections)`}
                            {score.subScores && !score.isMultiSection && (
                                <span style={{fontSize: '0.8em', marginLeft: '10px'}}>
                                    (
                                    {score.type === 'SAT' && `M: ${score.subScores.math || 'N/A'}, R/W: ${score.subScores.readingWriting || 'N/A'}`}
                                    {score.type === 'ACT' && `E: ${score.subScores.english || 'N/A'}, M: ${score.subScores.math || 'N/A'}, R: ${score.subScores.reading || 'N/A'}, S: ${score.subScores.science || 'N/A'}`}
                                    )
                                </span>
                            )}
                        </span>
                        <button type="button" onClick={() => handleRemovePastScore(score.scoreId || score.testId)} className="button button-danger button-sm remove-score-btn">Remove</button>
                    </div>
                ))}
            </div>
            <div className="add-past-score-form">
                <h3 className="sub-card-title">Add New Past Score</h3>
                <div className="form-group">
                    <label>Test Name (Optional):</label>
                    <input type="text" name="testName" value={newPastScore.testName} onChange={handleNewPastScoreChange} className="form-control" placeholder="e.g., Official Practice Test 1"/>
                </div>
                <div className="form-group">
                    <label>Test Type:</label>
                    <select name="type" value={newPastScore.type} onChange={handleNewPastScoreChange} className="form-control">
                        <option value="SAT">SAT</option>
                        <option value="ACT">ACT</option>
                        <option value="PSAT">PSAT</option>
                        <option value="Other">Other Practice</option>
                    </select>
                </div>
                <div className="form-group"><label>Date:</label><input type="date" name="date" value={newPastScore.date} onChange={handleNewPastScoreChange} className="form-control"/></div>
                <div className="form-group"><label>Overall Score:</label><input type="number" name="overall" value={newPastScore.overall} onChange={handleNewPastScoreChange} className="form-control"/></div>

                {newPastScore.type === 'SAT' && (
                    <>
                        <div className="form-group"><label>Math Score (SAT):</label><input type="number" name="subScore_math" value={newPastScore.subScores.math} onChange={handleNewPastScoreChange} className="form-control"/></div>
                        <div className="form-group"><label>Reading/Writing Score (SAT):</label><input type="number" name="subScore_readingWriting" value={newPastScore.subScores.readingWriting} onChange={handleNewPastScoreChange} className="form-control"/></div>
                    </>
                )}
                {newPastScore.type === 'ACT' && (
                    <>
                        <div className="form-group"><label>English Score (ACT):</label><input type="number" name="subScore_english" value={newPastScore.subScores.english} onChange={handleNewPastScoreChange} className="form-control"/></div>
                        <div className="form-group"><label>Math Score (ACT):</label><input type="number" name="subScore_math" value={newPastScore.subScores.math} onChange={handleNewPastScoreChange} className="form-control"/></div>
                        <div className="form-group"><label>Reading Score (ACT):</label><input type="number" name="subScore_reading" value={newPastScore.subScores.reading} onChange={handleNewPastScoreChange} className="form-control"/></div>
                        <div className="form-group"><label>Science Score (ACT):</label><input type="number" name="subScore_science" value={newPastScore.subScores.science} onChange={handleNewPastScoreChange} className="form-control"/></div>
                    </>
                )}
                {/* For 'Other' or 'PSAT', no specific sub-score fields are shown here, but they could be added */}

                <div className="form-group"><label><input type="checkbox" name="isOfficial" checked={newPastScore.isOfficial} onChange={handleNewPastScoreChange} /> Official Score?</label></div>
                <button type="button" onClick={handleAddPastScore} className="button button-secondary">Add Score to List</button>
            </div>
        </div>

        {/* API Settings */}
        <div className="card">
          <h2 className="card-title">API Settings</h2>
          <div className="form-group">
            <label htmlFor="apiKey">DeepSeek API Key:</label>
            <input type="password" id="apiKey" name="apiKey" value={profileData.apiKey || ''} onChange={(e) => handleInputChange(e, 'apiKey')} className="form-control" placeholder="Enter your DeepSeek API Key"/>
            <small className="form-text">Your API key is stored locally (for now) and used for AI features.</small>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="alert alert-success">{successMessage}</p>}
        
        <button type="submit" className="button button-success button-lg save-profile-button" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Profile & Settings'}
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;
