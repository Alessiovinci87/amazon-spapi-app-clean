// utils/normalizzaAccessori.js
export const normalizzaAccessori = (arr) =>
  arr.map((acc) => ({
    ...acc,
    asin:
      acc.asin_accessorio ||
      acc.asin ||
      (acc.nome ? acc.nome.replace(/\s+/g, "_").toUpperCase() : "SIN_ASIN"),
    quantitaPerProdotto: Number(acc.quantitaPerProdotto ?? acc.quantita ?? 0),
  }));
