import React, { useState, useMemo, useRef, useEffect } from 'react'
import './RewritePanel.css'

function RewritePanel({ 
  original, 
  rewrite, 
  onRewrite, 
  keywordMatches = [], 
  sentenceInsights = [] 
}) {
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('rewritten') // 'original', 'rewritten'
  const [approvedChanges, setApprovedChanges] = useState(
    rewrite?.changes ? rewrite.changes.map(() => true) : []
  )
  const [copied, setCopied] = useState(false)

  const originalScrollRef = useRef(null)
  const rewrittenScrollRef = useRef(null)
  const isSyncingScroll = useRef(false)

  useEffect(() => {
    setApprovedChanges(rewrite?.changes ? rewrite.changes.map(() => true) : [])
    setCopied(false)
  }, [rewrite])

  const parsedChanges = useMemo(() => {
    if (!rewrite?.changes) return []
    return rewrite.changes
      .map((change) => {
        const match = change.match(/Replaced '(.+?)' with '(.+?)'/)
        if (!match) return null
        return {
          original: match[1],
          replacement: match[2],
          description: change,
        }
      })
      .filter(Boolean)
  }, [rewrite])

  const toggleApproved = (index) => {
    setApprovedChanges((prev) => {
      const base =
        prev && prev.length === (rewrite?.changes?.length || 0)
          ? [...prev]
          : rewrite?.changes
          ? rewrite.changes.map(() => true)
          : []
      if (!base.length) return base
      base[index] = !base[index]
      return base
    })
  }

  const handleSyncedScroll = (source) => (e) => {
    if (isSyncingScroll.current) return
    const sourceEl = e.currentTarget
    const targetEl =
      source === 'original' ? rewrittenScrollRef.current : originalScrollRef.current
    if (!targetEl) return

    const maxSource = sourceEl.scrollHeight - sourceEl.clientHeight || 1
    const ratio = sourceEl.scrollTop / maxSource
    const maxTarget = targetEl.scrollHeight - targetEl.clientHeight

    isSyncingScroll.current = true
    targetEl.scrollTop = ratio * maxTarget
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  // Highlight biased words in original text
  const labelMap = {
    'gender-bias': 'Gender bias',
    'age-bias': 'Age bias',
    'culture-fit-bias': 'Culture fit bias',
    'intl-bias': 'International bias',
    'exclusionary-language': 'Exclusionary language',
    'disability-bias': 'Disability bias',
  }

  const hasSentenceInsights = Array.isArray(sentenceInsights) && sentenceInsights.length > 0

  const formatLabel = (label) => {
    if (!label) return 'Bias'
    return labelMap[label] || label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatConfidenceLabel = (level) => {
    if (level === 'low') return 'Model unsure'
    if (level === 'high') return 'Model confident'
    return 'Model signal'
  }

  const highlightBiasedWords = (text) => {
    if (!text) return text

    let highlighted = text

    // Primary: highlight original biased phrases based on rewrite change log
    if (parsedChanges.length > 0) {
      parsedChanges.forEach(({ original }) => {
        if (!original) return
        const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern =
          original.split(' ').length === 1
            ? new RegExp(`\\b${escaped}\\b`, 'gi')
            : new RegExp(escaped, 'gi')
        highlighted = highlighted.replace(
          pattern,
          (match) =>
            `<mark class="biased-word-original" title="Original biased phrase">${match}</mark>`
        )
      })
      return highlighted
    }

    // Fallback: use keyword matches if no parsed changes are available
    if (!keywordMatches || keywordMatches.length === 0) {
      return text
    }

    const allMatches = []
    const seenIndices = new Set()

    keywordMatches.forEach((category) => {
      if (category && category.matches && Array.isArray(category.matches)) {
        category.matches.forEach((match) => {
          if (!match || typeof match !== 'string') return

          const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const pattern =
            match.split(' ').length === 1
              ? `\\b${escapedMatch}\\b`
              : escapedMatch

          try {
            const regex = new RegExp(pattern, 'gi')
            let result
            const textCopy = text
            while ((result = regex.exec(textCopy)) !== null) {
              const key = `${result.index}-${result.index + result[0].length}`
              if (!seenIndices.has(key)) {
                seenIndices.add(key)
                allMatches.push({
                  text: result[0],
                  index: result.index,
                  length: result[0].length,
                })
              }
            }
          } catch {
            // skip invalid regex patterns
          }
        })
      }
    })

    allMatches.sort((a, b) => b.index - a.index)

    allMatches.forEach((match) => {
      const before = highlighted.substring(0, match.index)
      const matched = highlighted.substring(
        match.index,
        match.index + match.length
      )
      const after = highlighted.substring(match.index + match.length)
      highlighted = `${before}<mark class="biased-word-original" title="Biased language detected">${matched}</mark>${after}`
    })

    return highlighted
  }

  // Highlight changed words in rewritten text
  const highlightChanges = (originalText, rewrittenText) => {
    if (!originalText || !rewrittenText) return rewrittenText
    let highlighted = rewrittenText

    if (parsedChanges.length > 0) {
      parsedChanges.forEach(({ replacement }) => {
        if (!replacement) return
        const escaped = replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern =
          replacement.split(' ').length === 1
            ? new RegExp(`\\b${escaped}\\b`, 'gi')
            : new RegExp(escaped, 'gi')
        highlighted = highlighted.replace(
          pattern,
          (match) =>
            `<mark class="changed-word-rewritten" title="Inclusive replacement">${match}</mark>`
        )
      })
      return highlighted
    }

    return highlighted
  }

  const highlightedOriginal = useMemo(
    () => highlightBiasedWords(original),
    [original, keywordMatches, parsedChanges]
  )
  const highlightedRewritten = useMemo(
    () => highlightChanges(original, rewrite.rewritten_text),
    [original, rewrite.rewritten_text, parsedChanges]
  )

  // Get preview text (first 200 chars)
  const previewText = rewrite.rewritten_text.substring(0, 200) + (rewrite.rewritten_text.length > 200 ? '...' : '')

  return (
    <>
      <div className="rewrite-panel-card">
        <div className="panel-header">
          <div className="header-left">
            <h3 className="panel-title">Inclusive Rewrite</h3>
            <span className="panel-badge">✓ Optimized</span>
          </div>
          <div className="header-actions">
            <button
              className="compare-btn"
              onClick={() => setShowModal(true)}
              title="View side-by-side comparison"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2H7V7H2V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 2H14V7H9V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 9H7V14H2V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9H14V14H9V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Compare
            </button>
          </div>
        </div>

        <div className="rewrite-preview">
          <div className="preview-header">
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'rewritten' ? 'active' : ''}`}
                onClick={() => setViewMode('rewritten')}
              >
                Rewritten
              </button>
              <button
                className={`toggle-btn ${viewMode === 'original' ? 'active' : ''}`}
                onClick={() => setViewMode('original')}
              >
                Original
              </button>
            </div>
          </div>

          <div className="preview-content">
            {viewMode === 'original' ? (
              <div 
                className="preview-text" 
                dangerouslySetInnerHTML={{ __html: highlightedOriginal.substring(0, 300) + (original.length > 300 ? '...' : '') }}
              />
            ) : (
              <div className="preview-text">{previewText}</div>
            )}
          </div>
        </div>

        {rewrite.changes && rewrite.changes.length > 0 && (
          <div className="changes-section">
            <h4 className="changes-title">
              <span className="changes-icon">✨</span>
              Key Changes ({rewrite.changes.length})
            </h4>
            <div className="changes-grid">
              {rewrite.changes.slice(0, 3).map((change, index) => {
                const globalIndex = index
                const isApproved =
                  approvedChanges[globalIndex] === undefined
                    ? true
                    : approvedChanges[globalIndex]
                return (
                  <button
                    type="button"
                    key={globalIndex}
                    className={`change-badge ${
                      isApproved ? '' : 'change-badge-unapproved'
                    }`}
                    onClick={() => toggleApproved(globalIndex)}
                  >
                    <span
                      className={`change-status-dot ${
                        isApproved ? 'approved' : 'pending'
                      }`}
                    />
                    <span className="change-badge-text">{change}</span>
                    <span className="change-status-label">
                      {isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </button>
                )
              })}
              {rewrite.changes.length > 3 && (
                <button 
                  className="view-all-changes-btn"
                  onClick={() => setShowModal(true)}
                >
                  +{rewrite.changes.length - 3} more
                </button>
              )}
            </div>
          </div>
        )}

        <div className="nlp-insights-section">
          <div className="nlp-insights-header">
            <h4 className="nlp-title">
              <span role="img" aria-label="ai">🤖</span> Potentially Biased Sentences (NLP)
            </h4>
            <span className="nlp-subtitle">
              Powered by MNLI classifier
            </span>
          </div>
          {hasSentenceInsights ? (
            <ul className="nlp-sentence-list">
              {sentenceInsights.map((insight, index) => (
                <li key={`${insight.label}-${index}`} className="nlp-sentence">
                  <div className="nlp-sentence-header">
                    <span className={`nlp-label-badge nlp-${insight.label || 'generic'}`}>
                      {formatLabel(insight.label)}
                    </span>
                    <span className="nlp-score">
                      {Math.round((insight.calibrated_score ?? insight.score ?? 0) * 100)}% confidence
                    </span>
                  </div>
                  <div className={`nlp-confidence-chip ${insight.confidence_level === 'low' ? 'low' : 'high'}`}>
                    {formatConfidenceLabel(insight.confidence_level)}
                  </div>
                  <p className="nlp-sentence-text">“{insight.sentence}”</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="nlp-empty-state">
              No high-confidence biased sentences flagged. Great job keeping the language inclusive!
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button className="rewrite-btn secondary" onClick={() => setShowModal(true)}>
            View Full Comparison
          </button>
          <button className="rewrite-btn primary" onClick={(e) => {
            e.preventDefault()
            onRewrite()
          }}>
            Regenerate
          </button>
        </div>
      </div>

      {/* Modal for side-by-side comparison */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Side-by-Side Comparison</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="side-by-side-container">
                <div className="text-content original-panel">
                  <div className="text-label">
                    <span className="label-icon">⚠️</span>
                    Original
                    <span className="label-badge">Biased terms highlighted</span>
                  </div>
                  <div 
                    className="text-body" 
                    ref={originalScrollRef}
                    onScroll={handleSyncedScroll('original')}
                    dangerouslySetInnerHTML={{ __html: highlightedOriginal }}
                  />
                </div>
                <div className="text-content rewritten-panel">
                  <div className="text-label">
                    <span className="label-icon">✓</span>
                    Rewritten
                    <span className="label-badge">Inclusive version</span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard
                            .writeText(rewrite.rewritten_text)
                            .then(() => {
                              setCopied(true)
                              setTimeout(() => setCopied(false), 1500)
                            })
                            .catch(() => {
                              // silently ignore copy failures
                            })
                        }
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy text'}
                    </button>
                  </div>
                  <div 
                    className="text-body" 
                    ref={rewrittenScrollRef}
                    onScroll={handleSyncedScroll('rewritten')}
                    dangerouslySetInnerHTML={{ __html: highlightedRewritten }}
                  />
                </div>
              </div>

              {rewrite.changes && rewrite.changes.length > 0 && (
                <div className="modal-changes-section">
                  <h3 className="modal-changes-title">All Changes Made</h3>
                  <ul className="modal-changes-list">
                    {rewrite.changes.map((change, index) => {
                      const isApproved =
                        approvedChanges[index] === undefined
                          ? true
                          : approvedChanges[index]
                      return (
                        <li
                          key={index}
                          className={`modal-change-item ${
                            isApproved ? 'approved' : 'pending'
                          }`}
                        >
                          <span className="change-icon">✓</span>
                          <div className="change-text">
                            <div className="change-text-main">{change}</div>
                            <button
                              type="button"
                              className="change-approve-toggle"
                              onClick={() => toggleApproved(index)}
                            >
                              {isApproved ? 'Mark as needs review' : 'Approve change'}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button className="modal-btn primary" onClick={(e) => {
                e.preventDefault()
                onRewrite()
              }}>
                Regenerate Rewrite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RewritePanel

