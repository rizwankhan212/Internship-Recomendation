import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postInternship } from '../../api/recruiterApi';

const SKILLS_OPTIONS = ['JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Java', 'Spring', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'DevOps', 'TypeScript', 'Vue', 'Angular', 'GraphQL', 'Flutter', 'Android', 'iOS', 'Swift', 'Kotlin', 'Blockchain', 'Cybersecurity', 'C++', 'Redis', 'Go'];

export default function PostInternship() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', location: '', type: 'remote', duration: '3 months',
    stipend: 0, openings: 5, minCgpa: 0, skills: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggleSkill = (s) => {
    const lower = s.toLowerCase();
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(lower) ? f.skills.filter((x) => x !== lower) : [...f.skills, lower],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await postInternship(form);
      setSuccess(true);
      setTimeout(() => navigate('/recruiter'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post internship');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="page flex-center"><div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ marginBottom: 8 }}>Internship Posted!</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Redirecting to dashboard...</p>
    </div></div>
  );

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>Post New Internship</h1>
          <p>Create a new internship listing. The system will generate a vector embedding for AI-powered matching.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">📋 Basic Details</div>
            <div className="form-grid">
              <div className="input-group" style={{ gridColumn: '1/-1' }}>
                <label className="input-label">Internship Title *</label>
                <input className="input" placeholder="e.g. Software Engineering Intern" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Location *</label>
                <input className="input" placeholder="Bangalore / Remote" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="remote">Remote</option>
                  <option value="on-site">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Duration</label>
                <select className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                  {['1 month', '2 months', '3 months', '4 months', '6 months'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Monthly Stipend (₹)</label>
                <input className="input" type="number" min={0} value={form.stipend} onChange={(e) => setForm({ ...form, stipend: parseInt(e.target.value) })} />
              </div>
              <div className="input-group">
                <label className="input-label">Openings</label>
                <input className="input" type="number" min={1} value={form.openings} onChange={(e) => setForm({ ...form, openings: parseInt(e.target.value) })} />
              </div>
              <div className="input-group">
                <label className="input-label">Min CGPA</label>
                <input className="input" type="number" min={0} max={10} step={0.1} value={form.minCgpa} onChange={(e) => setForm({ ...form, minCgpa: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 12 }}>
              <label className="input-label">Description *</label>
              <textarea className="input" rows={5} placeholder="Describe the internship role, responsibilities and what interns will learn..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">💻 Required Skills</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>These skills are used to generate a vector embedding for AI matching.</p>
            <div className="tags-row">
              {SKILLS_OPTIONS.map((s) => {
                const active = form.skills.includes(s.toLowerCase());
                return (
                  <span key={s} className="skill-tag" onClick={() => toggleSkill(s)}
                    style={{ cursor: 'pointer', background: active ? 'rgba(108,99,255,0.3)' : undefined, fontWeight: active ? 700 : 400, borderColor: active ? 'var(--accent)' : undefined }}>
                    {active ? '✓ ' : ''}{s}
                  </span>
                );
              })}
            </div>
            {form.skills.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Selected: <strong style={{ color: 'var(--accent)' }}>{form.skills.join(', ')}</strong>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Posting...' : '🚀 Post Internship & Generate Embedding'}
          </button>
        </form>
      </div>
    </div>
  );
}
