import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats, getMyInternships, deleteInternship } from '../../api/recruiterApi';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    Promise.all([getDashboardStats(), getMyInternships()])
      .then(([sRes, iRes]) => {
        setStats(sRes.data.stats);
        setInternships(iRes.data.internships || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this internship?')) return;
    setDeleting(id);
    try {
      await deleteInternship(id);
      setInternships((prev) => prev.filter((i) => i._id !== id));
    } catch (err) { alert('Delete failed'); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>🏢 {user?.company} Dashboard</h1>
          <p>Manage your internship postings and review candidate applications</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Internships', value: stats?.totalInternships, color: 'var(--accent)', icon: '📋' },
            { label: 'Active Internships', value: stats?.activeInternships, color: 'var(--green)', icon: '✅' },
            { label: 'Total Applications', value: stats?.totalApplications, color: 'var(--accent-2)', icon: '📨' },
            { label: 'Shortlisted', value: stats?.shortlisted, color: 'var(--yellow)', icon: '⭐' },
            { label: 'Selected', value: stats?.selected, color: 'var(--green)', icon: '🎉' },
            { label: 'Pending', value: stats?.pending, color: 'var(--orange)', icon: '⏳' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div className="stat-number" style={{ color: s.color, fontSize: 30 }}>{s.value ?? 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline overview */}
        <div className="card" style={{ marginBottom: 28, background: 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(0,212,255,0.04))' }}>
          <div className="section-title">⚡ Greedy Allocator Pipeline</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
            <div className="flow-box flow-box-blue">📋 {stats?.totalApplications} Total Applicants</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box flow-box-yellow">🤖 Rank by Score</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box flow-box-cyan">📌 Shortlist Top 20</div>
            <div className="flow-arrow">→</div>
            <div className="flow-box flow-box-green">✅ {stats?.selected} Selected</div>
          </div>
        </div>

        {/* Internships Table */}
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>📋 Your Internships</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/recruiter/post')}>
            + Post New
          </button>
        </div>

        {internships.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No internships posted yet</h3>
            <button className="btn btn-primary" onClick={() => navigate('/recruiter/post')}>Post Your First Internship →</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Stipend</th>
                  <th>Openings</th>
                  <th>Applications</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {internships.map((i) => (
                  <tr key={i._id}>
                    <td><strong>{i.title}</strong></td>
                    <td style={{ color: 'var(--text-secondary)' }}>📍 {i.location}</td>
                    <td><span className={`badge badge-${i.type}`}>{i.type}</span></td>
                    <td style={{ color: 'var(--green)' }}>₹{(i.stipend / 1000).toFixed(0)}K</td>
                    <td>{i.openings}</td>
                    <td>
                      <span style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 99, fontWeight: 700, fontSize: 13 }}>
                        {i.applicationCount || 0}
                      </span>
                    </td>
                    <td><span className={`badge ${i.isActive ? 'badge-selected' : 'badge-not_selected'}`}>{i.isActive ? 'Active' : 'Closed'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/recruiter/internships/${i._id}/applicants`)}>👥 View</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-2)' }} onClick={() => navigate(`/recruiter/internships/${i._id}/shortlist`)}>⭐ Shortlist</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} disabled={deleting === i._id} onClick={() => handleDelete(i._id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
