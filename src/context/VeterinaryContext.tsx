import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { usePoultry } from './PoultryContext';

export type VeterinaryType =
  | 'vaccination'
  | 'treatment'
  | 'prevention'
  | 'inspection';

export type VeterinaryPaymentMethod = 'cash' | 'card' | 'bank';

export interface VeterinaryRecord {
  id: string;
  batchId: string;
  batchCode: string;
  date: string;
  type: VeterinaryType;
  title: string;
  medicine: string;
  birdCount: number;
  amount: number;
  paymentMethod: VeterinaryPaymentMethod;
  nextDate: string;
  note: string;
  createdAt: string;
}

export type CreateVeterinaryRecord = Omit<
  VeterinaryRecord,
  'id' | 'batchCode' | 'createdAt'
>;

interface VeterinaryContextValue {
  records: VeterinaryRecord[];

  addRecord: (input: CreateVeterinaryRecord) => VeterinaryRecord;

  removeRecord: (id: string) => void;

  getBatchRecords: (batchId: string) => VeterinaryRecord[];

  totalExpense: number;
}

export const VETERINARY_TYPES: {
  value: VeterinaryType;
  label: string;
}[] = [
  { value: 'vaccination', label: 'Emlash' },
  { value: 'treatment', label: 'Davolash' },
  { value: 'prevention', label: 'Profilaktika' },
  { value: 'inspection', label: "Veterinariya ko'rigi" },
];

export const VETERINARY_PAYMENT_METHODS: Record<
  VeterinaryPaymentMethod,
  string
> = {
  cash: 'Naqd',
  card: 'Karta',
  bank: "Bank o'tkazmasi",
};

const STORAGE_KEY = 'poultry-erp-veterinary-v1';

const VeterinaryContext = createContext<VeterinaryContextValue | null>(null);

function localToday(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isRecord(value: unknown): value is VeterinaryRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const r = value as Partial<VeterinaryRecord>;

  return (
    typeof r.id === 'string' &&
    typeof r.batchId === 'string' &&
    typeof r.batchCode === 'string' &&
    typeof r.date === 'string' &&
    isValidDate(r.date) &&
    VETERINARY_TYPES.some((item) => item.value === r.type) &&
    typeof r.title === 'string' &&
    typeof r.medicine === 'string' &&
    typeof r.birdCount === 'number' &&
    Number.isSafeInteger(r.birdCount) &&
    r.birdCount > 0 &&
    typeof r.amount === 'number' &&
    Number.isFinite(r.amount) &&
    r.amount >= 0 &&
    (r.paymentMethod === 'cash' ||
      r.paymentMethod === 'card' ||
      r.paymentMethod === 'bank') &&
    typeof r.nextDate === 'string' &&
    (r.nextDate === '' || isValidDate(r.nextDate)) &&
    typeof r.note === 'string' &&
    typeof r.createdAt === 'string'
  );
}

function readRecords(): VeterinaryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const data: unknown = JSON.parse(raw);

    return Array.isArray(data) ? data.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function persist(records: VeterinaryRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    throw new Error("Veterinariya yozuvini saqlab bo'lmadi.");
  }
}

export function VeterinaryProvider({ children }: { children: ReactNode }) {
  const { batches } = usePoultry();

  const [records, setRecords] = useState<VeterinaryRecord[]>(readRecords);

  function addRecord(input: CreateVeterinaryRecord) {
    const batch = batches.find((item) => item.id === input.batchId);

    if (!batch) {
      throw new Error('Parranda partiyasini tanlang.');
    }

    if (
      !isValidDate(input.date) ||
      input.date > localToday() ||
      input.date < batch.arrivalDate.slice(0, 10)
    ) {
      throw new Error(
        "Tadbir sanasi partiya kelgan sanadan bugungacha bo'lishi kerak."
      );
    }

    if (!VETERINARY_TYPES.some((item) => item.value === input.type)) {
      throw new Error('Tadbir turini tanlang.');
    }

    if (!input.title.trim()) {
      throw new Error('Tadbir nomini kiriting.');
    }

    if (
      !Number.isSafeInteger(input.birdCount) ||
      input.birdCount <= 0 ||
      input.birdCount > batch.initialCount
    ) {
      throw new Error("Parrandalar sonini to'g'ri kiriting.");
    }

    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new Error("Xarajat summasi 0 yoki undan katta bo'lishi kerak.");
    }

    if (
      input.paymentMethod !== 'cash' &&
      input.paymentMethod !== 'card' &&
      input.paymentMethod !== 'bank'
    ) {
      throw new Error("To'lov usulini tanlang.");
    }

    if (
      input.nextDate &&
      (!isValidDate(input.nextDate) || input.nextDate < input.date)
    ) {
      throw new Error(
        "Keyingi tadbir sanasi joriy tadbirdan oldin bo'lishi mumkin emas."
      );
    }

    const record: VeterinaryRecord = {
      ...input,
      batchCode: batch.code,
      title: input.title.trim(),
      medicine: input.medicine.trim(),
      note: input.note.trim(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const next = [...readRecords(), record];

    persist(next);
    setRecords(next);

    return record;
  }
  function removeRecord(id: string): void {
    const next = readRecords().filter((record) => record.id !== id);

    persist(next);
    setRecords(next);
  }
  function getBatchRecords(batchId: string) {
    return records.filter((record) => record.batchId === batchId);
  }

  const totalExpense = useMemo(
    () => records.reduce((total, record) => total + record.amount, 0),
    [records]
  );

  return (
    <VeterinaryContext.Provider
      value={{
        records,
        addRecord,
        removeRecord,
        getBatchRecords,
        totalExpense,
      }}
    >
      {children}
    </VeterinaryContext.Provider>
  );
}

export function useVeterinary() {
  const context = useContext(VeterinaryContext);

  if (!context) {
    throw new Error('VeterinaryProvider ulanmagan.');
  }

  return context;
}
