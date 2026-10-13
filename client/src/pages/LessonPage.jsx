import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, ExternalLink, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import { useProgress } from "../context/ProgressContext.jsx";
import api from "../services/api.js";
import { ErrorState, Loading, notify, useDocumentMeta } from "../components/Feedback.jsx";
import { Breadcrumb, ProgressBar } from "../components/Layout.jsx";
import { contentKey, getYoutubeId } from "../utils/progress.js";

export default function LessonPage() {
  const { roadmapSlug: routeSlug, topicSlug, itemSlug } = useParams();
  const roadmapSlug = routeSlug || window.location.pathname.split("/").filter(Boolean)[0];
  const { completed, toggle } = useProgress();
  const type = "lesson";
  const [topic, setTopic] = useState(null);
  const endpoint = `/lessons/${topicSlug}/${itemSlug}`;
  const { data: item, loading, error, reload } = useResource(async signal => {
    const { data } = await api.get(endpoint, { signal });
    return data.data;
  }, [endpoint]);
  useEffect(() => {
    if (!item) return;
    let active = true;
    api.get(`/topics/${topicSlug}`, { params: { roadmap: roadmapSlug } })
      .then(({ data }) => { if (active) setTopic(data.data); })
      .catch(() => { if (active) setTopic(null); });
    return () => { active = false; };
  }, [item, roadmapSlug, topicSlug]);
  useDocumentMeta(item?.title || "Learning content", item?.description);

  const key = item ? contentKey(type, item._id) : "";
  const done = key ? completed.has(key) : false;
  const items = topic?.items || [];
  const index = items.findIndex(entry => entry._id === item?._id);
  const topicProgress = useMemo(() => items.length
    ? Math.round(items.filter(entry => completed.has(contentKey(type, entry._id))).length / items.length * 100)
    : 0, [items, completed, type]);
  if (loading) return <main className="page-shell"><Loading label="Loading lesson…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  if (!item) return null;

  const roadmap = item.topic?.roadmap;
  const isDsa = roadmap?.type === "dsa";
  const topicData = item.topic;
  const previous = item.navigation?.previous;
  const next = item.navigation?.next;
  const videoId = getYoutubeId(item.youtubeUrl, item.youtubeVideoId);
  const itemPath = slug => `/${roadmapSlug}/${topicSlug}/${slug}`;

  async function handleComplete() {
    try { await toggle(type, item._id); notify(done ? "Progress removed." : "Progress saved."); }
    catch (saveError) { notify(saveError.message || "Unable to save progress. Please try again.", "error"); }
  }

  return <main className="page-shell lesson-page">
    <Breadcrumb parts={[{ label: roadmap?.title || (isDsa ? "DSA with Java" : "MERN Stack"), to: `/${roadmapSlug}` }, { label: topicData?.title || topicSlug, to: `/${roadmapSlug}/${topicSlug}` }, { label: item.title }]}/>
    <div className="lesson-layout"><article className="lesson-content"><div className="lesson-overline"><span>{isDsa ? "DSA" : "MERN"}</span><span className="eyebrow-separator">/</span><span>{topicData?.title || topicSlug}</span><span className="lesson-overline-spacer"/><span>{String(item.navigation?.index || index + 1).padStart(2, "0")} / {String(item.navigation?.total || items.length || 1).padStart(2, "0")}</span></div>
      <h1>{item.title}<span className="heading-period">.</span></h1><p className="lesson-intro">{item.description}</p>
      {videoId ? <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`} title={`${item.title} video lesson`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/></div> : <div className="video-placeholder"><span><Play size={22}/></span><strong>Video coming soon</strong><p>This learning item is part of the roadmap. Check back soon for a video.</p></div>}
      <div className="video-caption"><span><Play size={13}/><b>{item.title}</b></span><span>{item.duration || "Video lesson"}</span></div>
      <section className="lesson-summary"><div className="summary-eyebrow">ABOUT THIS LESSON</div><p>{item.description}</p>{item.concepts?.length > 0 && <div className="concept-list">{item.concepts.map((concept, conceptIndex) => <span key={`${concept}-${conceptIndex}`}><i><Check size={12}/></i>{concept}</span>)}</div>}
        {item.problemUrl && <a className="button button-primary related-problem-link" href={item.problemUrl} target="_blank" rel="noopener noreferrer">{isDsa ? "Open related problem" : "Open related resource"} <ExternalLink size={14}/></a>}
      </section>
      <div className="lesson-complete-panel"><div><span className="complete-panel-icon">{done ? <Check size={15}/> : "✓"}</span><span><strong>{done ? "Nicely done." : "Finished this one?"}</strong><small>{done ? "This progress is saved." : "Check it off and keep your momentum."}</small></span></div><button className={`button ${done ? "button-secondary" : "button-primary"}`} type="button" onClick={handleComplete}>{done ? "Mark as incomplete" : "Mark as complete"}</button></div>
      <nav className="lesson-pagination" aria-label="Lesson navigation">{previous ? <Link to={itemPath(previous.slug)}><span><ArrowLeft size={11}/> PREVIOUS</span><strong>{previous.title}</strong></Link> : <Link to={`/${roadmapSlug}/${topicSlug}`}><span><ArrowLeft size={11}/> BACK TO TOPIC</span><strong>{topicData?.title}</strong></Link>}{next ? <Link className="lesson-next" to={itemPath(next.slug)}><span>NEXT UP <ArrowRight size={11}/></span><strong>{next.title}</strong></Link> : <Link className="lesson-next" to={`/${roadmapSlug}`}><span>PATHWAY COMPLETE <ArrowRight size={11}/></span><strong>Explore the roadmap</strong></Link>}</nav>
    </article>
    <aside className="lesson-sidebar"><div className="sidebar-heading"><span className="sidebar-icon"><Play size={15}/></span><span><b>{topicData?.title || topicSlug}</b><small>{roadmap?.title || "Learning path"}</small></span></div><div className="sidebar-progress"><div><span>TOPIC PROGRESS</span><b>{topicProgress}%</b></div><ProgressBar value={topicProgress} label={`${topicData?.title || "Topic"} progress`}/></div><div className="sidebar-list">{items.map((entry, entryIndex) => { const active = entry._id === item._id; const isComplete = completed.has(contentKey(type, entry._id)); return <Link className={`sidebar-item ${active ? "active" : ""} ${isComplete ? "complete" : ""}`} key={entry._id} to={itemPath(entry.slug)}><span className="sidebar-item-state">{isComplete ? <Check size={11}/> : String(entryIndex + 1).padStart(2, "0")}</span><span>{entry.title}</span></Link>; })}</div></aside></div>
  </main>;
}
