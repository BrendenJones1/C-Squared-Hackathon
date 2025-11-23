import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SimplifyNav from '../components/SimplifyNav'
import './JobBoardPage.css'

function JobBoardPage() {
  const navigate = useNavigate()
  const [selectedJob, setSelectedJob] = useState(0)
  const [activeTab, setActiveTab] = useState('summary')
  const [biasAnalysis, setBiasAnalysis] = useState(null)
  const [biasLoading, setBiasLoading] = useState(false)

  const jobs = [
    {
      id: 0,
      company: 'Salesforce',
      logo: 'SF',
      title: 'Intern',
      type: 'Internship',
      location: 'Seattle, WA, USA + 2 more',
      remote: 'In Person',
      salary: null,
      tags: ['Software Engineering', 'Full-Stack Engineering'],
      companySize: '10,001+ employees',
      companyDesc: 'Cloud-based CRM software provider',
      requirements: [
        'Enrolled and working towards obtaining a BS/MS in Computer Science or related field',
        'In order to be eligible for an internship, we require that you be returning to school after the Summer 2026 program to work towards completing your degree',
        'Must be attending a College or University in North America',
        'Strong background in Computer Science or a related engineering discipline',
        'Strong understanding of object-oriented programming/design, algorithms, and data structures and how to efficiently implement them into a solution',
        'Strong understanding of CS fundamentals and practical coding application',
        'Team player with demonstrated collaboration skills'
      ],
      responsibilities: [
        'The software engineering intern role will give you hands-on experience with architecture, design, implementation, and testing as you ensure we build products customers trust and love'
      ],
      desiredQualifications: [
        'Proficiency in SQL and relational database concepts',
        'Proficiency in Java, Javascript and related frameworks',
        'Working knowledge of HTML and web technologies',
        'Knowledge of front end and back end languages',
        'Strong communication skills - written, verbal and visual',
        'Strong analytical and problem-solving skills',
        'Commitment to delivering high-quality solutions',
        'Self-motivated and eager to learn',
        'Experience using telemetry and metrics to drive operational excellence',
        'Ability to quickly adapt to new technologies'
      ],
      additionalLocations: ['San Francisco, CA, USA', 'Bellevue, WA, USA'],
      applyLink: 'https://simplify.jobs/p/40e34901-0127-44d1-90fb-a4b6b9948046/Intern'
    },
    {
      id: 1,
      company: 'Summit Ridge Enterprises',
      logo: 'SR',
      title: 'Front Desk Coordinator',
      type: 'Full-Time',
      location: 'Toronto, ON, Canada',
      remote: 'In Person',
      salary: null,
      tags: [],
      companySize: '11-50 employees',
      companyDesc: 'Traditional workplace culture focused on professional presentation',
      requirements: [
        'Female applicants only — role requires a "pleasant feminine presence"',
        'Ages 20–30 to match our youthful office',
        'Native English speakers only',
        'Must be a Canadian-born citizen — no international students, PR applicants, or work-permit holders',
        'Must have a presentable physical appearance: No visible tattoos, No braids, dyed hair, or "non-professional" hairstyles, No piercings outside of a single ear piercing',
        'Must be able to stand for long hours — no accommodation provided',
        'Must have your own car',
        'Comfortable with after-hours socializing with the team',
        'Must "fit company culture," meaning outgoing, extroverted, and able to blend with our tight-knit group'
      ],
      responsibilities: [
        'Greeting clients upon arrival',
        'Managing schedules',
        'Answering phones and sorting mail',
        'Assisting management with administrative tasks'
      ],
      desiredQualifications: [
        'Lives within 10 minutes of the office — we do not offer relocation',
        'Background in hospitality or modelling',
        'Instagram profile that reflects "professional personal branding"'
      ]
    },
    {
      id: 2,
      company: 'GreenSpark Software',
      logo: 'GS',
      title: 'Software Engineer',
      type: 'Full-Time',
      location: 'New York, NY, USA',
      remote: 'Remote',
      salary: null,
      tags: [],
      companySize: '11-50 employees',
      companyDesc: 'Software for scrap yard operations management',
      requirements: [
        '4+ years of professional software engineering experience',
        'Expertise in React JavaScript/TypeScript',
        'Advanced knowledge of cloud platforms (AWS, Azure, GCP)',
        'Strong problem-solving and communication skills'
      ]
    },
    {
      id: 3,
      company: 'Valon',
      logo: 'V',
      title: 'Software Engineer',
      type: 'Full-Time',
      location: 'San Francisco, CA, USA + 1 more',
      salary: '$140k - $200k /yr',
      remote: 'In Person',
      tags: [],
      companySize: '51-200 employees',
      companyDesc: 'Financial technology solutions',
      requirements: [
        '5+ years of software development experience',
        'Strong background in Python and Java',
        'Experience with microservices architecture'
      ]
    },
    {
      id: 4,
      company: 'Exegy',
      logo: 'E',
      title: 'Software Engineer',
      type: 'Full-Time',
      location: 'New York, NY, USA',
      remote: 'Remote',
      salary: null,
      tags: [],
      companySize: '201-500 employees',
      companyDesc: 'Enterprise software solutions',
      requirements: [
        '4+ years of software engineering experience',
        'Expertise in C++ or Java',
        'Experience with high-performance systems'
      ]
    }
  ]

  const selectedJobData = jobs[selectedJob]

  // Function to combine job text for bias analysis
  const getJobTextForAnalysis = (job) => {
    let text = `${job.title} at ${job.company}\n\n`
    
    if (job.requirements && job.requirements.length > 0) {
      text += 'Requirements:\n' + job.requirements.join('\n') + '\n\n'
    }
    
    if (job.responsibilities && job.responsibilities.length > 0) {
      text += 'Responsibilities:\n' + job.responsibilities.join('\n') + '\n\n'
    }
    
    if (job.desiredQualifications && job.desiredQualifications.length > 0) {
      text += 'Desired Qualifications:\n' + job.desiredQualifications.join('\n') + '\n\n'
    }
    
    return text
  }

  // Fetch bias analysis when job is selected
  useEffect(() => {
    const analyzeJobBias = async () => {
      const job = jobs[selectedJob]
      if (!job) return
      
      setBiasLoading(true)
      setBiasAnalysis(null)
      
      try {
        const jobText = getJobTextForAnalysis(job)
        const response = await fetch('http://localhost:8000/analyze/full', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: jobText, use_nlp: false }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setBiasAnalysis(data)
        }
      } catch (error) {
        console.error('Error analyzing job bias:', error)
      } finally {
        setBiasLoading(false)
      }
    }
    
    analyzeJobBias()
  }, [selectedJob])

  // Convert bias score to readable format
  const getBiasRanking = (biasScore) => {
    if (biasScore === null || biasScore === undefined) return { label: 'N/A', color: '#666' }
    
    // Bias score is 0-100 where higher is worse
    if (biasScore >= 70) {
      return { label: 'High Bias Risk', color: '#EF4444' }
    } else if (biasScore >= 40) {
      return { label: 'Moderate Bias Risk', color: '#F59E0B' }
    } else if (biasScore >= 20) {
      return { label: 'Low Bias Risk', color: '#10B981' }
    } else {
      return { label: 'Very Low Bias Risk', color: '#10B981' }
    }
  }

  const biasRanking = biasAnalysis ? getBiasRanking(biasAnalysis.bias_score) : { label: 'Analyzing...', color: '#666' }

  return (
    <div className="job-board-page">
      <SimplifyNav currentPage="jobs" />
      <div className="job-board-container">
        <div className="job-board-left">
          <div className="search-section">
            <h1 className="search-title">Search All Jobs</h1>
            <div className="search-bar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Software Engineering" defaultValue="Software Engineering" />
            </div>
            <div className="filters">
              <button className="filter-chip active">
                Location (1)
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="filter-chip active">
                Job Type (2)
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="filter-chip">Experience Level</button>
              <button className="filter-chip active">
                Category (6)
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="filter-chip">More filters</button>
            </div>
            <div className="filter-actions">
              <button className="save-search-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M3 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Save Search
              </button>
              <button className="clear-filters-btn">Clear All Filters</button>
            </div>
          </div>

          <div className="jobs-list-section">
            <div className="jobs-header">
              <span className="jobs-count">Showing 21 of 24,455 Jobs</span>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span>Most recent</span>
              </label>
            </div>
            <div className="jobs-list">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`job-card ${selectedJob === job.id ? 'selected' : ''}`}
                  onClick={() => setSelectedJob(job.id)}
                >
                  <div className="job-card-content">
                    <div className="job-company-logo">{job.logo}</div>
                    <div className="job-card-info">
                      <Link to={`/jobseeker/company?company=${encodeURIComponent(job.company)}`} className="job-card-company-link">
                        <div className="job-card-company">{job.company}</div>
                      </Link>
                      <div className="job-card-title">{job.title}</div>
                      <div className="job-card-meta">
                        <span>{job.type}</span>
                        {job.salary && <span>{job.salary}</span>}
                        <span>{job.location}</span>
                        <span>{job.remote}</span>
                      </div>
                    </div>
                  </div>
                  <button className="job-bookmark">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="job-board-right">
          <div className="job-details">
            <div className="job-details-actions">
              <button className="action-btn">Already Applied?</button>
              <button className="action-btn icon-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
              <a 
                href={selectedJobData.applyLink || '#'} 
                target={selectedJobData.applyLink ? "_blank" : undefined}
                rel={selectedJobData.applyLink ? "noopener noreferrer" : undefined}
                className="action-btn primary-btn"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L3 7v11h14V7l-7-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Apply
              </a>
            </div>

            <div className="job-tabs">
              <button
                className={`job-tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button
                className={`job-tab ${activeTab === 'full' ? 'active' : ''}`}
                onClick={() => setActiveTab('full')}
              >
                Full Job Posting
              </button>
            </div>

            {activeTab === 'summary' && (
              <div className="job-summary">
                <h2 className="job-detail-title">{selectedJobData.title}</h2>
                <p className="job-status">Confirmed live in the last 24 hours</p>

                <div className="job-lock-section">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="4" y="7" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Unlock job analytics with Simplify+</span>
                </div>

                <div className="company-info-section">
                  <div className="company-header">
                    <div className="company-logo-large">{selectedJobData.logo}</div>
                    <div>
                      <Link to={`/jobseeker/company?company=${encodeURIComponent(selectedJobData.company)}`} className="company-name-link">
                        <div className="company-name">{selectedJobData.company}</div>
                      </Link>
                      <div className="company-size">{selectedJobData.companySize || '11-50 employees'}</div>
                    </div>
                  </div>
                  <p className="company-description">{selectedJobData.companyDesc || 'Software for scrap yard operations management'}</p>
                </div>

                <div className="job-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Salary</span>
                    <span className="detail-value">No salary listed</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Experience level</span>
                    <span className="detail-value">
                      {selectedJobData.type === 'Internship' ? 'Intern' : 'Mid, Senior'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">
                      {selectedJobData.location}
                      {selectedJobData.additionalLocations && selectedJobData.additionalLocations.length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {selectedJobData.additionalLocations.map((loc, idx) => (
                            <div key={idx}>{loc}</div>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Bias Ranking</span>
                    <span className="detail-value" style={{ color: biasRanking.color, fontWeight: '600' }}>
                      {biasLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          <span style={{ 
                            width: '12px', 
                            height: '12px', 
                            border: '2px solid currentColor',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            display: 'inline-block'
                          }}></span>
                          Analyzing...
                        </span>
                      ) : (
                        biasRanking.label
                      )}
                    </span>
                  </div>
                </div>

                <div className="candidate-preferences">
                  <h3>You match the following {selectedJobData.company}'s candidate preferences</h3>
                  <p className="preferences-subtitle">Employers are more likely to interview you if you match these preferences:</p>
                  <div className="preferences-list">
                    <div className="preference-item match">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8" stroke="#10B981" strokeWidth="2"/>
                        <path d="M6 10l3 3 5-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>Degree</span>
                    </div>
                    <div className="preference-item no-match">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="2"/>
                        <path d="M7 7l6 6M13 7l-6 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>Experience</span>
                    </div>
                  </div>
                </div>

                <div className="referral-section">
                  <div className="referral-content">
                    <div>
                      <p className="referral-text">You have ways to get a {selectedJobData.company} referral from your network.</p>
                      <a href="#" className="referral-link">Get referrals →</a>
                    </div>
                    <div className="referral-avatars">
                      <div className="referral-avatar">A</div>
                      <div className="referral-avatar">B</div>
                      <div className="referral-avatar">C</div>
                    </div>
                  </div>
                </div>

                {selectedJobData.requirements && (
                  <div className="requirements-section">
                    <h3>Requirements</h3>
                    <ul className="requirements-list">
                      {selectedJobData.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJobData.responsibilities && (
                  <div className="requirements-section">
                    <h3>Responsibilities</h3>
                    <ul className="requirements-list">
                      {selectedJobData.responsibilities.map((resp, idx) => (
                        <li key={idx}>{resp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJobData.desiredQualifications && (
                  <div className="requirements-section">
                    <h3>Desired Qualifications</h3>
                    <ul className="requirements-list">
                      {selectedJobData.desiredQualifications.map((qual, idx) => (
                        <li key={idx}>{qual}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!selectedJobData.requirements && !selectedJobData.responsibilities && !selectedJobData.desiredQualifications && (
                  <div className="requirements-section">
                    <h3>Requirements</h3>
                    <ul className="requirements-list">
                      <li>4+ years of professional software engineering experience</li>
                      <li>Expertise in React JavaScript/TypeScript</li>
                      <li>Advanced knowledge of cloud platforms (AWS, Azure, GCP)</li>
                      <li>Strong problem-solving and communication skills</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'full' && (
              <div className="job-full-posting">
                <p>Full job posting content would go here...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobBoardPage

