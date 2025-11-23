import React, { useState } from 'react'
import Header from '../components/Header'
import JobInput from '../components/JobInput'
import RewritePanel from '../components/RewritePanel'
import '../App.css'

function EmployerPage() {
  const [jobText, setJobText] = useState('')
  const [rewriteResult, setRewriteResult] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async (text) => {
    // For employers we go straight to rewrite; no separate bias score UI
    if (!text || text.trim().length < 10) {
      setError('Please provide a job description with at least 10 characters.')
      return
    }

    setJobText(text)
    // Fetch analysis to get word flag mapping
    try {
      const analysisResponse = await fetch('http://localhost:8000/analyze/full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        setAnalysisResults(analysisData)
      }
    } catch (err) {
      console.error('Failed to fetch analysis:', err)
    }
    await handleRewrite(text)
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
      setError(
        err.message || 'An unexpected error occurred during rewrite. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleParseLink = async (url) => {
    setLoading(true)
    setError(null)

    try {
      // Basic URL validation
      new URL(url)
    } catch {
      const errorMsg =
        'Please enter a valid URL (e.g., https://linkedin.com/jobs/view/...)'
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
        const errorMsg =
          errorData.detail ||
          'Link parsing failed. Please check your connection and try again.'
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      const data = await response.json()
      if (data.success && data.raw_text) {
        setJobText(data.raw_text)
        await handleRewrite(data.raw_text)
      } else {
        const errorMsg =
          data.error ||
          'Could not detect a valid job posting at this URL. The site may require login, use heavy JavaScript, or may not be a standard job posting page.'
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    } catch (err) {
      const errorMsg =
        err.message ||
        'An unexpected error occurred. Please try again or paste the job description text directly.'
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
            <JobInput
              onAnalyze={handleAnalyze}
              onParseLink={handleParseLink}
              loading={loading}
              initialText={jobText}
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="right-column">
            {rewriteResult && (
              <RewritePanel
                original={jobText}
                rewrite={rewriteResult}
                onRewrite={handleRewrite}
                keywordMatches={analysisResults?.keyword_analysis ? Object.values(analysisResults.keyword_analysis).filter(cat => cat && cat.matches) : []}
                wordFlagMapping={analysisResults?.word_flag_mapping || {}}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default EmployerPage


