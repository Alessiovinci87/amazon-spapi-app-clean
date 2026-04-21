/**
 * Scarica un array di oggetti come file CSV.
 * @param {Object[]} rows — dati da esportare
 * @param {string[]} columns — chiavi delle colonne da includere
 * @param {Object} [headers] — mappa chiave→etichetta header (opzionale, default = chiave)
 * @param {string} filename — nome del file scaricato
 */
export function downloadCSV(rows, columns, headers = {}, filename = "export.csv") {
  if (!rows?.length) return;

  const headerRow = columns.map(c => headers[c] || c).join(";");

  const dataRows = rows.map(row =>
    columns.map(c => {
      const val = row[c] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(";") || str.includes('"') || str.includes("\n")
        ? `"${str}"`
        : str;
    }).join(";")
  );

  // BOM per Excel
  const bom = "\uFEFF";
  const csv = bom + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
