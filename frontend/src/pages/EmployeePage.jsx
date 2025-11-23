import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import JobInput from '../components/JobInput'
import AnalysisResults from '../components/AnalysisResults'
import CompanyDEI from '../components/CompanyDEI'
import AlternativeJobs from '../components/AlternativeJobs'
import '../App.css'

function EmployeePage() {
  const navigate = useNavigate()
  const [jobText, setJobText] = useState('')
  const [analysisResults, setAnalysisResults] = useState(null)
  const [companyData, setCompanyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async (text) => {
    if (!text || text.trim().length < 10) {
      setError('Please provide a job description with at least 10 characters.')
      return
    }
    
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 10000)

    try {
      const response = await fetch('http://localhost:8000/analyze/full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Analysis failed. Please check your connection and try again.')
      }
      
      const data = await response.json()
      setAnalysisResults(data)
      setJobText(text)
      
      let companyName = null
      const patterns = [
        /(?:at|from|company:)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s|$|,|\.|;)/i,
        /(?:Company|Employer):\s*([A-Z][a-zA-Z0-9\s&]+?)(?:\s|$|,|\.|;)/i,
        /([A-Z][a-zA-Z0-9\s&]+?)\s+(?:is|seeks|looking|hiring)/i,
        /(?:Join|Work at|Apply to)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:\s|$|,|\.|;)/i
      ]
      
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
          companyName = match[1].trim()
          companyName = companyName.replace(/\s+(Inc|LLC|Corp|Corporation|Ltd|Limited)$/i, '')
          if (companyName.length > 2 && companyName.length < 50) {
            break
          }
        }
      }
      
      if (companyName) {
        await fetchCompanyData(companyName)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Analysis took longer than 10 seconds and was cancelled. Please try again or shorten the job description.')
      } else {
        setError(err.message)
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const fetchCompanyData = async (companyName) => {
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
      }
    } catch (err) {
      console.error('Failed to fetch company data:', err)
    }
  }

  const handleParseLink = async (url) => {
    setLoading(true)
    setError(null)
    
    try {
      new URL(url)
    } catch {
      const errorMsg = 'Please enter a valid URL (e.g., https://linkedin.com/jobs/view/...)'
      setError(errorMsg)
      setLoading(false)
      throw new Error(errorMsg)
    }
    
    try {
      const response = await fetch('http://localhost:8000/parse-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.detail || 'Link parsing failed. Please check your connection and try again.'
        setError(errorMsg)
        throw new Error(errorMsg)
      }
      
      const data = await response.json()
      if (data.success && data.raw_text) {
        setJobText(data.raw_text)
        await handleAnalyze(data.raw_text)
      } else {
        throw new Error(
          data.error || 'Could not detect a valid job posting at this URL. The site may require login, use heavy JavaScript, or may not be a standard job posting page.'
        )
      }
    } catch (err) {
      const errorMsg = err.message || 'An unexpected error occurred. Please try again or paste the job description text directly.'
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-layout">
          <div className="left-column">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => navigate('/jobseeker/jobs')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'var(--simplify-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--simplify-green)'}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L2 5.5L8 9L14 5.5L8 2Z" fill="white"/>
                  <path d="M2 11.5L8 15L14 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2 8.5L8 12L14 8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Browse Jobs on Simplify
              </button>
            </div>
            <JobInput
              onAnalyze={handleAnalyze}
              onParseLink={handleParseLink}
              loading={loading}
              initialText={jobText}
            />
            {error && <div className="error-message">{error}</div>}
            {analysisResults && (
              <AnalysisResults results={analysisResults} />
            )}
          </div>
          
          <div className="right-column">
            {companyData && (
              <CompanyDEI data={companyData} />
            )}
            {(companyData?.alternatives && companyData.alternatives.length > 0) || 
             (companyData?.alternative_jobs && companyData.alternative_jobs.length > 0) ? (
              <AlternativeJobs 
                alternatives={companyData.alternatives || []} 
                alternativeJobs={companyData.alternative_jobs || []}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}

export default EmployeePage

