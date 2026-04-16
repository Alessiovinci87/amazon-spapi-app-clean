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
  LogOut,
  Bell,
  TrendingUp,
  Factory,
  ShoppingCart,
  Users,
  ClipboardList,
  Calculator,
  Wrench,
  Tag,
  BoxSelect,
  Star,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const MENU = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/uffici/alert-center", label: "Centro Alert", icon: Bell },
  { to: "/europe",    label: "Europa",    icon: Flag },
  { to: "/magazzino", label: "Magazzino", icon: Boxes },

  { divider: true, label: "Gestione uffici" },
  { to: "/uffici/listing",     label: "Listing Amazon",       icon: ListChecks },
  { to: "/uffici/inventario",  label: "Inventario merce",     icon: Boxes },
  { to: "/uffici/produzione",  label: "Produzione",           icon: Factory },
  { to: "/uffici/spedizioni",  label: "Gestione spedizioni",  icon: Package },
  { to: "/uffici/ddt",         label: "Genera DDT",           icon: FileText },

  { divider: true, label: "Fornitori e ordini" },
  { to: "/uffici/fornitori",   label: "Fornitori e ordini",   icon: Users },

  { divider: true, label: "Strumenti" },
  { to: "/fba-gestione-prodotti", label: "Calcolo margini FBA", icon: Calculator },
  { to: "/accessori",             label: "Accessori",           icon: Wrench },
  { to: "/etichette",             label: "Etichette",           icon: Tag },
  { to: "/scatolette",            label: "Scatolette",          icon: BoxSelect },
  { to: "/recensioni",            label: "Seller Feedback",     icon: Star },

  { divider: true, label: "Analytics" },
  { to: "/uffici/vendite",         label: "Dashboard Vendite",   icon: TrendingUp },
  { to: "/uffici/resi-fba",       label: "Resi FBA",            icon: Package },

  { divider: true, label: "Storici e report" },
  { to: "/uffici/storici/movimenti", label: "Storico movimenti", icon: Archive },
  { to: "/uffici/spedizioni/storico", label: "Storico spedizioni", icon: Archive },
  { to: "/uffici/bilancio",          label: "Gestione bilancio", icon: TrendingUp },

  { divider: true, label: "Sfuso e produzione" },
  { to: "/magazzino/sfuso",         label: "Gestione sfuso", icon: FlaskConical },
  { to: "/magazzino/storici/sfuso", label: "Storico sfuso",  icon: Archive },
];

const SidebarUffici = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const isActive = (to) => location.pathname === to;

  const { logout } = useAuth();
  const handleBackToHome = () => {
    logout();
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
      aria-label="Sidebar Uffici"
    >
      {/* === Brand === */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-4 h-4 text-indigo-400" />
        </div>
        {hovering && (
          <div className="ml-3 flex flex-col leading-none min-w-0">
            <span className="text-[13px] font-semibold tracking-tight text-white truncate">Nexus</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mt-1">Uffici</span>
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
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-indigo-400 rounded-r-full" />
              )}
              {Icon && (
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-200"
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
              ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
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
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarUffici;
