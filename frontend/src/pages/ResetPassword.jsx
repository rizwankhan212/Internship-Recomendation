import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/candidateApi';

export default function ResetPassword() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'candidate';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      await resetPassword(token, { password, role });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may be expired.');
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
          <div className="auth-logo-text">🔑 New Password</div>
          <div className="auth-logo-sub">
            {success
              ? 'Your password has been reset successfully!'
              : `Set a new password for your ${role} account.`}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: '#00ca8a', fontWeight: 600, fontSize: 16 }}>Password reset successful!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>Redirecting to login in 3 seconds...</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              Go to Login →
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input
                id="reset-password"
                className="input"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                id="reset-confirm"
                className="input"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p style={{ color: '#f43f5e', fontSize: 13, margin: '-8px 0 8px' }}>⚠️ Passwords don't match</p>
            )}

            <button id="reset-submit" className="btn btn-primary" type="submit" disabled={loading || password !== confirmPassword} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Resetting...' : 'Reset Password →'}
            </button>
          </form>
        )}

        <div className="auth-divider" style={{ marginTop: 20 }}>
          <Link to="/login" className="auth-link">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
