export default function Imports() {
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Coming in v1.1</p>
          <h1>Statement imports</h1>
          <p>Upload a bank statement PDF, review the parsed transactions, commit what's right.</p>
        </div>
      </div>

      <div className="coming-soon">
        <div className="badge">Soon</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Bank PDF import</h2>
        <p style={{ color: 'var(--ink-muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
          Drop a PDF statement, we'll parse the transactions, apply your categorization rules,
          and surface them in a review screen before anything commits to the ledger. Nothing
          imports automatically — you always get the final say.
        </p>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 360, margin: '2rem auto 0', textAlign: 'left', fontSize: 14, color: 'var(--ink-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>PDF text extraction (pdf.js client-side)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>Per-bank parsing templates</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>Rules engine for auto-categorization</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>Side-by-side review &amp; commit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>Duplicate detection against existing ledger</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>○</span>
            <span>Budget-vs-actual auto-comparison after commit</span>
          </div>
        </div>
      </div>
    </div>
  )
}
