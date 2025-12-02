export const PAESI = [
  "Italia", "Francia", "UK", "Spagna", "Germania",
  "Belgio", "Olanda", "Svezia", "Polonia", "Irlanda",
];

export const cleanText = (text) => {
  return text
    .normalize("NFKD")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();
};
