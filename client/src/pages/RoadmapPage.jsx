import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Layers3, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import api from "../services/api.js";
import { ErrorState, Loading, useDocumentMeta } from "../components/Feedback.jsx";
import { Breadcrumb, ProgressBar } from "../components/Layout.jsx";

const ROADMAP_SECTIONS = {
  mern: [
    {
      label: "Foundations",
      titles: ["Introduction to MERN Stack Development", "HTML", "CSS", "JavaScript Fundamentals", "JavaScript"]
    },
    {
      label: "JavaScript Deep Dive",
      titles: ["Advanced JavaScript", "JavaScript Deep Dive"]
    },
    {
      label: "Developer Tools",
      titles: ["Git and GitHub", "Git & GitHub", "GitHub"]
    },
    {
      label: "Frontend Development",
      titles: [
        "React.js Fundamentals", "React", "Advanced React.js", "React Routing and API Integration",
        "State Management with Redux Toolkit", "Tailwind CSS and Modern UI Development", "Tailwind CSS"
      ]
    },
    {
      label: "Backend Development",
      titles: ["Node.js Fundamentals", "Node.js", "Express.js and Backend Development", "Express.js", "REST APIs and HTTP", "REST APIs"]
    },
    {
      label: "Database",
      titles: ["MongoDB Fundamentals", "MongoDB", "Mongoose and Database Integration", "MongoDB with Mongoose"]
    },
    {
      label: "Full Stack & Security",
      titles: [
        "Authentication and Authorization", "Authentication", "Full Stack MERN Integration",
        "File Uploads and Cloud Storage", "File Uploads"
      ]
    },
    {
      label: "Deployment & Projects",
      titles: ["Deployment and Hosting", "Deployment", "MERN Stack Projects", "Full-stack Projects", "Interview Preparation"]
    }
  ],
  dsa: [
    {
      label: "Start Here",
      titles: ["Java Fundamentals for DSA", "Java Basics", "Time and Space Complexity", "Time & Space Complexity", "Arrays in Java", "Arrays", "Basic Mathematics"]
    },
    {
      label: "Arrays & Strings",
      titles: ["Searching Algorithms in Java", "Binary Search", "Sorting Algorithms in Java", "Sorting", "Strings in Java", "Strings"]
    },
    {
      label: "Problem-Solving Patterns",
      titles: [
        "Recursion in Java", "Recursion", "Backtracking in Java", "Backtracking",
        "Two Pointers Technique in Java", "Two Pointer", "Sliding Window Technique in Java",
        "Sliding Window", "Prefix Sum and Difference Array in Java", "Prefix Sum",
        "Bit Manipulation in Java", "Bit Manipulation", "Greedy Algorithms in Java", "Greedy"
      ]
    },
    {
      label: "Core Data Structures",
      titles: [
        "Linked List in Java", "Linked List", "Stack in Java", "Stack & Queue", "Queue in Java",
        "Hashing in Java — HashMap and HashSet", "Hashing", "Trees and Binary Trees in Java",
        "Binary Trees", "Binary Search Tree (BST) in Java", "Binary Search Tree"
      ]
    },
    {
      label: "Advanced DSA",
      titles: [
        "Heap and Priority Queue in Java", "Heap / Priority Queue", "Graphs in Java", "Graphs",
        "Trie Data Structure in Java", "Trie", "Dynamic Programming in Java", "Dynamic Programming",
        "Shortest Path Algorithms in Java", "Minimum Spanning Tree — Prim's and Kruskal's Algorithms"
      ]
    }
  ]
};

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferSectionIndex(type, title) {
  const normalized = normalizeTitle(title);
  if (type === "mern") {
    if (/advancedjavascript|javascriptdeepdive/.test(normalized)) return 1;
    if (/html|css|javascript|mernstackdevelopment/.test(normalized)) return 0;
    if (/git|github|developertools/.test(normalized)) return 2;
    if (/react|frontend|tailwind|redux|routing/.test(normalized)) return 3;
    if (/node|express|restapi|backend|http/.test(normalized)) return 4;
    if (/mongo|mongoose|database/.test(normalized)) return 5;
    if (/auth|security|upload|cloud|fullstack|integration/.test(normalized)) return 6;
    return 7;
  }
  if (/search|sort|string|binarysearch/.test(normalized)) return 1;
  if (/recursion|backtrack|twopointer|slidingwindow|prefixsum|differencearray|bitmanipulation|greedy/.test(normalized)) return 2;
  if (/linkedlist|stack|queue|hash|tree|bst/.test(normalized)) return 3;
  if (/heap|priorityqueue|graph|trie|dynamicprogramming|shortestpath|minimumspanning/.test(normalized)) return 4;
  return 0;
}

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
    const sections = ROADMAP_SECTIONS[roadmap.type];
    if (!sections) {
      return [{ label: "Course topics", ordinal: 1, topics: roadmap.topics.map((topic, index) => ({ topic, index })) }];
    }
    const normalizedSections = sections.map(section => ({
      ...section,
      normalizedTitles: section.titles.map(normalizeTitle)
    }));
    const topicsBySection = sections.map(() => []);
    roadmap.topics.forEach((topic, sourceIndex) => {
      const normalized = normalizeTitle(topic.title);
      const sectionIndex = normalizedSections.findIndex(section => section.normalizedTitles.includes(normalized));
      const targetIndex = sectionIndex === -1 ? inferSectionIndex(roadmap.type, topic.title) : sectionIndex;
      topicsBySection[targetIndex].push({
        topic,
        sourceIndex,
        topicOrder: normalizedSections[targetIndex].normalizedTitles.indexOf(normalized)
      });
    });
    let displayIndex = 0;
    return sections.flatMap((section, ordinal) => {
      const topics = topicsBySection[ordinal]
        .sort((a, b) => {
          const aOrder = a.topicOrder === -1 ? Number.MAX_SAFE_INTEGER : a.topicOrder;
          const bOrder = b.topicOrder === -1 ? Number.MAX_SAFE_INTEGER : b.topicOrder;
          return aOrder - bOrder || a.sourceIndex - b.sourceIndex;
        })
        .map(({ topic }) => ({ topic, index: displayIndex++ }));
      return topics.length ? [{ label: section.label, ordinal: ordinal + 1, topics }] : [];
    });
  }, [roadmap]);

  if (loading) return <main className="page-shell"><Loading label="Loading roadmap…"/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={reload}/></main>;
  if (!roadmap) return null;
  const isDsa = roadmap.type === "dsa";
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
    {groups.map(group => <section className={`roadmap-group roadmap-group-stage-${(group.ordinal - 1) % 5}`} key={group.label}>
      <div className="group-heading">
        <div className="group-title"><span className="group-marker"><Layers3 size={15}/></span><h3>{group.label}</h3></div>
        <span className="group-line"/>
        <span className="group-count">{String(group.topics.length).padStart(2, "0")} TOPICS</span>
      </div>
      <div className="topic-grid">{group.topics.map(({ topic, index }) => <TopicCard key={topic._id} topic={topic} index={index} roadmap={roadmap} completed={completed}/>)}</div>
    </section>)}
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
  return <Link className="topic-card" to={`/${roadmap.slug}/${topic.slug}`}>
    <span className="topic-index">{String(index + 1).padStart(2, "0")}</span>
    <div className="topic-card-main"><h3>{topic.title}</h3><p>{topic.description}</p></div>
    <span className="topic-card-count">{roadmap.type === "dsa" ? `${lessonCount} lessons · ${questionCount} questions` : `${count} lessons`}</span>
    <div className="topic-mini-progress"><ProgressBar value={value} label={`${topic.title} progress`}/><span>{value}%</span></div>
    <span className="topic-card-arrow"><ArrowRight size={15}/></span>
  </Link>;
}

function percent(completed, total) {
  return total ? Math.round(completed / total * 100) : 0;
}
