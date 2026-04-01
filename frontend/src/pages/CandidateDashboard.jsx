import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function CandidateDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getCurrentUser();
        setUser(res.data.user);
      } catch {
        navigate("/");
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div>
      <h2>Dashboard</h2>

      {user && (
        <>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
        </>
      )}

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}