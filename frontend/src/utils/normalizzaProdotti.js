export function normalizzaProdotto(p) {
  return {
    asin: p.asin,
    sku: p.sku,
    nome: p.nome,
    image: p.image,
    prezzo: p.prezzo ?? null,
    stock: p.stock ?? null,
    buyBox: p.buyBox ?? null,
    marketplaces: p.marketplaces || p.perPaese || {},
  };
}
