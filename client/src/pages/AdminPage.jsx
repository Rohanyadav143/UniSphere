import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Ban, BookOpen, Check, Clapperboard, ExternalLink, Layers3, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import api, { apiMessage } from "../services/api.js";
import { Breadcrumb } from "../components/Layout.jsx";
import { confirmAction, ErrorState, Loading, notify, useDocumentMeta } from "../components/Feedback.jsx";

export default function AdminHomePage() {
  const { data, loading, error, reload } = useResource(async signal => {
    const { data: result } = await api.get("/admin/overview", { signal });
    return result.data;
  }, []);
  useDocumentMeta("Admin content studio", "Manage UniSphere learning roadmaps and student accounts.");
  if (loading) return <main className="page-shell"><Loading label="Loading content studio…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  const metrics = [
    ["Total users", data.users, <Users/>],
    ["Published courses", data.courses.filter(course => course.isPublished).length, <Layers3/>],
    ["Lecture videos", data.videos, <Clapperboard/>],
    ["Completed lessons", data.completedItems, <Check/>]
  ];
  return <main className="page-shell admin-page"><Breadcrumb parts={[{ label: "Admin studio" }]}/><section className="dashboard-welcome admin-welcome"><div><div className="eyebrow">CONTENT & COMMUNITY</div><h1>Admin studio<span className="heading-period">.</span></h1><p>Build courses, organize topics, publish lessons, and support your learners.</p></div><Link className="button button-primary" to="/admin/content/roadmaps"><BookOpen size={15}/> Manage courses</Link></section><AdminNavigation/><div className="admin-metrics">{metrics.map(([label, value, icon]) => <article className="admin-metric" key={label}><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>)}</div><section className="admin-workspace"><div className="section-heading"><div><div className="eyebrow">MANAGE LEARNING CONTENT</div><h2>Your courses<span className="heading-period">.</span></h2></div><Link to="/admin/content/roadmaps" className="text-button">Add a course <ArrowRight size={13}/></Link></div><div className="admin-course-grid">{data.courses.map(course => <Link className={`admin-course-card ${course.type === "dsa" ? "admin-course-dsa" : ""}`} to={`/admin/content/lessons?course=${course._id}`} key={course._id}><span className="admin-course-icon">{course.type === "dsa" ? <Layers3/> : <BookOpen/>}</span><span className={`admin-course-status ${course.isPublished ? "published" : ""}`}>{course.isPublished ? "Published" : "Draft"}</span><h3>{course.title}</h3><p>{course.pathType ? `${course.pathType} · ` : ""}{course.description || "No course description yet."}</p><div><span>{course.topicCount} topics</span><span>{course.lessonCount} lessons</span>{course.type === "dsa" && <span>{course.questionCount} questions</span>}</div><ArrowRight className="admin-course-arrow" size={16}/></Link>)}</div><div className="admin-workspace"><div className="section-heading"><div><div className="eyebrow">QUICK ACTIONS</div><h2>Manage your platform<span className="heading-period">.</span></h2></div></div><div className="admin-link-grid">{[["topics", "Topics", "Create and organize topics within any course."], ["lessons", "Lessons", "Add videos and DSA lesson links."], ["dsa-questions", "DSA Sheet", "Add topic-wise problems and track completion."], ["users", "Student accounts", "Review progress, block, unblock, or delete accounts."]].map(([path, title, description]) => <Link className="admin-link-card" to={path === "users" ? "/admin/users" : `/admin/content/${path}`} key={path}><span>{title}</span><p>{description}</p><ArrowRight size={15}/></Link>)}</div></div></section></main>;
}

