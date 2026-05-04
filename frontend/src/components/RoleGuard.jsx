// frontend/src/components/RoleGuard.jsx
// Blocca lato client le rotte non consentite al ruolo dell'utente.
// Per gli operatori "magazzino" è in vigore una whitelist; gli altri ruoli passano.
// Indietro / avanti del browser, deep-link, refresh: il guard rivaluta a ogni cambio path.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Rotte permesse a chi ha ruolo "magazzino".
// Match per prefisso (es. /uffici/ddt copre anche /uffici/ddt/123).
const MAGAZZINO_ALLOWED = [
  /^\/magazzino(\/|$)/,
  /^\/uffici\/inventario(\/|$)/,
  /^\/uffici\/ddt(\/|$)/,
  /^\/uffici\/produzione(\/|$)/,
  /^\/uffici\/spedizioni(\/|$)/,
  /^\/uffici\/storici(\/|$)/,
  /^\/scatolette(\/|$)/,
  /^\/etichette(\/|$)/,
  /^\/sfuso(\/|$)/,
  /^\/inventario(\/|$)/,
  /^\/inventario-magazzino(\/|$)/,
  /^\/gestione-produzione(\/|$)/,
  /^\/spedizioni(\/|$)/,
  /^\/ddt(\/|$|-)/,            // /ddt, /ddt/..., /ddt-nuovo, /ddt-index, /ddt-storico
  /^\/storico(\/|$|-)/,        // /storico, /storico/..., /storico-sfuso, /storico-produzioni-sfuso, /storico-sfuso-inventario
  /^\/storicosfuso$/,
  /^\/accessori(\/|$)/,
  /^\/settings$/,
];

export default function RoleGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.ruolo === "magazzino") {
    const allowed = MAGAZZINO_ALLOWED.some((rx) => rx.test(location.pathname));
    if (!allowed) {
      return <Navigate to="/magazzino" replace />;
    }
  }

  return children;
}
