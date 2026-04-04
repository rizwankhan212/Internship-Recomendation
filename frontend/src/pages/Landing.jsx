import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getChromaStatus } from '../api/candidateApi';

export default function Landing() {
  const [chromaStatus, setChromaStatus] = useState(null);

  useEffect(() => {
    getChromaStatus()
      .then((res) => setChromaStatus(res.data.chroma))
      .catch(() => setChromaStatus({ available: false }));
  }, []);

  return (
    <div className="hero">
      {/* Background orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      {/* ChromaDB live status pill */}
      {chromaStatus !== null && (
        <div
          style={{
            position: 'fixed', top: 72, right: 20, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 8,
            background: chromaStatus.available ? 'rgba(0,229,160,0.1)' : 'rgba(255,214,10,0.1)',
            border: `1px solid ${chromaStatus.available ? 'rgba(0,229,160,0.3)' : 'rgba(255,214,10,0.3)'}`,
            borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 600,
            color: chromaStatus.available ? 'var(--green)' : 'var(--yellow)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', flexShrink: 0, animation: chromaStatus.available ? 'pulse-glow 2s infinite' : 'none' }} />
          ChromaDB {chromaStatus.available ? '✅ Connected' : '⚠️ Offline (fallback active)'}
        </div>
      )}



      <h1 className="hero-title">
        Find Your Perfect<br />Internship with AI
      </h1>


      <div className="hero-cta">
        <Link to="/register" className="btn btn-primary btn-lg">🚀 Get Started Free</Link>
        <Link to="/login" className="btn btn-secondary btn-lg">Sign In →</Link>
      </div>

      

      <div className="hero-stats">
        <div className="hero-stat"><div className="hero-stat-num">300+</div><div className="hero-stat-label">Candidates</div></div>
        <div className="hero-stat"><div className="hero-stat-num">20</div><div className="hero-stat-label">Internships</div></div>
        <div className="hero-stat"><div className="hero-stat-num">5</div><div className="hero-stat-label">Top Companies</div></div>
        <div className="hero-stat"><div className="hero-stat-num">700+</div><div className="hero-stat-label">Applications</div></div>
        <div className="hero-stat"><div className="hero-stat-num">BM25+ANN</div><div className="hero-stat-label">Hybrid Retrieval</div></div>
        <div className="hero-stat">
          <div className="hero-stat-num" style={{ color: chromaStatus?.available ? 'var(--green)' : 'var(--yellow)', fontSize: 18 }}>
            {chromaStatus === null ? '...' : chromaStatus.available ? 'LIVE' : 'FALLBACK'}
          </div>
          <div className="hero-stat-label">ChromaDB</div>
        </div>
      </div>
    </div>
  );
}
