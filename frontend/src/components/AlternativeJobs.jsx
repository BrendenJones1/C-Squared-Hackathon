import React from 'react'
import './AlternativeJobs.css'

function AlternativeJobs({ alternatives = [], alternativeJobs = [] }) {
  return (
    <div className="alternative-jobs-card">
      <h3 className="card-title">Safer Alternative Opportunities</h3>
      <p className="card-subtitle">International-friendly job postings and companies</p>

      {alternativeJobs.length > 0 && (
        <div className="alternatives-section">
          <h4 className="section-subtitle">Similar Job Postings</h4>
          <div className="alternatives-list">
            {alternativeJobs.map((job, index) => (
              <div key={index} className="alternative-item job-item">
                <div className="alt-header">
                  <div className="alt-job-title">{job.job_title}</div>
                  <div className="alt-company">{job.company}</div>
                  <div className="alt-badges">
                    {job.badges?.map((badge, i) => (
                      <span key={i} className="alt-badge">{badge}</span>
                    ))}
                  </div>
                </div>
                <div className="alt-location">{job.location}</div>
                <div className="alt-scores">
                  <div className="alt-score">
                    <span className="alt-score-label">Inclusivity:</span>
                    <span className="alt-score-value">{job.inclusivity_score?.toFixed(1)}/5.0</span>
                  </div>
                  <div className="alt-score">
                    <span className="alt-score-label">International Friendly:</span>
                    <span className="alt-score-value">{job.international_friendly?.toFixed(1)}/5.0</span>
                  </div>
                </div>
                <div className="alt-sponsorship">
                  <span className="alt-sponsorship-label">Sponsorship:</span>
                  <span className="alt-sponsorship-value">{job.sponsorship_history}</span>
                </div>
                {job.description && (
                  <div className="alt-description">{job.description.substring(0, 150)}...</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h4 className="section-subtitle">Similar Companies</h4>
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
      )}
    </div>
  )
}

export default AlternativeJobs

