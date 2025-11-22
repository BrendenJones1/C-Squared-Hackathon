import React from 'react'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0A66C2"/>
            <path d="M2 17L12 22L22 17" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="logo-text">BiasLens</span>
        </div>
        <nav className="header-nav">
          <a href="#" className="nav-item active">Analyze</a>
          <a href="#" className="nav-item">About</a>
        </nav>
      </div>
    </header>
  )
}

export default Header

