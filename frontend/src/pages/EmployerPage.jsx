import React, { useState } from 'react'
import Header from '../components/Header'
import JobInput from '../components/JobInput'
import RewritePanel from '../components/RewritePanel'
import '../App.css'

function EmployerPage() {
  const [jobText, setJobText] = useState('')
  const [rewriteResult, setRewriteResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async (text) => {
    // For employers we go straight to rewrite; no separate bias score UI
    if (!text || text.trim().length < 10) {
      setError('Please provide a job description with at least 10 characters.')
      return
    }

    setJobText(text)
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

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-layout">
          <div className="left-column">
            <JobInput
              onAnalyze={handleAnalyze}
              onParseLink={handleAnalyze}
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
                // Employer view focuses on replacements; we omit bias-category highlights here
                keywordMatches={[]}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default EmployerPage


