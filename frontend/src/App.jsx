import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import CandidateDashboard from "./pages/CandidateDashboard";
import RecruiterDashboard from "./pages/RecruiterDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/candidate-dashboard" element={
          <ProtectedRoute allowedRole="candidate">
            <CandidateDashboard/>
          </ProtectedRoute>
        } />
        <Route path="/recruiter-dashboard" element={
          <ProtectedRoute allowedRole="recruiter">
            <RecruiterDashboard/>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;