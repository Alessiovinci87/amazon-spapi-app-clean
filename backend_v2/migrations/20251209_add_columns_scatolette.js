// 20251209_add_columns_scatolette.js
module.exports = {
  name: "20251209_add_columns_scatolette",
  async up(db) {
    db.prepare(`ALTER TABLE scatolette ADD COLUMN colonna1 TEXT`).run();
    db.prepare(`ALTER TABLE scatolette ADD COLUMN mesi8 TEXT`).run();
    db.prepare(`ALTER TABLE scatolette ADD COLUMN ordineSigma TEXT`).run();
    db.prepare(`ALTER TABLE scatolette ADD COLUMN ordinePackly TEXT`).run();
    db.prepare(`ALTER TABLE scatolette ADD COLUMN dataOrdine TEXT`).run();
    db.prepare(`ALTER TABLE scatolette ADD COLUMN mesi8new TEXT`).run();
  }
};
