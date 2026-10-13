import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Code2, Search, X } from "lucide-react";
import api from "../services/api.js";

export function FooterSearch({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const input = useRef(null);
  const resultsRef = useRef(results);
  const navigate = useNavigate();
  resultsRef.current = results;

  useEffect(() => {
    input.current?.focus();
    const closeOnEscape = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && resultsRef.current[0]) {
        navigate(resultsRef.current[0].href);
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, navigate]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return undefined; }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search", { params: { q: query.trim() }, signal: controller.signal });
        setResults(data.data);
      } catch (error) {
        if (error.code !== "ERR_CANCELED") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query]);

  return <div className="search-overlay open" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="search-backdrop" onClick={onClose} />
    <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search learning content">
      <div className="search-field"><Search size={17}/><input ref={input} value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search topics and lessons..." /><kbd>ESC</kbd><button type="button" aria-label="Close search" onClick={onClose}><X size={17}/></button></div>
      <div className="search-results">
        {!query.trim() ? <><div className="search-hint">TRY A TOPIC, A CONCEPT, OR A PROBLEM</div><div className="search-shortcuts">{["React", "Arrays", "Binary"].map(value => <button type="button" key={value} onClick={() => setQuery(value)}>{value}<span>↵</span></button>)}</div></> :
          loading ? <div className="search-loading">Searching learning content…</div> :
          results.length ? <><div className="search-hint">{results.length} SEARCH RESULTS</div>{results.map(result => <Link key={`${result.kind}:${result.id}`} to={result.href} className="search-result" onClick={onClose}><span className="search-result-icon"><Code2 size={15}/></span><span><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowRight className="search-result-arrow" size={14}/></Link>)}</> :
          <div className="search-no-results"><span className="empty-icon"><Search size={17}/></span><strong>No learning content found.</strong><span>Try a different topic or keyword.</span></div>}
      </div>
      <div className="search-footer"><span>ENTER to open</span><span>ESC to close</span><span>Public learning content</span></div>
    </section>
  </div>;
}
