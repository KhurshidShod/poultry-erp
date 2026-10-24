
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  purchases as demoPurchases,
  productions as demoProductions,
  transfers as demoTransfers,
} from "../data/warehouseData";

import type {
  Purchase,
  PurchasePayment,
  FeedProduction,
  FeedTransfer,
  Material,
} from "../types/warehouse";

import {
  useMasterData,
  type Product,
} from "./MasterDataContext";

/* ==========================================
   TYPES
========================================== */

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
  purchasePayments: PurchasePayment[];
}

interface WarehouseContextValue extends StoredWarehouse {
  materials: Material[];
  feedLots: FeedLot[];
  feedGroups: FeedGroup[];

  addPurchase: (item: Purchase) => void;
  addPurchasePayment: (payment: PurchasePayment) => void;
  getPurchasePaid: (purchaseId: string) => number;
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

/* ==========================================
   CONTEXT
========================================== */

const WarehouseContext =
  createContext<WarehouseContextValue | null>(null);

const STORAGE_KEY = "poultry-erp-warehouse-v2";

const EPSILON = 0.00001;

/* ==========================================
   INITIAL DATA
========================================== */

const initialState: StoredWarehouse = {
  purchases: demoPurchases,
  productions: demoProductions,
  transfers: demoTransfers,
  openingFeeds: [],
  purchasePayments: [],
};

/* ==========================================
   HELPERS
========================================== */

const dayOf = (value: string) => value.slice(0, 10);

function todayString() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function validPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function validNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function validDate(value: string) {
  const date = dayOf(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

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

/* ==========================================
   LOCAL STORAGE
   Only warehouse transactions are stored here.
   Products and partners remain in MasterDataContext.
========================================== */

function readState(): StoredWarehouse {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return initialState;
    }

    const parsed = JSON.parse(saved) as StoredWarehouse;

    if (
      !Array.isArray(parsed.purchases) ||
      !Array.isArray(parsed.productions) ||
      !Array.isArray(parsed.transfers) ||
      !Array.isArray(parsed.openingFeeds)
    ) {
      return initialState;
    }

    return {
      ...parsed,
      purchasePayments: Array.isArray(parsed.purchasePayments)
        ? parsed.purchasePayments
        : [],
    };
  } catch {
    return initialState;
  }
}

/* ==========================================
   MATERIAL BALANCES

   Opening quantity
   + Purchased quantity
   - Used in completed feed production

   Products are loaded dynamically from
   MasterDataContext.
========================================== */

function buildMaterialBalances(
  state: StoredWarehouse,
  endDate: string,
  catalog: Product[]
): Material[] {
  return catalog.map((material) => {
    const incoming = state.purchases
      .filter(
        (purchase) =>
          purchase.materialId === material.id &&
          purchase.status === "received" &&
          dayOf(purchase.date) <= endDate
      )
      .reduce(
        (sum, purchase) => sum + purchase.quantity,
        0
      );

    const outgoing = state.productions
      .filter(
        (production) =>
          production.status === "completed" &&
          dayOf(production.date) <= endDate
      )
      .flatMap((production) => production.ingredients)
      .filter(
        (ingredient) =>
          ingredient.materialId === material.id
      )
      .reduce(
        (sum, ingredient) => sum + ingredient.quantity,
        0
      );

    return {
      ...material,
      quantity:
        material.quantity + incoming - outgoing,
    };
  });
}

/* ==========================================
   FEED LOTS

   Every completed production becomes a feed lot.
   Opening feed is also included.

   Transfers reduce remaining quantity of the
   lot they were allocated from.
========================================== */

function buildFeedLots(
  state: StoredWarehouse,
  endDate: string,
  catalog: Product[]
): FeedLot[] {
  const productionLots: FeedLot[] = state.productions
    .filter(
      (production) =>
        production.status === "completed" &&
        dayOf(production.date) <= endDate
    )
    .map((production) => {
      const ingredientCost =
        production.ingredients.reduce(
          (sum, ingredient) => {
            const material = catalog.find(
              (item) =>
                item.id === ingredient.materialId
            );

            return (
              sum +
              ingredient.quantity *
                (material?.unitCost ?? 0)
            );
          },
          0
        );

      const unitCost =
        production.quantity > 0
          ? ingredientCost / production.quantity
          : 0;

      return {
        id: production.id,
        date: production.date,
        feedType: production.feedType,
        recipeName: production.recipeName,
        quantity: production.quantity,
        remaining: production.quantity,
        unitCost,
      };
    });

  const openingLots: FeedLot[] = state.openingFeeds
    .filter(
      (opening) => dayOf(opening.date) <= endDate
    )
    .map((opening) => ({
      ...opening,
      remaining: opening.quantity,
    }));

  const lots: FeedLot[] = [
    ...productionLots,
    ...openingLots,
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.id.localeCompare(b.id)
  );

  /* Deduct transferred quantities */

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

    if (!lot) continue;

    lot.remaining -= transfer.quantity;
  }

  return lots;
}

/* ==========================================
   FEED GROUPS

   Same feed type + same recipe
   are grouped together.
========================================== */

