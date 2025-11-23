import React, { useState, useMemo } from 'react'
import './RewritePanel.css'

function RewritePanel({ original, rewrite, onRewrite, keywordMatches = [] }) {
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('rewritten') // 'original', 'rewritten'

  // Highlight biased words in original text
  const highlightBiasedWords = (text) => {
    if (!text || !keywordMatches || keywordMatches.length === 0) {
      return text
    }

    const allMatches = []
    const seenIndices = new Set()
    
    // Collect all matches with their positions (avoid duplicates)
    keywordMatches.forEach(category => {
      if (category && category.matches && Array.isArray(category.matches)) {
        category.matches.forEach(match => {
          if (!match || typeof match !== 'string') return
          
          // Escape special regex characters
          const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          // Use word boundaries for single words, allow phrases
          const pattern = match.split(' ').length === 1 
            ? `\\b${escapedMatch}\\b` 
            : escapedMatch
          
          try {
            const regex = new RegExp(pattern, 'gi')
            let result
            const textCopy = text // Create a copy to avoid regex issues
            while ((result = regex.exec(textCopy)) !== null) {
              const key = `${result.index}-${result.index + result[0].length}`
              if (!seenIndices.has(key)) {
                seenIndices.add(key)
                allMatches.push({
                  text: result[0],
                  index: result.index,
                  length: result[0].length
                })
              }
            }
          } catch (e) {
            // Skip invalid regex patterns
            console.warn('Invalid regex pattern:', pattern, e)
          }
        })
      }
    })

    // Sort by index (reverse order) to avoid index shifting
    allMatches.sort((a, b) => b.index - a.index)

    // Apply highlights from end to start
    let highlighted = text
    allMatches.forEach(match => {
      const before = highlighted.substring(0, match.index)
      const matched = highlighted.substring(match.index, match.index + match.length)
      const after = highlighted.substring(match.index + match.length)
      highlighted = `${before}<mark class="biased-word" title="Biased language detected">${matched}</mark>${after}`
    })

    return highlighted
  }

  // Highlight changed words in rewritten text
  const highlightChanges = (originalText, rewrittenText) => {
    if (!originalText || !rewrittenText) return rewrittenText

    // Simple approach: highlight words that appear in rewritten but not in original
    // This helps show what was added/changed
    const originalLower = originalText.toLowerCase()
    const rewrittenWords = rewrittenText.split(/(\s+)/)
    
    // Find common phrases that were likely changed (from keyword matches)
    let highlighted = rewrittenText
    if (keywordMatches && keywordMatches.length > 0) {
      keywordMatches.forEach(category => {
        if (category && category.matches && Array.isArray(category.matches)) {
          category.matches.forEach(match => {
            if (!match || typeof match !== 'string') return
            const matchLower = match.toLowerCase()
            // If the original had this biased term, highlight the replacement in rewritten
            if (originalLower.includes(matchLower)) {
              // Find common replacement patterns
              const replacements = {
                'rockstar': 'skilled professional',
                'ninja': 'expert',
                'guru': 'specialist',
                'native english speaker': 'strong english communication skills',
                'native speaker': 'strong communication skills',
                'aggressive': 'proactive',
                'work hard play hard': 'collaborative and dynamic environment',
                'digital native': 'comfortable with technology',
                'young and energetic': 'enthusiastic',
                'cultural fit': 'team collaboration'
              }
              
              // Check if any replacement appears in rewritten text
              Object.entries(replacements).forEach(([original, replacement]) => {
                if (matchLower.includes(original) && highlighted.toLowerCase().includes(replacement.toLowerCase())) {
                  const regex = new RegExp(`(${replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
                  highlighted = highlighted.replace(regex, '<mark class="changed-word" title="Changed from biased language">$1</mark>')
                }
              })
            }
          })
        }
      })
    }
    
    return highlighted
  }

  const highlightedOriginal = useMemo(() => highlightBiasedWords(original), [original, keywordMatches])
  const highlightedRewritten = useMemo(() => highlightChanges(original, rewrite.rewritten_text), [original, rewrite.rewritten_text])

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
              {rewrite.changes.slice(0, 3).map((change, index) => (
                <div key={index} className="change-badge">
                  {change}
                </div>
              ))}
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
                    dangerouslySetInnerHTML={{ __html: highlightedOriginal }}
                  />
                </div>
                <div className="text-content rewritten-panel">
                  <div className="text-label">
                    <span className="label-icon">✓</span>
                    Rewritten
                    <span className="label-badge">Inclusive version</span>
                  </div>
                  <div 
                    className="text-body" 
                    dangerouslySetInnerHTML={{ __html: highlightedRewritten }}
                  />
                </div>
              </div>

              {rewrite.changes && rewrite.changes.length > 0 && (
                <div className="modal-changes-section">
                  <h3 className="modal-changes-title">All Changes Made</h3>
                  <ul className="modal-changes-list">
                    {rewrite.changes.map((change, index) => (
                      <li key={index} className="modal-change-item">
                        <span className="change-icon">✓</span>
                        <span className="change-text">{change}</span>
                      </li>
                    ))}
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

