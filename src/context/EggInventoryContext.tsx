
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useEggProduction,
} from "./EggProductionContext";

export type EggCategory =
  | "category1"
  | "category2"
  | "category3"
  | "category4";

export const EGG_CATEGORIES: {
  key: EggCategory;
  label: string;
}[] = [
  { key: "category1", label: "Mayda" },
  { key: "category2", label: "2-kategoriya" },
  { key: "category3", label: "1-kategoriya" },
  { key: "category4", label: "Egizak" },
];

export type EggCounts = Record<EggCategory, number>;

export interface EggSaleLine {
  category: EggCategory;
  quantity: number;
  unitPrice: number;
}

export interface EggSale {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: EggSaleLine[];
  note: string;
  totalAmount: number;
  createdAt: string;
}

export interface CreateEggSale {
  date: string;
  customerId: string;
  customerName: string;
  lines: EggSaleLine[];
  note: string;
}

export interface EggInventorySummary {
  produced: EggCounts;
  sold: EggCounts;
  remaining: EggCounts;
  brokenCount: number;
  producedTotal: number;
  soldTotal: number;
  remainingTotal: number;
  revenue: number;
}

interface EggInventoryContextValue {
  sales: EggSale[];
  inventory: EggInventorySummary;
  getInventoryAsOf: (
    date: string
  ) => EggInventorySummary;
  addSale: (sale: CreateEggSale) => EggSale;
}

const STORAGE_KEY = "poultry-erp-egg-sales-v1";

const EggInventoryContext =
  createContext<EggInventoryContextValue | null>(
    null
  );

const EMPTY: EggCounts = {
  category1: 0,
  category2: 0,
  category3: 0,
  category4: 0,
};

function emptyCounts(): EggCounts {
  return { ...EMPTY };
}

function localToday() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function isCategory(
  value: unknown
): value is EggCategory {
  return EGG_CATEGORIES.some(
    (item) => item.key === value
  );
}

function isValidLine(
  value: unknown
): value is EggSaleLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const line = value as Partial<EggSaleLine>;

  return (
    isCategory(line.category) &&
    Number.isSafeInteger(line.quantity) &&
    Number(line.quantity) > 0 &&
    typeof line.unitPrice === "number" &&
    Number.isFinite(line.unitPrice) &&
    line.unitPrice >= 0
  );
}

function isValidSale(
  value: unknown
): value is EggSale {
  if (!value || typeof value !== "object") {
    return false;
  }

  const sale = value as Partial<EggSale>;

  if (
    typeof sale.id !== "string" ||
    typeof sale.date !== "string" ||
    !isValidDate(sale.date) ||
    typeof sale.customerId !== "string" ||
    typeof sale.customerName !== "string" ||
    typeof sale.note !== "string" ||
    typeof sale.createdAt !== "string" ||
    !Array.isArray(sale.lines) ||
    sale.lines.length === 0 ||
    !sale.lines.every(isValidLine) ||
    typeof sale.totalAmount !== "number"
  ) {
    return false;
  }

  const categories = sale.lines.map(
    (line) => line.category
  );

  return (
    new Set(categories).size === categories.length &&
    Number.isFinite(sale.totalAmount) &&
    sale.totalAmount >= 0
  );
}

function readSales(): EggSale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(isValidSale)
      : [];
  } catch (error) {
    console.error(
      "Tuxum savdosi tarixini o'qishda xato:",
      error
    );
    return [];
  }
}

function writeSales(sales: EggSale[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sales)
    );
  } catch {
    throw new Error(
      "Savdo yozuvini brauzer xotirasiga saqlab bo'lmadi."
    );
  }
}

