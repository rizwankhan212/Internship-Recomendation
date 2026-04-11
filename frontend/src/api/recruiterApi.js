import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Recruiter Auth ──────────────────────────────────────────────────────────
export const registerRecruiter = (data) => api.post('/auth/register/recruiter', data);

// ── Recruiter Profile ───────────────────────────────────────────────────────
export const getRecruiterProfile = () => api.get('/recruiters/me');
export const updateRecruiterProfile = (data) => api.put('/recruiters/me', data);
export const deleteRecruiterAccount = () => api.delete('/recruiters/me');
export const getDashboardStats = () => api.get('/recruiters/dashboard/stats');

// ── Internship Management ────────────────────────────────────────────────────
export const getMyInternships = () => api.get('/recruiters/internships');
export const postInternship = (data) => api.post('/recruiters/internships', data);
export const updateInternship = (id, data) => api.put(`/recruiters/internships/${id}`, data);
export const deleteInternship = (id) => api.delete(`/recruiters/internships/${id}`);

// ── Applicant Management ─────────────────────────────────────────────────────
export const getApplicants = (internshipId, params) =>
  api.get(`/recruiters/internships/${internshipId}/applications`, { params });
export const getShortlist = (internshipId) =>
  api.get(`/recruiters/internships/${internshipId}/shortlist`);
export const updateApplicationStatus = (appId, status) =>
  api.put(`/recruiters/applications/${appId}/status`, { status });

export default api;
