import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { usePoultry } from './PoultryContext';

export type MedicineUnit = 'dona' | 'flakon' | 'ml' | 'litr' | 'gramm' | 'kg';

export type MedicineType = 'medicine' | 'vaccine';

export type MedicinePaymentMethod = 'cash' | 'card' | 'bank';

export interface Medicine {
  id: string;
  name: string;
  type: MedicineType;
  unit: MedicineUnit;
  active: boolean;
  createdAt: string;
}

export interface MedicinePurchase {
  id: string;
  medicineId: string;
  medicineName: string;
  unit: MedicineUnit;
  date: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentMethod: MedicinePaymentMethod;
  supplierName: string;
  note: string;
  createdAt: string;
}

export interface MedicineUsage {
  id: string;
  medicineId: string;
  medicineName: string;
  unit: MedicineUnit;
  batchId: string;
  batchCode: string;
  date: string;
  quantity: number;
  purpose: string;
  note: string;
  createdAt: string;
  veterinaryRecordId?: string;
}

export interface MedicineBalance {
  medicine: Medicine;
  purchased: number;
  used: number;
  remaining: number;
}

export interface CreateMedicine {
  name: string;
  type: MedicineType;
  unit: MedicineUnit;
}

export interface CreateMedicinePurchase {
  medicineId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  paymentMethod: MedicinePaymentMethod;
  supplierName: string;
  note: string;
}

export interface CreateMedicineUsage {
  medicineId: string;
  batchId: string;
  date: string;
  quantity: number;
  purpose: string;
  note: string;
  veterinaryRecordId?: string;
}

interface InventoryState {
  medicines: Medicine[];
  purchases: MedicinePurchase[];
  usages: MedicineUsage[];
}

interface VeterinaryInventoryValue extends InventoryState {
  balances: MedicineBalance[];
  purchaseExpense: number;
  addMedicine: (input: CreateMedicine) => void;
  addPurchase: (input: CreateMedicinePurchase) => void;
  addUsage: (input: CreateMedicineUsage) => void;
  getBalance: (medicineId: string) => number;
}

const STORAGE_KEY = 'poultry-erp-veterinary-inventory-v1';

const Context = createContext<VeterinaryInventoryValue | null>(null);

function today(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const units: MedicineUnit[] = ['dona', 'flakon', 'ml', 'litr', 'gramm', 'kg'];

function validMedicine(value: unknown): value is Medicine {
  if (!value || typeof value !== 'object') return false;

  const v = value as Partial<Medicine>;

  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.type === 'medicine' || v.type === 'vaccine') &&
    units.includes(v.unit as MedicineUnit) &&
    typeof v.active === 'boolean' &&
    typeof v.createdAt === 'string'
  );
}

function validPurchase(value: unknown): value is MedicinePurchase {
  if (!value || typeof value !== 'object') return false;

  const v = value as Partial<MedicinePurchase>;

  return (
    typeof v.id === 'string' &&
    typeof v.medicineId === 'string' &&
    typeof v.medicineName === 'string' &&
    units.includes(v.unit as MedicineUnit) &&
    typeof v.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.quantity === 'number' &&
    Number.isFinite(v.quantity) &&
    v.quantity > 0 &&
    typeof v.unitPrice === 'number' &&
    Number.isFinite(v.unitPrice) &&
    v.unitPrice >= 0 &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount) &&
    v.amount >= 0 &&
    (v.paymentMethod === 'cash' ||
      v.paymentMethod === 'card' ||
      v.paymentMethod === 'bank') &&
    typeof v.supplierName === 'string' &&
    typeof v.note === 'string' &&
    typeof v.createdAt === 'string'
  );
}

function validUsage(value: unknown): value is MedicineUsage {
  if (!value || typeof value !== 'object') return false;

  const v = value as Partial<MedicineUsage>;

  return (
    typeof v.id === 'string' &&
    typeof v.medicineId === 'string' &&
    typeof v.medicineName === 'string' &&
    units.includes(v.unit as MedicineUnit) &&
    typeof v.batchId === 'string' &&
    typeof v.batchCode === 'string' &&
    typeof v.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.quantity === 'number' &&
    Number.isFinite(v.quantity) &&
    v.quantity > 0 &&
    typeof v.purpose === 'string' &&
    typeof v.note === 'string' &&
    typeof v.createdAt === 'string' &&
    (v.veterinaryRecordId === undefined ||
      typeof v.veterinaryRecordId === 'string')
  );
}

function readState(): InventoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        medicines: [],
        purchases: [],
        usages: [],
      };
    }

    const parsed: Partial<InventoryState> = JSON.parse(raw);

    return {
      medicines: Array.isArray(parsed.medicines)
        ? parsed.medicines.filter(validMedicine)
        : [],
      purchases: Array.isArray(parsed.purchases)
        ? parsed.purchases.filter(validPurchase)
        : [],
      usages: Array.isArray(parsed.usages)
        ? parsed.usages.filter(validUsage)
        : [],
    };
  } catch {
    return {
      medicines: [],
      purchases: [],
      usages: [],
    };
  }
}

function persist(next: InventoryState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Dori ombori ma'lumotlarini saqlab bo'lmadi.");
  }
}

