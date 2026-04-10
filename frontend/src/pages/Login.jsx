import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/candidateApi';

export default function Login() {
  const [role, setRole] = useState('candidate');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await loginUser({ ...form, role });
      const { token, role: r, user } = res.data;
      login(token, r, user);
      navigate(r === 'recruiter' ? '/recruiter' : '/candidate');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="hero-orb hero-orb-1" style={{ opacity: 0.4 }} />
      <div className="hero-orb hero-orb-2" style={{ opacity: 0.3 }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">⚡ Intern's Home</div>
          <div className="auth-logo-sub">Welcome back! Sign in to continue.</div>
        </div>

        {/* Role Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${role === 'candidate' ? 'active' : ''}`} onClick={() => setRole('candidate')}>
            👤 Candidate
          </button>
          <button className={`auth-tab ${role === 'recruiter' ? 'active' : ''}`} onClick={() => setRole('recruiter')}>
            🏢 Recruiter
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder={role === 'recruiter' ? 'e.g. priya@google.com' : 'your@email.com'}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Signing in...' : `Sign in as ${role === 'recruiter' ? 'Recruiter' : 'Candidate'} →`}
          </button>
        </form>

      

        <div className="auth-divider" style={{ marginTop: 20 }}>
          Don't have an account? <Link to="/register" className="auth-link">Register here</Link>
        </div>
      </div>
    </div>
  );
}
