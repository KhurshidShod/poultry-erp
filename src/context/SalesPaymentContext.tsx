import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useEggInventory } from './EggInventoryContext';
import { useMeatSales } from './MeatSalesContext';

export type SaleKind = 'eggs' | 'meat';
export type PaymentMethod = 'cash' | 'card' | 'bank';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface SalesPayment {
  id: string;
  saleKind: SaleKind;
  saleId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note: string;
  createdAt: string;
}

export interface CreateSalesPayment {
  saleKind: SaleKind;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface SalePaymentSummary {
  total: number;
  paid: number;
  debt: number;
  status: PaymentStatus;
}

interface SalesPaymentContextValue {
  payments: SalesPayment[];
  getSalePaymentSummary: (kind: SaleKind, saleId: string) => SalePaymentSummary;
  addPayment: (input: CreateSalesPayment) => void;
  totalPaid: number;
  totalDebt: number;
  addPayments: (inputs: CreateSalesPayment[], saleTotal?: number) => void;
}

const STORAGE_KEY = 'poultry-erp-sales-payments-v1';
const EPS = 0.000001;

const SalesPaymentContext = createContext<SalesPaymentContextValue | null>(
  null
);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Naqd',
  card: 'Karta',
  bank: "Bank o'tkazmasi",
};

function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function validPayment(value: unknown): value is SalesPayment {
  if (!value || typeof value !== 'object') return false;

  const p = value as Partial<SalesPayment>;

  return (
    typeof p.id === 'string' &&
    (p.saleKind === 'eggs' || p.saleKind === 'meat') &&
    typeof p.saleId === 'string' &&
    typeof p.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    typeof p.amount === 'number' &&
    Number.isFinite(p.amount) &&
    p.amount > 0 &&
    (p.method === 'cash' || p.method === 'card' || p.method === 'bank') &&
    typeof p.note === 'string' &&
    typeof p.createdAt === 'string'
  );
}

function readPayments(): SalesPayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(validPayment) : [];
  } catch {
    return [];
  }
}

function persistPayments(payments: SalesPayment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  } catch {
    throw new Error("To'lovni brauzer xotirasiga saqlab bo'lmadi.");
  }
}

