import React, { useState, useEffect, useRef } from 'react';
import './AITutorPage.css'; // We will create this next

const AITutorPage = () => {
  const [messages, setMessages] = useState([
    { id: 'initial-ai', sender: 'ai', text: 'Hello! I am your AI Tutor. How can I help you prepare today?' }
  ]);
  const [currentMessageInput, setCurrentMessageInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null); // For scrolling to bottom

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentMessageInput.trim()) return;

    const newUserMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: currentMessageInput.trim(),
    };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setCurrentMessageInput('');
    setIsLoadingResponse(true);
    setError(null);

    // Construct history (e.g., last 5 messages, excluding the initial one if desired)
    const contextHistory = messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));
    // If the very first message was the AI's greeting and we don't want to include it as "assistant" history for the first user query:
    if (contextHistory.length > 0 && messages[0].id === 'initial-ai' && messages.length <= 6) { // if initial is part of last 5
        // decide if initial-ai should be part of history. For now, let's keep it simple and include.
    }


    try {
      const response = await fetch('/api/ai-tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newUserMessage.text,
          history: contextHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.response) {
        const newAiMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.response,
        };
        setMessages(prevMessages => [...prevMessages, newAiMessage]);
      } else if (data.error) {
        setError(data.message || 'Received an error from AI Tutor service.');
      } else {
        setError('Received an unexpected response from AI Tutor service.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to AI Tutor service. Please check your connection or API key setup.');
      console.error("AI Tutor fetch error:", err);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return (
    <div className="page-container ai-tutor-page-container">
      <h1 className="page-title">AI Tutor Chat</h1>
      <div className="card chat-card">
        <div className="chat-messages-area">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.sender}`}>
              <p className="message-text">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
        </div>
        
        <div className="tutor-capabilities-info">
          <p>
            <strong>Hint:</strong> I can help with specific questions, explain SAT/ACT concepts, and discuss test-taking strategies, time management, or even calculator tips!
          </p>
        </div>

        {isLoadingResponse && <p className="typing-indicator">AI Tutor is typing...</p>}
        {error && <p className="error-message chat-error">{error}</p>}
        
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            className="form-control chat-input"
            value={currentMessageInput}
            onChange={(e) => setCurrentMessageInput(e.target.value)}
            placeholder="Ask your question..."
            disabled={isLoadingResponse}
          />
          <button 
            type="submit" 
            className="button button-primary send-button"
            disabled={isLoadingResponse || !currentMessageInput.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AITutorPage;
