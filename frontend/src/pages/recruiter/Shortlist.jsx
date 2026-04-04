import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShortlist, updateApplicationStatus } from '../../api/recruiterApi';
import StatusBadge from '../../components/StatusBadge';
import ScoreBar from '../../components/ScoreBar';

export default function Shortlist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadShortlist(); }, [id]);

  const loadShortlist = async () => {
    setLoading(true);
    try {
      const res = await getShortlist(id);
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatus = async (appId, status) => {
    setUpdating(appId);
    try {
      await updateApplicationStatus(appId, status);
      setData((prev) => ({
        ...prev,
        shortlist: prev.shortlist.map((a) =>
          a._id === appId ? { ...a, status } : a
        ),
      }));
    } catch (err) { alert('Update failed'); }
    finally { setUpdating(null); }
  };

  if (loading) return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p className="loading-text">🤖 Running Greedy Allocator + ILP Solver...</p>
    </div>
  );

  const { internship, shortlist = [], totalApplications, shortlistSize } = data || {};

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recruiter')} style={{ marginBottom: 12 }}>← Back</button>
          <h1>⭐ Shortlisted Candidates</h1>
          <p>Internship: <strong style={{ color: 'var(--accent)' }}>{internship}</strong></p>
        </div>

        {/* Algorithm info */}
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg,rgba(0,212,255,0.07),rgba(108,99,255,0.07))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Algorithm Used</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-2)' }}>Greedy Real-time Allocator</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Applicants</div>
              <div style={{ fontWeight: 700 }}>{totalApplications}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Shortlisted</div>
              <div style={{ fontWeight: 700, color: 'var(--green)' }}>{shortlistSize}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div className="flow-box flow-box-blue" style={{ fontSize: 12 }}>
                📋 {totalApplications} Apps → Rank Sort → 📌 Top {shortlistSize}
              </div>
            </div>
          </div>
        </div>

        {shortlist.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No shortlisted candidates</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shortlist.map((app, idx) => {
              const c = app.candidate;
              const isSelected = app.status === 'selected';
              const isRejected = app.status === 'not_selected';
              return (
                <div
                  key={app._id}
                  className="card"
                  style={{
                    borderColor: isSelected ? 'rgba(0,229,160,0.4)' : isRejected ? 'rgba(255,77,109,0.3)' : undefined,
                    background: isSelected ? 'rgba(0,229,160,0.04)' : isRejected ? 'rgba(255,77,109,0.04)' : undefined,
                    animationDelay: `${idx * 0.04}s`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Rank + Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit', color: idx < 3 ? 'var(--yellow)' : 'var(--accent-2)', minWidth: 36, textAlign: 'center' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div className="candidate-avatar">{c?.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{c?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c?.college} • {c?.degree}</div>
                        <div style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600 }}>CGPA: {c?.cgpa}</div>
                      </div>
                    </div>

                    {/* Score bars */}
                    <div style={{ flex: 1.5, minWidth: 220 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <ScoreBar label="Overall Score" value={app.rankScore} />
                        <ScoreBar label="Skill Overlap" value={app.skillOverlapScore} color="linear-gradient(90deg,#00e5a0,#00d4ff)" />
                        <ScoreBar label="ANN Similarity" value={app.similarityScore} color="linear-gradient(90deg,#00d4ff,#6c63ff)" />
                      </div>
                    </div>

                    {/* Skills */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div className="tags-row">
                        {c?.skills?.slice(0, 5).map((s) => <span key={s} className="skill-tag" style={{ fontSize: 11 }}>{s}</span>)}
                        {c?.skills?.length > 5 && <span className="skill-tag" style={{ fontSize: 11 }}>+{c.skills.length - 5}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      <StatusBadge status={app.status} />
                      {!isSelected && !isRejected && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-success btn-sm"
                            disabled={updating === app._id}
                            onClick={() => handleStatus(app._id, 'selected')}
                          >
                            ✅ Select
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={updating === app._id}
                            onClick={() => handleStatus(app._id, 'not_selected')}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                      {(isSelected || isRejected) && (
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={updating === app._id}
                          onClick={() => handleStatus(app._id, 'shortlisted')}
                        >
                          ↩ Undo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>ℹ️ Selection Status</strong> — Candidates marked ✅ Selected or ❌ Rejected will see their status update in real-time on their dashboard.
        </div>
      </div>
    </div>
  );
}
