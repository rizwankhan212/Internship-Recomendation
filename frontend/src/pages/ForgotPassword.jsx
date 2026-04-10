import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/candidateApi';

export default function ForgotPassword() {
  const [role, setRole] = useState('candidate');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setDevLink(''); setLoading(true);
    try {
      const res = await forgotPassword({ email, role });
      setSuccess(res.data.message);
      if (res.data.devResetUrl) setDevLink(res.data.devResetUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
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
          <div className="auth-logo-text">🔐 Reset Password</div>
          <div className="auth-logo-sub">Enter your email to receive a password reset link.</div>
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
        {success && (
          <div className="alert" style={{ background: 'rgba(0,229,160,0.1)', color: '#00ca8a', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 14 }}>
            ✅ {success}
          </div>
        )}

        {/* Dev mode link */}
        {devLink && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.3)', borderRadius: 10, fontSize: 13, wordBreak: 'break-all' }}>
            <strong>⚠️ Dev Mode:</strong> <a href={devLink} style={{ color: 'var(--primary)' }}>Click here to reset</a>
          </div>
        )}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                id="forgot-email"
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button id="forgot-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Sending...' : 'Send Reset Link →'}
            </button>
          </form>
        )}

        <div className="auth-divider" style={{ marginTop: 20 }}>
          Remember your password? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
