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
        <button onClick={toggleTestType} className="toggle-button">
          Switch to {testType === 'SAT' ? 'ACT' : 'SAT'}
        </button>
      </div>
      <div className="header-right">
        {isLoggedIn ? (
          <div className="user-menu-container" ref={dropdownRef}>
            <button onClick={toggleDropdown} className="user-menu-button">
              Menu {/* Or User Icon */}
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li><Link to="/dashboard" onClick={() => setDropdownOpen(false)}>Dashboard</Link></li>
                <li><Link to="/practice" onClick={() => setDropdownOpen(false)}>Practice</Link></li>
                <li><Link to="/tests" onClick={() => setDropdownOpen(false)}>Tests</Link></li>
                {/* Placeholder button for Profile */}
                <li><button onClick={() => handlePlaceholderClick('Profile')}>Profile</button></li>
                <li><button onClick={handleLogoutClick}>Logout</button></li>
              </ul>
            )}
          </div>
        ) : (
          <>
            <button className="header-button">Try for Free</button>
            <button className="header-button login-button" onClick={onLogin}>Log In</button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
