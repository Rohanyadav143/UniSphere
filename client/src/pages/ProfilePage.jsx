import { useState } from "react";
import { ArrowRight, CalendarDays, Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api, { apiMessage } from "../services/api.js";
import { Breadcrumb } from "../components/Layout.jsx";
import { notify, useDocumentMeta } from "../components/Feedback.jsx";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useDocumentMeta("Your profile", "Manage your UniSphere account profile.");
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch("/auth/profile", { name });
      await refreshUser();
      notify("Profile updated.");
    } catch (requestError) { setError(apiMessage(requestError)); }
    finally { setSaving(false); }
  }
  return <main className="page-shell profile-page"><Breadcrumb parts={[{ label: "Profile" }]}/><section className="profile-header"><div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><div className="eyebrow">YOUR PATHWAY ACCOUNT</div><h1>{user.name}<span className="heading-period">.</span></h1><p>{user.email}</p></div></section><div className="profile-grid"><form className="profile-card" onSubmit={save}><h2>Profile details</h2><label>Name<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required/></label><label>Email<input value={user.email} readOnly/></label>{error && <div className="form-error">{error}</div>}<button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"} <ArrowRight size={14}/></button></form><aside className="profile-card profile-meta"><h2>Account</h2><p><Mail size={15}/><span>{user.email}</span></p><p><CalendarDays size={15}/><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></p><p><UserRound size={15}/><span>{user.role === "admin" ? "Administrator" : "Student account"}</span></p><Link to={user.role === "admin" ? "/admin" : "/dashboard"}>{user.role === "admin" ? "Open admin studio" : "View learning progress"} <ArrowRight size={13}/></Link></aside></div></main>;
}
