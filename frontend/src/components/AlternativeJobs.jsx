import React from 'react'
import './AlternativeJobs.css'

function AlternativeJobs({ alternatives }) {
  return (
    <div className="alternative-jobs-card">
      <h3 className="card-title">Safer Alternative Companies</h3>
      <p className="card-subtitle">International-friendly job postings</p>

      <div className="alternatives-list">
        {alternatives.map((alt, index) => (
          <div key={index} className="alternative-item">
            <div className="alt-header">
              <div className="alt-company">{alt.company}</div>
              <div className="alt-badges">
                {alt.badges?.map((badge, i) => (
                  <span key={i} className="alt-badge">{badge}</span>
                ))}
              </div>
            </div>
            <div className="alt-scores">
              <div className="alt-score">
                <span className="alt-score-label">Inclusivity:</span>
                <span className="alt-score-value">{alt.inclusivity_score?.toFixed(1)}/5.0</span>
              </div>
              <div className="alt-score">
                <span className="alt-score-label">International Friendly:</span>
                <span className="alt-score-value">{alt.international_friendly?.toFixed(1)}/5.0</span>
              </div>
            </div>
            <div className="alt-sponsorship">
              <span className="alt-sponsorship-label">Sponsorship:</span>
              <span className="alt-sponsorship-value">{alt.sponsorship_history}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AlternativeJobs

