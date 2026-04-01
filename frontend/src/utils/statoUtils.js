const STATE_MAP = {
  prenotazione: "pending",
  "in lavorazione": "in_corso",
  confermata: "completato",
  completato: "completato",
  annullata: "annullato",
  annullato: "annullato",
  pending: "pending",
  in_corso: "in_corso",
};

const STATE_LABELS = {
  pending: "Prenotazione",
  in_corso: "In Lavorazione",
  completato: "Completato",
  annullato: "Annullato",
};

export function normalizeState(value) {
  if (!value) return "pending";
  return STATE_MAP[value.toString().toLowerCase().trim()] ?? "pending";
}

export function getStateLabel(normalizedState) {
  return STATE_LABELS[normalizedState] ?? normalizedState;
}
