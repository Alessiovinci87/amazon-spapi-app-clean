// backend_v2/utils/password.js
// Utility per hash e verifica password — usa crypto built-in di Node (nessuna dipendenza esterna)

const crypto = require("crypto");

/**
 * Genera un hash sicuro della password con salt casuale.
 * Formato restituito: "<salt_hex>:<hash_hex>"
 * @param {string} plain - Password in chiaro
 * @returns {string}
 */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifica che una password in chiaro corrisponda all'hash memorizzato.
 * @param {string} plain - Password in chiaro da verificare
 * @param {string} stored - Hash memorizzato nel formato "<salt_hex>:<hash_hex>"
 * @returns {boolean}
 */
function verifyPassword(plain, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const inputHash = crypto.scryptSync(plain, salt, 64);
  const storedHash = Buffer.from(hash, "hex");
  // timingSafeEqual previene timing attacks
  return crypto.timingSafeEqual(inputHash, storedHash);
}

module.exports = { hashPassword, verifyPassword };
