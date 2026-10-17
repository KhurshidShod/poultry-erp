
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

import { useLocation } from "react-router-dom";
import { navigation } from "../../config/navigation";
import { useTheme } from "../../context/ThemeContext";

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

export default function Header({
  onMobileMenuOpen,
}: HeaderProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const currentGroup = navigation.find((group) =>
    group.items.some(
      (item) =>
        item.path === location.pathname ||
        (item.path !== "/" &&
          location.pathname.startsWith(item.path + "/"))
    )
  );

  const currentPage = currentGroup?.items.find(
    (item) =>
      item.path === location.pathname ||
      (item.path !== "/" &&
        location.pathname.startsWith(item.path + "/"))
  );

  const today = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .replace(/\//g, ".");

  return (
    <header
      className="
        sticky top-0 z-30
        flex h-[72px] w-full
        items-center justify-between
        gap-4 border-b border-border-custom
        bg-sidebar px-5 lg:px-8
        text-text-main
      "
    >
      {/* LEFT: BREADCRUMB */}

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          aria-label="Menyuni ochish"
          className="
            rounded-lg p-2 text-muted
            transition-colors
            hover:bg-[var(--hover-bg)]
            hover:text-text-main
            lg:hidden
          "
        >
          <Menu size={21} />
        </button>

        <nav
          aria-label="Sahifa yo'li"
          className="flex min-w-0 items-center gap-2 text-[12px]"
        >
          <span className="hidden shrink-0 text-muted sm:inline">
            {currentGroup?.label ?? "Asosiy"}
          </span>

          <ChevronRight
            size={14}
            className="hidden shrink-0 text-muted sm:block"
          />

          <span className="truncate font-medium text-text-main">
            {currentPage?.title ?? "Boshqaruv paneli"}
          </span>
        </nav>
      </div>

      {/* RIGHT: DATE, THEME AND NOTIFICATIONS */}

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-text-main">
          <CalendarDays
            size={17}
            strokeWidth={1.8}
            className="text-muted"
          />

          <span className="hidden sm:inline">
            {today}
          </span>
        </div>

        <div className="h-5 w-px bg-border-custom" />

        {/* THEME TOGGLE */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "Yorug' rejimga o'tish"
              : "Qorong'i rejimga o'tish"
          }
          title={
            theme === "dark"
              ? "Yorug' rejim"
              : "Qorong'i rejim"
          }
          className="
            flex h-9 w-9 items-center justify-center
            rounded-lg border border-border-custom
            bg-card text-text-main
            transition-colors duration-150
            hover:bg-[var(--hover-bg)]
          "
        >
          {theme === "dark" ? (
            <Sun size={19} strokeWidth={1.8} />
          ) : (
            <Moon size={19} strokeWidth={1.8} />
          )}
        </button>

        {/* NOTIFICATIONS */}
<button
  type="button"
  disabled
  title="Bildirishnomalar keyingi bosqichda"
  aria-label="Bildirishnomalar"
  className="
    flex h-9 w-9 items-center justify-center
    rounded-lg text-text-main !opacity-100
  "
>
  <Bell size={19} strokeWidth={1.8} />
</button>
      </div>
    </header>
  );
}
