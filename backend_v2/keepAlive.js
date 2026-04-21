const axios = require("axios");
const cron = require("node-cron");
const logger = require("./utils/logger");
const { getAccessToken } = require("./modules/auth/authService");
// ⬆️ qui usi già la funzione che ti genera l'access_token fresco dal refresh_token

// 🔄 Funzione che fa la chiamata keep-alive
async function keepAlive() {
  try {
    const { access_token } = await getAccessToken();

    const res = await axios.get(
      "https://sellingpartnerapi-eu.amazon.com/sellers/v1/marketplaceParticipations",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
      }
    );

  } catch (err) {
    logger.error({ err, responseData: err.response?.data }, "Errore keep-alive");
  }
}

// ⚙️ Pianificazione: il 1° giorno di ogni mese a mezzanotte
cron.schedule("0 0 1 * *", () => {
  keepAlive();
});

// 🔥 Esegui subito al primo avvio (opzionale)
keepAlive();
