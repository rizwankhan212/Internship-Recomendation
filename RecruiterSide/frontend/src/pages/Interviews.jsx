import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [shortlisted, setShortlisted] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    application_id: '', job_id: '', scheduled_at: '',
    duration_minutes: 30, mode: 'online', meeting_link: '', notes: '',
  });
  const [feedbackForm, setFeedbackForm] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [intRes, jobRes] = await Promise.all([
        api.get('/interviews'),
        api.get('/jobs'),
      ]);
      setInterviews(intRes.data);
      setJobs(jobRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadShortlisted = async (jobId) => {
    try {
      const { data } = await api.get(`/jobs/${jobId}/shortlist`);
      setShortlisted(data.shortlisted || []);
    } catch (err) { setShortlisted([]); }
  };

  const handleJobSelect = (jobId) => {
    setForm({ ...form, job_id: jobId });
    loadShortlisted(jobId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/interviews', {
        ...form,
        duration_minutes: parseInt(form.duration_minutes),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      });
      setShowForm(false);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Failed to schedule'); }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/interviews/${feedbackForm.id}`, {
        status: 'completed',
        feedback: feedbackForm.feedback,
        rating: parseFloat(feedbackForm.rating),
      });
      setFeedbackForm(null);
      loadData();
    } catch (err) { alert('Failed to save feedback'); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2>Interview Panel</h2>
          <p>Schedule and manage candidate interviews</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          📅 Schedule Interview
        </button>
      </div>

      {/* Schedule Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Schedule Interview</h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Job *</label>
                <select className="form-select" value={form.job_id} onChange={(e) => handleJobSelect(e.target.value)} required>
                  <option value="">Select Job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Candidate *</label>
                <select className="form-select" value={form.application_id}
                  onChange={(e) => setForm({...form, application_id: e.target.value})} required>
                  <option value="">Select Shortlisted Candidate</option>
                  {shortlisted.map(s => (
                    <option key={s.application_id} value={s.application_id}>
                      {s.student_name} (Score: {(s.rank_score * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date & Time *</label>
                  <input className="form-input" type="datetime-local" value={form.scheduled_at}
                    onChange={set('scheduled_at')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <input className="form-input" type="number" min="15" max="180"
                    value={form.duration_minutes} onChange={set('duration_minutes')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={form.mode} onChange={set('mode')}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Meeting Link</label>
                  <input className="form-input" value={form.meeting_link} onChange={set('meeting_link')}
                    placeholder="https://meet.google.com/..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={set('notes')}
                  placeholder="Interview notes, topics to discuss..." />
              </div>
              <div className="flex gap-sm" style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" type="submit">Schedule</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setFeedbackForm(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Interview Feedback</h3>
              <button className="btn-icon" onClick={() => setFeedbackForm(null)}>✕</button>
            </div>
            <form onSubmit={handleFeedback}>
              <div className="form-group">
                <label className="form-label">Candidate</label>
                <input className="form-input" value={feedbackForm.student_name || 'Candidate'} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Rating (1-5) *</label>
                <input className="form-input" type="number" step="0.5" min="1" max="5"
                  value={feedbackForm.rating} onChange={(e) => setFeedbackForm({...feedbackForm, rating: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Feedback *</label>
                <textarea className="form-textarea" value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm({...feedbackForm, feedback: e.target.value})}
                  placeholder="Your detailed feedback about the candidate..." required />
              </div>
              <div className="flex gap-sm">
                <button className="btn btn-primary" type="submit">💾 Save Feedback</button>
                <button className="btn btn-secondary" type="button" onClick={() => setFeedbackForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interviews List */}
      {interviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <h3>No interviews scheduled</h3>
          <p>Schedule interviews with shortlisted candidates</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{iv.student_name || 'Unknown'}</div>
                  </td>
                  <td>{iv.job_title || '—'}</td>
                  <td>{new Date(iv.scheduled_at).toLocaleString()}</td>
                  <td>{iv.duration_minutes} min</td>
                  <td>
                    <span className="badge badge-applied" style={{ textTransform: 'capitalize' }}>
                      {iv.mode === 'online' ? '💻' : iv.mode === 'phone' ? '📞' : '🏢'} {iv.mode}
                    </span>
                  </td>
                  <td><span className={`badge badge-${iv.status}`}>{iv.status}</span></td>
                  <td>{iv.rating ? `⭐ ${iv.rating}/5` : '—'}</td>
                  <td>
                    <div className="flex gap-sm">
                      {iv.status === 'scheduled' && (
                        <button className="btn btn-sm btn-primary"
                          onClick={() => setFeedbackForm({ id: iv.id, student_name: iv.student_name, feedback: '', rating: 3 })}>
                          📝 Feedback
                        </button>
                      )}
                      {iv.meeting_link && (
                        <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
                          🔗 Join
                        </a>
                      )}
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
