import React, { useState } from 'react'
import './AnalysisResults.css'

function AnalysisResults({ results }) {
  const { 
    bias_score, 
    international_student_bias_score, 
    inclusivity_score, 
    red_flags, 
    breakdown,
    classification,
    sentence_insights = []
  } = results
  const [expandedCategories, setExpandedCategories] = useState({})
  const [expandedFlags, setExpandedFlags] = useState({})

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
    // For inclusivity, higher is better (green), lower is worse (red)
    if (score >= 80) return 'low'  // High inclusivity = green (low bias)
    if (score >= 60) return 'medium'  // Medium inclusivity = yellow
    return 'high'  // Low inclusivity = red (high bias)
  }

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const toggleFlagExpansion = (category, index) => {
    const key = `${category}-${index}`
    setExpandedFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const classificationLabelMap = {
    'gender-bias': 'Gender bias',
    'age-bias': 'Age bias',
    'culture-fit-bias': 'Culture fit bias',
    'intl-bias': 'International bias',
    'exclusionary-language': 'Exclusionary language',
    'disability-bias': 'Disability bias',
    neutral: 'Neutral / inclusive'
  }

  const formatClassificationLabel = (label) => {
    if (!label) return 'Unknown'
    return classificationLabelMap[label] || label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatSentenceConfidence = (level) => {
    if (level === 'low') return 'Model unsure'
    if (level === 'high') return 'Model confident'
    return 'Model signal'
  }

  const topLabel = classification?.labels?.[0]
  const classifierScoreSource = classification?.calibrated_scores?.length
    ? classification.calibrated_scores
    : classification?.scores
  const topScore = classifierScoreSource?.[0]
  const classifierConfidence = typeof topScore === 'number' ? Math.round(topScore * 100) : null
  const hasSentenceInsights = Array.isArray(sentence_insights) && sentence_insights.length > 0

  // Map red flag categories to breakdown categories
  const getFlagsForCategory = (category) => {
    if (!red_flags || red_flags.length === 0) return []
    
    const categoryMap = {
      'Visa Requirements': ['Visa/Immigration Exclusion', 'Geographic Exclusion'],
      'Language Bias': ['Language Discrimination'],
      'Cultural Assumptions': ['Cultural Fit Bias'],
      'Gender Discrimination': ['Gender Discrimination'],
      'Age Discrimination': ['Age Discrimination'],
      'Disability Discrimination': ['Disability Discrimination'],
      'Appearance Discrimination': ['Appearance Discrimination']
    }
    
    const matchingCategories = categoryMap[category] || []
    return red_flags.filter(flag => matchingCategories.includes(flag.category))
  }

  return (
    <div className="analysis-results-card">
      <h2 className="card-title">Bias Analysis Results</h2>
      <p className="card-subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', marginTop: '-8px' }}>
        Comprehensive analysis of potential bias indicators
      </p>

      <div className="scores-section">
        <div className="score-card main-score">
          <div className="score-header">
            <div className="score-label">Overall Bias Score</div>
            <div className="score-help" title="Higher scores indicate more bias detected. Lower is better.">ℹ️</div>
          </div>
          <div className={`score-value ${getScoreColor(bias_score)}`}>
            {bias_score}
          </div>
          <div className="score-progress">
            <div 
              className={`score-progress-bar ${getScoreColor(bias_score)}`}
              style={{ width: `${bias_score}%` }}
            />
          </div>
          <div className="score-description">{getScoreLabel(bias_score)}</div>
          <div className="score-context">Lower is better • 0-39: Low risk • 40-69: Moderate risk • 70+: High risk</div>
        </div>

        <div className="score-card intl-score">
          <div className="score-header">
            <div className="score-label">International Student Bias</div>
            <div className="score-help" title="Measures bias specifically affecting international students and candidates needing visa sponsorship. Lower is better.">ℹ️</div>
          </div>
          <div
            className={`score-value ${getScoreColor(
              international_student_bias_score
            )}`}
          >
            {international_student_bias_score}
          </div>
          <div className="score-progress">
            <div 
              className={`score-progress-bar ${getScoreColor(international_student_bias_score)}`}
              style={{ width: `${international_student_bias_score}%` }}
            />
          </div>
          <div className="score-description">
            {getScoreLabel(international_student_bias_score)}
          </div>
          <div className="score-context">Measures visa, language, and geographic restrictions</div>
        </div>

        {inclusivity_score && (
          <div className="score-card inclusivity-score">
            <div className="score-header">
              <div className="score-label">Inclusivity Score</div>
              <div className="score-help" title="Higher scores indicate more inclusive language. Higher is better.">ℹ️</div>
            </div>
            <div className={`score-value ${getInclusivityColor(inclusivity_score.overall_inclusivity_score)}`}>
              {Math.round(inclusivity_score.overall_inclusivity_score)}
            </div>
            <div className="score-progress">
              <div 
                className={`score-progress-bar ${getInclusivityColor(inclusivity_score.overall_inclusivity_score)}`}
                style={{ width: `${inclusivity_score.overall_inclusivity_score}%` }}
              />
            </div>
            <div className="score-description">{inclusivity_score.interpretation}</div>
            <div className="score-context">Higher is better • 80+: Highly Inclusive • 60-79: Moderate • Below 60: Needs Improvement</div>
          </div>
        )}
      </div>

      {inclusivity_score && inclusivity_score.breakdown && (
        <div className="inclusivity-breakdown-section">
          <h3 className="section-title">Bias Category Breakdown</h3>
          <p className="section-description">These scores show bias levels in each category. Lower scores are better (less bias detected).</p>
          <div className="breakdown-items">
            <div className="breakdown-item">
              <div className="breakdown-info">
                <span className="breakdown-label">Gender Bias</span>
                <span className="breakdown-desc">Masculine/feminine coded language or explicit gender preferences</span>
              </div>
              <div className="breakdown-right">
                <div className="breakdown-progress">
                  <div 
                    className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.gender_bias)}`}
                    style={{ width: `${inclusivity_score.breakdown.gender_bias}%` }}
                  />
                </div>
                <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.gender_bias)}`}>
                  {Math.round(inclusivity_score.breakdown.gender_bias)}
                </span>
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-info">
                <span className="breakdown-label">Age Bias</span>
                <span className="breakdown-desc">Age restrictions or age-coded language</span>
              </div>
              <div className="breakdown-right">
                <div className="breakdown-progress">
                  <div 
                    className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.age_bias)}`}
                    style={{ width: `${inclusivity_score.breakdown.age_bias}%` }}
                  />
                </div>
                <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.age_bias)}`}>
                  {Math.round(inclusivity_score.breakdown.age_bias)}
                </span>
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-info">
                <span className="breakdown-label">Disability Bias</span>
                <span className="breakdown-desc">Physical requirements or accommodation refusals</span>
              </div>
              <div className="breakdown-right">
                <div className="breakdown-progress">
                  <div 
                    className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.disability_bias)}`}
                    style={{ width: `${inclusivity_score.breakdown.disability_bias}%` }}
                  />
                </div>
                <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.disability_bias)}`}>
                  {Math.round(inclusivity_score.breakdown.disability_bias)}
                </span>
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-info">
                <span className="breakdown-label">Cultural Fit Bias</span>
                <span className="breakdown-desc">Vague cultural fit requirements that may exclude diverse candidates</span>
              </div>
              <div className="breakdown-right">
                <div className="breakdown-progress">
                  <div 
                    className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.cultural_fit_bias)}`}
                    style={{ width: `${inclusivity_score.breakdown.cultural_fit_bias}%` }}
                  />
                </div>
                <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.cultural_fit_bias)}`}>
                  {Math.round(inclusivity_score.breakdown.cultural_fit_bias)}
                </span>
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-info">
                <span className="breakdown-label">Exclusionary Language</span>
                <span className="breakdown-desc">Visa restrictions, language requirements, geographic limitations</span>
              </div>
              <div className="breakdown-right">
                <div className="breakdown-progress">
                  <div 
                    className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.exclusionary_language)}`}
                    style={{ width: `${inclusivity_score.breakdown.exclusionary_language}%` }}
                  />
                </div>
                <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.exclusionary_language)}`}>
                  {Math.round(inclusivity_score.breakdown.exclusionary_language)}
                </span>
              </div>
            </div>
            {inclusivity_score.breakdown.appearance_bias !== undefined && (
              <div className="breakdown-item">
                <div className="breakdown-info">
                  <span className="breakdown-label">Appearance Bias</span>
                  <span className="breakdown-desc">Tattoo, piercing, or hairstyle restrictions</span>
                </div>
                <div className="breakdown-right">
                  <div className="breakdown-progress">
                    <div 
                      className={`breakdown-progress-bar ${getScoreColor(inclusivity_score.breakdown.appearance_bias)}`}
                      style={{ width: `${inclusivity_score.breakdown.appearance_bias}%` }}
                    />
                  </div>
                  <span className={`breakdown-value ${getScoreColor(inclusivity_score.breakdown.appearance_bias)}`}>
                    {Math.round(inclusivity_score.breakdown.appearance_bias)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {breakdown && (
        <div className="breakdown-section">
          <h3 className="section-title">Issue Count Summary</h3>
          <p className="section-description">Click on any category to see specific issues found. Number of problematic phrases detected in each category.</p>
          <div className="breakdown-items">
            {breakdown.visa_requirements > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Visa Requirements'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Visa Requirements')}>
                  <span className="breakdown-label">Visa Requirements:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.visa_requirements} {breakdown.visa_requirements === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Visa Requirements'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Visa Requirements'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Visa Requirements').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Visa Requirements-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Visa Requirements-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Visa Requirements', index)}
                            aria-label={expandedFlags[`Visa Requirements-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Visa Requirements-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Visa Requirements').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.language_bias > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Language Bias'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Language Bias')}>
                  <span className="breakdown-label">Language Bias:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.language_bias} {breakdown.language_bias === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Language Bias'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Language Bias'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Language Bias').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Language Bias-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Language Bias-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Language Bias', index)}
                            aria-label={expandedFlags[`Language Bias-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Language Bias-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Language Bias').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.cultural_assumptions > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Cultural Assumptions'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Cultural Assumptions')}>
                  <span className="breakdown-label">Cultural Assumptions:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.cultural_assumptions} {breakdown.cultural_assumptions === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Cultural Assumptions'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Cultural Assumptions'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Cultural Assumptions').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Cultural Assumptions-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Cultural Assumptions-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Cultural Assumptions', index)}
                            aria-label={expandedFlags[`Cultural Assumptions-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Cultural Assumptions-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Cultural Assumptions').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.gender_discrimination !== undefined && breakdown.gender_discrimination > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Gender Discrimination'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Gender Discrimination')}>
                  <span className="breakdown-label">Gender Discrimination:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.gender_discrimination} {breakdown.gender_discrimination === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Gender Discrimination'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Gender Discrimination'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Gender Discrimination').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Gender Discrimination-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Gender Discrimination-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Gender Discrimination', index)}
                            aria-label={expandedFlags[`Gender Discrimination-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Gender Discrimination-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Gender Discrimination').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.age_discrimination !== undefined && breakdown.age_discrimination > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Age Discrimination'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Age Discrimination')}>
                  <span className="breakdown-label">Age Discrimination:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.age_discrimination} {breakdown.age_discrimination === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Age Discrimination'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Age Discrimination'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Age Discrimination').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Age Discrimination-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Age Discrimination-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Age Discrimination', index)}
                            aria-label={expandedFlags[`Age Discrimination-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Age Discrimination-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Age Discrimination').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.disability_discrimination !== undefined && breakdown.disability_discrimination > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Disability Discrimination'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Disability Discrimination')}>
                  <span className="breakdown-label">Disability Discrimination:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.disability_discrimination} {breakdown.disability_discrimination === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Disability Discrimination'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Disability Discrimination'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Disability Discrimination').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Disability Discrimination-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Disability Discrimination-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Disability Discrimination', index)}
                            aria-label={expandedFlags[`Disability Discrimination-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Disability Discrimination-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Disability Discrimination').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.appearance_discrimination !== undefined && breakdown.appearance_discrimination > 0 && (
              <div className={`breakdown-item clickable ${expandedCategories['Appearance Discrimination'] ? 'expanded' : ''}`}>
                <div className="breakdown-item-header" onClick={() => toggleCategoryExpansion('Appearance Discrimination')}>
                  <span className="breakdown-label">Appearance Discrimination:</span>
                  <div className="breakdown-header-right">
                    <span className="breakdown-count">{breakdown.appearance_discrimination} {breakdown.appearance_discrimination === 1 ? 'issue' : 'issues'}</span>
                    <span className="breakdown-arrow">{expandedCategories['Appearance Discrimination'] ? '▼' : '▶'}</span>
                  </div>
                </div>
                {expandedCategories['Appearance Discrimination'] && (
                  <div className="breakdown-flags">
                    {getFlagsForCategory('Appearance Discrimination').map((flag, index) => (
                      <div key={index} className={`red-flag ${flag.severity} ${expandedFlags[`Appearance Discrimination-${index}`] ? 'expanded' : ''}`}>
                        <span className="flag-icon">{flag.icon}</span>
                        <div className="flag-content">
                          <span className="flag-text">{flag.text}</span>
                          {flag.explanation && (
                            <div className={`flag-details ${expandedFlags[`Appearance Discrimination-${index}`] ? 'visible' : ''}`}>
                              <div className="flag-explanation">
                                <strong>Why this is problematic:</strong> {flag.explanation}
                              </div>
                              {flag.suggestion && (
                                <div className="flag-suggestion">
                                  <strong>How to fix it:</strong> {flag.suggestion}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {flag.explanation && (
                          <button 
                            className="flag-expand-btn"
                            onClick={() => toggleFlagExpansion('Appearance Discrimination', index)}
                            aria-label={expandedFlags[`Appearance Discrimination-${index}`] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedFlags[`Appearance Discrimination-${index}`] ? '−' : '+'}
                          </button>
                        )}
                      </div>
                    ))}
                    {getFlagsForCategory('Appearance Discrimination').length === 0 && (
                      <div className="no-flags-message">No specific issues flagged in this category</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {breakdown.other_exclusionary > 0 && (
              <div className="breakdown-item">
                <span className="breakdown-label">Other Exclusionary Terms:</span>
                <span className="breakdown-count">{breakdown.other_exclusionary} {breakdown.other_exclusionary === 1 ? 'issue' : 'issues'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {classification?.labels && (
        <div className="nlp-summary-section">
          <div className="nlp-summary-card">
            <div className="nlp-summary-header">
              <div className="nlp-summary-label">
                <span className="nlp-chip">NLP Signal</span>
                <h3>{formatClassificationLabel(topLabel)}</h3>
              </div>
              {classifierConfidence !== null && (
                <span className="nlp-confidence">{classifierConfidence}% confidence</span>
              )}
            </div>
            <p className="nlp-summary-description">
              {topLabel === 'neutral'
                ? 'Our MNLI model considers this posting broadly inclusive.'
                : 'The MNLI classifier detected meaningful bias patterns in this posting.'}
            </p>
            <div className="nlp-summary-meta">
              {classification?.fallback ? (
                <span className="nlp-fallback">Keyword fallback in use — NLP model unavailable</span>
              ) : (
                <span className="nlp-provider">
                  Provider: {classification?.provider ? classification.provider.toUpperCase() : 'MNLI'}
                </span>
              )}
              {typeof classification?.latency_ms === 'number' && (
                <span className="nlp-latency">{classification.latency_ms} ms</span>
              )}
            </div>
          </div>

          <div className="nlp-sentence-card">
            <div className="nlp-sentence-header">
              <h4>Top flagged sentences</h4>
              <span className="nlp-sentence-subtitle">
                {hasSentenceInsights
                  ? `Showing up to ${Math.min(3, sentence_insights.length)} of ${sentence_insights.length} (includes low-confidence suggestions)`
                  : 'Model confidence below threshold'}
              </span>
            </div>
            {hasSentenceInsights ? (
              <ul className="nlp-sentence-list">
                {sentence_insights.slice(0, 3).map((insight, index) => (
                  <li key={`${insight.label}-${index}`} className="nlp-sentence-item">
                    <div className="nlp-sentence-meta">
                      <span className="nlp-sentence-label">
                        {formatClassificationLabel(insight.label)}
                      </span>
                      <div className="nlp-sentence-meta-right">
                        <span
                          className={`nlp-sentence-confidence ${insight.confidence_level === 'low' ? 'low' : 'high'}`}
                        >
                          {formatSentenceConfidence(insight.confidence_level)}
                        </span>
                        <span className="nlp-sentence-score">
                          {Math.round((insight.calibrated_score ?? insight.score ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                    <p>“{insight.sentence}”</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="nlp-sentence-empty">
                No specific sentences crossed the NLP confidence threshold.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default AnalysisResults

