const { ensureDatabaseReady, getDb } = require("./db/database");

(async () => {
  await ensureDatabaseReady();
  const db = getDb();

  console.log("📋 Controllo tabelle che fanno riferimento a fornitori...");

  const results = db.prepare(`
    SELECT name, sql 
    FROM sqlite_master 
    WHERE type='table' AND sql LIKE '%REFERENCES fornitori%';
  `).all();

  for (const row of results) {
    console.log("\n🔗 Tabella:", row.name);
    console.log(row.sql);
  }

  process.exit();
})();
