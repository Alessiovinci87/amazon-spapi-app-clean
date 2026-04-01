
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

console.log("🌍 API_BASE in uso:", API_BASE);

export async function fetchJSON(endpoint, options = {}) {
  const url = buildUrl(endpoint);
  console.log("📡 Fetch JSON →", url);

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  const json = await res.json().catch(() => ({}));
  
  // 🔍 DEBUG: Log della risposta grezza dal server
  console.log("🔍 [fetchJSON] Risposta grezza dal server:", json);
  console.log("🔍 [fetchJSON] Tipo:", typeof json);
  console.log("🔍 [fetchJSON] È array?", Array.isArray(json));
  console.log("🔍 [fetchJSON] json.data:", json?.data);
  console.log("🔍 [fetchJSON] json.ok:", json?.ok);
  
  // Estrae data se presente, altrimenti restituisce l'intero oggetto
  const result = json?.data ?? json;
  console.log("🔍 [fetchJSON] Valore restituito:", result);
  console.log("🔍 [fetchJSON] Tipo risultato:", typeof result);
  console.log("🔍 [fetchJSON] Risultato è array?", Array.isArray(result));
  
  return result;
}

export { API_BASE, buildUrl };