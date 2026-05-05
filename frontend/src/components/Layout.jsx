import React from "react";
import { Outlet } from "react-router-dom";
import SidebarUffici from "./SidebarUffici";
import SidebarMagazzino from "./SidebarMagazzino";
import GlobalAlertBell from "./GlobalAlertBell";
import ErrorBoundary from "./ErrorBoundary";
import RoleGuard from "./RoleGuard";

const Layout = () => {
  // 🔹 Determina quale sidebar mostrare in base all'accesso
  const access = localStorage.getItem("auth") || "amazon";

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* 🔹 Sidebar dinamica in base all'accesso */}
      {access === "magazzino" ? <SidebarMagazzino /> : <SidebarUffici />}

      <main
        className="flex-1 bg-transparent transition-margin duration-300"
        style={{ marginLeft: "4rem" }} // per sidebar chiusa
      >
        <ErrorBoundary>
          <RoleGuard>
            <Outlet />
          </RoleGuard>
        </ErrorBoundary>
      </main>

      {/* 🔔 Campana alert globale — visibile in qualsiasi sezione */}
      <GlobalAlertBell />
    </div>
  );
};

export default Layout;