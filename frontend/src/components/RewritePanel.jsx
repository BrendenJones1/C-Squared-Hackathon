import React, { useState, useMemo, useRef, useEffect } from 'react'
import './RewritePanel.css'

function RewritePanel({ original, rewrite, onRewrite, keywordMatches = [], wordFlagMapping = {} }) {
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

  // Highlight biased words in original text with flag icons
  const highlightBiasedWords = (text) => {
    if (!text) return text

    let highlighted = text

    // Build a comprehensive list of all biased words/phrases with their flag info
    const allBiasedWords = []
    
    // Add words from parsed changes (rewrite changes)
    if (parsedChanges.length > 0) {
      parsedChanges.forEach(({ original: origPhrase }) => {
        if (!origPhrase) return
        const flagInfo = wordFlagMapping[origPhrase] || {
          icon: "⚠️",
          category: "Bias Detected",
          color: "#dc2626",
          explanation: "This phrase may contain biased language.",
          severity: "medium"
        }
        allBiasedWords.push({
          phrase: origPhrase,
          flag: flagInfo
        })
      })
    }

    // Add words from keyword matches
    if (keywordMatches && keywordMatches.length > 0) {
      keywordMatches.forEach((category) => {
        if (category && category.matches && Array.isArray(category.matches)) {
          category.matches.forEach((match) => {
            if (!match || typeof match !== 'string') return
            const flagInfo = wordFlagMapping[match] || {
              icon: "⚠️",
              category: category.category || "Bias Detected",
              color: "#dc2626",
              explanation: "This phrase may contain biased language.",
              severity: "medium"
            }
            allBiasedWords.push({
              phrase: match,
              flag: flagInfo
            })
          })
        }
      })
    }

    // If we have word flag mapping, use it to highlight all words
    if (Object.keys(wordFlagMapping).length > 0) {
      // Sort phrases by length (longest first) to avoid partial matches
      const sortedPhrases = Object.entries(wordFlagMapping).sort((a, b) => b[0].length - a[0].length)
      
      sortedPhrases.forEach(([phrase, flagInfo]) => {
        if (!phrase) return
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern =
          phrase.split(' ').length === 1
            ? new RegExp(`\\b${escaped}\\b`, 'gi')
            : new RegExp(escaped, 'gi')
        
        // Only replace if the match is not already inside HTML tags
        highlighted = highlighted.replace(pattern, (match, offset) => {
          // Check if we're inside an HTML tag
          const beforeMatch = highlighted.substring(0, offset)
          const afterMatch = highlighted.substring(offset + match.length)
          
          // Skip if already inside a mark tag
          if (beforeMatch.includes('<mark') && !beforeMatch.substring(beforeMatch.lastIndexOf('<mark')).includes('</mark>')) {
            return match
          }
          
          const flagIcon = flagInfo.icon || "⚠️"
          const flagColor = flagInfo.color || "#dc2626"
          const flagCategory = flagInfo.category || "Bias Detected"
          const flagExplanation = flagInfo.explanation || "This phrase may contain biased language."
          const flagSuggestion = flagInfo.suggestion || ""
          const severity = flagInfo.severity || "medium"
          
          return `<mark class="biased-word-original biased-word-flagged" 
                    data-flag-icon="${flagIcon}" 
                    data-flag-color="${flagColor}"
                    data-flag-category="${flagCategory}"
                    data-flag-explanation="${flagExplanation.replace(/"/g, '&quot;')}"
                    data-flag-suggestion="${flagSuggestion.replace(/"/g, '&quot;')}"
                    data-severity="${severity}"
                    style="--flag-color: ${flagColor};"
                    title="${flagCategory}: ${flagExplanation}">
                    ${match}
                    <span class="flag-icon-hover" style="background-color: ${flagColor};">${flagIcon}</span>
                  </mark>`
        })
      })
      return highlighted
    }

    // Fallback: highlight based on parsed changes
    if (parsedChanges.length > 0) {
      parsedChanges.forEach(({ original: origPhrase }) => {
        if (!origPhrase) return
        const escaped = origPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern =
          origPhrase.split(' ').length === 1
            ? new RegExp(`\\b${escaped}\\b`, 'gi')
            : new RegExp(escaped, 'gi')
        highlighted = highlighted.replace(
          pattern,
          (match) =>
            `<mark class="biased-word-original" title="Original biased phrase">
              ${match}
              <span class="flag-icon-hover" style="background-color: #dc2626;">⚠️</span>
            </mark>`
        )
      })
      return highlighted
    }

    // Final fallback: use keyword matches
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
                const flagInfo = wordFlagMapping[match] || {
                  icon: "⚠️",
                  category: category.category || "Bias Detected",
                  color: "#dc2626"
                }
                allMatches.push({
                  text: result[0],
                  index: result.index,
                  length: result[0].length,
                  flag: flagInfo
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
      const flagIcon = match.flag?.icon || "⚠️"
      const flagColor = match.flag?.color || "#dc2626"
      highlighted = `${before}<mark class="biased-word-original biased-word-flagged" 
                      style="--flag-color: ${flagColor};"
                      title="${match.flag?.category || 'Biased language detected'}">
                      ${matched}
                      <span class="flag-icon-hover" style="background-color: ${flagColor};">${flagIcon}</span>
                    </mark>${after}`
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

        <div className="panel-footer">
          <button className="rewrite-btn secondary" onClick={() => setShowModal(true)}>
            View Full Comparison
          </button>
          <button className="rewrite-btn primary" onClick={onRewrite}>
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
              <button className="modal-btn primary" onClick={onRewrite}>
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

