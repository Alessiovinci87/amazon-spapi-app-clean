// backend_v2/modules/auth/authService.js
const axios = require("axios");
const logger = require("../../utils/logger");

const LWA_ENDPOINT = "https://api.amazon.com/auth/o2/token";

const {
  LWA_CLIENT_ID,
  LWA_CLIENT_SECRET,
  LWA_REFRESH_TOKEN,
} = process.env;

// Cache del token in memoria — valido per tutta la durata del processo
let _cachedToken = null;
let _tokenExpiresAt = 0; // timestamp ms

// Cache token grantless per-scope (Notifications API ecc.)
const _grantlessCache = new Map();

/**
 * 🔑 Restituisce l'access_token Amazon LWA.
 * Lo rinnova solo se mancano meno di 60 secondi alla scadenza.
 */
async function getAccessToken() {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }

  try {
    if (!LWA_CLIENT_ID || !LWA_CLIENT_SECRET || !LWA_REFRESH_TOKEN) {
      throw new Error("Variabili LWA mancanti! Controlla il file .env");
    }

    logger.info("Richiesta nuovo access_token a Amazon...");

    const response = await axios.post(
      LWA_ENDPOINT,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: LWA_REFRESH_TOKEN,
        client_id: LWA_CLIENT_ID,
        client_secret: LWA_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, expires_in, token_type } = response.data;

    _cachedToken = response.data;
    // Rinnova 60 secondi prima della scadenza reale
    _tokenExpiresAt = now + (expires_in - 60) * 1000;

    logger.info(`Access token ottenuto (expires_in: ${expires_in}s, type: ${token_type})`);

    return _cachedToken;
  } catch (err) {
    logger.error({ err, data: err.response?.data }, "Errore richiesta access_token");
    throw new Error("Impossibile ottenere access_token");
  }
}

/**
 * 🔑 Restituisce un access_token "grantless" per scope SP-API che non richiedono
 * autorizzazione del seller (es. Notifications API: createDestination).
 * scope tipico: "sellingpartnerapi::notifications".
 */
async function getGrantlessToken(scope) {
  if (!scope) throw new Error("scope richiesto per grantless token");
  const now = Date.now();
  const cached = _grantlessCache.get(scope);
  if (cached && now < cached.expiresAt) return cached.data;

  if (!LWA_CLIENT_ID || !LWA_CLIENT_SECRET) {
    throw new Error("Variabili LWA mancanti! Controlla il file .env");
  }

  const response = await axios.post(
    LWA_ENDPOINT,
    new URLSearchParams({
      grant_type: "client_credentials",
      scope,
      client_id: LWA_CLIENT_ID,
      client_secret: LWA_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const data = response.data;
  _grantlessCache.set(scope, {
    data,
    expiresAt: now + (data.expires_in - 60) * 1000,
  });
  logger.info({ scope, expires_in: data.expires_in }, "[Auth] grantless token ottenuto");
  return data;
}

module.exports = { getAccessToken, getGrantlessToken };
