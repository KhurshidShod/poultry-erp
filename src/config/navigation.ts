import type { LucideIcon } from 'lucide-react';

import {
  ArrowLeftRight,
  Beef,
  Bird,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ClipboardList,
  ContactRound,
  Egg,
  Factory,
  FileBarChart,
  Layers3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Syringe,
  Users,
  Wallet,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
} from 'lucide-react';

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
  // ========================================
  // ASOSIY
  // ========================================
  {
    id: 'main',
    label: 'Asosiy',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Boshqaruv paneli',
        path: '/',
        icon: LayoutDashboard,
      },
    ],
  },

  // ========================================
  // OMBOR VA ISHLAB CHIQARISH
  // ========================================
  {
    id: 'warehouse-production',
    label: 'Ombor va ishlab chiqarish',
    icon: Warehouse,
    items: [
      {
        title: 'Asosiy ombor',
        path: '/warehouse',
        icon: Warehouse,
      },
      {
        title: 'Xaridlar',
        path: '/purchases',
        icon: ShoppingCart,
      },
      {
        title: 'Yem ishlab chiqarish',
        path: '/feed-production',
        icon: Factory,
      },
      {
        title: 'Yem zaxiralari',
        path: '/feed-inventory',
        icon: Wheat,
      },
      {
        title: 'Ombor harakatlari',
        path: '/inventory-transfers',
        icon: ArrowLeftRight,
      },
      {
        title: 'Fermalar yem zaxirasi',
        path: '/farm-feed-inventory',
        icon: Building2,
      },
    ],
  },

  // ========================================
  // PARRANDACHILIK
  // ========================================
  {
    id: 'poultry',
    label: 'Parrandachilik',
    icon: Bird,
    items: [
      {
        title: 'Parranda partiyalari',
        path: '/chicken-batches',
        icon: Layers3,
      },
      {
        title: 'Veterinariya',
        path: '/veterinary',
        icon: Syringe,
      },
      {
        title: 'Tuxum ishlab chiqarish',
        path: '/eggs',
        icon: ChartNoAxesCombined,
      },
      {
        title: "110 kunlik jo'jaxona",
        path: '/egg-chick-house',
        icon: Bird,
      },
      {
        title: 'Tuxum fermasi №1',
        path: '/egg-farm-1',
        icon: Egg,
      },
      {
        title: 'Tuxum fermasi №2',
        path: '/egg-farm-2',
        icon: Egg,
      },
      {
        title: "Go'sht jo'jaxonasi",
        path: '/meat',
        icon: Beef,
      },

      // Veterinariya moduli tayyor bo'lgach
      // qayta qo'shamiz:
      //
      // {
      //   title: "Veterinariya",
      //   path: "/veterinary",
      //   icon: Syringe,
      // },
    ],
  },

  // ========================================
  // MOLIYA VA BOSHQARUV
  // ========================================
  {
    id: 'finance',
    label: 'Moliya va boshqaruv',
    icon: Wallet,
    items: [
      {
        title: 'Savdo',
        path: '/sales',
        icon: ShoppingCart,
      },
      {
        title: 'Moliya',
        path: '/finance',
        icon: Wallet,
      },
      {
        title: 'Xodimlar',
        path: '/employees',
        icon: Users,
      },
      {
        title: 'Kommunal xarajatlar',
        path: '/utilities',
        icon: Zap,
      },
      {
        title: 'Texnika xarajatlari',
        path: '/equipment-expenses',
        icon: Wrench,
      },
      {
        title: 'Foyda va zarar',
        path: '/profit-loss',
        icon: ChartNoAxesCombined,
      },
      {
        title: 'Hisobotlar',
        path: '/reports',
        icon: FileBarChart,
      },
    ],
  },

  // ========================================
  // MA'LUMOTLAR BOSHQARUVI
  // ========================================
  {
    id: 'master-data',
    label: "Ma'lumotlar boshqaruvi",
    icon: Boxes,
    items: [
      {
        title: 'Mahsulotlar',
        path: '/products',
        icon: Package,
      },
      {
        title: 'Hamkorlar',
        path: '/partners',
        icon: ContactRound,
      },
      {
        title: 'Yem turlari',
        path: '/feed-types',
        icon: Wheat,
      },
      {
        title: 'Retseptlar',
        path: '/recipes',
        icon: ClipboardList,
      },
      {
        title: "Omborlar va bo'limlar",
        path: '/locations',
        icon: Building2,
      },
    ],
  },

  // ========================================
  // TIZIM
  // ========================================
  {
    id: 'system',
    label: 'Tizim',
    icon: Layers3,
    items: [
      {
        title: 'Sozlamalar',
        path: '/settings',
        icon: Settings,
      },
    ],
  },
];
