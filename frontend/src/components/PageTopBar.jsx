import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import GlobalAlertBell from "./GlobalAlertBell";
import { useTakeOverAlertBell } from "./AlertBellContext";

/**
 * Top bar sticky riusabile per le pagine principali.
 *
 * Layout (da sinistra a destra):
 *   [back] [icon] [eyebrow + title]      [alert badge inline]      [actions ...] [sync circle]
 *
 * - Sticky: rimane in alto durante lo scroll.
 * - Il bell flottante (Layout) si nasconde automaticamente via context.
 * - L'indicatore sync circolare appare all'estrema destra solo se passi `syncing` o `onSyncClick`.
 *
 * Props:
 *   icon        ElementType (lucide)             — icona della sezione
 *   iconAccent  string                           — chiave colore (blue, cyan, emerald, ...)
 *   eyebrow     string                           — etichetta superiore (UPPERCASE)
 *   title       string                           — titolo della sezione
 *   backTo      string | (() => void)            — destinazione del back (default: -1)
 *   syncing     boolean                          — true → spinner nel cerchio sync
 *   onSyncClick (() => void)                     — handler click sync (omettilo per nasconderlo)
 *   syncTitle   string                           — tooltip sync (default "Aggiorna")
 *   actions     ReactNode                        — slot bottoni a destra (prima del sync)
 *   showAlertBell  boolean                       — mostra il bell al centro (default true)
 *   containerClass string                        — override delle classi del container interno
 */
export default function PageTopBar({
  icon: Icon,
  iconAccent = "blue",
  eyebrow,
  title,
  backTo,
  syncing = false,
  onSyncClick,
  syncTitle,
  actions,
  showAlertBell = true,
  containerClass = "w-full px-4 sm:px-6 lg:px-8",
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof backTo === "function") backTo();
    else if (typeof backTo === "string") navigate(backTo);
    else navigate(-1);
  };

  const ACCENT = {
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    cyan:    "bg-cyan-500/10 border-cyan-500/40 text-cyan-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    indigo:  "bg-indigo-500/10 border-indigo-500/40 text-indigo-400",
    violet:  "bg-violet-500/10 border-violet-500/40 text-violet-400",
    rose:    "bg-rose-500/10 border-rose-500/40 text-rose-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    pink:    "bg-pink-500/10 border-pink-500/40 text-pink-400",
    teal:    "bg-teal-500/10 border-teal-500/40 text-teal-400",
    orange:  "bg-orange-500/10 border-orange-500/40 text-orange-400",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur w-full overflow-hidden">
      <div className={`${containerClass} py-3 flex items-center gap-3 min-w-0`}>
        {/* Sinistra: back + icon + eyebrow/title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={handleBack}
            type="button"
            title="Indietro"
            className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {Icon && (
            <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${ACCENT[iconAccent] || ACCENT.blue}`}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
          )}
          <div className="flex flex-col leading-none min-w-0">
            {eyebrow && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 truncate">
                {eyebrow}
              </span>
            )}
            {title && (
              <span className="text-[15px] font-semibold tracking-tight text-white truncate mt-0.5">
                {title}
              </span>
            )}
          </div>
        </div>

        {/* Centro: alert bell rettangolare */}
        {showAlertBell && (
          <div className="flex-shrink-0">
            <InlineAlertBellSlot />
          </div>
        )}

        {/* Destra: actions + sync indicator */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-1 justify-end">
          {actions}
          {(onSyncClick || syncing) && (
            <button
              type="button"
              onClick={onSyncClick}
              disabled={!onSyncClick || syncing}
              title={syncing ? "Sincronizzazione in corso…" : (syncTitle || "Aggiorna")}
              aria-label={syncing ? "Sincronizzazione in corso" : (syncTitle || "Aggiorna")}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                syncing
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                  : "border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-blue-500/40 text-slate-400 hover:text-blue-300"
              } disabled:cursor-default`}
            >
              {syncing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Sub-componente: renderizza il bell inline e dichiara al context che il
// flottante in Layout deve nascondersi. Estratto per chiamare l'hook
// in modo condizionale-safe (montato solo se showAlertBell=true).
function InlineAlertBellSlot() {
  useTakeOverAlertBell();
  return <GlobalAlertBell inline />;
}
