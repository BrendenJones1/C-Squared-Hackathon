import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SimplifyNav from '../components/SimplifyNav'
import CompanyDEI from '../components/CompanyDEI'
import './CompanyPage.css'

function CompanyPage() {
  const navigate = useNavigate()
  const [biasRating, setBiasRating] = useState(null)
  const [overallRating, setOverallRating] = useState('B')
  const [companyData, setCompanyData] = useState(null)
  
  // Get company name from URL params or default to GreenSpark Software
  const urlParams = new URLSearchParams(window.location.search)
  const companyName = urlParams.get('company') || 'GreenSpark Software'
  
  // Convert letter grade to numeric value
  const gradeToNumber = (grade) => {
    const gradeMap = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 }
    return gradeMap[grade] || 0
  }
  
  // Convert numeric value to letter grade
  const numberToGrade = (num) => {
    if (num >= 3.5) return 'A'
    if (num >= 2.5) return 'B'
    if (num >= 1.5) return 'C'
    if (num >= 0.5) return 'D'
    return 'F'
  }
  
  // Calculate overall rating as average of all ratings
  const calculateOverallRating = (biasGrade) => {
    const competitiveEdge = 'C'
    const growthPotential = 'A'
    const differentiation = 'B'
    const biasInclusivity = biasGrade || 'B'
    
    const ratings = [competitiveEdge, growthPotential, differentiation, biasInclusivity]
    const numericValues = ratings.map(gradeToNumber)
    const average = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
    return numberToGrade(average)
  }
  
  // Company details mapping
  const companyDetails = {
    'GreenSpark Software': {
      logo: 'GS',
      tagline: 'Software for scrap yard operations management',
      size: '11-50',
      stage: 'Early VC',
      funding: '$14.4M',
      industries: ['Data & Analytics', 'Enterprise Software'],
      description: 'GreenSpark Software builds a cloud-based, all-in-one software platform for scrap yards. It combines receiving, inventory tracking, and customer management with analytics in a single, easy-to-use system delivered on a subscription. The software replaces multiple tools by storing data in the cloud and guiding operations from receipt to sale. Its goal is to help scrap yards save time and money, improve data accuracy, and enable business growth by streamlining processes.'
    },
    'Salesforce': {
      logo: 'SF',
      tagline: 'Cloud-based CRM software provider',
      size: '10,001+',
      stage: 'IPO',
      funding: null,
      industries: ['Enterprise Software', 'CRM', 'Cloud Computing'],
      description: 'Salesforce is a cloud-based customer relationship management (CRM) software company. The company provides Customer 360, a comprehensive suite of integrated products that help companies connect with their customers in entirely new ways. Salesforce offers a subscription-based model with an integrated suite of modules for sales, service, marketing, commerce, and more. The company has built a robust app ecosystem and serves a global customer base, helping businesses improve customer relationships and drive growth.'
    },
    'Summit Ridge Enterprises': {
      logo: 'SR',
      tagline: 'Traditional workplace culture focused on professional presentation',
      size: '11-50',
      stage: 'Private',
      funding: null,
      industries: ['Administrative Services', 'Office Management'],
      description: 'Summit Ridge Enterprises maintains a traditional workplace culture focused on professional presentation and maintaining a specific company image. The company emphasizes traditional values and expects staff to present themselves in a manner that aligns with their established workplace standards.'
    },
    'Amazon': {
      logo: 'AM',
      tagline: 'Earth\'s most customer-centric company',
      size: '10,001+',
      stage: 'IPO',
      funding: null,
      industries: ['E-commerce', 'Cloud Computing', 'Technology', 'Retail'],
      description: 'Amazon is a multinational technology company focusing on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence. The company is one of the Big Five American information technology companies, alongside Alphabet, Apple, Meta, and Microsoft. Amazon is known for its disruption of well-established industries through technological innovation and mass scale.'
    }
  }
  
  const currentCompanyDetails = companyDetails[companyName] || companyDetails['GreenSpark Software']

  useEffect(() => {
    async function fetchBiasRating() {
      try {
        const response = await fetch('http://localhost:8000/company/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ company: companyName }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setCompanyData(data)
          const insights = data.insights
          
          if (insights && insights.inclusivity_score !== null && insights.inclusivity_score !== undefined) {
            // Convert 0-5 scale to letter grade
            const score = insights.inclusivity_score
            let grade
            if (score >= 4.5) grade = 'A'
            else if (score >= 4.0) grade = 'B'
            else if (score >= 3.5) grade = 'C'
            else if (score >= 3.0) grade = 'D'
            else grade = 'F'
            
            setBiasRating(grade)
            setOverallRating(calculateOverallRating(grade))
          } else {
            // If no bias rating, calculate overall from the three hardcoded ratings
            setOverallRating(calculateOverallRating(null))
          }
        } else {
          // If API call fails, still calculate overall from hardcoded ratings
          setOverallRating(calculateOverallRating(null))
        }
      } catch (error) {
        console.error('Error fetching bias rating:', error)
        // On error, calculate overall from hardcoded ratings
        setOverallRating(calculateOverallRating(null))
      }
    }
    
    fetchBiasRating()
  }, [companyName])

  return (
    <div className="company-page">
      <SimplifyNav />
      <div className="company-page-container">
        <div className="company-page-left">
          <button className="back-button" onClick={() => navigate('/jobseeker/jobs')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Back
          </button>

          <div className="company-header-section">
            <div className="company-logo-xl">
              {companyName === 'Salesforce' ? (
                <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#00A1E0' }}>SF</span>
              ) : companyName === 'Summit Ridge Enterprises' ? (
                <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#6366F1' }}>SR</span>
              ) : companyName === 'Amazon' ? (
                <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#FF9900' }}>AM</span>
              ) : (
                <>
                  <span className="logo-g">{currentCompanyDetails.logo[0]}</span>
                  <span className="logo-s">{currentCompanyDetails.logo[1]}</span>
                  <span className="logo-spark">*</span>
                </>
              )}
            </div>
            <div className="company-title-section">
              <h1 className="company-name-large">{companyName}</h1>
              <p className="company-tagline">{currentCompanyDetails.tagline}</p>
            </div>
          </div>

          <div className="company-actions">
            <button className="company-action-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M3 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Website
            </button>
            <button className="company-action-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              in
            </button>
            <button className="company-action-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M3 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Share
            </button>
            <div className="claim-section">
              <p className="claim-text">Work Here?</p>
              <button className="claim-btn">Claim Your Company</button>
            </div>
          </div>

          <div className="overview-section">
            <h2 className="section-title">Overview</h2>
            {companyData?.insights?.sponsorship_history && companyData.insights.sponsorship_history !== 'Unknown' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', color: 'var(--simplify-green)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L3 4l5 4 5-4-5-4z" fill="currentColor"/>
                  <path d="M3 10l5 4 5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Company Historically Provides H1B Sponsorship</span>
              </div>
            )}
            <p className="overview-text">
              {currentCompanyDetails.description}
            </p>
          </div>

          <div className="referral-section-large">
            <div className="referral-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="referral-content-large">
              <h3 className="referral-title">Want to apply to {companyName}?</h3>
              <p className="referral-text-large">You have ways to get a {companyName} referral from your network.</p>
              <div className="referral-avatars-large">
                <div className="referral-avatar-large">A</div>
                <div className="referral-avatar-large">B</div>
                <div className="referral-avatar-large">C</div>
              </div>
              <button className="referral-link-btn">Get referrals →</button>
            </div>
          </div>

          <div className="simplify-take-section">
            <div className="take-header">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L2 7l8 5 8-5-8-5z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <h3 className="take-title">Simplify's Take</h3>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="take-subtitle">What believers are saying</p>
            <ul className="take-list">
              <li>Strong adoption by industry leaders like Nucor and Sims Metal validates product-market fit.</li>
            </ul>
          </div>
        </div>

        <div className="company-page-right">
          <h2 className="about-title">About {companyName}</h2>

          <div className="rating-section">
            <div className="rating-header">
              <h3 className="rating-title">Simplify's Rating</h3>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="rating-badge">
              <div className="rating-grade">{overallRating}</div>
              <p className="rating-explanation">Why {companyName} is rated {overallRating}</p>
            </div>

            <div className="rating-breakdown">
              <div className="rating-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Rated C on Competitive Edge</span>
              </div>
              <div className="rating-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 10h16M10 2v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Rated A on Growth Potential</span>
              </div>
              <div className="rating-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5h10v10H5z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 8h4v4H8z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Rated B on Differentiation</span>
              </div>
              {biasRating && (
                <div className="rating-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span>Rated {biasRating} on Bias & Inclusivity</span>
                </div>
              )}
            </div>
          </div>

          <div className="industries-section">
            <h3 className="industries-title">Industries</h3>
            <div className="industries-tags">
              {currentCompanyDetails.industries.map((industry, idx) => (
                <span key={idx} className="industry-tag">{industry}</span>
              ))}
            </div>
          </div>

          <div className="company-details-section">
            <div className="company-detail-item">
              <span className="detail-label">Company Size:</span>
              <span className="detail-value">{currentCompanyDetails.size}</span>
            </div>
            <div className="company-detail-item">
              <span className="detail-label">Company Stage:</span>
              <span className="detail-value">{currentCompanyDetails.stage}</span>
            </div>
            {currentCompanyDetails.funding && (
              <div className="company-detail-item">
                <span className="detail-label">Total Funding:</span>
                <span className="detail-value">{currentCompanyDetails.funding}</span>
              </div>
            )}
            {companyName === 'Salesforce' && (
              <>
                <div className="company-detail-item">
                  <span className="detail-label">Headquarters:</span>
                  <span className="detail-value">San Francisco, California</span>
                </div>
                <div className="company-detail-item">
                  <span className="detail-label">Founded:</span>
                  <span className="detail-value">1999</span>
                </div>
              </>
            )}
            {companyName === 'Summit Ridge Enterprises' && (
              <>
                <div className="company-detail-item">
                  <span className="detail-label">Headquarters:</span>
                  <span className="detail-value">Toronto, Ontario, Canada</span>
                </div>
                <div className="company-detail-item">
                  <span className="detail-label">Founded:</span>
                  <span className="detail-value">2015</span>
                </div>
              </>
            )}
            {companyName === 'Amazon' && (
              <>
                <div className="company-detail-item">
                  <span className="detail-label">Headquarters:</span>
                  <span className="detail-value">Seattle, Washington</span>
                </div>
                <div className="company-detail-item">
                  <span className="detail-label">Founded:</span>
                  <span className="detail-value">1994</span>
                </div>
              </>
            )}
          </div>

          {companyData && companyData.insights && companyData.insights.status !== 'DEI data unavailable' && (
            <div style={{ marginTop: '32px' }}>
              <CompanyDEI data={companyData} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyPage

