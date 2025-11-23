import React, { useState, useEffect } from 'react'
import './JobInput.css'

function JobInput({ onAnalyze, onParseLink, loading, initialText }) {
  const [inputMode, setInputMode] = useState('text') // 'text' or 'link'
  const [text, setText] = useState(initialText || '')
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [linkSuccess, setLinkSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (inputMode === 'link' && url) {
      setAnalyzing(true)
      setLinkSuccess(null)
      try {
        await onParseLink(url)
        setLinkSuccess(true)
      } catch (err) {
        setLinkSuccess(false)
      }
      setAnalyzing(false)
    } else if (inputMode === 'text' && text.trim()) {
      setAnalyzing(true)
      await onAnalyze(text)
      setAnalyzing(false)
    }
  }
  
  // Reset success message when URL changes
  useEffect(() => {
    if (url) {
      setLinkSuccess(null)
    }
  }, [url])

  return (
    <div className="job-input-card">
      <h2 className="card-title">Analyze Job Posting</h2>
      <p className="card-subtitle">Detect bias and get inclusive rewrite suggestions</p>
      
      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
          aria-label="Switch to text input mode"
          aria-pressed={inputMode === 'text'}
        >
          Paste Text
        </button>
        <button
          className={`mode-btn ${inputMode === 'link' ? 'active' : ''}`}
          onClick={() => setInputMode('link')}
          aria-label="Switch to URL input mode"
          aria-pressed={inputMode === 'link'}
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
          aria-label="Analyze job posting for bias"
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
        <div className="link-info">
          {linkSuccess === true && (
            <p className="link-success">
              ✅ Successfully extracted job posting!
            </p>
          )}
          {linkSuccess === false && (
            <div className="link-error">
              <p style={{ marginBottom: '8px' }}>
                ⚠️ Could not extract job posting automatically.
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Many job sites (like LinkedIn) require login or use JavaScript that prevents automatic extraction. 
                Please copy and paste the job description text directly into the text area above.
              </p>
            </div>
          )}
          {linkSuccess === null && (
            <>
              <p className="link-hint">
                ✅ Auto-detecting job posting from LinkedIn, Indeed, Glassdoor, and more
              </p>
              <p className="link-tip">
                Tip: If parsing fails, try copying the job description text directly
              </p>
            </>
          )}
        </div>
      )}
      
      <p className="analysis-hint">
        ⚡ Fast keyword-based analysis (NLP disabled for speed)
      </p>
    </div>
  )
}

export default JobInput

