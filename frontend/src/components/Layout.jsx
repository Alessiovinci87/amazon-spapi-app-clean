import React from "react";
import { Outlet } from "react-router-dom";
import SidebarUffici from "./SidebarUffici";
import SidebarMagazzino from "./SidebarMagazzino";

const Layout = () => {
  // 🔹 Determina quale sidebar mostrare in base all'accesso
  const access = localStorage.getItem("auth") || "amazon";

  return (
    <div className="flex min-h-screen">
      {/* 🔹 Sidebar dinamica in base all'accesso */}
      {access === "magazzino" ? <SidebarMagazzino /> : <SidebarUffici />}
      
      <main
        className="flex-1 p-6 bg-transparent overflow-auto transition-margin duration-300"
        style={{ marginLeft: "4rem" }} // per sidebar chiusa
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;