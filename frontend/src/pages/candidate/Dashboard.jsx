import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchInternships, getRecommendations, applyToInternship, getMyApplications } from '../../api/candidateApi';
import InternshipCard from '../../components/InternshipCard';
import ScoreBar from '../../components/ScoreBar';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [applyModal, setApplyModal] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [alert, setAlert] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', type: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, appRes] = await Promise.all([getRecommendations(), getMyApplications()]);
      setRecommendations(recRes.data.recommendations || []);
      setMyApplications(appRes.data.applications || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      const res = await searchInternships({ query, ...filters, skills: user?.skills });
      setSearchResults(res.data.results || []);
      setActiveTab('search');
    } catch (err) {
      console.error(err);
    } finally { setSearchLoading(false); }
  };

  const handleApply = async () => {
    if (!applyModal) return;
    setApplying(true);
    try {
      await applyToInternship(applyModal._id, { coverLetter });
      setAlert({ type: 'success', msg: `Applied to ${applyModal.title} successfully!` });
      setApplyModal(null);
      setCoverLetter('');
      await loadData();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Apply failed' });
    } finally { setApplying(false); }
  };

  const appliedIds = new Set(myApplications.map((a) => a.internship?._id));
  const getAppStatus = (id) => myApplications.find((a) => a.internship?._id === id)?.status;

  const tabItems = [
    { key: 'recommendations', label: '⚡ AI Recommendations' },
    { key: 'search', label: '🔍 Search Results' },
  ];

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <h1>Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0]}</span> 👋</h1>
          <p>Your personalized internship recommendations powered by Hybrid Retrieval + LambdaMART</p>
        </div>

        {/* Stats Row */}
        <div className="grid-3" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--accent)' }}>{myApplications.length}</div>
            <div className="stat-label">Applications Sent</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--green)' }}>
              {myApplications.filter((a) => a.status === 'shortlisted').length}
            </div>
            <div className="stat-label">Shortlisted</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--yellow)' }}>
              {myApplications.filter((a) => a.status === 'selected').length}
            </div>
            <div className="stat-label">Selected</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            🔍 Search Internships
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="e.g. machine learning, react developer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 2, minWidth: 200 }}
            />
            <input
              className="input"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={{ flex: 1, minWidth: 120 }}
            />
            <select className="input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ flex: 1, minWidth: 120 }}>
              <option value="">Any type</option>
              <option value="remote">Remote</option>
              <option value="on-site">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <button className="btn btn-primary" onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? '...' : '🔍 Search'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
            {alert.msg}
            <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabItems.map((t) => (
            <button key={t.key} className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <>
            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Loading AI recommendations...</p></div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <h3>No recommendations yet</h3>
                <p>Update your profile with skills and preferences to get personalized internship matches.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                  ⚡ Top <strong style={{ color: 'var(--text-primary)' }}>{recommendations.length}</strong> internships ranked by AI (BM25 + ANN + Skill Match + Location)
                </div>
                <div className="grid-2">
                  {recommendations.map(({ internship, rankScore, skillOverlapScore }, idx) => (
                    <div key={internship._id} style={{ animationDelay: `${idx * 0.05}s` }} className="animate-fade-up">
                      <div style={{ marginBottom: 4 }}>
                        <span className="rank-number" style={{ fontSize: 13, marginRight: 6 }}>#{idx + 1}</span>
                      </div>
                      <InternshipCard
                        internship={internship}
                        scores={{ rankScore, skillOverlapScore }}
                        applied={appliedIds.has(internship._id)}
                        applicationStatus={getAppStatus(internship._id)}
                        onApply={(i) => { setApplyModal(i); setCoverLetter(''); }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            {searchLoading ? (
              <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Searching...</p></div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try different keywords or remove filters.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                  Found <strong style={{ color: 'var(--text-primary)' }}>{searchResults.length}</strong> results ranked by hybrid retrieval
                </div>
                <div className="grid-2">
                  {searchResults.map(({ internship, scores }, idx) => (
                    <div key={internship._id} style={{ animationDelay: `${idx * 0.04}s` }} className="animate-fade-up">
                      <InternshipCard
                        internship={internship}
                        scores={scores}
                        applied={appliedIds.has(internship._id)}
                        applicationStatus={getAppStatus(internship._id)}
                        onApply={(i) => { setApplyModal(i); setCoverLetter(''); }}
                      />
                      {/* Score details */}
                      <div className="card" style={{ borderRadius: '0 0 16px 16px', borderTop: 'none', padding: '12px 20px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <ScoreBar label="Overall Match" value={scores.rankScore} />
                          <ScoreBar label="Keyword (BM25)" value={scores.bm25Score} color="linear-gradient(90deg,#ff6b9d,#ffd60a)" />
                          <ScoreBar label="Semantic (ANN)" value={scores.similarityScore} color="linear-gradient(90deg,#00d4ff,#6c63ff)" />
                          <ScoreBar label="Skill Overlap" value={scores.skillOverlapScore} color="linear-gradient(90deg,#00e5a0,#00d4ff)" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Apply Modal */}
        {applyModal && (
          <div className="modal-overlay" onClick={() => setApplyModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Apply to {applyModal.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                🏢 {applyModal.company} • 📍 {applyModal.location} • {applyModal.type}
              </div>
              <div className="tags-row" style={{ marginBottom: 20 }}>
                {applyModal.skills?.map((s) => <span key={s} className="skill-tag">{s}</span>)}
              </div>
              <div className="input-group" style={{ marginBottom: 20 }}>
                <label className="input-label">Cover Letter (optional)</label>
                <textarea
                  className="input"
                  rows={5}
                  placeholder="Tell the recruiter why you're a great fit..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setApplyModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                  {applying ? 'Applying...' : 'Submit Application →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
