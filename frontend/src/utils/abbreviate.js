// src/utils/abbreviate.js
export function abbreviate(text, max = 30) {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}
