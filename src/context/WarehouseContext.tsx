
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  warehouseMaterials,
  purchases as demoPurchases,
  productions as demoProductions,
  transfers as demoTransfers,
} from "../data/warehouseData";

import type {
  Purchase,
  FeedProduction,
  FeedTransfer,
  Material,
} from "../types/warehouse";

export interface OpeningFeed {
  id: string;
  date: string;
  feedType: string;
  recipeName: string;
  quantity: number;
  unitCost: number;
}

export interface FeedLot {
  id: string;
  date: string;
  feedType: string;
  recipeName: string;
  quantity: number;
  remaining: number;
  unitCost: number;
}

export interface FeedGroup {
  key: string;
  feedType: string;
  recipeName: string;
  produced: number;
  remaining: number;
  lots: number;
  value: number;
}

interface StoredWarehouse {
  purchases: Purchase[];
  productions: FeedProduction[];
  transfers: FeedTransfer[];
  openingFeeds: OpeningFeed[];
}

interface WarehouseContextValue extends StoredWarehouse {
  materials: Material[];
  feedLots: FeedLot[];
  feedGroups: FeedGroup[];
  addPurchase: (item: Purchase) => void;
  addProduction: (item: FeedProduction) => void;
  addOpeningFeed: (item: OpeningFeed) => void;
  addTransfer: (
    feedKey: string,
    date: string,
    destination: string,
    quantity: number
  ) => void;
  getMaterialsAsOf: (date: string) => Material[];
  getFeedGroupsAsOf: (date: string) => FeedGroup[];
}

const WarehouseContext =
  createContext<WarehouseContextValue | null>(null);

const STORAGE_KEY = "poultry-erp-warehouse-v2";

const initialState: StoredWarehouse = {
  purchases: demoPurchases,
  productions: demoProductions,
  transfers: demoTransfers,
  openingFeeds: [],
};

const dayOf = (value: string) => value.slice(0, 10);

export const feedKey = (
  feedType: string,
  recipeName: string
) => JSON.stringify([feedType, recipeName]);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

export const formatMoney = (value: number) =>
  `${formatNumber(value)} so'm`;

function readState(): StoredWarehouse {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;

    const parsed = JSON.parse(saved) as StoredWarehouse;

    if (
      !Array.isArray(parsed.purchases) ||
      !Array.isArray(parsed.productions) ||
      !Array.isArray(parsed.transfers) ||
      !Array.isArray(parsed.openingFeeds)
    ) {
      return initialState;
    }

    return parsed;
  } catch {
    return initialState;
  }
}

function buildMaterialBalances(
  state: StoredWarehouse,
  endDate: string
): Material[] {
  return warehouseMaterials.map((material) => {
    const incoming = state.purchases
      .filter(
        (p) =>
          p.materialId === material.id &&
          p.status === "received" &&
          dayOf(p.date) <= endDate
      )
      .reduce((sum, p) => sum + p.quantity, 0);

    const outgoing = state.productions
      .filter(
        (p) =>
          p.status === "completed" &&
          dayOf(p.date) <= endDate
      )
      .flatMap((p) => p.ingredients)
      .filter((i) => i.materialId === material.id)
      .reduce((sum, i) => sum + i.quantity, 0);

    return {
      ...material,
      quantity: material.quantity + incoming - outgoing,
    };
  });
}

function buildFeedLots(
  state: StoredWarehouse,
  endDate: string
): FeedLot[] {
  const productionLots: FeedLot[] = state.productions
        .filter(
          (p) =>
            p.status === "completed" &&
            dayOf(p.date) <= endDate
        )
        .map((p) => {
          const ingredientCost = p.ingredients.reduce(
            (sum, ingredient) => {
              const material = warehouseMaterials.find(
                (m) => m.id === ingredient.materialId
              );

              return (
                sum +
                ingredient.quantity * (material?.unitCost ?? 0)
              );
            },
            0
          );

          return {
            id: p.id,
            date: p.date,
            feedType: p.feedType,
            recipeName: p.recipeName,
            quantity: p.quantity,
            remaining: p.quantity,
            unitCost: ingredientCost / p.quantity,
          };
        });

  const openingLots: FeedLot[] = state.openingFeeds
    .filter((p) => dayOf(p.date) <= endDate)
    .map((p) => ({
      ...p,
      remaining: p.quantity,
    }));

  const lots = [...productionLots, ...openingLots]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.id.localeCompare(b.id)
    );

  // Deduct transfers against their referenced lots.
  // Each saved transfer refers to a specific production or opening lot.
  for (const transfer of state.transfers) {
    if (
      transfer.status === "draft" ||
      dayOf(transfer.date) > endDate
    ) {
      continue;
    }

    const lot = lots.find(
      (item) => item.id === transfer.productionId
    );

    if (lot) {
      lot.remaining -= transfer.quantity;
    }
  }

  return lots;
}

