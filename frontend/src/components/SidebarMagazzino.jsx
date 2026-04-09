import {
  FlaskConical,
  Settings2,
  Archive,
  LogOut,
  Factory,
  Truck,
  Warehouse,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";

const MENU = [
  { to: "/magazzino", label: "Home Magazzino", icon: Warehouse },

  { divider: true, label: "Operatività" },
  { to: "/magazzino/produzione",  label: "Produzione",           icon: Factory },
  { to: "/magazzino/spedizioni",  label: "Spedizioni",           icon: Truck },
  { to: "/magazzino/sfuso",       label: "Gestione sfuso",       icon: FlaskConical },

  { divider: true, label: "Storici" },
  { to: "/magazzino/storici/movimenti",  label: "Storico movimenti",  icon: Archive },
  { to: "/magazzino/storici/sfuso",      label: "Storico sfuso",      icon: Archive },
  { to: "/magazzino/storici/scatolette", label: "Storico scatolette", icon: Archive },
];

const SidebarMagazzino = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const isActive = (to) => location.pathname === to;

  const handleBackToHome = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        "fixed top-0 left-0 h-screen bg-slate-950 text-slate-100 flex flex-col transition-[width] duration-200 ease-out border-r border-slate-800 z-40",
        hovering ? "w-60" : "w-16"
      )}
      aria-label="Sidebar Magazzino"
    >
      {/* === Brand === */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
          <Warehouse className="w-4 h-4 text-emerald-400" />
        </div>
        {hovering && (
          <div className="ml-3 flex flex-col leading-none min-w-0">
            <span className="text-[13px] font-semibold tracking-tight text-white truncate">Nexus</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mt-1">Warehouse</span>
          </div>
        )}
      </div>

      {/* === Menu === */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent" role="menu">
        {MENU.map(({ to, label, icon: Icon, divider }, index) => {
          if (divider) {
            return hovering ? (
              <div
                key={`divider-${index}`}
                className="text-[10px] uppercase tracking-[0.14em] text-slate-600 px-3 pt-5 pb-2 select-none"
              >
                {label}
              </div>
            ) : (
              <div key={`divider-${index}`} className="my-3 mx-3 border-t border-slate-800/60" />
            );
          }

          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              role="menuitem"
              tabIndex={hovering ? 0 : -1}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex items-center h-9 my-0.5 rounded-md transition-colors group",
                hovering ? "px-3" : "px-0 justify-center",
                active
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-emerald-400 rounded-r-full" />
              )}
              {Icon && (
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-200"
                  )}
                  aria-hidden="true"
                />
              )}
              {hovering && (
                <span className="ml-3 text-[13px] font-medium truncate">{label}</span>
              )}
              {!hovering && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* === Footer === */}
      <div className="border-t border-slate-800 px-2 py-3 space-y-0.5">
        <button
          onClick={handleBackToHome}
          aria-label="Cambia accesso"
          className={clsx(
            "relative flex items-center h-9 w-full rounded-md transition-colors group",
            hovering ? "px-3" : "px-0 justify-center",
            "text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {hovering && <span className="ml-3 text-[13px] font-medium">Cambia accesso</span>}
          {!hovering && (
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-amber-500/30 text-amber-300 text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Cambia accesso
            </span>
          )}
        </button>

        <Link
          to="/settings"
          aria-label="Impostazioni"
          role="menuitem"
          tabIndex={hovering ? 0 : -1}
          className={clsx(
            "relative flex items-center h-9 w-full rounded-md transition-colors group",
            hovering ? "px-3" : "px-0 justify-center",
            isActive("/settings")
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
          )}
        >
          <Settings2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {hovering && <span className="ml-3 text-[13px] font-medium">Impostazioni</span>}
          {!hovering && (
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-[11px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
              Impostazioni
            </span>
          )}
        </Link>

        {hovering && (
          <div className="px-3 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-600 select-none">v2.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarMagazzino;
