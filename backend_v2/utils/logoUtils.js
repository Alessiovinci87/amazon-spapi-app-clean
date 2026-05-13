const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "..", "frontend", "public");

function logoToDataUri(staticPath) {
  if (!staticPath) return "";
  try {
    const rel = String(staticPath).replace(/^\/?static\//, "");
    const filePath = path.join(STATIC_ROOT, rel);
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext || "png"}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return staticPath;
  }
}

module.exports = { logoToDataUri };
