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
  Home,
  TrendingUp,
  Factory,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";

const SidebarUffici = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const isActive = (to) => location.pathname === to;

  // 🔹 Funzione per tornare alla selezione iniziale
  const handleBackToHome = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  // ================== MENU UFFICI ==================
  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/europe", label: "Europa", icon: Flag },
    { to: "/magazzino", label: "Magazzino", icon: Boxes },

    // 📦 Sezione Gestione
    { divider: true, label: "Gestione Uffici" },
    { to: "/uffici/listing", label: "Listing Amazon", icon: ListChecks },
    { to: "/uffici/inventario", label: "Inventario Merce", icon: Boxes },
    { to: "/uffici/produzione", label: "Produzione", icon: Factory },
    { to: "/uffici/spedizioni", label: "Gestione Spedizioni", icon: Package },
    { to: "/uffici/ddt", label: "Genera DDT", icon: FileText },
    
    // 📊 Sezione Storici
    { divider: true, label: "Storici e Report" },
    { to: "/uffici/storici/movimenti", label: "Storico Movimenti", icon: Archive },
    { to: "/uffici/bilancio", label: "Gestione Bilancio", icon: TrendingUp },

    // 🧪 Sezione SFUSO (accesso a magazzino)
    { divider: true, label: "Sfuso e Produzione" },
    { to: "/magazzino/sfuso", label: "Gestione Sfuso", icon: FlaskConical },
    { to: "/magazzino/storici/sfuso", label: "Storico Sfuso", icon: Archive },
  ];

  // ================== RENDER SIDEBAR ==================
  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        "fixed top-0 left-0 h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between transition-all duration-300 border-r border-slate-700 z-40 shadow-2xl",
        hovering ? "w-64" : "w-20"
      )}
      aria-label="Sidebar Uffici"
    >
      {/* 🔹 Logo / Header */}
      <div className="flex items-center justify-center h-20 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        {hovering ? (
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white">Gestionale</span>
              <span className="text-xs text-blue-400">Area Uffici</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* 🔹 Menu principale */}
      <nav className="flex-1 flex flex-col items-start py-6 gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-3" role="menu">
        {menuItems.map(({ to, label, icon: Icon, divider }, index) => {
          if (divider) {
            return (
              hovering && (
                <div
                  key={`divider-${index}`}
                  className="w-full text-xs font-semibold uppercase text-slate-500 px-3 pt-6 pb-2 select-none tracking-wider"
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
                  ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white hover:border hover:border-slate-700/50"
              )}
              aria-current={active ? "page" : undefined}
              role="menuitem"
              tabIndex={hovering ? 0 : -1}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-lg shadow-blue-500/50" />
              )}

              {Icon && (
                <div className={clsx(
                  "flex items-center justify-center",
                  hovering ? "w-6 h-6" : "w-full"
                )}>
                  <Icon
                    className={clsx(
                      "w-5 h-5 min-w-[20px] transition-all duration-200",
                      active ? "text-blue-400 scale-110" : "text-slate-400 group-hover:text-white group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                </div>
              )}

              {hovering && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className={clsx(
                    "text-sm font-medium transition-all duration-200",
                    active ? "text-white" : "text-slate-400 group-hover:text-white"
                  )}>
                    {label}
                  </span>
                  {active && (
                    <ChevronRight className="w-4 h-4 text-blue-400 animate-pulse" />
                  )}
                </div>
              )}

              {!hovering && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-700 z-50">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 🔹 Footer: Cambia Accesso + Impostazioni */}
      <div className="flex flex-col items-start px-3 pb-6 gap-2 border-t border-slate-700/50 pt-4 bg-slate-900/30 backdrop-blur-sm">
        
        {/* 🏠 Pulsante Cambia Accesso */}
        <button
          onClick={handleBackToHome}
          className={clsx(
            "flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group",
            "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border hover:border-amber-500/30"
          )}
          aria-label="Cambia accesso"
        >
          <div className={clsx(
            "flex items-center justify-center",
            hovering ? "w-6 h-6" : "w-full"
          )}>
            <Home
              className="w-5 h-5 transition-all duration-200 text-amber-400 group-hover:scale-110"
              aria-hidden="true"
            />
          </div>

          {hovering && (
            <span className="ml-3 text-sm font-medium transition-all duration-200 text-amber-400 group-hover:text-amber-300">
              Cambia Accesso
            </span>
          )}

          {!hovering && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-amber-500/20 text-amber-300 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-amber-500/30 z-50">
              Cambia Accesso
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-amber-500/20"></div>
            </div>
          )}
        </button>

        {/* ⚙️ Impostazioni */}
        <Link
          to="/settings"
          className={clsx(
            "flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group",
            isActive("/settings")
              ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-white hover:border hover:border-slate-700/50"
          )}
          role="menuitem"
          tabIndex={hovering ? 0 : -1}
          aria-label="Impostazioni"
        >
          <div className={clsx(
            "flex items-center justify-center",
            hovering ? "w-6 h-6" : "w-full"
          )}>
            <Settings2
              className={clsx(
                "w-5 h-5 transition-all duration-200",
                isActive("/settings")
                  ? "text-blue-400 scale-110"
                  : "text-slate-400 group-hover:text-white group-hover:scale-110 group-hover:rotate-90"
              )}
              aria-hidden="true"
            />
          </div>

          {hovering && (
            <span className={clsx(
              "ml-3 text-sm font-medium transition-all duration-200",
              isActive("/settings") ? "text-white" : "text-slate-400 group-hover:text-white"
            )}>
              Impostazioni
            </span>
          )}

          {!hovering && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-700 z-50">
              Impostazioni
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
            </div>
          )}
        </Link>

        {hovering && (
          <div className="w-full px-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 select-none">Uffici v1.0</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarUffici;