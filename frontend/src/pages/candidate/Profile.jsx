import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCandidateProfile, updateCandidateProfile } from '../../api/candidateApi';

const ALL_SKILLS = ['JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Java', 'Spring', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'DevOps', 'TypeScript', 'Vue', 'Angular', 'GraphQL', 'Flutter', 'Android', 'iOS', 'Swift', 'Kotlin', 'Blockchain', 'Cybersecurity', 'Data Science', 'Tableau', 'Git', 'C++', 'Go', 'Rust'];

export default function CandidateProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    getCandidateProfile().then((res) => {
      const c = res.data.candidate;
      setForm({
        name: c.name || '',
        location: c.location || '',
        bio: c.bio || '',
        cgpa: c.cgpa || '',
        college: c.college || '',
        degree: c.degree || '',
        experience: c.experience || 0,
        skills: c.skills || [],
        preferredTypes: c.preferredTypes || [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const toggleSkill = (s) => {
    const lower = s.toLowerCase();
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(lower) ? f.skills.filter((x) => x !== lower) : [...f.skills, lower],
    }));
  };

  const toggleType = (t) => {
    setForm((f) => ({
      ...f,
      preferredTypes: f.preferredTypes.includes(t) ? f.preferredTypes.filter((x) => x !== t) : [...f.preferredTypes, t],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCandidateProfile(form);
      setUser(res.data.candidate);
      setAlert({ type: 'success', msg: 'Profile updated! Your embedding has been recalculated.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Update failed' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>;
  if (!form) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>Your Profile</h1>
          <p>Update your skills and preferences to improve AI recommendation accuracy</p>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.msg} <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Profile vector info */}
        <div className="card card-glow" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>🧠 Vector Profile Status</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Your 50-dim profile embedding is live</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Covers {form.skills.length} skills • Updates automatically when you save • Used for ANN search
          </div>
          <div className="tags-row" style={{ marginTop: 10 }}>
            {form.skills.slice(0, 8).map((s) => <span key={s} className="skill-tag">{s}</span>)}
            {form.skills.length > 8 && <span className="skill-tag">+{form.skills.length - 8} more</span>}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">👤 Basic Info</div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <input className="input" placeholder="Bangalore" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">College</label>
                <input className="input" placeholder="IIT Bombay" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Degree</label>
                <select className="input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })}>
                  <option value="">Select</option>
                  {['B.Tech CSE', 'B.Tech ECE', 'M.Tech CSE', 'BCA', 'MCA', 'B.E. CSE', 'M.Sc Data Science'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">CGPA (out of 10)</label>
                <input className="input" type="number" min={0} max={10} step={0.1} value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: parseFloat(e.target.value) })} />
              </div>
              <div className="input-group">
                <label className="input-label">Experience (months)</label>
                <input className="input" type="number" min={0} value={form.experience} onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 12 }}>
              <label className="input-label">Bio</label>
              <textarea className="input" rows={3} placeholder="Tell recruiters about yourself..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">💻 Skills</div>
            <div className="tags-row">
              {ALL_SKILLS.map((s) => {
                const active = form.skills.includes(s.toLowerCase());
                return (
                  <span key={s} className="skill-tag" onClick={() => toggleSkill(s)}
                    style={{ cursor: 'pointer', background: active ? 'rgba(108,99,255,0.3)' : undefined, fontWeight: active ? 700 : 400, borderColor: active ? 'var(--accent)' : undefined }}>
                    {active ? '✓ ' : ''}{s}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">⚙️ Preferences</div>
            <label className="input-label" style={{ marginBottom: 8 }}>Preferred Internship Types</label>
            <div className="tags-row">
              {['remote', 'on-site', 'hybrid'].map((t) => (
                <span key={t} className={`badge badge-${t}`} onClick={() => toggleType(t)}
                  style={{ cursor: 'pointer', opacity: form.preferredTypes.includes(t) ? 1 : 0.35, fontSize: 14, padding: '6px 18px' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving...' : '💾 Save Profile & Recalculate Vector'}
          </button>
        </form>
      </div>
    </div>
  );
}
