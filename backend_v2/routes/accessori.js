// backend_v2/routes/accessori.js
const express = require('express');
const logger = require("../utils/logger");
const { z } = require("zod");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const AccessoriController = require('../controllers/accessoriController');
const AccessoriService = require("../services/accessoriService");
const { validate } = require("../middleware/validate");

const asinParam = z.object({ asin_accessorio: z.string().min(1).max(50) });

// ── Upload immagine accessorio ────────────────────────────
// Le immagini vengono salvate in frontend/public/accessori-images/
// così sono servite come statiche sotto /accessori-images/<asin>.<ext>.
const UPLOAD_DIR = path.join(__dirname, "../../frontend/public/accessori-images");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Nome file = asin_accessorio + estensione originale (sanificata).
    const ext = (path.extname(file.originalname) || ".jpg").toLowerCase();
    const safeAsin = String(req.params.asin_accessorio).replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${safeAsin}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo immagini consentite"));
  },
});

const sogliaSchema = z.object({
  soglia_minima: z.coerce.number().int().min(0),
});

const updateQtaSchema = z.object({
  quantita: z.coerce.number().int().min(0),
  nota: z.string().max(1000).nullish(),
  operatore: z.string().max(100).optional(),
});

router.use((req, _res, next) => {
  logger.info(`[ACCESSORI] ${req.method} ${req.originalUrl}`);
  next();
});

/** 📜 GET storico accessori */
router.get('/storico', AccessoriController.getStoricoAccessori);

/** PATCH imposta soglia minima */
router.patch('/:asin_accessorio/soglia',
  validate({ params: asinParam, body: sogliaSchema }),
  AccessoriController.updateSogliaAccessorio);

/** PATCH aggiorna quantità */
router.patch('/:asin_accessorio',
  validate({ params: asinParam, body: updateQtaSchema }),
  AccessoriController.updateQuantitaAccessorio);

/** GET tutti gli accessori */
router.get('/', AccessoriController.getAllAccessori);

/** GET singolo accessorio */
router.get('/:asin_accessorio', AccessoriController.getAccessorio);

/** 🖼️ POST carica/aggiorna immagine accessorio (multipart/form-data, campo "file") */
router.post('/:asin_accessorio/immagine', (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    try {
      const publicPath = `/accessori-images/${req.file.filename}`;
      const updated = AccessoriService.updateImmagineAccessorio(req.params.asin_accessorio, publicPath);
      if (!updated) return res.status(404).json({ error: "Accessorio non trovato" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });
});

/** 🗑️ DELETE rimuovi immagine accessorio */
router.delete('/:asin_accessorio/immagine',
  validate({ params: asinParam }),
  (req, res, next) => {
    try {
      const updated = AccessoriService.updateImmagineAccessorio(req.params.asin_accessorio, null);
      if (!updated) return res.status(404).json({ error: "Accessorio non trovato" });
      res.json(updated);
    } catch (e) { next(e); }
  }
);

module.exports = router;
