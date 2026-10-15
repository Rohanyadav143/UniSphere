import { ArrowRight, BookOpenCheck, CheckCircle2, Code2, Layers3, Laptop, ListChecks, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { useResource } from "../hooks/useResource.js";
import api from "../services/api.js";
import { ErrorState, Loading, useDocumentMeta } from "../components/Feedback.jsx";
import { ProgressBar } from "../components/Layout.jsx";

export default function HomePage() {
  const { data, loading, error, reload } = useResource(async signal => {
    const { data: response } = await api.get("/roadmaps", { signal });
    return Array.isArray(response.data) ? response.data : [];
  }, []);
  const { user } = useAuth();
  const { completed } = useProgress();
  const roadmaps = Array.isArray(data) ? data : [];
  useDocumentMeta("Learn. Build. Grow.", "UniSphere offers structured learning paths with organized topics, lessons, DSA questions, and progress tracking.");

  const topicCount = roadmaps.reduce((sum, roadmap) => sum + (roadmap.topics?.length || 0), 0);
  const itemCount = roadmaps.reduce((sum, roadmap) => sum + (roadmap.topics || []).reduce((topicSum, topic) => topicSum + (topic.itemCount || 0), 0), 0);

  return <main>
    <Hero roadmaps={roadmaps} loading={loading} error={error}/>
    <section className="path-section section-wrap" id="roadmaps">
      <div className="section-heading"><div><div className="eyebrow">CHOOSE YOUR DIRECTION</div><h2>Learning paths. <span>One good place to start.</span></h2></div><p>Clear roadmaps with lessons and milestones to keep you moving.</p></div>
      {loading ? <Loading label="Loading learning paths…"/> : error ? <ErrorState message={error} retry={reload}/> : roadmaps.length ? <div className="path-grid">{roadmaps.map((roadmap, index) => <RoadmapCard key={roadmap._id} roadmap={roadmap} completed={completed} user={user} index={String(index + 1).padStart(2, "0")} kicker={roadmap.pathType || (roadmap.type === "dsa" ? "CORE CONCEPTS" : roadmap.type === "mern" ? "DEVELOPMENT" : "LEARNING PATH")} tagline={roadmap.description} icon={roadmap.type === "dsa" ? <Layers3/> : <Code2/>}/>)}</div> : <div className="empty-state compact-empty"><h3>New learning paths are on the way.</h3><p>Check back soon to explore the first course.</p></div>}
    </section>
    {!loading && !error && roadmaps.length > 0 && <section className="curriculum-section section-wrap" aria-labelledby="curriculum-title">
      <div className="section-heading"><div><div className="eyebrow">BUILT AROUND THE REAL CURRICULUM</div><h2 id="curriculum-title">A clear path, <span>step by step.</span></h2></div><p>Explore the published topics in each learning path before you begin.</p></div>
      <div className="curriculum-grid">{roadmaps.map(roadmap => <article className={`curriculum-card ${roadmap.type === "dsa" ? "curriculum-dsa" : ""}`} key={roadmap._id}>
        <div className="curriculum-card-heading"><span className="curriculum-icon">{roadmap.type === "dsa" ? <Layers3/> : <Code2/>}</span><div><span className="curriculum-kicker">{roadmap.pathType || "LEARNING PATH"}</span><h3>{roadmap.title}</h3></div><Link to={`/${roadmap.slug}`} aria-label={`Explore ${roadmap.title}`}><ArrowRight size={17}/></Link></div>
        {roadmap.topics?.length ? <ol className="curriculum-steps">{roadmap.topics.slice(0, 6).map((topic, index) => <li key={topic._id}><span>{String(index + 1).padStart(2, "0")}</span><Link to={`/${roadmap.slug}/${topic.slug}`}>{topic.title}</Link><small>{topic.itemCount || 0} items</small></li>)}</ol> : <p className="curriculum-empty">Topics will appear here when this path is published.</p>}
        {roadmap.topics?.length > 6 && <p className="curriculum-more">+ {roadmap.topics.length - 6} more topics in this path</p>}
      </article>)}</div>
    </section>}
    {!loading && !error && roadmaps.length > 0 && <section className="platform-facts section-wrap" aria-label="UniSphere learning content">
      <div><strong>{roadmaps.length}</strong><span>published learning paths</span></div><div><strong>{topicCount}</strong><span>curriculum topics</span></div><div><strong>{itemCount}</strong><span>published lessons and questions</span></div>
    </section>}
    <section className="features-section section-wrap"><div className="section-heading"><div><div className="eyebrow">MADE FOR STEADY PROGRESS</div><h2>Everything you need to <span>keep moving.</span></h2></div><p>Focused learning tools, with the content and progress connected to your actual courses.</p></div><div className="feature-grid">
      <FeatureCard icon={<ListChecks/>} title="A structured learning sequence" text="Follow published topics in a clear order and see how each step fits into the bigger picture."/>
      <FeatureCard icon={<Play/>} title="Lessons with video" text="Open a lesson to watch its embedded video, review its description, and move to the next item."/>
      <FeatureCard icon={<CheckCircle2/>} title="Progress that stays yours" text="Track lessons as a guest on this device, or sign in to sync your progress to your account."/>
      <FeatureCard icon={<Code2/>} title="Topic-based DSA questions" text="Open linked coding problems from DSA topics and keep a separate checklist of what you have solved."/>
      <FeatureCard icon={<Laptop/>} title="Learn across your devices" text="Browse UniSphere on a phone, tablet, laptop, or desktop with layouts designed to adapt."/>
      <FeatureCard icon={<Sparkles/>} title="A focused learning space" text="Search published courses and jump straight to a topic or lesson when you know what you need."/>
    </div></section>
    <section className="how-section section-wrap"><div className="section-heading"><div><div className="eyebrow">A SIMPLE WAY FORWARD</div><h2>Learn by <span>doing.</span></h2></div><p>Start with a path, build a learning habit, and make each completed step count.</p></div><div className="how-grid">
      <HowCard number="01" icon={<BookOpenCheck/>} title="Choose a learning path" text="Explore the available courses and pick a direction that fits what you want to learn."/>
      <HowCard number="02" icon={<Play/>} title="Follow the curriculum" text="Move through the published topics and watch lessons at a pace that works for you."/>
      <HowCard number="03" icon={<CheckCircle2/>} title="Track your progress" text="Mark lessons and DSA questions complete, then continue from your next step."/>
    </div></section>
    <section className="bottom-cta section-wrap"><div><div className="eyebrow">START WHEN YOU'RE READY</div><h2>Your next step is <span>one click away.</span></h2><p>Explore a learning path and keep your progress saved on this device.</p></div>{roadmaps[0] && <Link className="button button-primary" to={`/${roadmaps[0].slug}`}>Explore {roadmaps[0].title} <ArrowRight size={15}/></Link>}</section>
  </main>;
}

function Hero({ roadmaps = [], loading = false, error }) {
  const featuredRoadmaps = roadmaps.slice(0, 2);
  return <section className="hero-section"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-pulse"/>LEARNING, WITH A CLEAR NEXT STEP</div>
    <h1>Build skills.<br/>One thoughtful step <span>at a time.</span></h1>
    <p className="hero-description">Explore focused learning paths for web development and problem solving, and keep track of what you learn.</p>
    <div className="hero-actions">{featuredRoadmaps.map((roadmap, index) => <Link className={`button ${index === 0 ? "button-primary" : "button-secondary"}`} to={`/${roadmap.slug}`} key={roadmap._id}>{index === 0 ? "Start learning" : roadmap.title} <ArrowRight size={15}/></Link>)}{!featuredRoadmaps.length && <Link className="button button-primary" to="/#roadmaps">Explore courses <ArrowRight size={15}/></Link>}</div>
    <div className="hero-proof"><span className="hero-proof-mark"><CheckCircle2 size={15}/></span><span>Self-paced lessons <i/> Progress tracking <i/> Your learning, your pace</span></div>
  </div><div className="hero-art"><div className="learning-preview">
    <div className="learning-preview-heading"><div><span className="learning-preview-kicker">EXPLORE THE CURRICULUM</span><h2>Choose a learning path</h2></div><Layers3 size={18}/></div>
    {loading ? <div className="learning-preview-empty" role="status">Loading published learning paths…</div> : error ? <div className="learning-preview-empty" role="status">Learning paths could not be loaded. Try again below.</div> : featuredRoadmaps.length ? <div className="learning-preview-list">{featuredRoadmaps.map(roadmap => <Link className="learning-preview-path" to={`/${roadmap.slug}`} key={roadmap._id}>
      <div className="learning-preview-path-heading"><span className="learning-preview-icon">{roadmap.type === "dsa" ? <Layers3 size={16}/> : <Code2 size={16}/>}</span><span><small>{roadmap.pathType || "LEARNING PATH"}</small><strong>{roadmap.title}</strong></span><ArrowRight size={15}/></div>
      {roadmap.description && <p>{roadmap.description}</p>}
      {roadmap.topics?.length > 0 && <ol>{roadmap.topics.slice(0, 3).map((topic, index) => <li key={topic._id}><span>{String(index + 1).padStart(2, "0")}</span><span>{topic.title}</span>{typeof topic.itemCount === "number" && <small>{topic.itemCount} items</small>}</li>)}</ol>}
      <span className="learning-preview-meta">{roadmap.topics?.length ? `${roadmap.topics.length} topics` : ""}{roadmap.topics?.length && roadmap.topics.some(topic => typeof topic.itemCount === "number") ? " · " : ""}{roadmap.topics?.some(topic => typeof topic.itemCount === "number") ? `${roadmap.topics.reduce((sum, topic) => sum + (topic.itemCount || 0), 0)} learning items` : ""}</span>
    </Link>)}</div> : <div className="learning-preview-empty">Published learning paths will appear here.</div>}
  </div></div></div><div className="hero-footnote"><span>YOUR LEARNING PATHS</span><a href="#roadmaps">Explore the curriculum <ArrowRight size={13}/></a></div></section>;
}

function RoadmapCard({ roadmap, completed, user, index, kicker, tagline, icon }) {
  const topics = Array.isArray(roadmap.topics) ? roadmap.topics : [];
  const count = topics.reduce((sum, topic) => sum + (topic.itemCount || 0), 0);
  const localFinished = topics.reduce((sum, topic) => sum
    + (topic.itemIds || []).filter(id => completed.has(`lesson:${id}`)).length
    + (topic.questionIds || []).filter(id => completed.has(`dsaQuestion:${id}`)).length, 0);
  const progress = user ? roadmap.progress?.percentage || 0 : count ? Math.round(localFinished / count * 100) : 0;
  return <Link className={`path-card path-${roadmap.type}`} to={`/${roadmap.slug}`}><div className="path-card-top"><span className="path-number">{index} / PATHWAY</span><span className="path-card-arrow"><ArrowRight size={17}/></span></div><div className="path-symbol">{icon}</div><div className="path-card-body"><span className="path-kicker">{kicker}</span><h3>{roadmap.title}</h3><p>{tagline || "Explore a structured set of topics and learning content."}</p></div><div className="path-card-meta"><span>{topics.length} topics</span><span>{count} learning items</span></div><div className="path-card-progress"><ProgressBar value={progress} label={`${roadmap.title} progress`}/><span>{progress}%</span></div></Link>;
}

function FeatureCard({ icon, title, text }) {
  return <article className="feature-card"><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article>;
}

function HowCard({ number, icon, title, text }) {
  return <article className="how-card"><span className="how-index">{number}</span><span className="how-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article>;
}