export function SalesPaymentProvider({ children }: { children: ReactNode }) {
  const { sales: eggSales } = useEggInventory();
  const { sales: meatSales } = useMeatSales();

  const [payments, setPayments] = useState<SalesPayment[]>(readPayments);

  function findSale(kind: SaleKind, saleId: string) {
    return kind === 'eggs'
      ? eggSales.find((sale) => sale.id === saleId)
      : meatSales.find((sale) => sale.id === saleId);
  }

  function getSalePaymentSummary(
    kind: SaleKind,
    saleId: string
  ): SalePaymentSummary {
    const sale = findSale(kind, saleId);

    if (!sale) {
      return {
        total: 0,
        paid: 0,
        debt: 0,
        status: 'unpaid',
      };
    }

    const paid = payments
      .filter(
        (payment) => payment.saleKind === kind && payment.saleId === saleId
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    const total = sale.totalAmount;
    const debt = Math.max(0, total - paid);

    return {
      total,
      paid,
      debt,
      status: debt <= EPS ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    };
  }

  function addPayment(input: CreateSalesPayment) {
    const sale = findSale(input.saleKind, input.saleId);

    if (!sale) {
      throw new Error('Savdo yozuvi topilmadi.');
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("To'lov summasi 0 dan katta bo'lishi kerak.");
    }

    if (
      input.method !== 'cash' &&
      input.method !== 'card' &&
      input.method !== 'bank'
    ) {
      throw new Error("To'lov usulini tanlang.");
    }

    const latest = readPayments();

    const paid = latest
      .filter((p) => p.saleKind === input.saleKind && p.saleId === input.saleId)
      .reduce((sum, p) => sum + p.amount, 0);

    const remaining = Math.max(0, sale.totalAmount - paid);

    if (input.amount > remaining + EPS) {
      throw new Error(
        `Qolgan qarz ${remaining.toLocaleString(
          'uz-UZ'
        )} so'm. Bundan ortiq to'lov kiritib bo'lmaydi.`
      );
    }

    const payment: SalesPayment = {
      id: crypto.randomUUID(),
      saleKind: input.saleKind,
      saleId: input.saleId,
      date: today(),
      amount: input.amount,
      method: input.method,
      note: input.note?.trim() ?? '',
      createdAt: new Date().toISOString(),
    };

    const next = [...latest, payment];
    persistPayments(next);
    setPayments(next);
  }

  function addPayments(inputs: CreateSalesPayment[], saleTotal?: number) {
    if (inputs.length === 0) return;

    const latest = readPayments();

    // To'lovlarni bitta savdo bo'yicha tekshiramiz.
    const kind = inputs[0].saleKind;
    const saleId = inputs[0].saleId;

    if (
      inputs.some((item) => item.saleKind !== kind || item.saleId !== saleId)
    ) {
      throw new Error("To'lovlar bitta savdoga tegishli bo'lishi kerak.");
    }

    const sale = findSale(kind, saleId);

    const targetTotal = saleTotal ?? sale?.totalAmount;

    if (
      targetTotal === undefined ||
      !Number.isFinite(targetTotal) ||
      targetTotal < 0
    ) {
      throw new Error('Savdo summasi topilmadi.');
    }

    for (const input of inputs) {
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error("To'lov summalari 0 dan katta bo'lishi kerak.");
      }

      if (
        input.method !== 'cash' &&
        input.method !== 'card' &&
        input.method !== 'bank'
      ) {
        throw new Error("To'lov usuli noto'g'ri.");
      }
    }

    const alreadyPaid = latest
      .filter((item) => item.saleKind === kind && item.saleId === saleId)
      .reduce((sum, item) => sum + item.amount, 0);

    const newTotal = inputs.reduce((sum, item) => sum + item.amount, 0);

    if (alreadyPaid + newTotal > targetTotal + 0.000001) {
      throw new Error("Jami to'lov savdo summasidan oshib ketdi.");
    }

    const now = new Date().toISOString();

    const newPayments: SalesPayment[] = inputs.map((input) => ({
      id: crypto.randomUUID(),
      saleKind: input.saleKind,
      saleId: input.saleId,
      date: today(),
      amount: input.amount,
      method: input.method,
      note: input.note?.trim() ?? '',
      createdAt: now,
    }));

    const next = [...latest, ...newPayments];

    // Naqd va karta to'lovlari bitta saqlashda yoziladi.
    persistPayments(next);
    setPayments(next);
  }

  const { totalPaid, totalDebt } = useMemo(() => {
    const combined = [
      ...eggSales.map((sale) => ({
        kind: 'eggs' as const,
        id: sale.id,
        total: sale.totalAmount,
      })),
      ...meatSales.map((sale) => ({
        kind: 'meat' as const,
        id: sale.id,
        total: sale.totalAmount,
      })),
    ];

    let paidSum = 0;
    let debtSum = 0;

    for (const sale of combined) {
      const paid = payments
        .filter((p) => p.saleKind === sale.kind && p.saleId === sale.id)
        .reduce((sum, p) => sum + p.amount, 0);

      paidSum += paid;
      debtSum += Math.max(0, sale.total - paid);
    }

    return {
      totalPaid: paidSum,
      totalDebt: debtSum,
    };
  }, [eggSales, meatSales, payments]);

  return (
    <SalesPaymentContext.Provider
      value={{
        payments,
        getSalePaymentSummary,
        addPayment,
        addPayments,
        totalPaid,
        totalDebt,
      }}
    >
      {children}
    </SalesPaymentContext.Provider>
  );
}

export function useSalesPayments() {
  const context = useContext(SalesPaymentContext);

  if (!context) {
    throw new Error('SalesPaymentProvider ulanmagan.');
  }

  return context;
}
