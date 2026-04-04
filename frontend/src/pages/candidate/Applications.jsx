import { useState, useEffect } from 'react';
import { getMyApplications } from '../../api/candidateApi';
import StatusBadge from '../../components/StatusBadge';
import ScoreBar from '../../components/ScoreBar';

export default function CandidateApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getMyApplications()
      .then((res) => setApplications(res.data.applications || []))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    selected: applications.filter((a) => a.status === 'selected').length,
    not_selected: applications.filter((a) => a.status === 'not_selected').length,
  };

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>My Applications</h1>
          <p>Track all your internship applications and selection status</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {Object.entries(counts).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className="btn"
              style={{
                background: filter === k ? 'var(--accent)' : 'var(--bg-card)',
                color: filter === k ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${filter === k ? 'var(--accent)' : 'var(--border)'}`,
                fontSize: 13,
              }}>
              {k === 'all' ? '📋' : k === 'pending' ? '⏳' : k === 'shortlisted' ? '📌' : k === 'selected' ? '✅' : '❌'}&nbsp;
              {k.replace('_', ' ')} ({v})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No applications yet</h3>
            <p>Go to the dashboard and start applying to internships!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((app, idx) => {
              const internship = app.internship;
              const isExpanded = expanded === app._id;
              return (
                <div key={app._id} className="card" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="flex-between" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : app._id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{internship?.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                          🏢 {internship?.company} &nbsp;•&nbsp; 📍 {internship?.location} &nbsp;•&nbsp; ⏱ {internship?.duration}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <StatusBadge status={app.status} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{isExpanded ? '⌃' : '⌄'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                      <div className="grid-2" style={{ gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>📊 Ranking Engine Scores</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <ScoreBar label="Overall Rank Score" value={app.rankScore} />
                            <ScoreBar label="BM25 Keyword Match" value={app.bm25Score} color="linear-gradient(90deg,#ff6b9d,#ffd60a)" />
                            <ScoreBar label="Vector Similarity (ANN)" value={app.similarityScore} color="linear-gradient(90deg,#00d4ff,#6c63ff)" />
                            <ScoreBar label="Skill Overlap" value={app.skillOverlapScore} color="linear-gradient(90deg,#00e5a0,#00d4ff)" />
                            <ScoreBar label="Location Match" value={app.locationScore} color="linear-gradient(90deg,#ffd60a,#ff9f1c)" />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>📝 Application Details</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Applied: {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          {app.coverLetter && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Cover Letter:</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>{app.coverLetter}</div>
                            </div>
                          )}
                          <div className="tags-row" style={{ marginTop: 12 }}>
                            <span className={`badge badge-${internship?.type}`}>{internship?.type}</span>
                            {internship?.skills?.slice(0, 4).map((s) => <span key={s} className="skill-tag">{s}</span>)}
                          </div>
                        </div>
                      </div>

                      {app.status === 'selected' && (
                        <div className="alert alert-success" style={{ marginTop: 16 }}>
                          🎉 Congratulations! You have been <strong>selected</strong> for this internship. The recruiter will contact you soon.
                        </div>
                      )}
                      {app.status === 'not_selected' && (
                        <div className="alert alert-error" style={{ marginTop: 16 }}>
                          Unfortunately you were not selected for this position. Keep applying — your next opportunity is around the corner!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
