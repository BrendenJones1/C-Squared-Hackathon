import React from 'react'
import './CompanyDEI.css'

function CompanyDEI({ data }) {
  const { company, insights, alternatives } = data

  if (!insights || insights.status === 'DEI data unavailable') {
    return (
      <div className="company-dei-card">
        <h3 className="card-title">Company DEI Snapshot</h3>
        <div className="unavailable-message">
          DEI data unavailable for {company}
        </div>
      </div>
    )
  }

  return (
    <div className="company-dei-card">
      <h3 className="card-title">Company DEI Snapshot</h3>
      <div className="company-name">{company}</div>

      <div className="dei-scores">
        <div className="dei-score-item">
          <span className="score-label">DEI Score</span>
          <span className="score-value">{insights.inclusivity_score?.toFixed(1)}/5.0</span>
        </div>
        <div className="dei-score-item">
          <span className="score-label">International Friendly</span>
          <span className="score-value">{insights.international_friendly?.toFixed(1)}/5.0</span>
        </div>
        <div className="dei-score-item">
          <span className="score-label">Employee Sentiment</span>
          <span className="score-value">{insights.employee_sentiment?.toFixed(1)}/5.0</span>
        </div>
      </div>

      <div className="dei-details">
        <div className="detail-item">
          <span className="detail-label">Sponsorship History:</span>
          <span className="detail-value">{insights.sponsorship_history || 'Unknown'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Diversity Report:</span>
          <span className="detail-value">
            {insights.diversity_report ? (
              <a href={insights.diversity_report} target="_blank" rel="noopener noreferrer">
                View Report
              </a>
            ) : (
              'Missing'
            )}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">EEOC Certified:</span>
          <span className="detail-value">{insights.eeoc_certified ? 'Yes' : 'No'}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Employee Resource Groups:</span>
          <span className="detail-value">{insights.erg_available ? 'Available' : 'Not Available'}</span>
        </div>
        {insights.global_footprint && insights.global_footprint.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">Global Footprint:</span>
            <span className="detail-value">{insights.global_footprint.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanyDEI

