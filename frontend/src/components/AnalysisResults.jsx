import React from 'react'
import './AnalysisResults.css'

function AnalysisResults({ results }) {
  const { bias_score, international_student_bias_score, red_flags, breakdown } = results

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

  return (
    <div className="analysis-results-card">
      <h2 className="card-title">Bias Analysis Results</h2>

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
          <div className={`score-value ${getScoreColor(international_student_bias_score)}`}>
            {international_student_bias_score}/100
          </div>
          <div className="score-description">{getScoreLabel(international_student_bias_score)}</div>
        </div>
      </div>

      {breakdown && (
        <div className="breakdown-section">
          <h3 className="section-title">Breakdown</h3>
          <div className="breakdown-items">
            <div className="breakdown-item">
              <span className="breakdown-label">Visa Requirements:</span>
              <span className="breakdown-value">{breakdown.visa_requirements} pts</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Language Bias:</span>
              <span className="breakdown-value">{breakdown.language_bias} pts</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Cultural Assumptions:</span>
              <span className="breakdown-value">{breakdown.cultural_assumptions} pts</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Other Exclusionary Terms:</span>
              <span className="breakdown-value">{breakdown.other_exclusionary} pts</span>
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
                <span className="flag-text">{flag.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisResults

