import { useEffect, useState } from "react";
import { getCurrentUser } from "../api/auth";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children,allowedRole }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getCurrentUser();
        setUser(res.data.user);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <p>Checking authentication...</p>;

  if (!user){
     return <Navigate to="/" state={{message:"Login to access this page"}}/>
  };

  if(allowedRole && user.role !== allowedRole){
    return <Navigate to='/' state={{message:"Access Denied"}}/>
  }

  return children;
}