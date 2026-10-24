import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocations } from './LocationsContext';

export type BatchDirection = 'egg' | 'meat';
export type BatchStatus = 'active' | 'closed';
export type BatchPaymentMethod = 'cash' | 'card' | 'bank';

export interface PoultryBatch {
  id: string;
  code: string;
  direction: BatchDirection;
  arrivalDate: string;
  supplierId: string;
  supplierName: string;
  locationId: string;
  locationName: string;
  initialCount: number;
  pricePerChick: number;
  createdAt?: string; // Partiya yaratilgan haqiqiy vaqt
  /** Undefined for existing batches: historical payment status is unknown. */
  paidAmount?: number;
  paymentMethod?: BatchPaymentMethod;
  status: BatchStatus;
  closedAt: string | null;
  note: string;
}

export interface BatchPurchasePayment {
  id: string;
  batchId: string;
  date: string;
  amount: number;
  method: BatchPaymentMethod;
  note: string;
  createdAt: string;
}

export interface PoultryEvent {
  id: string;
  batchId: string;
  date: string;
  type: 'mortality' | 'transfer' | 'slaughter' | 'live-sale';
  quantity: number;
  fromLocationId: string;
  toLocationId?: string;
  meatKg?: number;
  /** Live-bird sale: only this event uses these fields. */
  unitPrice?: number;
  paymentMethod?: BatchPaymentMethod;
  createdAt?: string;
  note: string;
}

export interface BatchBalance {
  locationId: string;
  quantity: number;
}

interface PoultryState {
  batches: PoultryBatch[];
  events: PoultryEvent[];
  purchasePayments: BatchPurchasePayment[];
}

interface PoultryContextValue extends PoultryState {
  addBatch: (batch: PoultryBatch) => void;
  addPurchasePayment: (payment: BatchPurchasePayment) => void;
  getBatchPaidAmount: (batchId: string) => number | null;
  getBatchDebt: (batchId: string) => number | null;
  addMortality: (
    batchId: string,
    locationId: string,
    quantity: number,
    date: string,
    note: string
  ) => void;
  transferBirds: (
    batchId: string,
    fromId: string,
    toId: string,
    quantity: number,
    date: string,
    note: string
  ) => void;
  addSlaughter: (
    batchId: string,
    locationId: string,
    quantity: number,
    meatKg: number,
    date: string,
    note: string
  ) => void;
  addLiveSale: (batchId: string, locationId: string, quantity: number, unitPrice: number, method: BatchPaymentMethod, date: string, note: string) => void;
  closeBatch: (batchId: string, date: string) => void;
  getBalances: (batchId: string) => BatchBalance[];
  getBalanceAsOf: (batchId: string, locationId: string, date: string) => number;
  getMortality: (batchId: string) => number;
  getSlaughtered: (batchId: string) => number;
  getMeatKg: (batchId: string) => number;
}

const STORAGE_KEY = 'poultry-erp-batches-v1';
const PoultryContext = createContext<PoultryContextValue | null>(null);

const EMPTY_STATE: PoultryState = {
  batches: [],
  events: [],
  purchasePayments: [],
};

const dayOf = (value: string) => value.slice(0, 10);

