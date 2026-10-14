import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Clock3, ExternalLink, Play, RefreshCw, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import { useProgress } from "../context/ProgressContext.jsx";
import api from "../services/api.js";
import { ErrorState, Loading, notify, useDocumentMeta } from "../components/Feedback.jsx";
import { Breadcrumb, ProgressBar } from "../components/Layout.jsx";
import { contentKey } from "../utils/progress.js";

export default function TopicPage() {
  const { roadmapSlug: routeSlug, topicSlug } = useParams();
  const roadmapSlug = routeSlug || window.location.pathname.split("/").filter(Boolean)[0];
  const { completed, toggle } = useProgress();
  const [questionFilter, setQuestionFilter] = useState("all");
  const [questionSearch, setQuestionSearch] = useState("");
  const { data: topic, loading, error, reload } = useResource(async signal => {
    const { data } = await api.get(`/topics/${topicSlug}`, { params: { roadmap: roadmapSlug }, signal });
    return data.data;
  }, [roadmapSlug, topicSlug]);
  useDocumentMeta(topic?.title || "Topic", topic?.description);

  const type = "lesson";
  const lessonDoneCount = useMemo(() => topic?.items.filter(item => completed.has(contentKey(type, item._id))).length || 0, [topic, completed]);
  const questions = Array.isArray(topic?.questions) ? topic.questions : [];
  const questionDoneCount = useMemo(() => questions.filter(item => completed.has(contentKey("dsaQuestion", item._id))).length, [questions, completed]);
  const visibleQuestions = useMemo(() => questions.filter(question => {
    const isComplete = completed.has(contentKey("dsaQuestion", question._id));
    const matchesStatus = questionFilter === "all" || (questionFilter === "solved" ? isComplete : !isComplete);
    return matchesStatus && (!questionSearch || question.title.toLowerCase().includes(questionSearch.toLowerCase()));
  }), [questions, completed, questionFilter, questionSearch]);
  const totalItems = (topic?.items.length || 0) + questions.length;
  const doneCount = lessonDoneCount + questionDoneCount;
  const value = totalItems ? Math.round(doneCount / totalItems * 100) : 0;
  if (loading) return <main className="page-shell"><Loading label="Loading topic…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  if (!topic) return null;
  const isDsa = topic.roadmap.type === "dsa";
  const next = topic.items.find(item => !completed.has(contentKey(type, item._id))) || topic.items[0];
  const pathPrefix = `/${roadmapSlug}/${topicSlug}`;

  return <main className="page-shell topic-page">
    <Breadcrumb parts={[{ label: topic.roadmap.title, to: `/${topic.roadmap.slug}` }, { label: topic.title }]}/>
    <section className="topic-hero"><div><div className="eyebrow">{topic.roadmap.type.toUpperCase()} ROADMAP <span className="eyebrow-separator">/</span> TOPIC {String(topic.order + 1).padStart(2, "0")}</div><h1>{topic.title}<span className="heading-period">.</span></h1><p>{topic.description}</p></div><div className="topic-hero-progress"><span className="progress-label">YOUR PROGRESS</span><div><strong>{value}<small>%</small></strong><span>{doneCount} of {totalItems} complete</span></div><ProgressBar value={value} label={`${topic.title} progress`}/></div></section>
    <div className="lesson-toolbar"><div><h2>Lessons</h2><span>{isDsa ? "Watch each lesson and open its related link when available." : "Watch, learn, then mark it done."}</span></div>{next && <Link className="button button-primary button-small" to={`${pathPrefix}/${next.slug}`}>{value ? "Continue" : "Start here"} <ArrowRight size={14}/></Link>}</div>
    {topic.items.length ? <div className="lesson-list">{topic.items.map(item => {
      const itemDone = completed.has(contentKey(type, item._id));
      const destination = `${pathPrefix}/${item.slug}`;
      const hasVideo = Boolean(item.youtubeVideoId || item.youtubeUrl);
      return <article className={`lesson-row ${itemDone ? "is-complete" : ""}`} key={item._id}><CompletionButton item={item} contentType={type} done={itemDone} toggle={toggle}/><Link className="lesson-row-main" to={destination}><span className="lesson-number">{String(item.order + 1).padStart(2, "0")}</span><span className="lesson-title-wrap"><strong>{item.title}</strong><span>{item.description}</span></span></Link><span className="lesson-content-tags"><span className={`lesson-format ${hasVideo ? "has-video" : ""}`}>{hasVideo ? <Play size={11}/> : <BookOpen size={11}/>} {hasVideo ? "Video" : "Lesson"}</span>{item.concepts?.length > 0 && <span className="lesson-concept-count">{item.concepts.length} concepts</span>}</span><span className="lesson-duration"><Clock3 size={12}/>{item.duration || "—"}</span><span className="related-link-actions">{item.problemUrl && <a href={item.problemUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open related link for ${item.title}`}><ExternalLink size={13}/><span>Related link</span></a>}</span><span className={`lesson-status ${itemDone ? "status-done" : ""}`}>{itemDone ? "Complete" : "Start lesson"}</span><Link className="row-open" to={destination} aria-label={`Open ${item.title}`}><ArrowRight size={14}/></Link></article>;
    })}</div> : <div className="empty-state compact-empty"><span className="empty-icon"><Search size={17}/></span><h3>No lessons available yet.</h3><p>Check back soon for learning content.</p></div>}
    {isDsa && <section className="dsa-sheet-section">
      <div className="dsa-sheet-heading"><div className="dsa-sheet-heading-copy"><span className="dsa-sheet-kicker"><span/> TOPIC PRACTICE</span><h2>DSA Sheet</h2><p>Choose a problem, solve it on the linked platform, then mark it complete.</p><button className="dsa-sheet-refresh" type="button" onClick={reload}><RefreshCw size={12}/> Refresh questions</button></div><div className="dsa-sheet-summary"><strong>{questionDoneCount}<span> / {questions.length}</span></strong><small>questions solved</small><div className="dsa-sheet-progress"><span style={{ width: `${questions.length ? questionDoneCount / questions.length * 100 : 0}%` }}/></div></div></div>
      {questions.length > 0 && <div className="dsa-sheet-toolbar"><label className="dsa-sheet-search"><Search size={15}/><input value={questionSearch} onChange={event => setQuestionSearch(event.target.value)} placeholder="Find a question…" aria-label="Find a DSA question"/></label><div className="dsa-sheet-filters" role="group" aria-label="Filter DSA questions">{[["all", "All", questions.length], ["todo", "To do", questions.length - questionDoneCount], ["solved", "Solved", questionDoneCount]].map(([value, label, count]) => <button type="button" key={value} className={questionFilter === value ? "active" : ""} aria-pressed={questionFilter === value} onClick={() => setQuestionFilter(value)}>{label}<span>{count}</span></button>)}</div></div>}
      {questions.length ? visibleQuestions.length ? <div className="dsa-sheet-list">{visibleQuestions.map((question, index) => {
        const isComplete = completed.has(contentKey("dsaQuestion", question._id));
        return <article className={`dsa-question-card ${isComplete ? "is-complete" : ""}`} key={question._id}><button className={`dsa-question-check ${isComplete ? "checked" : ""}`} type="button" role="checkbox" aria-checked={isComplete} aria-label={`Mark ${question.title} ${isComplete ? "unsolved" : "solved"}`} onClick={event => { event.preventDefault(); toggle("dsaQuestion", question._id).then(() => notify(isComplete ? "Question marked unsolved." : "Question marked solved.")).catch(error => notify(error.message || "Unable to save progress.", "error")); }}>{isComplete && <Check size={14}/>}</button><span className="dsa-question-index">{String(index + 1).padStart(2, "0")}</span><div className="dsa-question-copy"><strong>{question.title}</strong><span>{isComplete ? "Completed — nice work!" : "Ready when you are"}</span></div><a className="dsa-question-open" href={question.url} target="_blank" rel="noopener noreferrer">Solve problem <ExternalLink size={14}/></a></article>;
      })}</div> : <div className="dsa-sheet-empty"><Search size={17}/><span>No questions match this filter.</span><button type="button" onClick={() => { setQuestionFilter("all"); setQuestionSearch(""); }}>Show all questions</button></div> : <div className="dsa-sheet-empty"><span className="dsa-empty-icon"><Search size={17}/></span><strong>No questions in this topic yet.</strong><span>Questions added by the admin will appear here.</span></div>}
    </section>}
    <div className="topic-bottom-nav"><Link className="back-link" to={`/${roadmapSlug}`}>← Back to {topic.roadmap.title} roadmap</Link><span>Your progress stays on this device, even after you close the tab.</span></div>
  </main>;
}

function CompletionButton({ item, contentType, done, toggle }) {
  async function handleClick(event) {
    event.preventDefault();
    try { await toggle(contentType, item._id); notify(done ? "Progress removed." : "Progress saved."); }
    catch (error) { notify(error.message || "Unable to save progress. Please try again.", "error"); }
  }
  return <button className={`completion-check ${done ? "checked" : ""}`} type="button" role="checkbox" aria-checked={done} aria-label={`Mark ${item.title} ${done ? "incomplete" : "complete"}`} onClick={handleClick}>{done ? <Check size={12}/> : null}</button>;
}
