import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/client';

const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metricsRes, skillsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/skills'),
      ]);
      setMetrics(metricsRes.data);
      setSkills(skillsRes.data.skills || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const m = metrics || {};
  const metricCards = [
    { label: 'Total Jobs', value: m.total_jobs || 0, icon: '💼', color: '#6366f1' },
    { label: 'Active Jobs', value: m.active_jobs || 0, icon: '🟢', color: '#10b981' },
    { label: 'Total Applicants', value: m.total_applicants || 0, icon: '👥', color: '#22d3ee' },
    { label: 'Shortlisted', value: m.shortlisted || 0, icon: '⭐', color: '#f59e0b' },
    { label: 'Selected', value: m.selected || 0, icon: '✅', color: '#10b981' },
    { label: 'Interviews', value: m.interviews_scheduled || 0, icon: '📅', color: '#a855f7' },
    { label: 'Selection Rate', value: `${m.selection_rate || 0}%`, icon: '📈', color: '#6366f1' },
    { label: 'Shortlist Rate', value: `${m.shortlist_rate || 0}%`, icon: '🎯', color: '#22d3ee' },
  ];

  const funnelData = [
    { name: 'Applied', value: m.total_applicants || 0 },
    { name: 'Shortlisted', value: m.shortlisted || 0 },
    { name: 'Interviewed', value: m.interviews_scheduled || 0 },
    { name: 'Selected', value: m.selected || 0 },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your recruitment pipeline</p>
      </div>

      <div className="metrics-grid">
        {metricCards.map((card, i) => (
          <div className="metric-card" key={i} style={{ '--card-accent': card.color }}>
            <div className="metric-icon" style={{ background: `${card.color}20`, color: card.color }}>
              {card.icon}
            </div>
            <div className="metric-value" style={{ color: card.color }}>{card.value}</div>
            <div className="metric-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Hiring Funnel</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1f35', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }}
                labelStyle={{ color: '#f0f2f8' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Skill Demand</span>
          </div>
          {skills.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={skills.slice(0, 8)} layout="vertical" barSize={18}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: '#1a1f35', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }}
                />
                <Bar dataKey="demand_score" radius={[0, 6, 6, 0]}>
                  {skills.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>Create jobs to see skill demand analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
