// backend_v2/modules/auth/authService.js
const axios = require("axios");

const LWA_ENDPOINT = "https://api.amazon.com/auth/o2/token";

const {
  LWA_CLIENT_ID,
  LWA_CLIENT_SECRET,
  LWA_REFRESH_TOKEN,
} = process.env;

/**
 * 🔑 Richiede un nuovo access_token ad Amazon LWA
 */
async function getAccessToken() {
  try {
    if (!LWA_CLIENT_ID || !LWA_CLIENT_SECRET || !LWA_REFRESH_TOKEN) {
      throw new Error("Variabili LWA mancanti! Controlla il file .env");
    }

    console.log("🔄 Richiesta nuovo access_token a Amazon...");
    console.log("   ↳ Uso refresh_token (preview):", LWA_REFRESH_TOKEN.substring(0, 10) + "...");

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

    console.log("✅ Access token ottenuto:", {
      preview: access_token ? access_token.substring(0, 25) + "..." : null,
      expires_in,
      token_type,
    });

    return response.data; // { access_token, token_type, expires_in }
  } catch (err) {
    console.error("❌ Errore richiesta access_token:", err.response?.data || err.message);
    throw new Error("Impossibile ottenere access_token");
  }
}

module.exports = { getAccessToken };
