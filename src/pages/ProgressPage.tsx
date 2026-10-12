import { useState } from 'react'
import Layout from '../components/Layout'
import { modules } from '../content'
import { progressStore, useProgress } from '../hooks/useProgress'
import { examScore, exportProgress, importProgress, isModuleUnlocked } from '../lib/progress'

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—')

export default function ProgressPage() {
  const p = useProgress()
  const code = exportProgress(p)
  const [exportMsg, setExportMsg] = useState('')
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const hasHistory = p.exam.attempts.length > 0 || Object.values(p.modules).some((m) => m.attempts > 0)

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setExportMsg('Copied. Paste it into Import on your other device.') }
    catch { setExportMsg('Couldn’t copy automatically — select the code above and copy it.') }
  }

  const doImport = () => {
    try {
      const next = importProgress(importText)
      if (hasHistory && !window.confirm('This replaces the progress on this device. Carry on?')) return
      progressStore.replace(next)
      setImportText('')
      setResetMsg('')
      setImportMsg('Progress restored.')
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'That code is not valid')
    }
  }

  const reset = () => {
    if (!window.confirm('This wipes all progress on this device. Sure?')) return
    progressStore.reset()
    setImportMsg('')
    setResetMsg('All progress cleared.')
  }

  return (
    <Layout title="Your progress" back={{ href: '#/', label: 'Home' }}>
      <section className="card">
        <h2>Modules</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Module</th><th>Best</th><th>Tries</th><th>Last</th></tr></thead>
            <tbody>
              {modules.map((m) => {
                const mp = p.modules[m.id]
                const status = mp?.passed ? 'Passed' : isModuleUnlocked(p, modules, m.id) ? 'Ready' : 'Locked'
                return (
                  <tr key={m.id}>
                    <td>{m.order}. {m.title}<br /><span className="muted small">{status}</span></td>
                    <td>{mp?.attempts ? `${mp.bestScore}/10` : '—'}</td>
                    <td>{mp?.attempts ?? 0}</td>
                    <td>{day(mp?.lastAttemptAt ?? '')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Exam attempts</h2>
        {p.exam.attempts.length === 0 ? <p className="muted">None yet.</p> : (
          <ul className="breakdown">
            {[...p.exam.attempts].reverse().map((a, k) => {
              const { total, passed: ok } = examScore(a)
              return (
                <li key={k} className="breakdown-head">
                  <span>{day(a.finishedAt)}</span>
                  <span><strong>{a.score}/{total}</strong> <span className={ok ? 'pass' : 'fail'}>{ok ? 'Pass' : 'Not yet'}</span></span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Move to another device</h2>
        <p className="muted small">Copy this code, then paste it into Import on your phone or laptop. An exam you're partway through stays on this device.</p>
        <label htmlFor="export-code" className="eyebrow">Export code</label>
        <textarea id="export-code" readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={copy}>Copy export code</button>
        <p className="status" role="status">{exportMsg}</p>

        <label htmlFor="import-code" className="eyebrow" style={{ marginTop: 16 }}>Import</label>
        <textarea id="import-code" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste a code here" />
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }} disabled={!importText.trim()} onClick={doImport}>Import</button>
        <p className="status" role="status">{importMsg}</p>
      </section>

      <section className="card">
        <h2>Start over</h2>
        <p className="muted small">Clears every score, attempt and saved position on this device.</p>
        <button type="button" className="btn btn-danger btn-block" onClick={reset}>Reset everything</button>
        <p className="status" role="status">{resetMsg}</p>
      </section>
    </Layout>
  )
}