function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function isDate(value: string) {
  const s = dayOf(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;

  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function readState(): PoultryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.batches) || !Array.isArray(parsed.events)) {
      return EMPTY_STATE;
    }

    return {
      batches: parsed.batches,
      events: parsed.events,
      purchasePayments: Array.isArray(parsed.purchasePayments)
        ? parsed.purchasePayments
        : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function calculateBalances(
  batch: PoultryBatch,
  events: PoultryEvent[],
  date: string
): BatchBalance[] {
  if (date < batch.arrivalDate) return [];

  const map = new Map<string, number>();
  map.set(batch.locationId, batch.initialCount);

  const ordered = events
    .filter((e) => e.batchId === batch.id && dayOf(e.date) <= date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  for (const e of ordered) {
    map.set(e.fromLocationId, (map.get(e.fromLocationId) ?? 0) - e.quantity);

    if (e.type === 'transfer' && e.toLocationId) {
      map.set(e.toLocationId, (map.get(e.toLocationId) ?? 0) + e.quantity);
    }
  }

  return [...map.entries()].map(([locationId, quantity]) => ({
    locationId,
    quantity,
  }));
}

export function PoultryProvider({ children }: { children: ReactNode }) {
  const { locations } = useLocations();
  const [state, setState] = useState<PoultryState>(readState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Partiyalarni saqlash xatosi:', error);
    }
  }, [state]);

  const findBatch = (id: string) => {
    const batch = state.batches.find((b) => b.id === id);
    if (!batch) throw new Error('Partiya topilmadi.');
    return batch;
  };

  const findLocation = (id: string) => locations.find((l) => l.id === id);

  function validateLocationForDirection(
    direction: BatchDirection,
    id: string,
    initial: boolean
  ) {
    const location = findLocation(id);

    if (!location || !location.active) {
      throw new Error("Bo'lim mavjud emas yoki nofaol.");
    }

    if (direction === 'meat') {
      if (location.type !== 'meat-production') {
        throw new Error(
          "Go'sht partiyasi faqat go'sht jo'jaxonasida bo'lishi mumkin."
        );
      }
    } else if (
      initial
        ? location.type !== 'poultry'
        : location.type !== 'poultry' && location.type !== 'egg-production'
    ) {
      throw new Error(
        "Tuxum partiyasi faqat tuxum jo'jaxonasi yoki tuxum fermasida bo'lishi mumkin."
      );
    }
  }

  function validateEvent(event: PoultryEvent) {
    const batch = findBatch(event.batchId);

    if (batch.status !== 'active') {
      throw new Error("Yakunlangan partiyaga amal qo'shib bo'lmaydi.");
    }

    if (
      !isDate(event.date) ||
      dayOf(event.date) < batch.arrivalDate ||
      dayOf(event.date) > today()
    ) {
      throw new Error("Amal sanasi noto'g'ri.");
    }

    if (!Number.isInteger(event.quantity) || event.quantity <= 0) {
      throw new Error("Parrandalar soni musbat butun son bo'lishi kerak.");
    }

    const source = findLocation(event.fromLocationId);
    if (!source) {
      throw new Error("Boshlang'ich bo'lim topilmadi.");
    }

    if (event.type === 'live-sale') {
      if (!Number.isFinite(event.unitPrice) || (event.unitPrice ?? -1) < 0 ||
          !['cash', 'card', 'bank'].includes(event.paymentMethod ?? '')) {
        throw new Error("Tirik parranda sotish narxi yoki to'lov usuli noto'g'ri.");
      }
      validateLocationForDirection(batch.direction, event.fromLocationId, false);
    }

    if (event.type === 'slaughter') {
      // Only meat batches can be slaughtered here.
      if (batch.direction !== 'meat') {
        throw new Error(
          "Faqat go'sht yo'nalishidagi partiyalarni so'yish mumkin."
        );
      }

      // Slaughter must happen in a meat-production facility.
      const slaughterLocation = findLocation(event.fromLocationId);

      if (!slaughterLocation || slaughterLocation.type !== 'meat-production') {
        throw new Error(
          "So'yish faqat go'sht jo'jaxonasida qayd etilishi mumkin."
        );
      }

      // Validate meat output.
      if (!Number.isFinite(event.meatKg) || (event.meatKg ?? 0) <= 0) {
        throw new Error("Olingan go'sht miqdorini to'g'ri kiriting.");
      }
    }

    if (event.type === 'transfer') {
      if (!event.toLocationId || event.fromLocationId === event.toLocationId) {
        throw new Error("Boshqa qabul qiluvchi bo'limni tanlang.");
      }
      validateLocationForDirection(batch.direction, event.toLocationId, false);
    }

    /*
      Check quantities chronologically, including all later
      dates. Event ordering on the same calendar day is
      simplified; precise timestamps will be added later.
    */
    const all = [...state.events, event];
    const dates = new Set<string>([
      event.date,
      today(),
      ...all.filter((e) => e.batchId === batch.id).map((e) => dayOf(e.date)),
    ]);

    for (const date of dates) {
      const balances = calculateBalances(batch, all, date);
      if (balances.some((b) => b.quantity < 0)) {
        throw new Error(
          'Parrandalar soni yetarli emas yoki oldingi sanalar bilan ziddiyat bor.'
        );
      }
    }
  }

  function appendEvent(event: PoultryEvent) {
    validateEvent(event);
    setState((prev) => ({
      ...prev,
      events: [...prev.events, event],
    }));
  }

  const value = useMemo<PoultryContextValue>(
    () => ({
      ...state,

      addBatch(batch) {
        if (
          !batch.code.trim() ||
          !batch.supplierId ||
          !isDate(batch.arrivalDate) ||
          batch.arrivalDate > today() ||
          !Number.isInteger(batch.initialCount) ||
          batch.initialCount <= 0 ||
          !Number.isFinite(batch.pricePerChick) ||
          batch.pricePerChick < 0
        ) {
          throw new Error("Partiya ma'lumotlari noto'g'ri.");
        }

        const batchTotal = batch.initialCount * batch.pricePerChick;
        if (
          !Number.isFinite(batchTotal) ||
          (batch.paidAmount !== undefined && (
            !Number.isFinite(batch.paidAmount) ||
            batch.paidAmount < 0 ||
            batch.paidAmount > batchTotal + 0.001 ||
            (batch.paidAmount > 0 &&
              !['cash', 'card', 'bank'].includes(batch.paymentMethod ?? ''))
          ))
        ) {
          throw new Error("Partiya uchun to'lov ma'lumotlari noto'g'ri.");
        }

        validateLocationForDirection(batch.direction, batch.locationId, true);

        if (
          state.batches.some(
            (b) =>
              b.id === batch.id ||
              b.code.toLowerCase() === batch.code.toLowerCase()
          )
        ) {
          throw new Error('Bu raqamli partiya allaqachon mavjud.');
        }

        setState((prev) => ({
          ...prev,
          batches: [...prev.batches, { ...batch, createdAt: batch.createdAt ?? new Date().toISOString() }],
        }));
      },

      addPurchasePayment(payment) {
        const batch = findBatch(payment.batchId);
        if (batch.paidAmount === undefined) {
          throw new Error("Eski partiyaning boshlang'ich to'lov holati aniqlanmagan.");
        }
        if (
          !payment.id ||
          state.purchasePayments.some((entry) => entry.id === payment.id) ||
          !isDate(payment.date) ||
          dayOf(payment.date) < dayOf(batch.arrivalDate) ||
          dayOf(payment.date) > today() ||
          !Number.isFinite(payment.amount) ||
          payment.amount <= 0 ||
          !['cash', 'card', 'bank'].includes(payment.method) ||
          !payment.createdAt
        ) {
          throw new Error("Qarz to'lovi ma'lumotlari noto'g'ri.");
        }
        const total = batch.initialCount * batch.pricePerChick;
        const alreadyPaid = batch.paidAmount + state.purchasePayments
          .filter((entry) => entry.batchId === batch.id)
          .reduce((sum, entry) => sum + entry.amount, 0);
        if (payment.amount > total - alreadyPaid + 0.001) {
          throw new Error("To'lov qolgan qarzdan oshmasligi kerak.");
        }
        setState((prev) => ({
          ...prev,
          purchasePayments: [...prev.purchasePayments, payment],
        }));
      },

      getBatchPaidAmount(batchId) {
        const batch = findBatch(batchId);
        if (batch.paidAmount === undefined) return null;
        return batch.paidAmount + state.purchasePayments
          .filter((entry) => entry.batchId === batchId)
          .reduce((sum, entry) => sum + entry.amount, 0);
      },

      getBatchDebt(batchId) {
        const batch = findBatch(batchId);
        if (batch.paidAmount === undefined) return null;
        const paid = batch.paidAmount + state.purchasePayments
          .filter((entry) => entry.batchId === batchId)
          .reduce((sum, entry) => sum + entry.amount, 0);
        return Math.max(0, batch.initialCount * batch.pricePerChick - paid);
      },

      addMortality(batchId, locationId, quantity, date, note) {
        appendEvent({
          id: crypto.randomUUID(),
          batchId,
          date: dayOf(date),
          type: 'mortality',
          fromLocationId: locationId,
          quantity,
          note: note.trim(),
        });
      },

      transferBirds(batchId, fromId, toId, quantity, date, note) {
        appendEvent({
          id: crypto.randomUUID(),
          batchId,
          date: dayOf(date),
          type: 'transfer',
          fromLocationId: fromId,
          toLocationId: toId,
          quantity,
          note: note.trim(),
        });
      },

      addSlaughter(batchId, locationId, quantity, meatKg, date, note) {
        appendEvent({
          id: crypto.randomUUID(),
          batchId,
          date: dayOf(date),
          type: 'slaughter',
          fromLocationId: locationId,
          quantity,
          meatKg,
          note: note.trim(),
        });
      },

      addLiveSale(batchId, locationId, quantity, unitPrice, method, date, note) {
        appendEvent({
          id: crypto.randomUUID(),
          batchId,
          date: dayOf(date),
          type: 'live-sale',
          fromLocationId: locationId,
          quantity,
          unitPrice,
          paymentMethod: method,
          createdAt: new Date().toISOString(),
          note: note.trim(),
        });
      },

      closeBatch(batchId, date) {
        const batch = findBatch(batchId);

        if (batch.status === 'closed') {
          throw new Error('Partiya allaqachon yakunlangan.');
        }
        if (!isDate(date) || date < batch.arrivalDate || date > today()) {
          throw new Error("Yakunlash sanasi noto'g'ri.");
        }

        const lastEvent = state.events
          .filter((e) => e.batchId === batchId)
          .map((e) => dayOf(e.date))
          .sort()
          .at(-1);

        if (lastEvent && date < lastEvent) {
          throw new Error("Oxirgi amaldan oldin yakunlab bo'lmaydi.");
        }

        const remaining = calculateBalances(batch, state.events, date).reduce(
          (s, b) => s + b.quantity,
          0
        );

        if (remaining !== 0) {
          throw new Error(
            `${remaining} ta parranda hali hisobda. Avval barcha parrandalarning yakuniy chiqimini qayd eting.`
          );
        }

        setState((prev) => ({
          ...prev,
          batches: prev.batches.map((b) =>
            b.id === batchId ? { ...b, status: 'closed', closedAt: date } : b
          ),
        }));
      },

      getBalances(batchId) {
        return calculateBalances(findBatch(batchId), state.events, today());
      },

      getBalanceAsOf(batchId, locationId, date) {
        return (
          calculateBalances(findBatch(batchId), state.events, dayOf(date)).find(
            (b) => b.locationId === locationId
          )?.quantity ?? 0
        );
      },

      getMortality(batchId) {
        return state.events
          .filter((e) => e.batchId === batchId && e.type === 'mortality')
          .reduce((s, e) => s + e.quantity, 0);
      },

      getSlaughtered(batchId) {
        return state.events
          .filter((e) => e.batchId === batchId && e.type === 'slaughter')
          .reduce((s, e) => s + e.quantity, 0);
      },

      getMeatKg(batchId) {
        return state.events
          .filter((e) => e.batchId === batchId && e.type === 'slaughter')
          .reduce((s, e) => s + (e.meatKg ?? 0), 0);
      },
    }),
    [state, locations]
  );

  return (
    <PoultryContext.Provider value={value}>{children}</PoultryContext.Provider>
  );
}

export function usePoultry() {
  const context = useContext(PoultryContext);

  if (!context) {
    throw new Error('PoultryProvider mavjud emas.');
  }

  return context;
}
