// backend_v2/middleware/authMiddleware.js
// Middleware JWT per protezione route API

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET mancante o troppo corto (min 32 caratteri). Imposta una stringa casuale robusta nel file .env");
  process.exit(1);
}

/**
 * Middleware che verifica il token JWT nell'header Authorization.
 * Aggiunge req.user = { id, username, ruolo } se valido.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Token mancante." });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, username: payload.username, ruolo: payload.ruolo };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, message: "Token scaduto." });
    }
    return res.status(401).json({ ok: false, message: "Token non valido." });
  }
}

/**
 * Factory: crea un middleware che accetta solo i ruoli specificati.
 * Uso: requireRole("admin") oppure requireRole("admin", "ufficio")
 */
function requireRole(...ruoli) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Non autenticato." });
    }
    if (!ruoli.includes(req.user.ruolo)) {
      return res.status(403).json({ ok: false, message: "Permessi insufficienti." });
    }
    next();
  };
}

/**
 * Genera un token JWT per l'utente dato.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, ruolo: user.ruolo },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = { requireAuth, requireRole, generateToken, JWT_SECRET };
