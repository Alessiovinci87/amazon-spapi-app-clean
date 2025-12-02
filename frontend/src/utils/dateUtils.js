export const formatDateEU = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("it-IT"); // restituisce gg/mm/aaaa
};