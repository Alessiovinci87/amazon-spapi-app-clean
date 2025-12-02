export const fetchProdotti = async () => {
  const response = await fetch("/mock/prodotti.json");
  return response.json();
};
