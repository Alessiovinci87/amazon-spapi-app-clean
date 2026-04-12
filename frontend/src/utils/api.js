
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

export async function fetchJSON(endpoint, options = {}) {
  const url = buildUrl(endpoint);

  // Inietta automaticamente il token JWT
  options.headers = getAuthHeaders(options.headers || {});

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  const json = await res.json().catch(() => ({}));

  // Estrae data se presente, altrimenti restituisce l'intero oggetto
  return json?.data ?? json;
}

export { API_BASE, buildUrl };