import { Layers3, LogOut, PanelLeftClose, Search, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { navigation } from '../../config/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const [search, setSearch] = useState('');

  const groups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          group.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Menyuni yopish"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/75 lg:hidden"
        />
      )}

      <aside
        className={`
  fixed inset-y-0 left-0 z-50
  flex flex-col
  bg-sidebar text-text-main
  border-r border-border-custom
  transition-[width,transform] duration-200
  w-[260px]
  ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
  ${
    mobileOpen
      ? "translate-x-0"
      : "-translate-x-full lg:translate-x-0"
  }
`}
      >
        {/* Logo / Sidebar Toggle */}
        <div
          className={`
    flex h-[72px] shrink-0 items-center
    border-b border-border-custom px-4
    ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}
  `}
        >
          {/* White logo becomes the expand button when collapsed */}
          <button
            type="button"
            onClick={collapsed ? onToggle : undefined}
            aria-label={collapsed ? 'Yon menyuni kengaytirish' : 'Poultry ERP'}
            title={collapsed ? 'Menyuni ochish' : 'Poultry ERP'}
            className={`
  flex h-9 w-9 shrink-0
  items-center justify-center
  rounded-[10px]
  bg-[var(--hover-bg)]
  text-text-main
  transition-colors duration-150
  ${
    collapsed
      ? "lg:cursor-pointer hover:bg-card"
      : "cursor-default"
  }
`}
          >
            <Layers3 size={19} strokeWidth={2.1} />
          </button>

          {/* Collapse button visible only when sidebar is expanded */}
          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Yon menyuni yig'ish"
              title="Menyuni yopish"
              className="
        hidden h-9 w-9 items-center justify-center
        rounded-lg text-[#A1A1A1]
        transition-colors
        hover:bg-[#232323] hover:text-white
        lg:flex
      "
            >
              <PanelLeftClose size={18} />
            </button>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Menyuni yopish"
            className="ml-auto text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-4">
          {collapsed ? (
            <button
  type="button"
  onClick={onToggle}
  aria-label="Qidirish"
  className="
    hidden h-10 w-full items-center justify-center
    rounded-lg border border-border-custom
    bg-card text-text-main
    hover:bg-[var(--hover-bg)]
    lg:flex
  "
>
  <Search size={18} />
</button>
          ) : null}

          <div className={collapsed ? 'lg:hidden' : ''}>
            <div
  className="
    flex h-10 items-center gap-2
    rounded-lg border border-border-custom
    bg-[var(--input-bg)] px-3
  "
>
              <Search size={17} className="text-muted" />
              <input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Qidirish..."
  className="
    w-full min-w-0
    bg-transparent text-[13px]
    text-text-main outline-none
    placeholder:text-muted
  "
/>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
  className={`
    sidebar-scroll min-h-0 flex-1 pb-5
    ${collapsed ? "lg:px-2" : "px-3"}
  `}
>
          {groups.map((group) => {
            return (
              <div
                key={group.id}
                className={`
    mb-5
    ${collapsed ? 'lg:mb-3 lg:border-b lg:border-border-custom lg:pb-3' : ''}
  `}
              >
                {/* Group heading */}
<div
  className={`
    mb-2 px-2
    text-[13px] font-semibold
    text-text-main
    ${collapsed ? "lg:hidden" : ""}
  `}
>
  {group.label}
</div>

                {/* Group items */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    const active =
                      item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname === item.path ||
                          location.pathname.startsWith(item.path + '/');

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onMobileClose}
                        title={collapsed ? item.title : undefined}

className={`
  sidebar-link
  flex h-[42px] items-center gap-3 rounded-lg
  text-[13px] font-medium
  transition-colors duration-150
  ${
    collapsed
      ? "px-3 lg:mx-auto lg:w-[44px] lg:justify-center lg:px-0"
      : "ml-3 px-3"
  }
  ${active ? "active" : ""}
`}

                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                          className="shrink-0"
                        />

                        <span
                          className={`
      truncate
      ${collapsed ? 'lg:hidden' : ''}
    `}
                        >
                          {item.title}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border-custom p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#232323] text-xs text-white">
              AD
            </div>

            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-[12px] font-medium text-text-main">
                Administrator
              </p>
              <p className="text-[11px] text-[#A1A1A1]">Boshqaruvchi</p>
            </div>

            <LogOut
              size={17}
              className={`text-[#A1A1A1] ${collapsed ? 'lg:hidden' : ''}`}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
