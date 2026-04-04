import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function InternshipCard({ internship, scores, applied, applicationStatus, onApply, showApply = true }) {
  const nav = useNavigate();
  const stipendK = internship?.stipend ? `₹${(internship.stipend / 1000).toFixed(0)}K/mo` : 'Unpaid';

  return (
    <div className="internship-card" onClick={() => {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div className="internship-company">🏢 {internship?.company}</div>
          <div className="internship-title">{internship?.title}</div>
        </div>
        {scores?.rankScore !== undefined && (
          <div className="rank-badge">⚡ {Math.round(scores.rankScore * 100)}% match</div>
        )}
        {applicationStatus && <StatusBadge status={applicationStatus} />}
      </div>

      <div className="internship-meta">
        <span className="internship-meta-item">📍 {internship?.location}</span>
        <span className="internship-meta-item">⏱ {internship?.duration}</span>
        <span className="internship-meta-item">👥 {internship?.openings} openings</span>
      </div>

      <div className="tags-row" style={{ marginBottom: 12 }}>
        <span className={`badge badge-${internship?.type}`}>{internship?.type}</span>
        {internship?.skills?.slice(0, 4).map((s) => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
        {internship?.skills?.length > 4 && (
          <span className="skill-tag">+{internship.skills.length - 4}</span>
        )}
      </div>

      <div className="internship-footer">
        <div className="internship-stipend">{stipendK}</div>
        {showApply && (
          applied ? (
            <StatusBadge status={applicationStatus || 'pending'} />
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => { e.stopPropagation(); onApply && onApply(internship); }}
            >
              Apply Now →
            </button>
          )
        )}
      </div>
    </div>
  );
}
