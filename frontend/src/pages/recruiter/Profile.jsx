import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRecruiterProfile, updateRecruiterProfile } from '../../api/recruiterApi';

export default function RecruiterProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    getRecruiterProfile().then((res) => {
      const r = res.data.recruiter;
      setForm({
        name: r.name || '',
        company: r.company || '',
        designation: r.designation || '',
        industry: r.industry || '',
        companyDescription: r.companyDescription || '',
        website: r.website || '',
        companySize: r.companySize || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await updateRecruiterProfile(form);
      setUser(res.data.recruiter);
      setAlert({ type: 'success', msg: 'Profile updated successfully!' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Update failed' });
    } finally { setSaving(false); }
  };

  if (loading || !form) return <div className="loading-wrap"><div className="spinner" /></div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="page-header">
          <h1>Recruiter Profile</h1>
          <p>Update your company information and recruiter details</p>
        </div>

        {alert && <div className={`alert alert-${alert.type}`}>{alert.msg} <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button></div>}

        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">👤 Personal Info</div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Your Name</label>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Designation</label>
                <input className="input" placeholder="HR Manager" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">🏢 Company Info</div>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Company Name</label>
                <input className="input" value={form.company} onChange={(e) => set('company', e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Industry</label>
                <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                  {['Technology', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 'Manufacturing', 'Media'].map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Website</label>
                <input className="input" type="url" placeholder="https://company.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Company Size</label>
                <select className="input" value={form.companySize} onChange={(e) => set('companySize', e.target.value)}>
                  <option value="">Select</option>
                  {['1-50', '50-200', '200-1000', '1000-5000', '5000-10000', '10000+'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1/-1' }}>
                <label className="input-label">Company Description</label>
                <textarea className="input" rows={4} placeholder="Brief about your company..." value={form.companyDescription} onChange={(e) => set('companyDescription', e.target.value)} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving...' : '💾 Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
