import React from 'react'
import './RewritePanel.css'

const CATEGORY_EXPLANATIONS = {
  masculine_coded:
    'Masculine-coded language (e.g., "rockstar", "aggressive") can signal a male-dominated culture and discourage women and non-binary candidates.',
  feminine_coded:
    'Strongly feminine-coded language can also signal that certain genders are preferred, which may reduce perceived neutrality.',
  age_biased:
    'Age-biased phrases (e.g., "digital native", "young and energetic") can discourage experienced or older applicants.',
  exclusionary_language:
    'Exclusionary language around work authorization or citizenship (e.g., "no sponsorship") can deter international candidates and immigrants.',
  cultural_fit:
    '“Culture fit” clichés often mask subjective criteria that can exclude people from different backgrounds.',
  disability_biased:
    'Unnecessary physical requirements can exclude candidates with disabilities from otherwise suitable roles.',
}

function buildPhraseMeta(keywordAnalysis) {
  if (!keywordAnalysis) return {}

  const meta = {}

  Object.entries(keywordAnalysis).forEach(([category, data]) => {
    const matches = data?.matches || []
    matches.forEach((phrase) => {
      const key = phrase.toLowerCase()
      if (!meta[key]) {
        meta[key] = {
          phrase,
          category,
          explanation:
            CATEGORY_EXPLANATIONS[category] ||
            'This phrase may discourage some candidates or signal bias in the posting.',
        }
      }
    })
  })

  return meta
}

function buildDiffPhrases(rewrite) {
  const originals = new Set()
  const rewrites = new Set()

  if (!rewrite || !Array.isArray(rewrite.changes)) {
    return { originals, rewrites }
  }

  rewrite.changes.forEach((change) => {
    const parts = change.split("'")
    if (parts.length >= 4) {
      const from = parts[1]
      const to = parts[3]
      if (from && from.length > 0) originals.add(from)
      if (to && to.length > 0) rewrites.add(to)
    }
  })

  return { originals, rewrites }
}

function highlightText(text, phraseMeta, extraPhrases = new Set(), extraClass = '') {
  if (!text) return null

  const allPhrases = [
    ...Object.values(phraseMeta).map((m) => m.phrase),
    ...Array.from(extraPhrases),
  ]

  if (allPhrases.length === 0) {
    return text
  }

  const escaped = allPhrases
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (!part) return null
    const lower = part.toLowerCase()

    const phraseEntry = Object.values(phraseMeta).find(
      (m) => m.phrase.toLowerCase() === lower
    )

    const isExtra = extraPhrases.has(part) || extraPhrases.has(lower)

    if (!phraseEntry && !isExtra) {
      return <span key={index}>{part}</span>
    }

    const explanation = phraseEntry?.explanation
    const category = phraseEntry?.category
    const baseClass = phraseEntry ? 'highlight-bias' : ''
    const className = [baseClass, extraClass].filter(Boolean).join(' ')

    return (
      <span
        key={index}
        className={className}
        title={explanation || 'Changed phrase in the rewrite'}
        data-category={category}
      >
        {part}
      </span>
    )
  })
}

function RewritePanel({ original, rewrite, onRewrite, keywordAnalysis }) {
  const phraseMeta = buildPhraseMeta(keywordAnalysis)
  const { originals: diffOriginals, rewrites: diffRewrites } = buildDiffPhrases(rewrite)

  const highlightedOriginal = highlightText(
    original,
    phraseMeta,
    diffOriginals,
    'highlight-change'
  )

  const highlightedRewrite = highlightText(
    rewrite?.rewritten_text,
    phraseMeta,
    diffRewrites,
    'highlight-change'
  )

  const uniqueCategories = Array.from(
    new Set(Object.values(phraseMeta).map((m) => m.category))
  )

  return (
    <div className="rewrite-panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Inclusive Rewrite</h3>
      </div>

      <div className="rewrite-content side-by-side">
        <div className="text-content">
          <div className="text-label">Original (highlights show biased / changed phrases)</div>
          <div className="text-body">{highlightedOriginal}</div>
        </div>
        <div className="text-content">
          <div className="text-label">Inclusive Rewrite</div>
          <div className="text-body">{highlightedRewrite}</div>
        </div>
      </div>

      {rewrite?.changes && rewrite.changes.length > 0 && (
        <div className="changes-section">
          <h4 className="changes-title">Key Changes</h4>
          <ul className="changes-list">
            {rewrite.changes.map((change, index) => (
              <li key={index} className="change-item">
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uniqueCategories.length > 0 && (
        <div className="legend-section">
          <h4 className="legend-title">Why these phrases are highlighted</h4>
          <ul className="legend-list">
            {uniqueCategories.map((cat) => (
              <li key={cat} className="legend-item">
                <span className="legend-pill">{cat.replace('_', ' ')}</span>
                <span className="legend-text">{CATEGORY_EXPLANATIONS[cat]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="rewrite-btn" onClick={onRewrite}>
        Regenerate Rewrite
      </button>
    </div>
  )
}

export default RewritePanel