export function AdminContentPage() {
  const { type } = useParams();
  const titleMap = { roadmaps: "Courses", topics: "Topics", lessons: "Lessons", "dsa-questions": "DSA Sheet" };
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [roadmapFilter, setRoadmapFilter] = useState(() => new URLSearchParams(window.location.search).get("course") || "all");
  const { data: options, loading: optionsLoading, error: optionsError, reload: reloadOptions } = useResource(async signal => {
    const [roadmaps, topics] = await Promise.all([
      api.get("/admin/roadmaps", { signal }),
      api.get("/admin/topics", { signal })
    ]);
    return { roadmaps: roadmaps.data.data, topics: topics.data.data };
  }, []);
  const { data, loading, error: loadError, reload } = useResource(async signal => {
    const { data: response } = await api.get(`/admin/${type}`, { signal });
    return response.data;
  }, [type]);
  useDocumentMeta(`Manage ${titleMap[type] || "content"}`, "Manage UniSphere learning content.");

  const items = data || [];
  const typeOptions = options || { roadmaps: [], topics: [] };
  const parentTopics = typeOptions.topics;
  const filteredItems = items.filter(item => {
    const topicId = item.topicId?._id || item.topicId;
    const topic = ["lessons", "dsa-questions"].includes(type) ? parentTopics.find(entry => entry._id === topicId?.toString()) : null;
    const roadmapId = topic?.roadmapId?._id || topic?.roadmapId;
    const matchesRoadmap = roadmapFilter === "all" || roadmapId?.toString() === roadmapFilter;
    const searchable = `${item.title} ${item.slug} ${item.topicId?.title || ""} ${topic?.roadmapId?.title || ""}`.toLowerCase();
    return matchesRoadmap && (!filter || searchable.includes(filter.toLowerCase()));
  });

  function openCreate() {
    setError("");
    setDialog({ item: null, values: emptyForm(type, typeOptions, parentTopics, roadmapFilter) });
  }
  function openEdit(item) {
    setError("");
    const topicId = item.topicId?._id || item.topicId || "";
    const selectedTopic = parentTopics.find(topic => topic._id === topicId.toString());
    setDialog({ item, values: { ...item, roadmapId: item.roadmapId?._id || item.topicId?.roadmapId?._id || item.topicId?.roadmapId || selectedTopic?.roadmapId?._id || selectedTopic?.roadmapId || "", topicId, concepts: (item.concepts || []).join("\n"), youtubeUrl: item.youtubeUrl || "", problemUrl: item.problemUrl || "", duration: item.duration || "", description: item.description || "", order: item.order || 0, isPublished: item.isPublished !== false } });
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = { ...dialog.values, order: Number(dialog.values.order) || 0 };
    if (!values.slug) delete values.slug;
    if (typeof values.concepts === "string") values.concepts = values.concepts.split("\n").map(item => item.trim()).filter(Boolean);
    if (type === "lessons") {
      const selectedTopic = parentTopics.find(topic => topic._id === values.topicId);
      if (selectedTopic?.roadmapId?.type === "dsa") delete values.concepts;
      else delete values.problemUrl;
      delete values.roadmapId;
    } else if (type === "roadmaps" && values.type !== "course") {
      values.pathType = "";
    }
    try {
      if (dialog.item) await api.patch(`/admin/${type}/${dialog.item._id}`, values);
      else await api.post(`/admin/${type}`, values);
      setDialog(null);
      reload();
      notify(`${type === "dsa-questions" ? "DSA question" : titleMap[type].replace(/s$/, "")} ${dialog.item ? "updated" : "created"} successfully.`);
    } catch (requestError) {
      setError(apiMessage(requestError));
    } finally {
      setSaving(false);
    }
  }
  async function remove(item) {
    if (!(await confirmAction(`Delete "${item.title}"? This action cannot be undone.`, { title: "Delete learning content?", confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      await api.delete(`/admin/${type}/${item._id}`);
      reload();
      notify("Content deleted.");
    } catch (requestError) { notify(apiMessage(requestError), "error"); }
  }
  async function move(item, offset) {
    const direction = offset < 0 ? "up" : "down";
    try {
      const { data: response } = await api.patch(`/admin/${type}/${item._id}/reorder`, { direction });
      reload();
      notify(response.data.moved ? "Order updated." : `This item is already at the ${direction === "up" ? "top" : "bottom"}.`, response.data.moved ? "success" : "warning");
    } catch (requestError) { notify(apiMessage(requestError), "error"); }
  }

  return <main className="page-shell admin-page"><Breadcrumb parts={[{ label: "Admin studio", to: "/admin" }, { label: titleMap[type] || "Content" }]}/><section className="admin-title-row"><div><div className="eyebrow">CONTENT STUDIO</div><h1>{titleMap[type] || "Manage content"}<span className="heading-period">.</span></h1></div>{type !== "users" && <button className="button button-primary" type="button" onClick={openCreate}><Plus size={15}/> Add {type === "roadmaps" ? "course" : type === "topics" ? "topic" : type === "dsa-questions" ? "question" : "lesson"}</button>}</section>
    <AdminNavigation/>
    {type === "users" ? <AdminUsersPage/> : <>
      {["lessons", "dsa-questions"].includes(type) ? <div className="admin-list-toolbar lesson-track-filter"><label htmlFor="lesson-track">Course</label><select id="lesson-track" value={roadmapFilter} onChange={event => setRoadmapFilter(event.target.value)}><option value="all">All courses</option>{typeOptions.roadmaps.map(roadmap => <option key={roadmap._id} value={roadmap._id}>{roadmap.title}</option>)}</select><input value={filter} onChange={event => setFilter(event.target.value)} placeholder={`Filter ${titleMap[type]?.toLowerCase()}…`} aria-label={`Filter ${titleMap[type]}`}/><span>{filteredItems.length} items</span></div> : <div className="admin-list-toolbar"><input value={filter} onChange={event => setFilter(event.target.value)} placeholder={`Filter ${titleMap[type]?.toLowerCase() || "content"}…`} aria-label={`Filter ${titleMap[type]}`}/><span>{filteredItems.length} items</span></div>}
      {optionsError && <ErrorState message={optionsError} retry={reloadOptions}/>}
      {loading ? <Loading label={`Loading ${titleMap[type]?.toLowerCase()}…`}/> : loadError ? <ErrorState message={loadError} retry={reload}/> : filteredItems.length ? <div className="admin-content-list">{filteredItems.map((item, index) => {
        const previewPath = getContentPreviewPath(type, item);
        return <article className="admin-content-row" key={item._id}><span className="admin-order">{String(item.order ?? index).padStart(2, "0")}</span><div className="admin-content-main"><strong>{item.title}</strong><div className="admin-content-meta"><span className="admin-content-location">{["lessons", "dsa-questions"].includes(type) ? `${item.topicId?.roadmapId?.title || "Course"} / ${item.topicId?.title || "Topic"}` : item.topicId?.title || item.roadmapId?.title || item.slug}</span><span className={`admin-content-state ${item.isPublished ? "is-published" : ""}`}>{item.isPublished ? "Published" : "Draft"}</span>{item.youtubeVideoId && <span className="admin-content-badge video-badge">Video lesson</span>}{item.problemUrl && <span className="admin-content-badge link-badge">Problem link</span>}{type === "dsa-questions" && <span className="admin-content-badge question-badge">DSA problem</span>}</div>{["lessons", "topics"].includes(type) && item.description && <p className="admin-content-description">{item.description}</p>}</div><div className="admin-row-actions">{previewPath && item.isPublished && <Link className="admin-preview-link" to={previewPath} aria-label={`Preview ${item.title} as a learner`} title="View live content"><ExternalLink size={14}/></Link>}<button type="button" aria-label={`Move ${item.title} up`} onClick={() => move(item, -1)}><ArrowUp size={14}/></button><button type="button" aria-label={`Move ${item.title} down`} onClick={() => move(item, 1)}><ArrowDown size={14}/></button><button type="button" aria-label={`Edit ${item.title}`} onClick={() => openEdit(item)}><Pencil size={14}/></button><button type="button" className="danger-action" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 size={14}/></button></div></article>;
      })}</div> : <div className="empty-state"><h3>No {titleMap[type]?.toLowerCase()} yet.</h3><p>Add learning content here; changes will appear in the public roadmap.</p></div>}
      {dialog && <ContentDialog title={titleMap[type]} dialog={dialog} setDialog={setDialog} onSubmit={submit} saving={saving} error={error} options={typeOptions} topics={parentTopics} optionsLoading={optionsLoading} type={type}/>}
    </>}
  </main>;
}

function getContentPreviewPath(type, item) {
  if (type === "roadmaps") return item.slug ? `/${item.slug}` : "";
  if (type === "topics") {
    const roadmapSlug = item.roadmapId?.slug;
    return roadmapSlug && item.slug ? `/${roadmapSlug}/${item.slug}` : "";
  }
  const topic = item.topicId;
  const roadmapSlug = topic?.roadmapId?.slug;
  if (!roadmapSlug || !topic?.slug) return "";
  const topicPath = `/${roadmapSlug}/${topic.slug}`;
  return type === "lessons" && item.slug ? `${topicPath}/${item.slug}` : topicPath;
}

function AdminNavigation() {
  return <nav className="admin-tabs" aria-label="Admin content sections"><NavLink to="/admin">Overview</NavLink><NavLink to="/admin/content/roadmaps">Courses</NavLink><NavLink to="/admin/content/topics">Topics</NavLink><NavLink to="/admin/content/lessons">Lessons</NavLink><NavLink to="/admin/content/dsa-questions">DSA Sheet</NavLink><NavLink to="/admin/users">Students</NavLink></nav>;
}

function ContentDialog({ title, dialog, setDialog, onSubmit, saving, error, options, topics, optionsLoading, type }) {
  const edit = dialog.item;
  const activeTopic = topics.find(topic => topic._id === dialog.values.topicId);
  const selectedRoadmap = options.roadmaps.find(roadmap => roadmap._id === dialog.values.roadmapId);
  const courseType = activeTopic?.roadmapId?.type || selectedRoadmap?.type;
  const topicOptions = topics.filter(topic => (topic.roadmapId?._id || topic.roadmapId)?.toString() === dialog.values.roadmapId);
  const dsaTopics = topics.filter(topic => topic.roadmapId?.type === "dsa");
  const fields = type === "roadmaps"
    ? [["title", "Title"], ["slug", "URL slug"], ["type", "Course category"], ...(dialog.values.type === "course" ? [["pathType", "Custom path type"]] : []), ["description", "Description"], ["order", "Order"]]
    : type === "topics"
      ? [["roadmapId", "Roadmap"], ["title", "Title"], ["slug", "URL slug"], ["description", "Description"], ["order", "Order"]]
      : type === "dsa-questions"
        ? [["topicId", "DSA topic"], ["title", "Question title"], ["url", "Problem URL"], ["order", "Order"]]
        : [["roadmapId", "Course"], ["topicId", "Topic"], ["title", "Lesson title"], ["slug", "URL slug"], ["description", "Description"], ["youtubeUrl", "Lecture video URL"], ...(courseType === "dsa" ? [["problemUrl", "Related problem URL (optional)"]] : []), ["duration", "Duration"], ...(courseType === "mern" ? [["concepts", "Key concepts (one per line)"]] : []), ["order", "Order"]];
  const updateValue = (name, value) => setDialog(current => ({
    ...current,
    values: { ...current.values, [name]: value, ...(name === "roadmapId" ? { topicId: "" } : {}) }
  }));
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDialog(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-label={`${edit ? "Edit" : "Add"} ${title}`}><div className="admin-modal-head"><div><span className="eyebrow">CONTENT STUDIO</span><h2>{edit ? "Edit" : "Add"} {title.replace(/s$/, "")}</h2><p>{type === "lessons" ? courseType === "dsa" ? "DSA lesson: add a lecture, description, duration, and optional problem link." : "Lesson: add a lecture, description, duration, and course-specific details." : type === "dsa-questions" ? "Choose a DSA topic, then add a question title and its problem URL." : "Add course content and organize it for learners."}</p></div><button type="button" aria-label="Close dialog" onClick={() => setDialog(null)}>×</button></div><form onSubmit={onSubmit}><div className="admin-form-grid">  {fields.map(([name, label]) => <label className={["description", "concepts"].includes(name) ? "form-wide" : ""} key={name}>{label}{renderInput(name, label, dialog.values[name], value => updateValue(name, value), options, name === "topicId" ? type === "dsa-questions" ? dsaTopics : topicOptions : topics, !edit)}</label>)}<label className="published-toggle"><input type="checkbox" checked={dialog.values.isPublished !== false} onChange={event => setDialog(current => ({ ...current, values: { ...current.values, isPublished: event.target.checked } }))}/> Published publicly</label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="admin-modal-actions"><button className="button button-secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="button button-primary" disabled={saving || (type === "lessons" && (optionsLoading || !dialog.values.roadmapId || !dialog.values.topicId)) || (type === "dsa-questions" && (optionsLoading || !dialog.values.topicId))}>{saving ? "Saving…" : edit ? "Save changes" : "Create content"}</button></div></form></section></div>;
}

function renderInput(name, label, value, setValue, options, topics, creating = false) {
  if (name === "type") return <select required value={value || "course"} onChange={event => setValue(event.target.value)}><option value="course">Custom path type</option><option value="mern">MERN Stack</option><option value="dsa">DSA with Java</option></select>;
  if (name === "pathType") return <input type="text" value={value || ""} onChange={event => setValue(event.target.value)} placeholder="e.g. Python, UI/UX, Data Science" required/>;
  if (name === "roadmapId") return <select required value={value || ""} onChange={event => setValue(event.target.value)}><option value="">Select course</option>{options.roadmaps.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select>;
  if (name === "topicId") return <select required value={value || ""} onChange={event => setValue(event.target.value)}><option value="">Select topic</option>{topics.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select>;
  if (name === "url") return <input type="url" value={value || ""} onChange={event => setValue(event.target.value)} placeholder="https://leetcode.com/problems/…" required/>;
  if (name === "description" || name === "concepts") return <textarea required={name === "description" && creating} rows={name === "description" ? 4 : 3} value={value || ""} placeholder={name === "concepts" ? "One concept per line" : name === "description" ? "Explain what learners will understand after this lesson." : ""} onChange={event => setValue(event.target.value)}/>;
  if (name === "order") return <input type="number" min="0" max="10000" value={value ?? 0} onChange={event => setValue(event.target.value)} required/>;
  return <input type={name === "youtubeUrl" || name === "problemUrl" ? "url" : "text"} value={value || ""} onChange={event => setValue(event.target.value)} placeholder={name === "youtubeUrl" ? "https://www.youtube.com/watch?v=…" : name === "problemUrl" ? "https://leetcode.com/problems/… (optional)" : name === "duration" ? "e.g. 12 min" : label} required={name === "title" || (creating && ["youtubeUrl", "duration"].includes(name))}/>;
}

export function AdminUsersPage() {
  return <main className="page-shell admin-page"><Breadcrumb parts={[{ label: "Admin studio", to: "/admin" }, { label: "Student accounts" }]}/><section className="admin-title-row"><div><div className="eyebrow">CONTENT & COMMUNITY</div><h1>Student accounts<span className="heading-period">.</span></h1></div></section><AdminNavigation/><AdminUsersList/></main>;
}

function AdminUsersList() {
  const { data, loading, error, reload } = useResource(async signal => {
    const { data: result } = await api.get("/admin/users", { signal });
    return result.data;
  }, []);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsError, setDetailsError] = useState("");
  async function showProgress(user) {
    setSelected(user);
    setDetails(null);
    setDetailsError("");
    try {
      const { data: response } = await api.get(`/admin/users/${user._id}/progress`);
      setDetails(response.data);
    } catch (requestError) { setDetailsError(apiMessage(requestError)); }
  }
  async function toggleBlocked(user) {
    const isBlocked = !user.isBlocked;
    if (!(await confirmAction(`${isBlocked ? "Block" : "Unblock"} ${user.name}?`, { title: `${isBlocked ? "Block" : "Unblock"} student?`, confirmLabel: isBlocked ? "Block student" : "Unblock", tone: isBlocked ? "danger" : "warning" }))) return;
    try {
      await api.patch(`/admin/users/${user._id}/block`, { isBlocked });
      notify(`Student ${isBlocked ? "blocked" : "unblocked"}.`);
      reload();
    } catch (requestError) { notify(apiMessage(requestError), "error"); }
  }
  async function removeStudent(user) {
    if (!(await confirmAction(`Delete ${user.name} and permanently remove their saved progress? This cannot be undone.`, { title: "Delete student account?", confirmLabel: "Delete account", tone: "danger" }))) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      if (selected?._id === user._id) setSelected(null);
      notify("Student account and saved progress deleted.");
      reload();
    } catch (requestError) { notify(apiMessage(requestError), "error"); }
  }
  if (loading) return <Loading label="Loading student accounts…"/>;
  if (error) return <ErrorState message={error} retry={reload}/>;
  return <section className="admin-users"><div className="admin-user-table"><div className="admin-user-head"><span>STUDENT</span><span>ROLE</span><span>JOINED</span><span>PROGRESS</span><span>ACCOUNT ACTIONS</span></div>{data.items.map(user => <article className="admin-user-row" key={user._id}><div><strong>{user.name}</strong><small>{user.email}</small></div><span>{user.isBlocked ? "Blocked" : user.role}</span><span>{new Date(user.createdAt).toLocaleDateString()}</span><button type="button" className="text-button" onClick={() => showProgress(user)}>{user.completedItems} completed items</button><div className="admin-user-actions">{user.role === "student" && <><button type="button" className="text-button" onClick={() => toggleBlocked(user)}><Ban size={13}/>{user.isBlocked ? "Unblock" : "Block"}</button><button type="button" className="text-button danger-action" onClick={() => removeStudent(user)}><Trash2 size={13}/>Delete</button></>}</div></article>)}</div>{selected && <div className="admin-user-detail"><button type="button" className="detail-close" onClick={() => setSelected(null)}>Close</button><h3>{selected.name}</h3><p>{selected.email} · Joined {new Date(selected.createdAt).toLocaleDateString()}</p>{detailsError ? <div className="form-error">{detailsError}</div> : !details ? <Loading label="Loading learner progress…"/> : <div className="user-progress-detail"><strong>{details.progress.length} completed items</strong>{details.progress.slice(0, 15).map(row => <span key={`${row.contentType}-${row.contentId}`}>{row.contentType === "dsaQuestion" ? "DSA Sheet question" : "Learning lesson"} · {new Date(row.completedAt).toLocaleDateString()}</span>)}</div>}</div>}</section>;
}

function emptyForm(type, options, topics, preferredRoadmapId) {
  if (type === "roadmaps") return { title: "", slug: "", type: "course", pathType: "", description: "", order: 0, isPublished: true };
  if (type === "topics") return { roadmapId: options.roadmaps[0]?._id || "", title: "", slug: "", description: "", order: 0, isPublished: true };
  if (type === "dsa-questions") {
    const topic = topics.find(item => item.roadmapId?.type === "dsa");
    return { topicId: topic?._id || "", title: "", slug: "", url: "", order: 0, isPublished: true };
  }
  const topic = topics.find(item => !preferredRoadmapId || preferredRoadmapId === "all" || (item.roadmapId?._id || item.roadmapId)?.toString() === preferredRoadmapId) || topics[0];
  return { roadmapId: topic?.roadmapId?._id || topic?.roadmapId || "", topicId: topic?._id || "", title: "", slug: "", description: "", youtubeUrl: "", problemUrl: "", duration: "", concepts: "", order: 0, isPublished: true };
}
