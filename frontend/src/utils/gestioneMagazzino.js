export const scaricaCSV = (prodotti = []) => {
  if (!prodotti.length) return;

  const intestazioni = [
    "ASIN",
    "Nome prodotto",
    "Formato",
    "Categoria",
    "Pronto",
    "Prezzo",
    "BuyBox",
  ];

  const righe = prodotti.map((p) => [
    p.asin || "",
    p.nome?.replace(/,/g, " ") || "",
    p.formato || "",
    p.categoria || "",
    p.pronto ?? "",
    p.prezzo ?? "",
    p.buyBox ? "Sì" : "No",
  ]);

  // BOM per Excel + escape CSV
  const csvContent =
    "\uFEFF" +
    [intestazioni, ...righe]
      .map((r) =>
        r
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const oggi = new Date().toISOString().split("T")[0];
  const timestamp = Date.now();
  const fileName = `magazzino_prodotti_${oggi}_${timestamp}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
