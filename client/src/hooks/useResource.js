import { useCallback, useEffect, useState } from "react";
import { apiMessage } from "../services/api.js";

export function useResource(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loader(controller.signal).then(value => setData(value)).catch(requestError => {
      if (!controller.signal.aborted) setError(apiMessage(requestError, "Unable to load this content."));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  // Dependency identity is supplied by the caller.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version]);

  return { data, loading, error, reload };
}
