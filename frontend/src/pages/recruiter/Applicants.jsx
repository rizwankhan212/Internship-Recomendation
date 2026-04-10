import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicants } from '../../api/recruiterApi';
import StatusBadge from '../../components/StatusBadge';
import ScoreBar from '../../components/ScoreBar';

export default function Applicants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [resumeView, setResumeView] = useState(null);

  useEffect(() => {
    getApplicants(id, { page, limit: 50 })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [id, page]);

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  const { internship, applications = [], total } = data || {};

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recruiter')} style={{ marginBottom: 12 }}>← Back</button>
          <h1>Applicants for <span style={{ color: 'var(--accent)' }}>{internship?.title}</span></h1>
          <p>🏢 {internship?.company} &nbsp;•&nbsp; {internship?.openings} openings &nbsp;•&nbsp; Total: <strong>{total}</strong> applicants</p>
        </div>

        {/* Shortlist CTA */}
        <div className="card card-glow" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>🤖 Run Greedy Allocator</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automatically shortlist top 20 candidates by AI rank score</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate(`/recruiter/internships/${id}/shortlist`)}>
            ⭐ View Shortlist →
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📭</div><h3>No applications yet</h3></div>
        ) : (
          <>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
              Showing {applications.length} of {total} applicants, ranked by AI score
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>College</th>
                    <th>CGPA</th>
                    <th>Skills Match</th>
                    <th>Overall Score</th>
                    <th>Resume</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, idx) => {
                    const c = app.candidate;
                    const isExp = expanded === app._id;
                    return (
                      <>
                        <tr key={app._id} style={{ background: isExp ? 'rgba(108,99,255,0.05)' : undefined }}>
                          <td><span className="rank-number">#{idx + 1}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="candidate-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                                {c?.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{c?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{c?.college || '—'}</td>
                          <td><span style={{ color: 'var(--yellow)', fontWeight: 600 }}>{c?.cgpa || '—'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {c?.skills?.slice(0, 3).map((s) => <span key={s} className="skill-tag" style={{ fontSize: 11, padding: '2px 8px' }}>{s}</span>)}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', width: `${Math.round(app.rankScore * 100)}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-2)', minWidth: 36 }}>{Math.round(app.rankScore * 100)}%</span>
                            </div>
                          </td>
                          <td>
                            {app.resumePath ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: 12, gap: 4 }}
                                onClick={() => setResumeView({ url: app.resumePath, name: c?.name || 'Candidate' })}
                              >
                                📄 View
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No resume</span>
                            )}
                          </td>
                          <td><StatusBadge status={app.status} /></td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(isExp ? null : app._id)}>
                              {isExp ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {isExp && (
                          <tr key={`${app._id}-exp`}>
                            <td colSpan={10} style={{ padding: '16px 20px', background: 'rgba(108,99,255,0.03)' }}>
                              <div className="grid-2" style={{ gap: 20 }}>
                                <div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Ranking Scores</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <ScoreBar label="Overall" value={app.rankScore} />
                                    <ScoreBar label="BM25" value={app.bm25Score} color="linear-gradient(90deg,#ff6b9d,#ffd60a)" />
                                    <ScoreBar label="ANN Similarity" value={app.similarityScore} color="linear-gradient(90deg,#00d4ff,#6c63ff)" />
                                    <ScoreBar label="Skill Overlap" value={app.skillOverlapScore} color="linear-gradient(90deg,#00e5a0,#00d4ff)" />
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Cover Letter</div>
                                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{app.coverLetter || '(No cover letter)'}</p>
                                  <div className="tags-row" style={{ marginTop: 8 }}>
                                    {c?.skills?.map((s) => <span key={s} className="skill-tag">{s}</span>)}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {/* Resume Viewer Modal */}
        {resumeView && (
          <div className="modal-overlay" onClick={() => setResumeView(null)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 900, width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>📄 {resumeView.name}'s Resume</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={resumeView.url}
                    download
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12 }}
                  >
                    ⬇ Download
                  </a>
                  <button className="btn btn-ghost btn-sm" onClick={() => setResumeView(null)} style={{ fontSize: 16, padding: '4px 10px' }}>✕</button>
                </div>
              </div>
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(resumeView.url)}&embedded=true`}
                title="Resume Viewer"
                style={{ flex: 1, width: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