function buildFeedGroups(
  lots: FeedLot[]
): FeedGroup[] {
  const groups = new Map<string, FeedGroup>();

  for (const lot of lots) {
    const key = feedKey(
      lot.feedType,
      lot.recipeName
    );

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
    current.value +=
      lot.remaining * lot.unitCost;

    groups.set(key, current);
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      a.feedType.localeCompare(b.feedType) ||
      a.recipeName.localeCompare(b.recipeName)
  );
}

/* ==========================================
   WAREHOUSE PROVIDER
========================================== */

export function WarehouseProvider({
  children,
}: {
  children: ReactNode;
}) {
  /* Master data */

  const { products } = useMasterData();

  /* Warehouse transactions */

  const [state, setState] =
    useState<StoredWarehouse>(readState);

  /* Persist warehouse transactions */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error(
        "Ombor ma'lumotlarini saqlashda xatolik:",
        error
      );
    }
  }, [state]);

  /* ==========================================
     CONTEXT VALUE
  ========================================== */

  const value = useMemo<WarehouseContextValue>(() => {
    const currentDay = todayString();

    /* Current material inventory */

    const materials = buildMaterialBalances(
      state,
      currentDay,
      products
    );

    /* Current feed lots */

    const feedLots = buildFeedLots(
      state,
      currentDay,
      products
    );

    /* Grouped feed inventory */

    const feedGroups = buildFeedGroups(feedLots);

    return {
      ...state,

      materials,
      feedLots,
      feedGroups,

      /* =====================================
         HISTORICAL MATERIAL INVENTORY
      ===================================== */

      getMaterialsAsOf: (date) => {
        return buildMaterialBalances(
          state,
          dayOf(date),
          products
        );
      },

      /* =====================================
         HISTORICAL FEED INVENTORY
      ===================================== */

      getFeedGroupsAsOf: (date) => {
        const lots = buildFeedLots(
          state,
          dayOf(date),
          products
        );

        return buildFeedGroups(lots);
      },

      /* =====================================
         ADD PURCHASE
      ===================================== */

      addPurchase: (item) => {
        const product = products.find(
          (material) =>
            material.id === item.materialId
        );

        if (!product || !product.active) {
          throw new Error(
            "Tanlangan mahsulot mavjud emas yoki nofaol."
          );
        }

        if (
          !validPositive(item.quantity) ||
          !validNonNegative(item.unitPrice) ||
          !validDate(item.date) ||
          !item.supplier.trim() ||
          item.status !== "received"
        ) {
          throw new Error(
            "Xarid ma'lumotlarini to'g'ri kiriting."
          );
        }

        const purchaseTotal = item.quantity * item.unitPrice;
        if (
          !Number.isFinite(purchaseTotal) ||
          (item.paidAmount !== undefined &&
            (!Number.isFinite(item.paidAmount) ||
              item.paidAmount < 0 ||
              item.paidAmount > purchaseTotal + EPSILON)) ||
          ((item.paidAmount ?? 0) > 0 &&
            !["cash", "card", "bank"].includes(item.paymentMethod ?? ""))
        ) {
          throw new Error("To'langan summa yoki to'lov usuli noto'g'ri.");
        }

        if (
          state.purchases.some(
            (purchase) => purchase.id === item.id
          )
        ) {
          throw new Error(
            "Bu ID bilan xarid allaqachon mavjud."
          );
        }

        setState((previous) => ({
          ...previous,
          purchases: [
            ...previous.purchases,
            item,
          ],
        }));
      },

      /* =====================================
         PAY EXISTING PURCHASE DEBT
      ===================================== */

      getPurchasePaid: (purchaseId) => {
        const purchase = state.purchases.find((item) => item.id === purchaseId);
        if (!purchase) return 0;
        return (purchase.paidAmount ?? 0) + state.purchasePayments
          .filter((payment) => payment.purchaseId === purchaseId)
          .reduce((sum, payment) => sum + payment.amount, 0);
      },

      addPurchasePayment: (payment) => {
        const purchase = state.purchases.find((item) => item.id === payment.purchaseId);
        if (!purchase || purchase.status !== "received") {
          throw new Error("Xarid topilmadi yoki hali qabul qilinmagan.");
        }
        if (
          !validDate(payment.date) ||
          dayOf(payment.date) > todayString() ||
          !Number.isFinite(new Date(payment.date).getTime()) ||
          new Date(payment.date).getTime() > Date.now() ||
          dayOf(payment.date) < dayOf(purchase.date) ||
          !validPositive(payment.amount) ||
          !["cash", "card", "bank"].includes(payment.method) ||
          !payment.id ||
          !payment.createdAt ||
          state.purchasePayments.some((item) => item.id === payment.id)
        ) {
          throw new Error("To'lov ma'lumotlari noto'g'ri.");
        }
        const alreadyPaid = (purchase.paidAmount ?? 0) + state.purchasePayments
          .filter((item) => item.purchaseId === purchase.id)
          .reduce((sum, item) => sum + item.amount, 0);
        const due = purchase.quantity * purchase.unitPrice - alreadyPaid;
        if (payment.amount > due + EPSILON) {
          throw new Error("To'lov summasi qolgan qarzdan oshishi mumkin emas.");
        }
        setState((previous) => ({
          ...previous,
          purchasePayments: [...previous.purchasePayments, payment],
        }));
      },

      /* =====================================
         ADD FEED PRODUCTION
      ===================================== */

      addProduction: (item) => {
        if (
          !validPositive(item.quantity) ||
          !validDate(item.date) ||
          item.ingredients.length === 0
        ) {
          throw new Error(
            "Yem ishlab chiqarish ma'lumotlari noto'g'ri."
          );
        }

        if (
          state.productions.some(
            (production) => production.id === item.id
          )
        ) {
          throw new Error(
            "Bu ID bilan ishlab chiqarish mavjud."
          );
        }

        /* Calculate total ingredients */

        const totals = item.ingredients.reduce(
          (sum, ingredient) =>
            sum + ingredient.quantity,
          0
        );

        if (
          item.ingredients.some(
            (ingredient) =>
              !validPositive(ingredient.quantity)
          ) ||
          !Number.isFinite(totals) ||
          Math.abs(totals - item.quantity) > 0.01
        ) {
          throw new Error(
            "Ingredientlar jami tayyor yem miqdoriga teng bo'lishi kerak."
          );
        }

        /* Validate ingredient IDs and quantities */

        const required = new Map<string, number>();

        for (const ingredient of item.ingredients) {
          const material = products.find(
            (product) =>
              product.id === ingredient.materialId
          );

          if (!material || !material.active) {
            throw new Error(
              "Ingredient mavjud emas yoki nofaol."
            );
          }

          if (material.unit !== "kg") {
            throw new Error(
              `${material.name} kilogramm birligida emas.`
            );
          }

          required.set(
            ingredient.materialId,
            (required.get(ingredient.materialId) ?? 0) +
              ingredient.quantity
          );
        }

        /* Inventory as of production date */

        const balances = buildMaterialBalances(
          state,
          dayOf(item.date),
          products
        );

        for (const [materialId, quantity] of required) {
          const stock = balances.find(
            (material) => material.id === materialId
          );

          if (
            !stock ||
            stock.quantity - stock.reserved + EPSILON <
              quantity
          ) {
            throw new Error(
              `${
                stock?.name ?? materialId
              } zaxirasi yetarli emas.`
            );
          }
        }

        /* Save production */

        setState((previous) => ({
          ...previous,
          productions: [
            ...previous.productions,
            item,
          ],
        }));
      },

      /* =====================================
         ADD OPENING FEED
      ===================================== */

      addOpeningFeed: (item) => {
        if (
          !validPositive(item.quantity) ||
          !validNonNegative(item.unitCost) ||
          !validDate(item.date) ||
          !item.feedType.trim() ||
          !item.recipeName.trim()
        ) {
          throw new Error(
            "Yem ma'lumotlari noto'g'ri."
          );
        }

        if (
          state.openingFeeds.some(
            (feed) => feed.id === item.id
          ) ||
          state.productions.some(
            (production) => production.id === item.id
          )
        ) {
          throw new Error(
            "Bu ID bilan yem partiyasi mavjud."
          );
        }

        setState((previous) => ({
          ...previous,
          openingFeeds: [
            ...previous.openingFeeds,
            item,
          ],
        }));
      },

      /* =====================================
         TRANSFER FEED

         FIFO allocation:
         First available lot is used first.
      ===================================== */

      addTransfer: (
        key,
        date,
        destination,
        quantity
      ) => {
        if (
          !destination.trim() ||
          !validPositive(quantity) ||
          !validDate(date)
        ) {
          throw new Error(
            "Transfer ma'lumotlari noto'g'ri."
          );
        }

        const lots = buildFeedLots(
          state,
          dayOf(date),
          products
        )
          .filter(
            (lot) =>
              feedKey(
                lot.feedType,
                lot.recipeName
              ) === key &&
              lot.remaining > EPSILON
          )
          .sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              a.id.localeCompare(b.id)
          );

        const total = lots.reduce(
          (sum, lot) =>
            sum + lot.remaining,
          0
        );

        if (quantity > total + EPSILON) {
          throw new Error(
            "Tanlangan yem zaxirasida yetarli miqdor yo'q."
          );
        }

        let needed = quantity;

        const allocations: FeedTransfer[] = [];

        for (const lot of lots) {
          if (needed <= EPSILON) break;

          const take = Math.min(
            lot.remaining,
            needed
          );

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

        if (needed > EPSILON) {
          throw new Error(
            "Transfer uchun yem yetarli emas."
          );
        }

        setState((previous) => ({
          ...previous,
          transfers: [
            ...previous.transfers,
            ...allocations,
          ],
        }));
      },
    };
  }, [state, products]);

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

/* ==========================================
   CUSTOM HOOK
========================================== */

export function useWarehouse() {
  const context = useContext(WarehouseContext);

  if (!context) {
    throw new Error(
      "useWarehouse must be used inside WarehouseProvider"
    );
  }

  return context;
}
