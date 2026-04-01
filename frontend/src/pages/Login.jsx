import { useState } from "react";
import { loginUser } from "../api/auth";
import { useNavigate,useLocation } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const message = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(form);
      const role = res.data.user.role;
      if (role ==='candidate') {
        navigate('/candidate-dashboard');
      }else{
        navigate('/recruiter-dashboard');
      }

    } catch (err) {
  setError(err.response?.data?.message || "Login failed");
}
  };

  return (
    <div>
      <h2>Login</h2>
      {message && <p style={{color:'red'}}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        
        <input
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button type="submit">Login</button>
      </form>

      <p onClick={() => navigate("/signup")}>
        Don’t have an account? Signup
      </p>
    </div>
  );
}