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
      <h3 className="card-title" style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.3px' }}>Company DEI Snapshot</h3>
      <p className="card-subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Diversity, equity, and inclusion insights
      </p>
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

      {insights.demographics && (
        <div className="demographics-section" style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '2px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>Workforce Demographics</h4>
          
          {insights.demographics.us_workforce && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>U.S. Workforce Diversity</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--simplify-blue)' }}>{insights.demographics.us_workforce.racially_diverse}% Diverse</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Black', value: insights.demographics.us_workforce.black, color: '#3B82F6' },
                  { label: 'Latino/a/x', value: insights.demographics.us_workforce.latino, color: '#10B981' },
                  { label: 'Asian', value: insights.demographics.us_workforce.asian, color: '#8B5CF6' },
                  { label: 'White', value: insights.demographics.us_workforce.white, color: '#6B7280' },
                  { label: 'Multiracial/Other', value: insights.demographics.us_workforce.multiracial_other, color: '#F59E0B' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: '100px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {item.label}
                    </div>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-lighter)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${item.value}%`, 
                          backgroundColor: item.color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                    <div style={{ minWidth: '45px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {item.value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.demographics.global_workforce && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Global Workforce</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ minWidth: '100px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Women
                </div>
                <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-lighter)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${insights.demographics.global_workforce.women}%`, 
                      backgroundColor: '#EC4899',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ minWidth: '45px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {insights.demographics.global_workforce.women}%
                </div>
              </div>
            </div>
          )}

          {insights.demographics.executives && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Executive Leadership</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Women', value: insights.demographics.executives.women, color: '#EC4899' },
                  { label: 'White', value: insights.demographics.executives.white, color: '#6B7280' },
                  { label: 'Asian', value: insights.demographics.executives.asian, color: '#8B5CF6' },
                  { label: 'Black/Latino', value: insights.demographics.executives.black_latino, color: '#3B82F6' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: '100px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {item.label}
                    </div>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-lighter)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${item.value}%`, 
                          backgroundColor: item.color,
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div style={{ minWidth: '45px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {item.value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

