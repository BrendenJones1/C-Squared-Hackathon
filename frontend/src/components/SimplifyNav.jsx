import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './SimplifyNav.css'

function SimplifyNav({ currentPage = 'jobs' }) {
  const navigate = useNavigate()

  return (
    <header className="simplify-nav">
      <div className="nav-container">
        <div className="nav-left">
          <div className="logo">
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 2C3 0 5 -1 8 -1C11 -1 13 1 13 3C13 5 11 6 8 6" stroke="#50B4D8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M3 10C4 9 6 8 8 8C11 8 13 10 13 12C13 14 11 15 8 15" stroke="#50B4D8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="logo-text">BiasLens</span>
          </div>
          <nav className="nav-links">
            <Link to="/jobseeker/dashboard" className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}>
              Dashboard
            </Link>
            <Link to="/jobseeker/matches" className={`nav-link ${currentPage === 'matches' ? 'active' : ''}`}>
              Matches
            </Link>
            <Link to="/jobseeker/jobs" className={`nav-link ${currentPage === 'jobs' ? 'active' : ''}`}>
              Jobs
            </Link>
            <Link to="/jobseeker/tracker" className={`nav-link ${currentPage === 'tracker' ? 'active' : ''}`}>
              Job Tracker
            </Link>
            <Link to="/jobseeker/documents" className={`nav-link ${currentPage === 'documents' ? 'active' : ''}`}>
              Documents
            </Link>
            <Link to="/jobseeker/profile" className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}>
              Profile
            </Link>
          </nav>
        </div>
        <div className="nav-right">
          <button className="nav-icon-btn" aria-label="Sound">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2v16M6 6h8M6 14h8" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button className="nav-icon-btn" aria-label="Help">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 14v-2M10 8v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="nav-icon-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 016 6v4l2 2H2l2-2V8a6 6 0 016-6z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="14" cy="4" r="3" fill="#EF4444"/>
            </svg>
          </button>
          <button 
            className="biaslens-btn"
            onClick={() => navigate('/employee')}
          >
            BiasLens
          </button>
          <div className="user-avatar">
            <div className="avatar-initials">SJ</div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <button className="nav-icon-btn" aria-label="Share">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 7l-5-5-5 5M10 2v12M3 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default SimplifyNav

