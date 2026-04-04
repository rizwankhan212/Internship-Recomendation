export default function ScoreBar({ label, value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="score-bar-wrap">
      <div className="score-label">
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pct}%</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            background: color || 'linear-gradient(90deg, var(--accent), var(--accent-2))',
          }}
        />
      </div>
    </div>
  );
}
