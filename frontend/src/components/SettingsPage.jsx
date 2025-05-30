import React, { useState } from 'react';
import './SettingsPage.css';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [testDate, setTestDate] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const handleApiKeyChange = (event) => {
    setApiKey(event.target.value);
    setSaveMessage(''); // Clear message on new input
  };

  const handleTestDateChange = (event) => {
    setTestDate(event.target.value);
    setSaveMessage(''); // Clear message on new input
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Settings Saved:');
    console.log('DeepSeek API Key:', apiKey);
    console.log('Next Test Date:', testDate);
    // In a real app, you would save these to localStorage, context, or a backend.
    setSaveMessage('Settings saved to console!'); 
    // Optionally clear fields after save, or keep them:
    // setApiKey(''); 
    // setTestDate('');
  };

  return (
    <div className="page-container settings-page-container"> {/* Use page-container */}
      <h1 className="page-title">Settings</h1>
      <div className="card"> {/* Wrap form in a card */}
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="apiKey">DeepSeek API Key:</label>
            <input
              type="password" 
              id="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your DeepSeek API Key"
              className="form-control" // Use global form-control
            />
            <small className="form-text">Your API key is stored locally and used for AI features.</small> {/* Use global form-text */}
          </div>

          <div className="form-group">
            <label htmlFor="testDate">Your Next Test Date:</label>
            <input
              type="date"
              id="testDate"
              value={testDate}
              onChange={handleTestDateChange}
              className="form-control" // Use global form-control
            />
            <small className="form-text">Knowing your test date helps tailor your study plan.</small> {/* Use global form-text */}
          </div>

          <button type="submit" className="button button-success">Save Settings</button> {/* Use global button */}
          {saveMessage && <p className="alert alert-success save-message">{saveMessage}</p>} {/* Use global alert */}
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
