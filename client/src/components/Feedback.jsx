import { useEffect, useRef, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";

export function Loading({ label = "Loading learning content…" }) {
  return <div className="page-shell loading-state" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>;
}

export function ErrorState({ message = "Something went wrong. Please try again.", retry }) {
  return <div className="empty-state error-state"><span className="empty-icon"><TriangleAlert size={17} /></span><h3>We couldn't load this right now.</h3><p>{message}</p>{retry && <button className="button button-secondary" type="button" onClick={retry}>Try again</button>}</div>;
}

export function ToastProvider({ children }) {
  const [confirmation, setConfirmation] = useState(null);
  const confirmButton = useRef(null);
  const pendingConfirmation = useRef(null);
  useEffect(() => {
    const showToast = event => {
      const { message, type = "success" } = event.detail;
      if (type === "error") toast.error(message);
      else if (type === "warning") toast.warning(message);
      else if (type === "info") toast.info(message);
      else toast.success(message);
    };
    const showConfirmation = event => {
      pendingConfirmation.current?.(false);
      pendingConfirmation.current = event.detail.resolve;
      setConfirmation(event.detail);
    };
    window.addEventListener("unisphere:toast", showToast);
    window.addEventListener("unisphere:confirm", showConfirmation);
    return () => {
      window.removeEventListener("unisphere:toast", showToast);
      window.removeEventListener("unisphere:confirm", showConfirmation);
      pendingConfirmation.current?.(false);
    };
  }, []);
  useEffect(() => {
    if (!confirmation) return undefined;
    confirmButton.current?.focus();
    const closeOnEscape = event => {
      if (event.key === "Escape") finishConfirmation(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmation]);

  function finishConfirmation(accepted) {
    pendingConfirmation.current?.(accepted);
    pendingConfirmation.current = null;
    setConfirmation(null);
  }

  return <>{children}
    <ToastContainer position="top-right" autoClose={3600} newestOnTop closeOnClick pauseOnFocusLoss pauseOnHover draggable theme="dark" />
    {confirmation && <div className="confirm-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finishConfirmation(false); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <span className={`confirm-icon ${confirmation.tone === "danger" ? "danger" : ""}`}><TriangleAlert size={21}/></span>
        <h2 id="confirm-title">{confirmation.title || "Are you sure?"}</h2>
        <p id="confirm-message">{confirmation.message}</p>
        <div className="confirm-actions">
          <button type="button" className="button button-secondary" onClick={() => finishConfirmation(false)}>{confirmation.cancelLabel || "Cancel"}</button>
          <button ref={confirmButton} type="button" className={`button ${confirmation.tone === "danger" ? "button-danger" : "button-primary"}`} onClick={() => finishConfirmation(true)}>{confirmation.confirmLabel || "Continue"}</button>
        </div>
      </section>
    </div>}
  </>;
}

export function notify(message, type = "success") {
  window.dispatchEvent(new CustomEvent("unisphere:toast", { detail: { message, type } }));
}

export function confirmAction(message, options = {}) {
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent("unisphere:confirm", {
      detail: { message, ...options, resolve }
    }));
  });
}

export function useDocumentMeta(title, description) {
  useEffect(() => {
    const pageTitle = title ? `${title} | UniSphere` : "UniSphere — Learn. Build. Grow.";
    const pageDescription = description || "Explore structured learning paths, lessons, DSA practice, and progress tracking with UniSphere.";
    const productionOrigin = "https://unisphere-frontend-delta.vercel.app";
    const privatePage = /^\/(admin|dashboard|profile|login|signup)(\/|$)/.test(window.location.pathname)
      || title === "Page not found";
    document.title = pageTitle;

    function setMeta(selector, attributes, content) {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
        document.head.append(element);
      }
      element.content = content;
    }

    setMeta('meta[name="description"]', { name: "description" }, pageDescription);
    setMeta('meta[name="robots"]', { name: "robots" }, privatePage ? "noindex,nofollow" : "index,follow");
    setMeta('meta[property="og:title"]', { property: "og:title" }, pageTitle);
    setMeta('meta[property="og:description"]', { property: "og:description" }, pageDescription);
    setMeta('meta[property="og:url"]', { property: "og:url" }, privatePage ? `${productionOrigin}/` : `${productionOrigin}${window.location.pathname}`);
    setMeta('meta[property="og:image"]', { property: "og:image" }, `${productionOrigin}/og-image.png`);
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, pageTitle);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, pageDescription);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, `${productionOrigin}/og-image.png`);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (privatePage) {
      canonical?.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = `${productionOrigin}${window.location.pathname}`;
    }
  }, [title, description]);
}
