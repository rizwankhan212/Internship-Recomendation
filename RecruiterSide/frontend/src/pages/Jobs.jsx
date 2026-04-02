import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', description: '', required_skills: '', preferred_skills: '',
    min_cgpa: 0, eligible_branches: '', positions: 1, location: '',
    stipend: '', duration: '',
  });

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/jobs');
      setJobs(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', required_skills: '', preferred_skills: '',
      min_cgpa: 0, eligible_branches: '', positions: 1, location: '', stipend: '', duration: '' });
    setEditingJob(null);
    setShowForm(false);
  };

  const handleEdit = (job) => {
    setForm({
      title: job.title,
      description: job.description,
      required_skills: job.required_skills.join(', '),
      preferred_skills: job.preferred_skills.join(', '),
      min_cgpa: job.min_cgpa,
      eligible_branches: job.eligible_branches.join(', '),
      positions: job.positions,
      location: job.location || '',
      stipend: job.stipend || '',
      duration: job.duration || '',
    });
    setEditingJob(job);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
      preferred_skills: form.preferred_skills.split(',').map(s => s.trim()).filter(Boolean),
      eligible_branches: form.eligible_branches.split(',').map(s => s.trim()).filter(Boolean),
      min_cgpa: parseFloat(form.min_cgpa) || 0,
      positions: parseInt(form.positions) || 1,
    };
    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.id}`, payload);
      } else {
        await api.post('/jobs', payload);
      }
      resetForm();
      loadJobs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save job');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job posting?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      loadJobs();
    } catch (err) { alert('Failed to delete'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/jobs/${id}`, { status });
      loadJobs();
    } catch (err) { alert('Failed to update status'); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Job Postings</h2>
          <p>Manage your internship and job listings</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          ➕ Create Job
        </button>
      </div>

      {/* Job Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editingJob ? 'Edit Job' : 'Create Job Posting'}</h3>
              <button className="btn-icon" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input className="form-input" value={form.title} onChange={set('title')}
                  placeholder="e.g., ML Engineer Intern" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" value={form.description} onChange={set('description')}
                  placeholder="Job description, responsibilities, requirements..." required minLength={20} />
              </div>
              <div className="form-group">
                <label className="form-label">Required Skills * (comma-separated)</label>
                <input className="form-input" value={form.required_skills} onChange={set('required_skills')}
                  placeholder="python, machine learning, sql" required />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Skills (comma-separated)</label>
                <input className="form-input" value={form.preferred_skills} onChange={set('preferred_skills')}
                  placeholder="tensorflow, pytorch, docker" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min CGPA</label>
                  <input className="form-input" type="number" step="0.1" min="0" max="10"
                    value={form.min_cgpa} onChange={set('min_cgpa')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Positions</label>
                  <input className="form-input" type="number" min="1"
                    value={form.positions} onChange={set('positions')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Eligible Branches (comma-separated)</label>
                <input className="form-input" value={form.eligible_branches} onChange={set('eligible_branches')}
                  placeholder="Computer Science, Data Science, IT" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={set('location')}
                    placeholder="Bangalore / Remote" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stipend</label>
                  <input className="form-input" value={form.stipend} onChange={set('stipend')}
                    placeholder="₹25,000/month" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <input className="form-input" value={form.duration} onChange={set('duration')}
                  placeholder="3 months" />
              </div>
              <div className="flex gap-sm" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-primary" type="submit">
                  {editingJob ? '💾 Update Job' : '🚀 Publish Job'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <h3>No job postings yet</h3>
          <p>Create your first job posting to start receiving applications</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Skills</th>
                <th>Positions</th>
                <th>Min CGPA</th>
                <th>Applicants</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{job.title}</div>
                    <div className="text-sm text-muted">{job.location || 'Not specified'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                      {job.required_skills.slice(0, 3).map((s) => (
                        <span className="skill-tag" key={s}>{s}</span>
                      ))}
                      {job.required_skills.length > 3 && (
                        <span className="skill-tag">+{job.required_skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>{job.positions}</td>
                  <td>{job.min_cgpa > 0 ? job.min_cgpa.toFixed(1) : '—'}</td>
                  <td style={{ fontWeight: 600, color: '#22d3ee' }}>{job.application_count}</td>
                  <td>
                    <span className={`badge badge-${job.status}`}>{job.status}</span>
                  </td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn-icon" title="Edit" onClick={() => handleEdit(job)}>✏️</button>
                      {job.status === 'active' ? (
                        <button className="btn-icon" title="Pause" onClick={() => handleStatusChange(job.id, 'paused')}>⏸️</button>
                      ) : job.status === 'paused' ? (
                        <button className="btn-icon" title="Activate" onClick={() => handleStatusChange(job.id, 'active')}>▶️</button>
                      ) : null}
                      <button className="btn-icon" title="Delete" onClick={() => handleDelete(job.id)} style={{ color: '#ef4444' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
