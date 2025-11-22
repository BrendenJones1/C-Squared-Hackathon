import React, { useState } from 'react'
import './BatchAnalysis.css'

function BatchAnalysis({ onAnalyzeSingle }) {
  const [rawInput, setRawInput] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sortKey, setSortKey] = useState('bias_score')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const chunks = rawInput
      .split(/\n-{3,}\n/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (chunks.length === 0) {
      setError('Paste multiple job descriptions separated by a line with ---')
      return
    }

    const jobs = chunks.map((text, idx) => ({
      id: `job-${idx + 1}`,
      text,
      use_nlp: false,
    }))

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobs }),
      })

      if (!response.ok) {
        throw new Error('Batch analysis failed')
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    return vb - va
  })

  const handleRowClick = (id) => {
    const job = results.find((r) => r.id === id)
    const index = parseInt(id.replace('job-', ''), 10) - 1
    const chunks = rawInput
      .split(/\n-{3,}\n/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (chunks[index]) {
      onAnalyzeSingle(chunks[index])
    }
  }

  return (
    <div className="batch-card">
      <h2 className="card-title">Quick Scan Multiple Postings</h2>
      <p className="batch-hint">
        Paste multiple job descriptions separated by a line containing only <code>---</code>.
      </p>
      <form onSubmit={handleSubmit} className="batch-form">
        <textarea
          className="batch-textarea"
          rows={8}
          placeholder={`Job description #1...\n\n---\n\nJob description #2...\n\n---\n\nJob description #3...`}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
        />
        <button type="submit" className="batch-btn" disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Postings'}
        </button>
      </form>
      {error && <div className="batch-error">{error}</div>}

      {sortedResults.length > 0 && (
        <div className="batch-results">
          <div className="batch-results-header">
            <h3 className="section-title">Batch Results</h3>
            <div className="batch-sort">
              <span>Sort by:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="bias_score">Bias score</option>
                <option value="international_student_bias_score">
                  International bias
                </option>
                <option value="inclusivity_score">Inclusivity</option>
              </select>
            </div>
          </div>
          <table className="batch-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Bias</th>
                <th>Intl Bias</th>
                <th>Inclusivity</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r) => (
                <tr
                  key={r.id}
                  className="batch-row"
                  onClick={() => handleRowClick(r.id)}
                >
                  <td className="batch-title">
                    {r.title || r.id}
                  </td>
                  <td>{r.bias_score}</td>
                  <td>{r.international_student_bias_score}</td>
                  <td>{r.inclusivity_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="batch-click-hint">
            Click a row to open that job in the main analyzer.
          </p>
        </div>
      )}
    </div>
  )
}

export default BatchAnalysis


