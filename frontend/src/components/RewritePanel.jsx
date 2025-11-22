import React, { useState } from 'react'
import './RewritePanel.css'

function RewritePanel({ original, rewrite, onRewrite }) {
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <div className="rewrite-panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Inclusive Rewrite</h3>
        <button
          className="toggle-btn"
          onClick={() => setShowOriginal(!showOriginal)}
        >
          {showOriginal ? 'Show Rewrite' : 'Show Original'}
        </button>
      </div>

      <div className="rewrite-content">
        {showOriginal ? (
          <div className="text-content">
            <div className="text-label">Original</div>
            <div className="text-body">{original}</div>
          </div>
        ) : (
          <div className="text-content">
            <div className="text-label">Rewritten</div>
            <div className="text-body">{rewrite.rewritten_text}</div>
          </div>
        )}
      </div>

      {rewrite.changes && rewrite.changes.length > 0 && (
        <div className="changes-section">
          <h4 className="changes-title">Key Changes</h4>
          <ul className="changes-list">
            {rewrite.changes.map((change, index) => (
              <li key={index} className="change-item">{change}</li>
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

