const { ensureDatabaseReady, getDb } = require("./db/database");

(async () => {
  await ensureDatabaseReady();
  const db = getDb();

  // 1️⃣ Elimina collegamenti prodotti-fornitore
  const deletedLinks = db.prepare("DELETE FROM fornitori_prodotti WHERE id_fornitore = 1").run();
  console.log("Collegamenti prodotti-fornitore eliminati:", deletedLinks.changes);

  // 2️⃣ Elimina eventuali ordini associati
  const deletedOrders = db.prepare("DELETE FROM ordini_fornitori WHERE id_fornitore = 1").run();
  console.log("Ordini collegati eliminati:", deletedOrders.changes);

  // 3️⃣ Elimina il fornitore
  const deletedFornitore = db.prepare("DELETE FROM fornitori WHERE id = 1").run();
  console.log("Fornitori eliminati:", deletedFornitore.changes);

  process.exit();
})();
