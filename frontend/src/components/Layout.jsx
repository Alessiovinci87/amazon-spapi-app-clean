import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  // Se vuoi far sapere a Layout se sidebar è espansa
  // Potresti gestire stato di hovering qui e passarlo a Sidebar
  // Oppure tenerlo indipendente e far scorrere l'overlay mobile

  return (
    <div className="flex min-h-screen">
      <Sidebar />
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
