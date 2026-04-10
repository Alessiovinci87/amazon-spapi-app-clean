// frontend/src/utils/fetchInterceptor.js
// Interceptor globale: inietta il JWT token su tutte le chiamate fetch verso /api/
// Viene caricato una sola volta in main.jsx — non serve modificare i singoli file.

const originalFetch = window.fetch;

window.fetch = function (input, init = {}) {
  // Determina l'URL della richiesta
  const url = typeof input === "string" ? input : input?.url || "";

  // Inietta Authorization solo per chiamate alle nostre API
  if (url.startsWith("/api")) {
    const token = localStorage.getItem("nexus_token");
    if (token) {
      init = { ...init };
      init.headers = new Headers(init.headers || {});
      // Non sovrascrivere se già impostato
      if (!init.headers.has("Authorization")) {
        init.headers.set("Authorization", `Bearer ${token}`);
      }
    }
  }

  return originalFetch.call(this, input, init);
};
