import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerCandidate } from '../api/candidateApi';
import { registerRecruiter } from '../api/recruiterApi';

export default function Register() {
  const [role, setRole] = useState('candidate');
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    // Candidate fields
    skills: [], location: '', cgpa: '', college: '', degree: '', bio: '', preferredTypes: [],
    // Recruiter fields
    company: '', designation: '', industry: '', companyDescription: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const toggle = (field, val) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((x) => x !== val) : [...f[field], val],
    }));
  };

  const addSkill = (raw) => {
    const skill = raw.trim();
    if (skill && !form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setForm((f) => ({ ...f, skills: [...f.skills, skill] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
    if (e.key === 'Backspace' && !skillInput && form.skills.length) {
      removeSkill(form.skills[form.skills.length - 1]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      let res;
      if (role === 'candidate') {
        res = await registerCandidate({ ...form, skills: form.skills.map((s) => s.toLowerCase()) });
      } else {
        res = await registerRecruiter(form);
      }
      const { token, role: r, user } = res.data;
      login(token, r, user);
      navigate(r === 'recruiter' ? '/recruiter' : '/candidate');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="hero-orb hero-orb-1" style={{ opacity: 0.4 }} />
      <div className="hero-orb hero-orb-2" style={{ opacity: 0.3 }} />

      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-logo">
          <div className="auth-logo-text">⚡ Intern's Home</div>
          <div className="auth-logo-sub">Create your account to get started.</div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${role === 'candidate' ? 'active' : ''}`} onClick={() => setRole('candidate')}>👤 Candidate</button>
          <button className={`auth-tab ${role === 'recruiter' ? 'active' : ''}`} onClick={() => setRole('recruiter')}>🏢 Recruiter</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>

          {role === 'candidate' && (
            <>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">College / University</label>
                  <input className="input" type="text" placeholder="IIT Bombay" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Degree</label>
                  <select className="input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })}>
                    <option value="">Select degree</option>
                    {['B.Tech CSE', 'B.Tech ECE', 'M.Tech CSE', 'BCA', 'MCA', 'B.E. CSE', 'M.Sc Data Science'].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Location</label>
                  <input className="input" type="text" placeholder="Bangalore" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">CGPA</label>
                  <input className="input" type="number" min="0" max="10" step="0.1" placeholder="8.5" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Skills (type and press Enter to add)</label>
                <div className="tags-row" style={{ flexWrap: 'wrap', gap: 8, padding: form.skills.length ? '8px 0 4px' : 0 }}>
                  {form.skills.map((s) => (
                    <span key={s} className="skill-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, background: 'rgba(108,99,255,0.25)' }}>
                      {s}
                      <span onClick={() => removeSkill(s)} style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.7, marginLeft: 2 }} title="Remove skill">&times;</span>
                    </span>
                  ))}
                </div>
                <input
                  className="input"
                  type="text"
                  placeholder={form.skills.length ? 'Add another skill…' : 'e.g. JavaScript, Python, React'}
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={() => { if (skillInput.trim()) addSkill(skillInput); }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Preferred Internship Types</label>
                <div className="tags-row">
                  {['remote', 'on-site', 'hybrid'].map((t) => (
                    <span key={t} className={`badge badge-${t}`} style={{ cursor: 'pointer', opacity: form.preferredTypes.includes(t) ? 1 : 0.4 }} onClick={() => toggle('preferredTypes', t)}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {role === 'recruiter' && (
            <>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Company Name</label>
                  <input className="input" type="text" placeholder="Acme Corp" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Your Designation</label>
                  <input className="input" type="text" placeholder="HR Manager" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Industry</label>
                <select className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select industry</option>
                  {['Technology', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 'Manufacturing', 'Media'].map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Company Description</label>
                <textarea className="input" placeholder="Brief description of your company..." value={form.companyDescription} onChange={(e) => setForm({ ...form, companyDescription: e.target.value })} rows={3} />
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Creating account...' : `Create ${role === 'recruiter' ? 'Recruiter' : 'Candidate'} Account →`}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: 20 }}>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
