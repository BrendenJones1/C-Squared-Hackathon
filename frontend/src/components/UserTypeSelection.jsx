import React from 'react'
import { useNavigate } from 'react-router-dom'
import './UserTypeSelection.css'

function UserTypeSelection() {
  const navigate = useNavigate()

  return (
    <div className="user-type-selection">
      <div className="selection-container">
        <h1 className="selection-title">Welcome to BiasLens</h1>
        <p className="selection-subtitle">Choose how you'd like to use our platform</p>
        
        <div className="selection-cards">
          <button 
            className="selection-card employee-card"
            onClick={() => navigate('/employee')}
          >
            <div className="card-icon">👔</div>
            <h2 className="card-title">I'm an Employee</h2>
            <p className="card-description">
              Analyze job postings for bias and get inclusive rewrite suggestions
            </p>
          </button>
          
          <button 
            className="selection-card jobseeker-card"
            onClick={() => navigate('/jobseeker/jobs')}
          >
            <div className="card-icon">🔍</div>
            <h2 className="card-title">I'm Looking for a Job</h2>
            <p className="card-description">
              Find bias-free job opportunities and inclusive workplaces
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserTypeSelection

