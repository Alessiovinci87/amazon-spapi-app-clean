// frontend/src/utils/fetchInterceptor.js
// Interceptor globale: inietta il JWT token su tutte le chiamate fetch verso /api/
// Viene caricato una sola volta in main.jsx — non serve modificare i singoli file.

const originalFetch = window.fetch;

window.fetch = function (input, init) {
  const url = typeof input === "string" ? input : input?.url || "";

  if (url.startsWith("/api")) {
    const token = localStorage.getItem("nexus_token");
    if (token) {
      init = init ? { ...init } : {};
      // Mantieni headers come oggetto plain — compatibile con tutti i browser
      const existing = init.headers || {};
      // Se è un Headers object, convertilo in plain object
      const plain = {};
      if (existing instanceof Headers) {
        existing.forEach((v, k) => { plain[k] = v; });
      } else {
        Object.assign(plain, existing);
      }
      if (!plain["Authorization"] && !plain["authorization"]) {
        plain["Authorization"] = "Bearer " + token;
      }
      init.headers = plain;
    }
  }

  return originalFetch.call(this, input, init).then((response) => {
    if (url.startsWith("/api") && response.status === 401) {
      const isLoginCall = url.includes("/api/v2/auth-app/login");
      if (!isLoginCall && localStorage.getItem("nexus_token")) {
        localStorage.removeItem("nexus_token");
        localStorage.removeItem("nexus_user");
        localStorage.removeItem("role");
        localStorage.removeItem("auth");
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return response;
  });
};
