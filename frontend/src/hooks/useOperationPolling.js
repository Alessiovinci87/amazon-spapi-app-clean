import { useEffect, useRef, useState } from "react";

// Hook che polla GET /api/v2/inbound/operations/:opId ogni `intervalMs`
// finche' lo status non e' piu' IN_PROGRESS. Auto-stop su SUCCESS/FAILED.
// Ritorna { status, error, elapsed, stop }
export function useOperationPolling(operationId, { intervalMs = 2500, enabled = true } = {}) {
  const [status, setStatus] = useState(operationId ? "IN_PROGRESS" : null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const tickRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!operationId || !enabled) return;
    setStatus("IN_PROGRESS");
    setError(null);
    startRef.current = Date.now();

    const poll = async () => {
      try {
        const r = await fetch(`/api/v2/inbound/operations/${operationId}`);
        const data = await r.json();
        if (data.operationStatus) {
          setStatus(data.operationStatus);
          if (data.operationStatus === "FAILED") {
            setError(data.operationProblems?.[0]?.message || "Operazione fallita");
            stopAll();
          } else if (data.operationStatus === "SUCCESS") {
            stopAll();
          }
        }
      } catch (err) {
        setError(err.message);
      }
    };

    const stopAll = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      timerRef.current = null;
      tickRef.current = null;
    };

    timerRef.current = setInterval(poll, intervalMs);
    tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    poll();

    return stopAll;
  }, [operationId, intervalMs, enabled]);

  return { status, error, elapsed, stop: () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }};
}
