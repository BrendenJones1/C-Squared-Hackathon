import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Header.css'

function Header() {
  const location = useLocation()
  
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/employee" className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A66C2"/>
            <path d="M2 17L12 22L22 17" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="logo-text">BiasLens</span>
        </Link>
        <nav className="header-nav">
          <Link to="/employee" className={`nav-item ${location.pathname === '/employee' ? 'active' : ''}`}>
            Analyze
          </Link>
          <Link to="/jobseeker/jobs" className="nav-item simplify-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 2L2 5.5L8 9L14 5.5L8 2Z" fill="#10B981"/>
              <path d="M2 11.5L8 15L14 11.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 8.5L8 12L14 8.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Simplify Job Board
          </Link>
          <a href="#" className="nav-item">About</a>
        </nav>
      </div>
    </header>
  )
}

export default Header

