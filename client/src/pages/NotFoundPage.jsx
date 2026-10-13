import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../components/Feedback.jsx";

export default function NotFoundPage() {
  useDocumentMeta("Page not found", "The page you are looking for could not be found.");
  return <main className="page-shell not-found"><span className="not-found-code">404</span><h1>Page not found.</h1><p>This isn't on the roadmap. The page may have moved, or the URL might be taking a little detour.</p><div className="not-found-actions"><Link className="button button-primary" to="/">Explore learning paths <ArrowRight size={14}/></Link></div></main>;
}
