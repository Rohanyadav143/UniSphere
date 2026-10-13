import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Loading } from "./Feedback.jsx";

export default function ProtectedRoute({ children, admin = false, studentOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="page-shell"><Loading label="Checking your session…"/></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
  if (admin && user.role !== "admin") return <Navigate to="/" replace/>;
  if (studentOnly && user.role === "admin") return <Navigate to="/admin" replace/>;
  return children;
}
