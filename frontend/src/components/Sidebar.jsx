import {
  LayoutDashboard,
  Flag,
  Boxes,
  ListChecks,
  FlaskConical,
  FileText,
  Settings2,
  Package,
  Archive,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";

const Sidebar = () => {
  const location = useLocation();
  const [hovering, setHovering] = useState(false);
  const isActive = (to) => location.pathname === to;

  // 🔹 Accesso corrente (amazon / magazzino / altro)
  const access = "amazon";
  console.log("Access:", access);

  let filteredMenuItems = [];

  // ================== MENU AMAZON ==================
  if (access === "amazon") {
    filteredMenuItems = [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/europe", label: "Europa", icon: Flag },
      { to: "/magazzino", label: "Magazzino", icon: Boxes },
      { to: "/listing", label: "Listing Amazon", icon: ListChecks },
      { to: "/inventario", label: "Inventario Merce", icon: Boxes },
      { to: "/spedizioni", label: "Gestione Spedizioni", icon: Package },
      { to: "/ddt", label: "Genera DDT", icon: FileText },
      { to: "/storico", label: "Storico Movimenti", icon: Archive },

      // 🧪 Sezione SFUSO e PRODUZIONE
      { divider: true, label: "Sfuso e Produzione" },
      { to: "/sfuso", label: "Gestione Sfuso", icon: FlaskConical },
      { to: "/storico-sfuso", label: "Storico Movimenti Sfuso", icon: Archive },
      {
        to: "/storico-produzioni-sfuso",
        label: "Storico Produzioni Sfuso",
        icon: Archive,
      },
    ];
  }

  // ================== MENU MAGAZZINO ==================
  else if (access === "magazzino") {
    filteredMenuItems = [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/inventario", label: "Inventario Merce", icon: Boxes },
      { to: "/spedizioni", label: "Gestione Spedizioni", icon: ListChecks },
      { to: "/ddt", label: "Genera DDT", icon: ListChecks },
    ];
  }

  // ================== MENU DI DEFAULT ==================
  else {
    filteredMenuItems = [{ to: "/", label: "Dashboard", icon: LayoutDashboard }];
  }

  // ================== RENDER SIDEBAR ==================
  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        "fixed top-0 left-0 h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-white flex flex-col justify-between transition-all duration-300 border-r border-zinc-800 z-40 shadow-2xl",
        hovering ? "w-64" : "w-20"
      )}
      aria-label="Sidebar di navigazione"
    >
      {/* 🔹 Logo / Header */}
      <div className="flex items-center justify-center h-20 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        {hovering ? (
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white">Gestionale</span>
              <span className="text-xs text-zinc-400">Pro v1.0</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* 🔹 Menu principale */}
      <nav className="flex-1 flex flex-col items-start py-6 gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent px-3" role="menu">
        {filteredMenuItems.map(({ to, label, icon: Icon, divider }, index) => {
          if (divider) {
            return (
              hovering && (
                <div
                  key={`divider-${index}`}
                  className="w-full text-xs font-semibold uppercase text-zinc-500 px-3 pt-6 pb-2 select-none tracking-wider"
                >
                  {label}
                </div>
              )
            );
          }

          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                "relative flex items-center w-full px-4 py-3 transition-all duration-200 rounded-xl group",
                active
                  ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white shadow-lg shadow-emerald-500/10 border border-emerald-500/30"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white hover:border hover:border-zinc-700/50"
              )}
              aria-current={active ? "page" : undefined}
              role="menuitem"
              tabIndex={hovering ? 0 : -1}
            >
              {/* Indicatore attivo a sinistra */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-500 to-blue-600 rounded-r-full shadow-lg shadow-emerald-500/50" />
              )}
              
              {/* Icona */}
              {Icon && (
                <div className={clsx(
                  "flex items-center justify-center",
                  hovering ? "w-6 h-6" : "w-full"
                )}>
                  <Icon
                    className={clsx(
                      "w-5 h-5 min-w-[20px] transition-all duration-200",
                      active ? "text-emerald-400 scale-110" : "text-zinc-400 group-hover:text-white group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                </div>
              )}
              
              {/* Label con animazione */}
              {hovering && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className={clsx(
                    "text-sm font-medium transition-all duration-200",
                    active ? "text-white" : "text-zinc-400 group-hover:text-white"
                  )}>
                    {label}
                  </span>
                  {active && (
                    <ChevronRight className="w-4 h-4 text-emerald-400 animate-pulse" />
                  )}
                </div>
              )}
              
              {/* Tooltip quando sidebar è chiusa */}
              {!hovering && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-zinc-700 z-50">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-zinc-800"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 🔹 Sezione Impostazioni in basso */}
      <div className="flex flex-col items-start px-3 pb-6 gap-3 border-t border-zinc-800/50 pt-4 bg-zinc-900/30 backdrop-blur-sm">
        <Link
          to="/settings"
          className={clsx(
            "flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group",
            isActive("/settings")
              ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white shadow-lg shadow-emerald-500/10 border border-emerald-500/30"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white hover:border hover:border-zinc-700/50"
          )}
          role="menuitem"
          tabIndex={hovering ? 0 : -1}
          aria-label="Impostazioni"
        >
          {isActive("/settings") && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-500 to-blue-600 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          
          <div className={clsx(
            "flex items-center justify-center",
            hovering ? "w-6 h-6" : "w-full"
          )}>
            <Settings2 
              className={clsx(
                "w-5 h-5 transition-all duration-200",
                isActive("/settings") 
                  ? "text-emerald-400 scale-110" 
                  : "text-zinc-400 group-hover:text-white group-hover:scale-110 group-hover:rotate-90"
              )} 
              aria-hidden="true" 
            />
          </div>
          
          {hovering && (
            <span className={clsx(
              "ml-3 text-sm font-medium transition-all duration-200",
              isActive("/settings") ? "text-white" : "text-zinc-400 group-hover:text-white"
            )}>
              Impostazioni
            </span>
          )}
          
          {!hovering && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-zinc-700 z-50">
              Impostazioni
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-zinc-800"></div>
            </div>
          )}
        </Link>
        
        {hovering && (
          <div className="w-full px-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500 select-none">Versione 1.0</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;