
const API_BASE =
  import.meta.env?.VITE_API_BASE || "/api/v2";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const trimLeadingSlash = (value = "") => value.replace(/^\/+/, "");

const buildUrl = (endpoint = "") => {
  if (!endpoint) return trimTrailingSlash(API_BASE);

  // If endpoint is already a full URL, use it as-is.
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const base = trimTrailingSlash(API_BASE);

  // If the endpoint already includes the API_BASE, strip it to avoid duplication.
  const withoutBase = endpoint.startsWith(base)
    ? endpoint.slice(base.length)
    : endpoint;

  const path = trimLeadingSlash(withoutBase);
  return `${base}/${path}`;
};

/**
 * Ritorna gli headers con Authorization JWT se presente in localStorage.
 */
function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem("nexus_token");
  const headers = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // backoff esponenziale

function isRetryable(status) {
  // Retry su errori di rete (status 0), timeout, 502/503/504
  return status === 0 || status === 408 || status === 429 ||
         status === 502 || status === 503 || status === 504;
}

// Evita logout-loop multipli paralleli quando più chiamate ricevono 401 insieme
let authExpiredHandled = false;

function handleAuthExpired() {
  if (authExpiredHandled) return;
  authExpiredHandled = true;
  try {
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("nexus_user");
    localStorage.removeItem("role");
    localStorage.removeItem("auth");
  } catch { /* ignore */ }
  // Notifica eventuali listener interni (AuthContext) e forza il redirect alla home
  try { window.dispatchEvent(new Event("auth:expired")); } catch { /* ignore */ }
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

export async function fetchJSON(endpoint, options = {}) {
  const url = buildUrl(endpoint);

  // Inietta automaticamente il token JWT
  options.headers = getAuthHeaders(options.headers || {});

  let lastError;
  const method = (options.method || "GET").toUpperCase();
  // Retry solo su GET (le mutazioni non vanno riprovate automaticamente)
  const canRetry = method === "GET";

  for (let attempt = 0; attempt <= (canRetry ? MAX_RETRIES - 1 : 0); attempt++) {
    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        // 401 = token scaduto/invalido → cleanup + redirect alla home
        if (res.status === 401) {
          handleAuthExpired();
          throw new Error("Sessione scaduta");
        }
        if (canRetry && attempt < MAX_RETRIES - 1 && isRetryable(res.status)) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          continue;
        }
        throw new Error(`HTTP ${res.status} – ${res.statusText}`);
      }

      const json = await res.json().catch(() => ({}));
      return json?.data ?? json;
    } catch (err) {
      lastError = err;
      // Retry su errore di rete (TypeError: Failed to fetch)
      if (canRetry && attempt < MAX_RETRIES - 1 && err instanceof TypeError) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export { API_BASE, buildUrl };
