import React, { useState } from 'react'
import './JobInput.css'

function JobInput({ onAnalyze, onParseLink, loading, initialText }) {
  const [inputMode, setInputMode] = useState('text') // 'text' or 'link'
  const [text, setText] = useState(initialText || '')
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (inputMode === 'link' && url) {
      setAnalyzing(true)
      await onParseLink(url)
      setAnalyzing(false)
    } else if (inputMode === 'text' && text.trim()) {
      setAnalyzing(true)
      await onAnalyze(text)
      setAnalyzing(false)
    }
  }

  return (
    <div className="job-input-card">
      <h2 className="card-title">Analyze Job Posting</h2>
      
      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
        >
          Paste Text
        </button>
        <button
          className={`mode-btn ${inputMode === 'link' ? 'active' : ''}`}
          onClick={() => setInputMode('link')}
        >
          Paste Link
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        {inputMode === 'text' ? (
          <textarea
            className="job-textarea"
            placeholder="Paste job description here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            disabled={loading || analyzing}
          />
        ) : (
          <input
            type="url"
            className="job-url-input"
            placeholder="Paste job posting URL (LinkedIn, Indeed, etc.)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading || analyzing}
          />
        )}

        <button
          type="submit"
          className="analyze-btn"
          disabled={loading || analyzing || (inputMode === 'text' && !text.trim()) || (inputMode === 'link' && !url.trim())}
        >
          {analyzing ? (
            <>
              <span className="spinner"></span>
              Analyzing posting for bias...
            </>
          ) : (
            'Analyze for Bias'
          )}
        </button>
      </form>

      {inputMode === 'link' && (
        <p className="link-hint">
          Auto-detecting job posting... (Mock implementation)
        </p>
      )}
      
      <p className="analysis-hint">
        ⚡ Fast keyword-based analysis (NLP disabled for speed)
      </p>
    </div>
  )
}

export default JobInput

