import React, { useState } from 'react'
import Header from './components/Header'
import JobInput from './components/JobInput'
import AnalysisResults from './components/AnalysisResults'
import RewritePanel from './components/RewritePanel'
import CompanyDEI from './components/CompanyDEI'
import AlternativeJobs from './components/AlternativeJobs'
import './App.css'

function App() {
  const [jobText, setJobText] = useState('')
  const [analysisResults, setAnalysisResults] = useState(null)
  const [rewriteResult, setRewriteResult] = useState(null)
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
    }, 10000) // 10 seconds

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
      
      // Extract company name if possible (improved extraction)
      let companyName = null
      
      // Try multiple patterns
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
          // Clean up common suffixes
          companyName = companyName.replace(/\s+(Inc|LLC|Corp|Corporation|Ltd|Limited)$/i, '')
          if (companyName.length > 2 && companyName.length < 50) {
            break
          }
        }
      }
      
      if (companyName) {
        await fetchCompanyData(companyName)
      }
      
      // Automatically generate rewrite
      await handleRewrite(text)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError(
          'Analysis took longer than 10 seconds and was cancelled. Please try again or shorten the job description.'
        )
      } else {
        setError(err.message)
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleRewrite = async (textToRewrite = null) => {
    const text = textToRewrite || jobText
    if (!text) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Rewrite failed. Please try again.')
      }
      
      const data = await response.json()
      setRewriteResult(data)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during rewrite. Please try again.')
    } finally {
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
    
    // Validate URL format
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
      
      // Check if parsing was successful
      if (data.success && data.raw_text) {
        setJobText(data.raw_text)
        await handleAnalyze(data.raw_text)
      } else {
        // Show helpful error message
        const errorMsg = data.error || data.message || 
          'Could not detect a valid job posting at this URL. Many job sites (like LinkedIn) require authentication or use JavaScript rendering that prevents automatic extraction.\n\nPlease try:\n1. Copying the job description text directly\n2. Using a different job board (Indeed, Glassdoor)\n3. Checking if the URL is publicly accessible'
        setError(errorMsg)
        throw new Error(errorMsg)
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
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="main-content" role="main">
        <div className="content-layout">
          <div className="left-column">
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
            {rewriteResult && (
              <RewritePanel
                original={jobText}
                rewrite={rewriteResult}
                onRewrite={handleRewrite}
                keywordMatches={analysisResults?.keyword_analysis ? Object.values(analysisResults.keyword_analysis) : []}
              />
            )}
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

export default App

