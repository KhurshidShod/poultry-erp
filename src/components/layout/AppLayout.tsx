
import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("erp-sidebar-collapsed") === "true";
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((previous) => {
      const next = !previous;

      localStorage.setItem(
        "erp-sidebar-collapsed",
        String(next)
      );

      return next;
    });
  };

  return (
    <div className="min-h-screen w-full bg-app-bg text-text-main">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={`
          min-h-screen min-w-0
          transition-[margin] duration-200
          ${
            collapsed
              ? "lg:ml-[72px]"
              : "lg:ml-[260px]"
          }
        `}
      >
        <Header
          onMobileMenuOpen={() => setMobileOpen(true)}
        />

        <main
          className="
            min-h-[calc(100vh-72px)]
            w-full min-w-0
            p-4 sm:p-6 lg:p-8
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
