import React from 'react'
import './InternationalCompanies.css'

function InternationalCompanies({ companies }) {
  if (!companies || companies.length === 0) return null

  return (
    <div className="intl-companies-card">
      <h3 className="card-title">International-Friendly Companies</h3>
      <p className="card-subtitle">
        Top companies by inclusivity and international student friendliness
      </p>

      <div className="intl-company-list">
        {companies.map((c, index) => (
          <div key={index} className="intl-company-item">
            <div className="intl-company-header">
              <div className="intl-company-name">{c.company}</div>
              <div className="intl-company-badges">
                {c.sponsorship_history &&
                  (c.sponsorship_history === 'Very Active' ||
                    c.sponsorship_history === 'Active') && (
                    <span className="intl-badge">Verified Sponsorship</span>
                  )}
                {c.international_friendly >= 4 && (
                  <span className="intl-badge secondary">International Friendly</span>
                )}
              </div>
            </div>
            <div className="intl-company-scores">
              <div className="intl-score">
                <span className="intl-score-label">Inclusivity:</span>
                <span className="intl-score-value">
                  {c.inclusivity_score?.toFixed(1)}/5.0
                </span>
              </div>
              <div className="intl-score">
                <span className="intl-score-label">International Friendly:</span>
                <span className="intl-score-value">
                  {c.international_friendly?.toFixed(1)}/5.0
                </span>
              </div>
            </div>
            <div className="intl-company-footprint">
              <span className="intl-footprint-label">Global Footprint:</span>
              <span className="intl-footprint-value">
                {c.global_footprint && c.global_footprint.length > 0
                  ? c.global_footprint.join(', ')
                  : 'Not specified'}
              </span>
            </div>
            {c.unbiased_example && (
              <div className="intl-example">
                <span className="intl-example-label">
                  Unbiased job description example:
                </span>
                <span className="intl-example-text">{c.unbiased_example}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InternationalCompanies