function calculateBalance(state: InventoryState, medicineId: string): number {
  const purchased = state.purchases
    .filter((item) => item.medicineId === medicineId)
    .reduce((sum, item) => sum + item.quantity, 0);

  const used = state.usages
    .filter((item) => item.medicineId === medicineId)
    .reduce((sum, item) => sum + item.quantity, 0);

  return purchased - used;
}

export function VeterinaryInventoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { batches } = usePoultry();

  const [state, setState] = useState<InventoryState>(readState);

  function commit(next: InventoryState) {
    persist(next);
    setState(next);
  }

  function addMedicine(input: CreateMedicine) {
    const name = input.name.trim();

    if (!name) {
      throw new Error('Dori yoki vaksina nomini kiriting.');
    }

    if (input.type !== 'medicine' && input.type !== 'vaccine') {
      throw new Error('Mahsulot turini tanlang.');
    }

    if (!units.includes(input.unit)) {
      throw new Error("O'lchov birligini tanlang.");
    }

    const latest = readState();

    if (
      latest.medicines.some(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.unit === input.unit
      )
    ) {
      throw new Error('Bu nom va birlikdagi mahsulot allaqachon mavjud.');
    }

    const medicine: Medicine = {
      id: crypto.randomUUID(),
      name,
      type: input.type,
      unit: input.unit,
      active: true,
      createdAt: new Date().toISOString(),
    };

    commit({
      ...latest,
      medicines: [...latest.medicines, medicine],
    });
  }

  function addPurchase(input: CreateMedicinePurchase) {
    const latest = readState();

    const medicine = latest.medicines.find(
      (item) => item.id === input.medicineId && item.active
    );

    if (!medicine) {
      throw new Error('Dori yoki vaksinani tanlang.');
    }

    // Backdated purchase entry needs historical-stock
    // validation. For now, use today's date only.
    if (input.date !== today()) {
      throw new Error('Hozircha kirim bugungi sana bilan kiritiladi.');
    }

    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new Error("Kirim miqdorini to'g'ri kiriting.");
    }

    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      throw new Error("Birlik narxini to'g'ri kiriting.");
    }

    if (!['cash', 'card', 'bank'].includes(input.paymentMethod)) {
      throw new Error("To'lov usuli noto'g'ri.");
    }

    const amount = input.quantity * input.unitPrice;

    if (!Number.isFinite(amount)) {
      throw new Error("Jami xarid summasi noto'g'ri.");
    }

    const purchase: MedicinePurchase = {
      id: crypto.randomUUID(),
      medicineId: medicine.id,
      medicineName: medicine.name,
      unit: medicine.unit,
      date: input.date,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      amount,
      paymentMethod: input.paymentMethod,
      supplierName: input.supplierName.trim(),
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
    };

    commit({
      ...latest,
      purchases: [...latest.purchases, purchase],
    });
  }

  function addUsage(input: CreateMedicineUsage) {
    const latest = readState();

    const medicine = latest.medicines.find(
      (item) => item.id === input.medicineId && item.active
    );

    const batch = batches.find((item) => item.id === input.batchId);

    if (!medicine) {
      throw new Error('Dori yoki vaksinani tanlang.');
    }

    if (!batch) {
      throw new Error('Parranda partiyasini tanlang.');
    }

    if (input.date !== today()) {
      throw new Error('Hozircha sarf bugungi sana bilan kiritiladi.');
    }

    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new Error("Sarf miqdorini to'g'ri kiriting.");
    }

    if (!input.purpose.trim()) {
      throw new Error('Sarf sababini kiriting.');
    }

    const remaining = calculateBalance(latest, medicine.id);

    if (input.quantity > remaining + 0.000001) {
      throw new Error(
        `Omborda ${remaining} ${medicine.unit} mavjud. ` +
          "Bundan ko'p sarflab bo'lmaydi."
      );
    }

    const usage: MedicineUsage = {
      id: crypto.randomUUID(),
      medicineId: medicine.id,
      medicineName: medicine.name,
      unit: medicine.unit,
      batchId: batch.id,
      batchCode: batch.code,
      date: input.date,
      quantity: input.quantity,
      purpose: input.purpose.trim(),
      note: input.note.trim(),

      veterinaryRecordId: input.veterinaryRecordId,

      createdAt: new Date().toISOString(),
    };

    commit({
      ...latest,
      usages: [...latest.usages, usage],
    });
  }

  const balances = useMemo(
    () =>
      state.medicines.map((medicine) => {
        const purchased = state.purchases
          .filter((item) => item.medicineId === medicine.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        const used = state.usages
          .filter((item) => item.medicineId === medicine.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        return {
          medicine,
          purchased,
          used,
          remaining: purchased - used,
        };
      }),
    [state]
  );

  const purchaseExpense = useMemo(
    () => state.purchases.reduce((sum, purchase) => sum + purchase.amount, 0),
    [state.purchases]
  );

  return (
    <Context.Provider
      value={{
        ...state,
        balances,
        purchaseExpense,
        addMedicine,
        addPurchase,
        addUsage,
        getBalance: (medicineId) => calculateBalance(state, medicineId),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useVeterinaryInventory() {
  const context = useContext(Context);

  if (!context) {
    throw new Error('VeterinaryInventoryProvider ulanmagan.');
  }

  return context;
}
