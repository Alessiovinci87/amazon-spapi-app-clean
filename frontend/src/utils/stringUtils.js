export const normalizzaAsinAccessorio = (nome, asin_accessorio) => {
  return asin_accessorio || nome.replace(/\s+/g, "_").toUpperCase();
};