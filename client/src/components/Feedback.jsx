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
    document.title = title ? `${title} | UniSphere` : "UniSphere — Learn. Build. Grow.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.content = description;
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${window.location.origin}${window.location.pathname}`;
    if (!canonical.isConnected) document.head.append(canonical);
  }, [title, description]);
}