export function EggInventoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { records } = useEggProduction();

  const [sales, setSales] =
    useState<EggSale[]>(readSales);

  function getInventoryAsOf(
    endDate: string
  ): EggInventorySummary {
    const produced = emptyCounts();
    const sold = emptyCounts();

    let brokenCount = 0;
    let revenue = 0;

    for (const record of records) {
      if (record.date > endDate) continue;

      produced.category1 += record.category1;
      produced.category2 += record.category2;
      produced.category3 += record.category3;
      produced.category4 += record.category4;
      brokenCount += record.brokenCount;
    }

    for (const sale of sales) {
      if (sale.date > endDate) continue;

      revenue += sale.totalAmount;

      for (const line of sale.lines) {
        sold[line.category] += line.quantity;
      }
    }

    const remaining = emptyCounts();

    for (const category of EGG_CATEGORIES) {
      remaining[category.key] =
        produced[category.key] -
        sold[category.key];
    }

    const sum = (counts: EggCounts) =>
      EGG_CATEGORIES.reduce(
        (total, category) =>
          total + counts[category.key],
        0
      );

    return {
      produced,
      sold,
      remaining,
      brokenCount,
      producedTotal: sum(produced),
      soldTotal: sum(sold),
      remainingTotal: sum(remaining),
      revenue,
    };
  }

  const inventory = useMemo(
    () => getInventoryAsOf(localToday()),
    [records, sales]
  );

  function addSale(input: CreateEggSale) {
    // For the current frontend phase, sales are
    // recorded on today's date only. This avoids
    // creating inconsistent backdated inventory.
    if (
      !isValidDate(input.date) ||
      input.date !== localToday()
    ) {
      throw new Error(
        "Hozircha savdoni faqat bugungi sanaga kiriting."
      );
    }

    if (
      !input.customerId.trim() ||
      !input.customerName.trim()
    ) {
      throw new Error(
        "Xaridorni tanlang."
      );
    }

    if (
      input.lines.length === 0 ||
      !input.lines.every(isValidLine)
    ) {
      throw new Error(
        "Kamida bitta kategoriya uchun to'g'ri miqdor va narx kiriting."
      );
    }

    const categories = input.lines.map(
      (line) => line.category
    );

    if (
      new Set(categories).size !== categories.length
    ) {
      throw new Error(
        "Bitta kategoriya ikki marta kiritilgan."
      );
    }

    // Re-read the latest persisted sales to reduce
    // accidental stale-state writes between tabs.
    const storedSales = readSales();

    const produced = emptyCounts();
    const sold = emptyCounts();

    for (const record of records) {
      if (record.date <= input.date) {
        for (const category of EGG_CATEGORIES) {
          produced[category.key] +=
            record[category.key];
        }
      }
    }

    for (const sale of storedSales) {
      if (sale.date <= input.date) {
        for (const line of sale.lines) {
          sold[line.category] += line.quantity;
        }
      }
    }

    for (const line of input.lines) {
      const available =
        produced[line.category] -
        sold[line.category];

      if (line.quantity > available) {
        const name =
          EGG_CATEGORIES.find(
            (category) =>
              category.key === line.category
          )?.label ?? line.category;

        throw new Error(
          `${name} zaxirasida ${available} ta bor. ` +
          `${line.quantity} ta sotib bo'lmaydi.`
        );
      }
    }

    const totalAmount = input.lines.reduce(
      (total, line) =>
        total + line.quantity * line.unitPrice,
      0
    );

    if (!Number.isFinite(totalAmount)) {
      throw new Error(
        "Savdo summasi noto'g'ri."
      );
    }

    const now = new Date().toISOString();

    const sale: EggSale = {
      id: crypto.randomUUID(),
      date: input.date,
      customerId: input.customerId,
      customerName: input.customerName,
      lines: input.lines.map((line) => ({
        ...line,
      })),
      note: input.note.trim(),
      totalAmount,
      createdAt: now,
    };

    const next = [...storedSales, sale];

    writeSales(next);
    setSales(next);
    return sale;
  }

  return (
    <EggInventoryContext.Provider
      value={{
        sales,
        inventory,
        getInventoryAsOf,
        addSale,
      }}
    >
      {children}
    </EggInventoryContext.Provider>
  );
}

export function useEggInventory() {
  const context = useContext(
    EggInventoryContext
  );

  if (!context) {
    throw new Error(
      "EggInventoryProvider ulanmagan."
    );
  }

  return context;
}
