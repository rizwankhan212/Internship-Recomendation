import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateProfile from './pages/candidate/Profile';
import CandidateApplications from './pages/candidate/Applications';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import RecruiterProfile from './pages/recruiter/Profile';
import PostInternship from './pages/recruiter/PostInternship';
import Applicants from './pages/recruiter/Applicants';
import Shortlist from './pages/recruiter/Shortlist';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { user, role } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={role === 'recruiter' ? '/recruiter' : '/candidate'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={role === 'recruiter' ? '/recruiter' : '/candidate'} /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password/:token" element={user ? <Navigate to="/" /> : <ResetPassword />} />

        {/* Candidate Routes */}
        <Route path="/candidate" element={<PrivateRoute requiredRole="candidate"><CandidateDashboard /></PrivateRoute>} />
        <Route path="/candidate/profile" element={<PrivateRoute requiredRole="candidate"><CandidateProfile /></PrivateRoute>} />
        <Route path="/candidate/applications" element={<PrivateRoute requiredRole="candidate"><CandidateApplications /></PrivateRoute>} />

        {/* Recruiter Routes */}
        <Route path="/recruiter" element={<PrivateRoute requiredRole="recruiter"><RecruiterDashboard /></PrivateRoute>} />
        <Route path="/recruiter/profile" element={<PrivateRoute requiredRole="recruiter"><RecruiterProfile /></PrivateRoute>} />
        <Route path="/recruiter/post" element={<PrivateRoute requiredRole="recruiter"><PostInternship /></PrivateRoute>} />
        <Route path="/recruiter/internships/:id/applicants" element={<PrivateRoute requiredRole="recruiter"><Applicants /></PrivateRoute>} />
        <Route path="/recruiter/internships/:id/shortlist" element={<PrivateRoute requiredRole="recruiter"><Shortlist /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
