import React, { useState, useMemo } from 'react'
import './RewritePanel.css'

function RewritePanel({ original, rewrite, onRewrite, keywordMatches = [] }) {
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('rewritten') // 'original', 'rewritten'
  const [acceptedChanges, setAcceptedChanges] = useState(new Set())
  const [rejectedChanges, setRejectedChanges] = useState(new Set())
  const [finalText, setFinalText] = useState(rewrite?.rewritten_text || '')

  // Get bias category info for a match
  const getBiasCategoryInfo = (match) => {
    const matchLower = match.toLowerCase()
    
    // Gender bias
    if (matchLower.includes('rockstar') || matchLower.includes('ninja') || matchLower.includes('guru') ||
        matchLower.includes('aggressive') || matchLower.includes('male') || matchLower.includes('men')) {
      return {
        category: 'gender',
        className: 'bias-gender',
        tooltip: 'Gender-biased language: This term may discourage applicants of certain genders or reinforce stereotypes.'
      }
    }
    
    // Age bias
    if (matchLower.includes('young') || matchLower.includes('energetic') || matchLower.includes('digital native') ||
        matchLower.includes('under') || matchLower.includes('millennial') || matchLower.includes('gen z')) {
      return {
        category: 'age',
        className: 'bias-age',
        tooltip: 'Age-biased language: This term may exclude older candidates or create age-based assumptions.'
      }
    }
    
    // Exclusionary language (visa, citizenship, language)
    if (matchLower.includes('native') || matchLower.includes('citizen') || matchLower.includes('visa') ||
        matchLower.includes('sponsorship') || matchLower.includes('eligible to work') || matchLower.includes('u.s.') ||
        matchLower.includes('canadian') || matchLower.includes('local applicants')) {
      return {
        category: 'exclusionary',
        className: 'bias-exclusionary',
        tooltip: 'Exclusionary language: This requirement may exclude qualified international candidates or those with different backgrounds.'
      }
    }
    
    // Disability bias
    if (matchLower.includes('lift') || matchLower.includes('physical') || matchLower.includes('accommodation') ||
        matchLower.includes('driver') || matchLower.includes('vehicle') || matchLower.includes('stand')) {
      return {
        category: 'disability',
        className: 'bias-disability',
        tooltip: 'Disability bias: This requirement may exclude candidates with disabilities unless it\'s essential for the role.'
      }
    }
    
    // Cultural fit
    if (matchLower.includes('cultural fit') || matchLower.includes('fit the culture') || matchLower.includes('fit our culture') ||
        matchLower.includes('work hard play hard') || matchLower.includes('after-work drinks')) {
      return {
        category: 'cultural',
        className: 'bias-cultural',
        tooltip: 'Cultural fit bias: Vague "cultural fit" requirements can exclude diverse candidates and perpetuate homogeneity.'
      }
    }
    
    // Appearance bias
    if (matchLower.includes('tattoo') || matchLower.includes('piercing') || matchLower.includes('hairstyle') ||
        matchLower.includes('appearance') || matchLower.includes('professional appearance')) {
      return {
        category: 'appearance',
        className: 'bias-appearance',
        tooltip: 'Appearance bias: These requirements may discriminate based on personal expression and are often unnecessary.'
      }
    }
    
    // Default
    return {
      category: 'general',
      className: 'bias-general',
      tooltip: 'Biased language detected: This phrase may exclude qualified candidates.'
    }
  }

  // Highlight biased words in original text with category colors and tooltips
  const highlightBiasedWords = (text) => {
    if (!text || !keywordMatches || keywordMatches.length === 0) {
      return text
    }

    const allMatches = []
    const seenIndices = new Set()
    
    // Collect all matches with their positions and category info
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
            const textCopy = text
            while ((result = regex.exec(textCopy)) !== null) {
              const key = `${result.index}-${result.index + result[0].length}`
              if (!seenIndices.has(key)) {
                seenIndices.add(key)
                const categoryInfo = getBiasCategoryInfo(result[0])
                allMatches.push({
                  text: result[0],
                  index: result.index,
                  length: result[0].length,
                  category: categoryInfo.category,
                  className: categoryInfo.className,
                  tooltip: categoryInfo.tooltip
                })
              }
            }
          } catch (e) {
            console.warn('Invalid regex pattern:', pattern, e)
          }
        })
      }
    })

    // Sort by index (reverse order) to avoid index shifting
    allMatches.sort((a, b) => b.index - a.index)

    // Apply highlights from end to start with category-specific styling
    let highlighted = text
    allMatches.forEach(match => {
      const before = highlighted.substring(0, match.index)
      const matched = highlighted.substring(match.index, match.index + match.length)
      const after = highlighted.substring(match.index + match.length)
      const escapedTooltip = match.tooltip.replace(/"/g, '&quot;')
      highlighted = `${before}<mark class="biased-word ${match.className}" data-category="${match.category}" title="${escapedTooltip}">${matched}</mark>${after}`
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

  // Handle accept/reject suggestions
  const handleAcceptChange = (changeIndex) => {
    setAcceptedChanges(prev => new Set([...prev, changeIndex]))
    setRejectedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(changeIndex)
      return newSet
    })
  }

  const handleRejectChange = (changeIndex) => {
    setRejectedChanges(prev => new Set([...prev, changeIndex]))
    setAcceptedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(changeIndex)
      return newSet
    })
  }

  const copyFinalText = () => {
    navigator.clipboard.writeText(finalText || rewrite.rewritten_text)
    alert('Copied to clipboard!')
  }

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
              aria-label="View side-by-side comparison"
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
              Suggested Changes ({rewrite.changes.length})
            </h4>
            <div className="suggestions-list">
              {rewrite.changes.map((change, index) => {
                const isAccepted = acceptedChanges.has(index)
                const isRejected = rejectedChanges.has(index)
                return (
                  <div 
                    key={index} 
                    className={`suggestion-item ${isAccepted ? 'accepted' : ''} ${isRejected ? 'rejected' : ''}`}
                  >
                    <div className="suggestion-text">{change}</div>
                    <div className="suggestion-actions">
                      <button
                        className={`suggestion-btn accept-btn ${isAccepted ? 'active' : ''}`}
                        onClick={() => handleAcceptChange(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleAcceptChange(index)
                          }
                        }}
                        title="Accept this change"
                        aria-label={`Accept change: ${change}`}
                        aria-pressed={isAccepted}
                      >
                        ✓
                      </button>
                      <button
                        className={`suggestion-btn reject-btn ${isRejected ? 'active' : ''}`}
                        onClick={() => handleRejectChange(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleRejectChange(index)
                          }
                        }}
                        title="Reject this change"
                        aria-label={`Reject change: ${change}`}
                        aria-pressed={isRejected}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {rewrite.changes.length > 3 && (
              <button 
                className="view-all-changes-btn"
                onClick={() => setShowModal(true)}
                style={{ marginTop: '12px' }}
              >
                View Full Comparison
              </button>
            )}
          </div>
        )}

        <div className="panel-footer">
          <button className="rewrite-btn secondary" onClick={() => setShowModal(true)}>
            View Full Comparison
          </button>
          <button 
            className="rewrite-btn copy-btn" 
            onClick={copyFinalText} 
            title="Copy final text"
            aria-label="Copy rewritten text to clipboard"
          >
            Copy Text
          </button>
          <button 
            className="rewrite-btn primary" 
            onClick={onRewrite}
            aria-label="Regenerate inclusive rewrite"
          >
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