function buildFeedGroups(lots: FeedLot[]): FeedGroup[] {
  const groups = new Map<string, FeedGroup>();

  for (const lot of lots) {
    const key = feedKey(lot.feedType, lot.recipeName);

    const current = groups.get(key) ?? {
      key,
      feedType: lot.feedType,
      recipeName: lot.recipeName,
      produced: 0,
      remaining: 0,
      lots: 0,
      value: 0,
    };

    current.produced += lot.quantity;
    current.remaining += lot.remaining;
    current.lots += 1;
    current.value += lot.remaining * lot.unitCost;

    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.feedType.localeCompare(b.feedType)
  );
}

export function WarehouseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] =
    useState<StoredWarehouse>(readState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<WarehouseContextValue>(() => {
    const today = new Date();
    const currentDay = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const materials = buildMaterialBalances(
      state,
      currentDay
    );

    const feedLots = buildFeedLots(state, currentDay);

    const feedGroups = buildFeedGroups(feedLots);

    return {
      ...state,
      materials,
      feedLots,
      feedGroups,

      getMaterialsAsOf: (date) =>
        buildMaterialBalances(state, date),

      getFeedGroupsAsOf: (date) =>
        buildFeedGroups(buildFeedLots(state, date)),

      addPurchase: (item) => {
        if (
          item.quantity <= 0 ||
          item.unitPrice < 0 ||
          !warehouseMaterials.some(
            (m) => m.id === item.materialId
          )
        ) {
          throw new Error("Xarid ma'lumotlari noto'g'ri.");
        }

        setState((previous) => ({
          ...previous,
          purchases: [...previous.purchases, item],
        }));
      },

      addProduction: (item) => {
        const totals = item.ingredients.reduce(
          (sum, ingredient) => sum + ingredient.quantity,
          0
        );

        if (
          item.quantity <= 0 ||
          item.ingredients.length === 0 ||
          item.ingredients.some((i) => i.quantity < 0) ||
          Math.abs(totals - item.quantity) > 0.01
        ) {
          throw new Error(
            "Ingredientlar jami tayyor yem miqdoriga teng bo'lishi kerak."
          );
        }

        const balances = buildMaterialBalances(
          state,
          dayOf(item.date)
        );

        for (const ingredient of item.ingredients) {
          const stock = balances.find(
            (m) => m.id === ingredient.materialId
          );

          if (!stock || stock.quantity - stock.reserved < ingredient.quantity) {
            throw new Error(
              `${stock?.name ?? ingredient.materialId} zaxirasi yetarli emas.`
            );
          }
        }

        setState((previous) => ({
          ...previous,
          productions: [...previous.productions, item],
        }));
      },

      addOpeningFeed: (item) => {
        if (
          item.quantity <= 0 ||
          item.unitCost < 0 ||
          !item.feedType.trim() ||
          !item.recipeName.trim()
        ) {
          throw new Error("Yem ma'lumotlari noto'g'ri.");
        }

        setState((previous) => ({
          ...previous,
          openingFeeds: [...previous.openingFeeds, item],
        }));
      },

      addTransfer: (key, date, destination, quantity) => {
        if (!destination.trim() || quantity <= 0) {
          throw new Error("Transfer ma'lumotlari noto'g'ri.");
        }

        const lots = buildFeedLots(state, dayOf(date))
          .filter(
            (lot) =>
              feedKey(lot.feedType, lot.recipeName) === key &&
              lot.remaining > 0
          )
          .sort((a, b) => a.date.localeCompare(b.date));

        const total = lots.reduce(
          (sum, lot) => sum + lot.remaining,
          0
        );

        if (quantity > total + 0.00001) {
          throw new Error(
            "Tanlangan yem zaxirasida yetarli miqdor yo'q."
          );
        }

        let needed = quantity;
        const allocations: FeedTransfer[] = [];

        for (const lot of lots) {
          if (needed <= 0.00001) break;

          const take = Math.min(lot.remaining, needed);

          allocations.push({
            id: crypto.randomUUID(),
            date,
            productionId: lot.id,
            from: "Yem ombori",
            to: destination,
            quantity: take,
            status: "sent",
          });

          needed -= take;
        }

        setState((previous) => ({
          ...previous,
          transfers: [...previous.transfers, ...allocations],
        }));
      },
    };
  }, [state]);

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouse() {
  const context = useContext(WarehouseContext);

  if (!context) {
    throw new Error(
      "useWarehouse must be used inside WarehouseProvider"
    );
  }

  return context;
}
