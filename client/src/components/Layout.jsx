import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowRight, Code2, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import api, { apiMessage } from "../services/api.js";
import { confirmAction, notify } from "./Feedback.jsx";
import { FooterSearch } from "./Search.jsx";
import { useResource } from "../hooks/useResource.js";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { data: roadmapData } = useResource(async signal => {
    const { data } = await api.get("/roadmaps", { signal });
    return data.data;
  }, []);
  const roadmaps = Array.isArray(roadmapData) ? roadmapData : [];
  useEffect(() => {
    const openSearch = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  async function signOut() {
    if (!(await confirmAction("You'll need to sign in again to sync your progress.", { title: "Log out of UniSphere?", confirmLabel: "Log out", tone: "warning" }))) return;
    try {
      await logout();
      navigate("/");
      notify("You have been logged out.");
    } catch (error) {
      notify(apiMessage(error), "error");
    }
  }

  return <>
    <header className={`site-header ${menuOpen ? "menu-open" : ""}`}><div className="header-inner">
      <Link to="/" className="brand" aria-label="UniSphere home"><span className="brand-mark">U</span><span>UniSphere<span className="brand-dot">.</span></span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {user?.role === "admin"
          ? <><NavLink to="/" end>Home</NavLink><NavLink to="/admin">Admin</NavLink><NavLink to="/admin/content/roadmaps">Manage content</NavLink><NavLink to="/admin/users">Students</NavLink></>
          : <><NavLink to="/" end>Home</NavLink><a href="/#roadmaps">Roadmaps</a>{roadmaps.map(roadmap => <NavLink key={roadmap._id} to={`/${roadmap.slug}`}>{roadmap.title}</NavLink>)}</>}
      </nav>
      <div className="header-actions">
        <button className="icon-button search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Search learning content"><Search size={16} /><span className="search-label">Search</span><kbd>⌘ K</kbd></button>
        {user ? <>{user.role !== "admin" && <Link className="header-dashboard" to="/dashboard">Dashboard</Link>}<Link className="header-user" to="/profile" aria-label={`Profile: ${user.name}`}><span>{user.name.slice(0, 1).toUpperCase()}</span></Link><button className="text-button logout-link" type="button" onClick={signOut}>Log out</button></> : <Link className="header-dashboard" to="/login">Log in</Link>}
        <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="icon-button menu-toggle" type="button" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </div>
      {menuOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}>{user?.role === "admin" ? <><Link to="/">Home</Link><Link to="/admin">Admin overview</Link><Link to="/admin/content/roadmaps">Manage content</Link><Link to="/admin/users">Student accounts</Link></> : <><Link to="/">Home</Link><a href="/#roadmaps">All roadmaps</a>{roadmaps.map(roadmap => <Link key={roadmap._id} to={`/${roadmap.slug}`}>{roadmap.title}</Link>)}</>}{user ? <><Link to="/profile">Profile</Link><button type="button" className="mobile-logout" onClick={signOut}>Log out</button></> : <Link to="/login">Log in</Link>}</nav>}
    </header>
    {searchOpen && <FooterSearch onClose={() => setSearchOpen(false)} />}
  </>;
}

export function Footer() {
  const { data: roadmapData } = useResource(async signal => {
    const { data } = await api.get("/roadmaps", { signal });
    return data.data;
  }, []);
  const roadmaps = Array.isArray(roadmapData) ? roadmapData : [];
  return <footer className="site-footer"><div className="footer-main">
    <div className="footer-brand"><Link to="/" className="brand"><span className="brand-mark">U</span><span>UniSphere<span className="brand-dot">.</span></span></Link><p>Make progress on the skills that move your career forward.</p></div>
    <div className="footer-links"><div><span className="footer-label">LEARN</span>{roadmaps.map(roadmap => <Link to={`/${roadmap.slug}`} key={roadmap._id}>{roadmap.title}</Link>)}</div>
      <div><span className="footer-label">EXPLORE</span><Link to="/">Home</Link><a href="/#roadmaps">All roadmaps</a><Link to="/login">Sign in</Link></div></div>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} UniSphere</span><span>Built for the long game.</span></div></footer>;
}

export function SiteLayout({ children }) {
  return <><Header/>{children}<Footer/></>;
}

export function ProgressBar({ value = 0, label }) {
  return <div className="progress-line" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>;
}

export function Breadcrumb({ parts = [] }) {
  return <div className="breadcrumb"><Link to="/">Home</Link>{parts.map((part, index) => <span key={`${part.label}-${index}`} className="breadcrumb-part"><i>/</i>{part.to ? <Link to={part.to}>{part.label}</Link> : <span>{part.label}</span>}</span>)}</div>;
}

export function ArrowLink({ to, children, className = "text-link" }) {
  return <Link to={to} className={className}>{children}<ArrowRight size={14}/></Link>;
}

export function BrandIcon({ type }) {
  return type === "dsa" ? <Code2 size={21} /> : <Code2 size={21} />;
}
