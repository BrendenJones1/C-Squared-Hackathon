import React from 'react'
import './AnalysisResults.css'

function AnalysisResults({ results }) {
  const { bias_score, international_student_bias_score, inclusivity_score, red_flags, breakdown } = results

  const getScoreColor = (score) => {
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  const getScoreLabel = (score) => {
    if (score >= 70) return 'High bias risk'
    if (score >= 40) return 'Moderate bias risk'
    return 'Low bias risk'
  }

  const getInclusivityColor = (score) => {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
  }

  return (
    <div className="analysis-results-card">
      <h2 className="card-title">Bias Analysis Results</h2>
      <p className="card-subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', marginTop: '-8px' }}>
        Comprehensive analysis of potential bias indicators
      </p>

      <div className="scores-section">
        <div className="score-card main-score">
          <div className="score-label">Overall Bias Score</div>
          <div className={`score-value ${getScoreColor(bias_score)}`}>
            {bias_score}/100
          </div>
          <div className="score-description">{getScoreLabel(bias_score)}</div>
        </div>

        <div className="score-card intl-score">
          <div className="score-label">International Student Bias</div>
          <div
            className={`score-value ${getScoreColor(
              international_student_bias_score
            )}`}
          >
            {international_student_bias_score}/100
          </div>
          <div className="score-description">
            {getScoreLabel(international_student_bias_score)}
          </div>
        </div>

        {inclusivity_score && (
          <div className="score-card inclusivity-score">
            <div className="score-label">Inclusivity Score</div>
            <div className={`score-value ${getInclusivityColor(inclusivity_score.overall_inclusivity_score)}`}>
              {inclusivity_score.overall_inclusivity_score}/100
            </div>
            <div className="score-description">{inclusivity_score.interpretation}</div>
          </div>
        )}
      </div>

      {inclusivity_score && inclusivity_score.breakdown && (
        <div className="inclusivity-breakdown-section">
          <h3 className="section-title">Inclusivity Breakdown</h3>
          <div className="breakdown-items">
            <div className="breakdown-item">
              <span className="breakdown-label">Gender Bias:</span>
              <span className="breakdown-value">{inclusivity_score.breakdown.gender_bias}/100</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Age Bias:</span>
              <span className="breakdown-value">{inclusivity_score.breakdown.age_bias}/100</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Disability Bias:</span>
              <span className="breakdown-value">{inclusivity_score.breakdown.disability_bias}/100</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Cultural Fit Bias:</span>
              <span className="breakdown-value">{inclusivity_score.breakdown.cultural_fit_bias}/100</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Exclusionary Language:</span>
              <span className="breakdown-value">{inclusivity_score.breakdown.exclusionary_language}/100</span>
            </div>
            {inclusivity_score.breakdown.appearance_bias !== undefined && (
              <div className="breakdown-item">
                <span className="breakdown-label">Appearance Bias:</span>
                <span className="breakdown-value">{inclusivity_score.breakdown.appearance_bias}/100</span>
              </div>
            )}
          </div>
        </div>
      )}

      {breakdown && (
        <div className="breakdown-section">
          <h3 className="section-title">Breakdown</h3>
          <div className="breakdown-items">
            <div className="breakdown-item">
              <span className="breakdown-label">Visa Requirements:</span>
              <span className="breakdown-value">
                {breakdown.visa_requirements} pts
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Language Bias:</span>
              <span className="breakdown-value">
                {breakdown.language_bias} pts
              </span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Cultural Assumptions:</span>
              <span className="breakdown-value">
                {breakdown.cultural_assumptions} pts
              </span>
            </div>
            {breakdown.gender_discrimination !== undefined && (
              <div className="breakdown-item">
                <span className="breakdown-label">Gender Discrimination:</span>
                <span className="breakdown-value">{breakdown.gender_discrimination} pts</span>
              </div>
            )}
            {breakdown.age_discrimination !== undefined && (
              <div className="breakdown-item">
                <span className="breakdown-label">Age Discrimination:</span>
                <span className="breakdown-value">{breakdown.age_discrimination} pts</span>
              </div>
            )}
            {breakdown.disability_discrimination !== undefined && (
              <div className="breakdown-item">
                <span className="breakdown-label">Disability Discrimination:</span>
                <span className="breakdown-value">{breakdown.disability_discrimination} pts</span>
              </div>
            )}
            {breakdown.appearance_discrimination !== undefined && (
              <div className="breakdown-item">
                <span className="breakdown-label">Appearance Discrimination:</span>
                <span className="breakdown-value">{breakdown.appearance_discrimination} pts</span>
              </div>
            )}
            <div className="breakdown-item">
              <span className="breakdown-label">Other Exclusionary Terms:</span>
              <span className="breakdown-value">
                {breakdown.other_exclusionary} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {red_flags && red_flags.length > 0 && (
        <div className="red-flags-section">
          <h3 className="section-title">Red Flags</h3>
          <div className="red-flags-list">
            {red_flags.map((flag, index) => (
              <div key={index} className={`red-flag ${flag.severity}`}>
                <span className="flag-icon">{flag.icon}</span>
                <div className="flag-content">
                  {flag.category && (
                    <span className="flag-category">{flag.category}</span>
                  )}
                  <span className="flag-text">{flag.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisResults

