import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useDocumentMeta, notify } from "../components/Feedback.jsx";

export default function AuthPage({ mode = "login" }) {
  const isSignup = mode === "signup";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useDocumentMeta(
    isSignup ? "Create your account" : "Log in",
    isSignup
      ? "Create a UniSphere account to sync your MERN and DSA learning progress across devices."
      : "Log in to UniSphere to continue your MERN and DSA learning and sync your progress."
  );
  if (user) return <Navigate to={location.state?.from || (user.role === "admin" ? "/admin" : "/dashboard")} replace/>;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const signedInUser = await (isSignup ? register(form) : login({ email: form.email, password: form.password }));
      notify(isSignup ? "Your account is ready. Guest progress synced." : "Welcome back. Guest progress synced.");
      navigate(location.state?.from || (signedInUser.role === "admin" ? "/admin" : "/dashboard"), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page"><section className="auth-card"><Link className="brand auth-brand" to="/"><span className="brand-mark">U</span><span>UniSphere<span className="brand-dot">.</span></span></Link><div className="auth-eyebrow"><LockKeyhole size={13}/> YOUR LEARNING, IN SYNC</div><h1>{isSignup ? "Create your account." : "Welcome back."}</h1><p className="auth-subtitle">{isSignup ? "Keep your progress with you, wherever you learn." : "Pick up where your learning journey left off."}</p>
    <form className="auth-form" onSubmit={handleSubmit}>{isSignup && <label>Your name<input autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={80} placeholder="Alex Morgan"/></label>}<label>Email<input type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required maxLength={254} placeholder="you@example.com"/></label><label>Password<span className="password-input"><input type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required minLength={isSignup ? 10 : 1} maxLength={128} placeholder={isSignup ? "At least 10 characters" : "Your password"}/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button-primary auth-submit" disabled={submitting}>{submitting ? "Please wait…" : isSignup ? "Create account" : "Log in"} <ArrowRight size={15}/></button></form>
    <div className="auth-switch">{isSignup ? "Already have an account?" : "New to UniSphere?"} <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create an account"}</Link></div>
    <div className="auth-local-note"><CheckCircle2 size={15}/><span>Your guest progress will sync when you {isSignup ? "sign up" : "log in"}.</span></div>
    <Link className="auth-back" to="/">← Keep learning without an account</Link></section></main>;
}
