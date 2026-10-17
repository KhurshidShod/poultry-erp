
import {
  LayoutDashboard,
  Warehouse,
  ShoppingCart,
  Factory,
  Wheat,
  Bird,
  Egg,
  Beef,
  Syringe,
  Users,
  Zap,
  Wallet,
  ChartNoAxesCombined,
  FileBarChart,
  ContactRound,
  Settings,
  ArrowLeftRight,
  Layers3,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const navigation: NavigationGroup[] = [
  // ==============================
  // ASOSIY
  // ==============================
  {
    id: "main",
    label: "Asosiy",
    icon: LayoutDashboard,
    items: [
      {
        title: "Boshqaruv paneli",
        path: "/",
        icon: LayoutDashboard,
      },
    ],
  },

  // ==============================
  // OMBOR VA ISHLAB CHIQARISH
  // ==============================
  {
    id: "warehouse-production",
    label: "Ombor va ishlab chiqarish",
    icon: Warehouse,
    items: [
      {
        title: "Asosiy ombor",
        path: "/warehouse",
        icon: Warehouse,
      },
      {
        title: "Xaridlar",
        path: "/purchases",
        icon: ShoppingCart,
      },
      {
        title: "Yem ishlab chiqarish",
        path: "/feed-production",
        icon: Factory,
      },
      {
        title: "Yem zaxiralari",
        path: "/feed-inventory",
        icon: Wheat,
      },
      {
        title: "Ombor harakatlari",
        path: "/inventory-transfers",
        icon: ArrowLeftRight,
      },
    ],
  },

  // ==============================
  // PARRANDACHILIK
  // ==============================
  {
    id: "poultry",
    label: "Parrandachilik",
    icon: Bird,
    items: [
      {
        title: "Parrandalar",
        path: "/chickens",
        icon: Bird,
      },
      {
        title: "Tuxum ishlab chiqarish",
        path: "/eggs",
        icon: Egg,
      },
      {
        title: "Go'sht yetishtirish",
        path: "/meat",
        icon: Beef,
      },
      {
        title: "Veterinariya",
        path: "/veterinary",
        icon: Syringe,
      },
    ],
  },

  // ==============================
  // MOLIYA VA BOSHQARUV
  // ==============================
  {
    id: "finance",
    label: "Moliya va boshqaruv",
    icon: Wallet,
    items: [
      {
        title: "Savdo",
        path: "/sales",
        icon: ShoppingCart,
      },
      {
        title: "Xodimlar",
        path: "/employees",
        icon: Users,
      },
      {
        title: "Kommunal xarajatlar",
        path: "/utilities",
        icon: Zap,
      },
      {
        title: "Moliya",
        path: "/finance",
        icon: Wallet,
      },
      {
        title: "Foyda va zarar",
        path: "/profit-loss",
        icon: ChartNoAxesCombined,
      },
      {
        title: "Hisobotlar",
        path: "/reports",
        icon: FileBarChart,
      },
      {
        title: "Hamkorlar",
        path: "/partners",
        icon: ContactRound,
      },
    ],
  },

  // ==============================
  // TIZIM
  // ==============================
  {
    id: "system",
    label: "Tizim",
    icon: Layers3,
    items: [
      {
        title: "Sozlamalar",
        path: "/settings",
        icon: Settings,
      },
    ],
  },
];
