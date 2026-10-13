import { ArrowRight, Check, Code2, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { ErrorState, Loading, useDocumentMeta } from "../components/Feedback.jsx";
import { Breadcrumb, ProgressBar } from "../components/Layout.jsx";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(async signal => {
    const { data: response } = await api.get("/progress/dashboard", { signal });
    return response.data;
  }, []);
  useDocumentMeta("Your learning progress", "Track your progress across all UniSphere learning paths.");
  if (loading) return <main className="page-shell"><Loading label="Loading your progress…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  const continueLink = item => item ? item.contentType === "dsaQuestion" ? item.url : `/${item.roadmapSlug}/${item.topicSlug}/${item.slug}` : "";
  return <main className="page-shell dashboard-page"><Breadcrumb parts={[{ label: "My progress" }]}/><section className="dashboard-welcome"><div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Welcome back, {user.name.split(" ")[0]}<span className="heading-period">.</span></h1><p>Every lesson adds up. Keep showing up for yourself.</p></div><div className="guest-pill"><span/> Progress synced to your account</div></section>
    <section className="dashboard-overview">{data.roadmaps.map((roadmap, index) => <ProgressCard key={roadmap._id} icon={roadmap.type === "dsa" ? <Layers3/> : <Code2/>} type={`${String(index + 1).padStart(2, "0")} / ${roadmap.type === "dsa" ? "CORE CONCEPTS" : "LEARNING PATH"}`} name={roadmap.title} value={roadmap.progress.percentage} completed={roadmap.progress.completed} total={roadmap.progress.total} to={`/${roadmap.slug}`}/>)}</section>
    <section className="dashboard-stats">{data.roadmaps.map(roadmap => <div key={roadmap._id}><strong>{roadmap.progress.completed}</strong><span>{roadmap.title} items completed</span></div>)}<div><strong>{data.totalCompleted}</strong><span>Total learning wins</span></div></section>
    <section className="continue-section"><div className="section-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue learning<span className="heading-period">.</span></h2></div></div><div className="continue-grid">{data.roadmaps.map(roadmap => <ContinueCard key={roadmap._id} label={roadmap.title} item={data.continueLearning[roadmap.slug]} href={continueLink(data.continueLearning[roadmap.slug])} roadmapSlug={roadmap.slug}/>)}</div></section>
    <section className="dashboard-recent"><div className="section-heading"><div><div className="eyebrow">THE LITTLE WINS</div><h2>Recently completed<span className="heading-period">.</span></h2></div></div>{data.recentlyCompleted.length ? <div className="recent-grid">{data.recentlyCompleted.map((item, index) => { const content = <><span className="recent-check"><Check size={14}/></span><span className="recent-card-copy"><small>{item.roadmap} / {item.topic}{item.contentType === "dsaQuestion" ? " / DSA Sheet" : ""}</small><strong>{item.title}</strong></span><span className="recent-card-time">{new Date(item.completedAt).toLocaleDateString()}</span></>; return item.contentType === "dsaQuestion" ? <a className="recent-card" href={item.url} target="_blank" rel="noopener noreferrer" key={`${item.contentType}-${item.slug}-${index}`}>{content}</a> : <Link className="recent-card" to={`/${item.roadmapSlug}/${item.topicSlug}/${item.slug}`} key={`${item.contentType}-${item.slug}-${index}`}>{content}</Link>;})}</div> : <div className="empty-state"><span className="empty-icon"><Check size={17}/></span><h3>You haven't completed anything yet.</h3><p>Start learning and your finished lessons will show up here.</p>{data.roadmaps[0] && <Link className="button button-primary" to={`/${data.roadmaps[0].slug}`}>Explore a roadmap <ArrowRight size={14}/></Link>}</div>}</section>
  </main>;
}

function ProgressCard({ icon, type, name, value, completed, total, to }) {
  return <div className={`overview-card ${name.startsWith("DSA") ? "overview-dsa" : ""}`}><div className="overview-top"><span className="overview-symbol">{icon}</span><span>{type}</span></div><h2>{name}</h2><div className="overview-progress-row"><strong>{value}<small>%</small></strong><span>{completed} / {total} completed</span></div><ProgressBar value={value} label={`${name} progress`}/><Link to={to}>View roadmap <ArrowRight size={12}/></Link></div>;
}
function ContinueCard({ label, item, href, roadmapSlug }) {
  const action = item?.contentType === "dsaQuestion"
    ? <a href={href} target="_blank" rel="noopener noreferrer">Open DSA question <ArrowRight size={12}/></a>
    : <Link to={href || `/${roadmapSlug}`}>{item?.title ? "Continue learning" : "Review roadmap"} <ArrowRight size={12}/></Link>;
  return <article className="continue-card"><span className="continue-badge">{label}{item ? ` · ${item.topic}` : ""}</span><h3>{item?.title || "Everything explored."}</h3><p>{item?.title ? item.contentType === "dsaQuestion" ? "Solve the next DSA Sheet problem." : "Continue your learning journey with the next lesson." : "You've completed all published content in this path."}</p>{action}</article>;
}
