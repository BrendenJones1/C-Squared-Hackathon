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
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/analyze/full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      if (!response.ok) {
        throw new Error('Analysis failed')
      }
      
      const data = await response.json()
      setAnalysisResults(data)
      setJobText(text)
      
      // Extract company name if possible (simple extraction)
      const companyMatch = text.match(/(?:at|from|company:)\s+([A-Z][a-zA-Z\s]+)/i)
      if (companyMatch) {
        const companyName = companyMatch[1].trim()
        await fetchCompanyData(companyName)
      }
      
      // Automatically generate rewrite
      await handleRewrite(text)
    } catch (err) {
      setError(err.message)
    } finally {
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
        throw new Error('Rewrite failed')
      }
      
      const data = await response.json()
      setRewriteResult(data)
    } catch (err) {
      setError(err.message)
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
    try {
      const response = await fetch('http://localhost:8000/parse-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      
      if (!response.ok) {
        throw new Error('Link parsing failed')
      }
      
      const data = await response.json()
      if (data.success && data.raw_text) {
        setJobText(data.raw_text)
        await handleAnalyze(data.raw_text)
      } else {
        throw new Error(data.error || 'Could not extract job posting from URL. The site may require login or use JavaScript rendering.')
      }
    } catch (err) {
      setError(err.message)
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
              />
            )}
            {companyData && (
              <CompanyDEI data={companyData} />
            )}
            {companyData?.alternatives && companyData.alternatives.length > 0 && (
              <AlternativeJobs alternatives={companyData.alternatives} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

