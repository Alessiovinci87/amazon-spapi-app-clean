// backend_v2/utils/uploadPaths.js
// Risolve i percorsi delle cartelle upload immagini.
//
// Su sviluppo locale: salva in frontend/public/<categoria>-images/ così le
// immagini sono servite anche dal dev server Vite.
//
// In produzione (server): valorizzare UPLOAD_DIR nell'env per puntare a un
// path persistente fuori dal repo (es. /data/uploads su Fly volume / Oracle
// block volume). Le sottocartelle vengono create al primo accesso.
//
// Categorie supportate: accessori, onestep, topcoat, moduli

const path = require("path");
const fs = require("fs");

// Fallback storico: backend_v2/../frontend/public
const DEFAULT_BASE = path.join(__dirname, "../../frontend/public");

function getUploadBase() {
  return process.env.UPLOAD_DIR || DEFAULT_BASE;
}

function getUploadDir(category) {
  const dir = path.join(getUploadBase(), `${category}-images`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { getUploadBase, getUploadDir };
