import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Header.css';

const Header = ({ onLogin, onLogout, isLoggedIn }) => {
  const [testType, setTestType] = useState('SAT');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleTestType = () => {
    setTestType(prevType => (prevType === 'SAT' ? 'ACT' : 'SAT'));
  };

  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    onLogout();
  };

  const handlePlaceholderClick = (action) => {
    console.log(`${action} clicked`); // Placeholder action
    setDropdownOpen(false); // Close dropdown after click
  };
  
  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Using button-sm for a less prominent toggle button */}
        <button 
          onClick={toggleTestType} 
          className="button button-sm toggle-button-custom" 
          title={`Switch to ${testType === 'SAT' ? 'ACT' : 'SAT'} prep content`}
        >
          {testType === 'SAT' ? 'SAT' : 'ACT'} <span className="switch-icon">⇄</span>
        </button>
      </div>
      <div className="header-right">
        {isLoggedIn ? (
          <div className="user-menu-container" ref={dropdownRef}>
            <button onClick={toggleDropdown} className="button button-primary user-menu-button">
              Menu <span className="dropdown-icon">▼</span>
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li><Link to="/dashboard" className="button" onClick={() => setDropdownOpen(false)}>Dashboard</Link></li>
                <li><Link to="/practice" className="button" onClick={() => setDropdownOpen(false)}>Practice</Link></li>
                <li><Link to="/tests" className="button" onClick={() => setDropdownOpen(false)}>Tests</Link></li>
                <li><Link to="/analytics" className="button" onClick={() => setDropdownOpen(false)}>Analytics</Link></li>
                <li><Link to="/ai-learn" className="button" onClick={() => setDropdownOpen(false)}>AI Learn</Link></li>
                <li><Link to="/ai-tutor" className="button" onClick={() => setDropdownOpen(false)}>AI Tutor</Link></li>
                <li><hr className="dropdown-divider" /></li> {/* Optional divider */}
                <li><Link to="/settings" className="button" onClick={() => setDropdownOpen(false)}>Profile</Link></li> {/* Changed text to Profile */}
                <li><button className="button" onClick={handleLogoutClick}>Logout</button></li>
              </ul>
            )}
          </div>
        ) : (
          <>
            <button className="button button-outline-primary header-button-custom">Try for Free</button>
            <button className="button button-primary login-button-custom" onClick={onLogin}>Log In</button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
