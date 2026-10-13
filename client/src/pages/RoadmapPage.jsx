import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Layers3, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import api from "../services/api.js";
import { ErrorState, Loading, useDocumentMeta } from "../components/Feedback.jsx";
import { Breadcrumb, ProgressBar } from "../components/Layout.jsx";

export default function RoadmapPage() {
  const { roadmapSlug: routeSlug } = useParams();
  const roadmapSlug = routeSlug || window.location.pathname.split("/").filter(Boolean)[0];
  const { user } = useAuth();
  const { completed } = useProgress();
  const { data: roadmap, loading, error, reload } = useResource(async signal => {
    const { data } = await api.get(`/roadmaps/${roadmapSlug}`, { signal });
    return data.data;
  }, [roadmapSlug]);
  useDocumentMeta(roadmap?.title || "Learning roadmap", roadmap?.description);

  const groups = useMemo(() => {
    if (!roadmap) return [];
    const labelFor = (topic, index) => {
      if (roadmap.type === "mern") return index < 2 ? "Foundations" : index < 5 ? "Core" : index < 7 ? "Build" : index < 10 ? "Backend" : "Ship";
      if (roadmap.type === "dsa") return index < 3 ? "Start here" : index < 6 ? "Arrays & strings" : index < 13 ? "Patterns" : index < 19 ? "Data structures" : "Advanced";
      return "Course topics";
    };
    const byGroup = new Map();
    roadmap.topics.forEach((topic, index) => {
      const label = labelFor(topic, index);
      byGroup.set(label, [...(byGroup.get(label) || []), { topic, index }]);
    });
    return [...byGroup.entries()].map(([label, topics]) => ({ label, topics }));
  }, [roadmap]);

  if (loading) return <main className="page-shell"><Loading label="Loading roadmap…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  if (!roadmap) return null;
  const isDsa = roadmap.type === "dsa";
  const visibleGroups = groups;
  const total = roadmap.topics.reduce((sum, topic) => sum + (topic.itemCount || 0), 0);
  const finished = user
    ? roadmap.progress?.completed ?? 0
    : roadmap.topics.reduce((sum, topic) => sum
      + (topic.itemIds || []).filter(id => completed.has(`lesson:${id}`)).length
      + (topic.questionIds || []).filter(id => completed.has(`dsaQuestion:${id}`)).length, 0);
  const value = percent(finished, total);
  const first = roadmap.topics.find(topic => topic.itemCount) || roadmap.topics[0];

  return <main className="page-shell">
    <Breadcrumb parts={[{ label: roadmap.title }]}/>
    <section className={`roadmap-hero ${isDsa ? "roadmap-hero-dsa" : ""}`}><div><div className="eyebrow"><span className="eyebrow-pulse"/> YOUR LEARNING PATH</div><h1>{roadmap.title}<span className="heading-period">.</span></h1><p>{roadmap.description}</p><div className="roadmap-hero-meta"><span><Layers3 size={13}/> {roadmap.topics.length} topics</span><span><Play size={13}/> {total} learning items to explore</span><span><Clock3 size={13}/> Learn at your pace</span></div></div>
      <div className="roadmap-progress-card"><span className="progress-label">YOUR PROGRESS</span><strong>{value}<small>%</small></strong><ProgressBar value={value} label={`${roadmap.title} overall`}/><span className="progress-caption">{user ? `${finished} of ${total} completed` : `${finished} completed on this device`}</span></div>
    </section>
    <div className="roadmap-toolbar"><div><span className="toolbar-kicker">THE ROADMAP</span><h2>Start anywhere. <span>Keep going.</span></h2></div><span className="sequence-note"><Check size={13}/> Your checklist saves automatically</span></div>
    {visibleGroups.map(group => <section className="roadmap-group" key={group.label}><div className="group-heading"><span>{group.label}</span><span className="group-line"/><span className="group-count">{String(group.topics.length).padStart(2, "0")} TOPICS</span></div><div className="topic-grid">{group.topics.map(({ topic, index }) => <TopicCard key={topic._id} topic={topic} index={index} roadmap={roadmap} completed={completed}/>)}</div></section>)}
    {first && <div className="next-step-panel"><div><span className="eyebrow">A GOOD PLACE TO BEGIN</span><h3>{first.title}</h3><p>Start with {roadmap.title} — no account needed.</p></div><Link className="button button-primary" to={`/${roadmap.slug}/${first.slug}`}>Start learning <ArrowRight size={15}/></Link></div>}
  </main>;
}

function TopicCard({ topic, index, roadmap, completed }) {
  const contentType = "lesson";
  const count = topic.itemCount || 0;
  const lessonCount = topic.itemIds?.length || 0;
  const questionCount = topic.questionIds?.length || 0;
  const done = (topic.itemIds || []).filter(id => completed.has(`${contentType}:${id}`)).length
    + (topic.questionIds || []).filter(id => completed.has(`dsaQuestion:${id}`)).length;
  const value = count ? Math.round(done / count * 100) : 0;
  return <Link className="topic-card" to={`/${roadmap.slug}/${topic.slug}`}><div className="topic-card-top"><span className="topic-index">{String(index + 1).padStart(2, "0")}</span><span className="topic-card-count">{roadmap.type === "dsa" ? `${lessonCount} lessons · ${questionCount} questions` : `${count} lessons`}</span></div><h3>{topic.title}</h3><p>{topic.description}</p><div className="topic-card-bottom"><div className="topic-mini-progress"><ProgressBar value={value} label={`${topic.title} progress`}/><span>{value}%</span></div><span className="topic-card-arrow"><ArrowRight size={14}/></span></div></Link>;
}

function percent(completed, total) {
  return total ? Math.round(completed / total * 100) : 0;
}
