
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { usePoultry } from "./PoultryContext";

const STORAGE_KEY = "poultry-erp-meat-sales-v1";
const EPSILON = 0.000001;

export interface MeatSale {
  id: string;
  date: string;
  batchId: string;
  batchCode: string;
  customerId: string;
  customerName: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  note: string;
  createdAt: string;
}

export interface CreateMeatSale {
  date: string;
  batchId: string;
  customerId: string;
  customerName: string;
  quantityKg: number;
  unitPrice: number;
  note: string;
}

export interface MeatStock {
  batchId: string;
  batchCode: string;
  slaughteredKg: number;
  soldKg: number;
  remainingKg: number;
}

export interface MeatInventory {
  stocks: MeatStock[];
  slaughteredKg: number;
  soldKg: number;
  remainingKg: number;
  revenue: number;
}

interface MeatSalesContextValue {
  sales: MeatSale[];
  inventory: MeatInventory;
  getStock: (batchId: string) => MeatStock | undefined;
  addSale: (input: CreateMeatSale) => MeatSale;
}

const MeatSalesContext =
  createContext<MeatSalesContextValue | null>(null);

function today(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSale(value: unknown): value is MeatSale {
  if (!value || typeof value !== "object") return false;

  const sale = value as Partial<MeatSale>;

  return (
    typeof sale.id === "string" &&
    typeof sale.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(sale.date) &&
    typeof sale.batchId === "string" &&
    typeof sale.batchCode === "string" &&
    typeof sale.customerId === "string" &&
    typeof sale.customerName === "string" &&
    typeof sale.quantityKg === "number" &&
    Number.isFinite(sale.quantityKg) &&
    sale.quantityKg > 0 &&
    typeof sale.unitPrice === "number" &&
    Number.isFinite(sale.unitPrice) &&
    sale.unitPrice >= 0 &&
    typeof sale.totalAmount === "number" &&
    Number.isFinite(sale.totalAmount) &&
    sale.totalAmount >= 0 &&
    typeof sale.note === "string" &&
    typeof sale.createdAt === "string"
  );
}

function readSales(): MeatSale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(isSale)
      : [];
  } catch {
    return [];
  }
}

function saveSales(sales: MeatSale[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sales)
    );
  } catch {
    throw new Error(
      "Go'sht savdosini brauzer xotirasiga saqlab bo'lmadi."
    );
  }
}

export function MeatSalesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    batches,
    events,
    getMeatKg,
  } = usePoultry();

  const [sales, setSales] =
    useState<MeatSale[]>(readSales);

  const meatBatches = batches.filter(
    (batch) => batch.direction === "meat"
  );

  const inventory = useMemo<MeatInventory>(() => {
    const stocks = meatBatches.map((batch) => {
      const slaughteredKg = getMeatKg(batch.id);

      const soldKg = sales
        .filter((sale) => sale.batchId === batch.id)
        .reduce(
          (sum, sale) => sum + sale.quantityKg,
          0
        );

      return {
        batchId: batch.id,
        batchCode: batch.code,
        slaughteredKg,
        soldKg,
        remainingKg: slaughteredKg - soldKg,
      };
    });

    const total = (
      key: "slaughteredKg" | "soldKg" | "remainingKg"
    ) =>
      stocks.reduce(
        (sum, stock) => sum + stock[key],
        0
      );

    return {
      stocks,
      slaughteredKg: total("slaughteredKg"),
      soldKg: total("soldKg"),
      remainingKg: total("remainingKg"),
      revenue: sales.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0
      ),
    };
  }, [meatBatches, events, sales, getMeatKg]);

  function getStock(batchId: string) {
    return inventory.stocks.find(
      (stock) => stock.batchId === batchId
    );
  }

  function addSale(input: CreateMeatSale) {
    const currentDay = today();

    if (input.date !== currentDay) {
      throw new Error(
        "Hozircha savdo faqat bugungi sana bilan saqlanadi."
      );
    }

    const batch = meatBatches.find(
      (item) => item.id === input.batchId
    );

    if (!batch) {
      throw new Error(
        "Go'sht yo'nalishidagi BR partiyani tanlang."
      );
    }

    if (
      !input.customerId.trim() ||
      !input.customerName.trim()
    ) {
      throw new Error("Xaridorni tanlang.");
    }

    if (
      !Number.isFinite(input.quantityKg) ||
      input.quantityKg <= 0
    ) {
      throw new Error(
        "Go'sht miqdorini to'g'ri kiriting."
      );
    }

    if (
      !Number.isFinite(input.unitPrice) ||
      input.unitPrice < 0
    ) {
      throw new Error(
        "Bir kilogramm narxini to'g'ri kiriting."
      );
    }

    // Use the latest persisted sales when validating.
    const storedSales = readSales();

    // Only meat actually slaughtered by today is sellable.
    const slaughteredKg = events
      .filter(
        (event) =>
          event.batchId === batch.id &&
          event.type === "slaughter" &&
          event.date.slice(0, 10) <= currentDay
      )
      .reduce(
        (sum, event) => sum + (event.meatKg ?? 0),
        0
      );

    const soldKg = storedSales
      .filter(
        (sale) => sale.batchId === batch.id
      )
      .reduce(
        (sum, sale) => sum + sale.quantityKg,
        0
      );

    const availableKg = slaughteredKg - soldKg;

    if (input.quantityKg > availableKg + EPSILON) {
      throw new Error(
        `${batch.code} partiyasida ${availableKg.toFixed(2)} kg ` +
        "go'sht mavjud. Bundan ko'p sotib bo'lmaydi."
      );
    }

    const totalAmount =
      input.quantityKg * input.unitPrice;

    if (!Number.isFinite(totalAmount)) {
      throw new Error("Savdo summasi noto'g'ri.");
    }

    const sale: MeatSale = {
      id: crypto.randomUUID(),
      date: currentDay,
      batchId: batch.id,
      batchCode: batch.code,
      customerId: input.customerId,
      customerName: input.customerName,
      quantityKg: input.quantityKg,
      unitPrice: input.unitPrice,
      totalAmount,
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [...storedSales, sale];

    saveSales(next);
    setSales(next);
    return sale;
  }

  return (
    <MeatSalesContext.Provider
      value={{
        sales,
        inventory,
        getStock,
        addSale,
      }}
    >
      {children}
    </MeatSalesContext.Provider>
  );
}

export function useMeatSales() {
  const context = useContext(MeatSalesContext);

  if (!context) {
    throw new Error(
      "MeatSalesProvider ulanmagan."
    );
  }

  return context;
}
