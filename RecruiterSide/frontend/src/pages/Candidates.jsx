import { useState, useEffect } from 'react';
import api from '../api/client';

function ScoreBar({ score, label }) {
  const pct = Math.round(score * 100);
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
  return (
    <div style={{ minWidth: 100 }}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted">{label}</span>
        <span className="score-value" style={{ color: level === 'high' ? '#10b981' : level === 'medium' ? '#6366f1' : '#ef4444' }}>
          {pct}%
        </span>
      </div>
      <div className="score-bar">
        <div className={`score-bar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RankExplanation({ explanation }) {
  if (!explanation) return null;
  return (
    <div className="rank-explanation">
      <div className="rank-explanation-title">🤖 AI Ranking Breakdown</div>
      <div className="rank-breakdown">
        <div className="rank-factor">
          <span className="rank-factor-label">BM25 (Keyword)</span>
          <span className="rank-factor-value">{(explanation.bm25_score * 100).toFixed(0)}%</span>
        </div>
        <div className="rank-factor">
          <span className="rank-factor-label">Semantic Match</span>
          <span className="rank-factor-value">{(explanation.semantic_score * 100).toFixed(0)}%</span>
        </div>
        <div className="rank-factor">
          <span className="rank-factor-label">CGPA Score</span>
          <span className="rank-factor-value">{(explanation.cgpa_score * 100).toFixed(0)}%</span>
        </div>
        <div className="rank-factor">
          <span className="rank-factor-label">Skill Match</span>
          <span className="rank-factor-value">{(explanation.skill_match_score * 100).toFixed(0)}%</span>
        </div>
      </div>
      {explanation.matched_skills?.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <span className="text-sm text-muted">Matched: </span>
          {explanation.matched_skills.map(s => <span className="skill-tag" key={s}>{s}</span>)}
        </div>
      )}
      {explanation.missing_skills?.length > 0 && (
        <div style={{ marginTop: '0.3rem' }}>
          <span className="text-sm text-muted">Missing: </span>
          {explanation.missing_skills.map(s => (
            <span key={s} className="skill-tag" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>{s}</span>
          ))}
        </div>
      )}
      {explanation.explanation && (
        <div className="rank-explanation-text">💡 {explanation.explanation}</div>
      )}
    </div>
  );
}

export default function Candidates() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [shortlisting, setShortlisting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { if (selectedJob) loadCandidates(); }, [selectedJob]);

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/jobs');
      setJobs(data);
      if (data.length > 0) setSelectedJob(data[0].id);
    } catch (err) { console.error(err); }
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/jobs/${selectedJob}/applications?sort_by=rank_score`);
      setCandidates(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const runRanking = async () => {
    setRanking(true);
    try {
      await api.post(`/jobs/${selectedJob}/rank`);
      await loadCandidates();
    } catch (err) { alert('Ranking failed: ' + (err.response?.data?.detail || err.message)); }
    finally { setRanking(false); }
  };

  const runShortlist = async (method) => {
    setShortlisting(true);
    try {
      const { data } = await api.post(`/jobs/${selectedJob}/shortlist`, { method, branch_diversity: method === 'ilp' });
      alert(`${data.message}`);
      await loadCandidates();
    } catch (err) { alert('Shortlisting failed'); }
    finally { setShortlisting(false); }
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/jobs/${selectedJob}/applications/${appId}/status`, { status });
      loadCandidates();
    } catch (err) { alert('Failed to update status'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Candidate Management</h2>
        <p>AI-powered candidate ranking and shortlisting</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
            <label className="form-label">Select Job</label>
            <select className="form-select" value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', paddingTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={runRanking} disabled={ranking || !selectedJob}>
              {ranking ? '⏳ Ranking...' : '🤖 Run AI Ranking'}
            </button>
            <button className="btn btn-success" onClick={() => runShortlist('greedy')} disabled={shortlisting}>
              ⚡ Greedy Shortlist
            </button>
            <button className="btn btn-secondary" onClick={() => runShortlist('ilp')} disabled={shortlisting}>
              🧮 ILP Shortlist
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No applications yet</h3>
          <p>Applications will appear here once students apply to this job</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>CGPA</th>
                <th>Skills</th>
                <th>AI Rank Score</th>
                <th>BM25</th>
                <th>Semantic</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <>
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.student_name || 'Unknown'}</div>
                      <div className="text-sm text-muted">{c.student_email || c.student_id}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.student_cgpa >= 8 ? '#10b981' : c.student_cgpa >= 7 ? '#f59e0b' : '#ef4444' }}>
                        {c.student_cgpa?.toFixed(1) || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', maxWidth: '180px' }}>
                        {c.parsed_skills?.slice(0, 3).map(s => <span className="skill-tag" key={s}>{s}</span>)}
                        {(c.parsed_skills?.length || 0) > 3 && <span className="skill-tag">+{c.parsed_skills.length - 3}</span>}
                      </div>
                    </td>
                    <td><ScoreBar score={c.rank_score} label="Rank" /></td>
                    <td><ScoreBar score={c.bm25_score} label="BM25" /></td>
                    <td><ScoreBar score={c.semantic_score} label="Semantic" /></td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>
                      <div className="flex gap-sm" onClick={(e) => e.stopPropagation()}>
                        {c.status === 'applied' && (
                          <button className="btn btn-sm btn-success" onClick={() => updateStatus(c.id, 'shortlisted')}>
                            ✅ Shortlist
                          </button>
                        )}
                        {['applied', 'under_review'].includes(c.status) && (
                          <button className="btn btn-sm btn-danger" onClick={() => updateStatus(c.id, 'rejected')}>
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-exp`}>
                      <td colSpan={8} style={{ padding: '0 1rem 1rem' }}>
                        <RankExplanation explanation={c.rank_explanation} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
