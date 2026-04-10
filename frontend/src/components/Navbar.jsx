import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode toggle — persisted in localStorage
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">⚡ Intern's Home</Link>
      <div className="navbar-links">
        {!user ? (
          <>
            <Link to="/" className={isActive('/')}>Home</Link>
            <div className="nav-divider" />
            <button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </>
        ) : role === 'candidate' ? (
          <>
            <Link to="/candidate" className={isActive('/candidate')}>Dashboard</Link>
            <Link to="/candidate/applications" className={isActive('/candidate/applications')}>Applications</Link>
            <Link to="/candidate/profile" className={isActive('/candidate/profile')}>Profile</Link>
            <div className="nav-divider" />
            <button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 8px' }}>
              👋 {user?.name?.split(' ')[0]}
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/recruiter" className={isActive('/recruiter')}>Dashboard</Link>
            <Link to="/recruiter/post" className={isActive('/recruiter/post')}>Post Internship</Link>
            <Link to="/recruiter/profile" className={isActive('/recruiter/profile')}>Profile</Link>
            <div className="nav-divider" />
            <button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 8px' }}>
              🏢 {user?.company}
            </span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
