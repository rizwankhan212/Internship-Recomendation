import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const registerCandidate = (data) => api.post('/auth/register/candidate', data);
export const loginUser         = (data) => api.post('/auth/login', data);
export const getMe             = ()     => api.get('/auth/me');
export const forgotPassword    = (data) => api.post('/auth/forgot-password', data);
export const resetPassword     = (token, data) => api.post(`/auth/reset-password/${token}`, data);

// ── Candidate Profile ────────────────────────────────────────────────────────
export const getCandidateProfile   = ()     => api.get('/candidates/me');
export const updateCandidateProfile = (data) => api.put('/candidates/me', data);
export const deleteCandidateAccount = ()     => api.delete('/candidates/me');

// ── Search & Recommendations ─────────────────────────────────────────────────
export const searchInternships = (data)   => api.post('/candidates/search', data);
export const getRecommendations = ()      => api.get('/candidates/recommendations');

// ── Applications ──────────────────────────────────────────────────────────────
export const applyToInternship  = (id, formData) => api.post(`/candidates/apply/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMyApplications  = ()          => api.get('/candidates/applications');
export const getApplicationStatus = (id)      => api.get(`/candidates/applications/${id}`);

// ── Public Internships ────────────────────────────────────────────────────────
export const getAllInternships  = (params) => api.get('/internships', { params });
export const getInternshipById = (id)     => api.get(`/internships/${id}`);

// ── ChromaDB Status ───────────────────────────────────────────────────────────
export const getChromaStatus = () => api.get('/chroma/status');
export const getHealth       = () => api.get('/health');

export default api;
