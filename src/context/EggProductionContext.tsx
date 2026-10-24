
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { usePoultry } from "./PoultryContext";
import { useLocations } from "./LocationsContext";

export interface EggProductionRecord {
  id: string;
  date: string;
  batchId: string;
  locationId: string;
  category1: number;
  category2: number;
  category3: number;
  category4: number;
  brokenCount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type EggProductionInput = Pick<
  EggProductionRecord,
  | "date"
  | "batchId"
  | "locationId"
  | "category1"
  | "category2"
  | "category3"
  | "category4"
  | "brokenCount"
  | "note"
>;

export interface EggTotals {
  category1: number;
  category2: number;
  category3: number;
  category4: number;
  brokenCount: number;
  sellable: number;
  totalCollected: number;
}

interface EggProductionFilters {
  locationId?: string;
  batchId?: string;
  fromDate?: string;
  toDate?: string;
}

interface EggProductionContextValue {
  records: EggProductionRecord[];

  saveProduction: (
    input: EggProductionInput
  ) => void;

  getProduction: (
    batchId: string,
    locationId: string,
    date: string
  ) => EggProductionRecord | undefined;

  getRecordsByLocation: (
    locationId: string
  ) => EggProductionRecord[];

  getRecordsByBatch: (
    batchId: string
  ) => EggProductionRecord[];

  getTotals: (
    filters?: EggProductionFilters
  ) => EggTotals;
}

const STORAGE_KEY =
  "poultry-erp-egg-production-v1";

const EggProductionContext =
  createContext<EggProductionContextValue | null>(
    null
  );

function today(): string {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(
    `${date}T00:00:00Z`
  );

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function loadRecords(): EggProductionRecord[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is EggProductionRecord => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        const record = item as Record<
          string,
          unknown
        >;

        if (
          typeof record.id !== "string" ||
          typeof record.batchId !== "string" ||
          typeof record.locationId !== "string" ||
          typeof record.date !== "string"
        ) {
          return false;
        }

        return [
          "category1",
          "category2",
          "category3",
          "category4",
          "brokenCount",
        ].every(
          (field) =>
            Number.isSafeInteger(record[field]) &&
            Number(record[field]) >= 0
        );
      }
    );
  } catch (error) {
    console.error(
      "Tuxum yozuvlarini o'qishda xato:",
      error
    );

    return [];
  }
}

function persistRecords(
  records: EggProductionRecord[]
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    );
  } catch {
    throw new Error(
      "Tuxum ma'lumotlarini brauzerda saqlab bo'lmadi."
    );
  }
}

export function calculateEggTotals(
  records: EggProductionRecord[]
): EggTotals {
  const result = records.reduce(
    (total, record) => ({
      category1:
        total.category1 + record.category1,
      category2:
        total.category2 + record.category2,
      category3:
        total.category3 + record.category3,
      category4:
        total.category4 + record.category4,
      brokenCount:
        total.brokenCount + record.brokenCount,
    }),
    {
      category1: 0,
      category2: 0,
      category3: 0,
      category4: 0,
      brokenCount: 0,
    }
  );

  const sellable =
    result.category1 +
    result.category2 +
    result.category3 +
    result.category4;

  return {
    ...result,
    sellable,
    totalCollected:
      sellable + result.brokenCount,
  };
}

export function EggProductionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    batches,
    getBalanceAsOf,
  } = usePoultry();

  const { locations } = useLocations();

  const [records, setRecords] =
    useState<EggProductionRecord[]>(
      loadRecords
    );

  // MUHIM:
  // Bu funksiyalarni eski useMemo ichiga
  // joylamaymiz. Aks holda transferdan keyin
  // eskirgan getBalanceAsOf ishlatilishi mumkin.

  function saveProduction(
    input: EggProductionInput
  ) {
    const batch = batches.find(
      (item) =>
        item.id === input.batchId &&
        item.direction === "egg"
    );

    if (!batch) {
      throw new Error(
        "Tuxum yo'nalishidagi partiya topilmadi."
      );
    }

    const location = locations.find(
      (item) =>
        item.id === input.locationId &&
        item.type === "egg-production"
    );

    if (!location) {
      throw new Error(
        "Tanlangan tuxum fermasi topilmadi."
      );
    }

    if (
      !validDate(input.date) ||
      input.date < batch.arrivalDate ||
      input.date > today()
    ) {
      throw new Error(
        "Tuxum yig'imi sanasini to'g'ri tanlang."
      );
    }

    // THIS IS THE IMPORTANT FIX:
    // Get the latest poultry balance on every render.
    // The function is no longer trapped in a memo
    // that only depends on batches/locations/records.

    const livingBirds = getBalanceAsOf(
      input.batchId,
      input.locationId,
      input.date
    );

    if (livingBirds <= 0) {
      throw new Error(
        `Tanlangan ${input.date} sanasida ` +
        `${location.name}da ${batch.code} ` +
        "partiyasiga tegishli tirik tovuqlar yo'q."
      );
    }

    const counts = [
      input.category1,
      input.category2,
      input.category3,
      input.category4,
      input.brokenCount,
    ];

    if (
      counts.some(
        (count) =>
          !Number.isSafeInteger(count) ||
          count < 0
      )
    ) {
      throw new Error(
        "Tuxum sonlari 0 yoki undan katta butun son bo'lishi kerak."
      );
    }

    const totalCollected = counts.reduce(
      (sum, count) => sum + count,
      0
    );

    if (totalCollected <= 0) {
      throw new Error(
        "Kamida bitta tuxum kiriting."
      );
    }

    // Same batch + farm + day = one record.
    // A second save edits the original record.
    const existing = records.find(
      (item) =>
        item.batchId === input.batchId &&
        item.locationId === input.locationId &&
        item.date === input.date
    );

    const now = new Date().toISOString();

    const nextRecord: EggProductionRecord = {
      ...input,
      id:
        existing?.id ??
        crypto.randomUUID(),
      note: input.note.trim(),
      createdAt:
        existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextRecords = existing
      ? records.map((item) =>
          item.id === existing.id
            ? nextRecord
            : item
        )
      : [...records, nextRecord];

    persistRecords(nextRecords);
    setRecords(nextRecords);
  }

  function getProduction(
    batchId: string,
    locationId: string,
    date: string
  ) {
    return records.find(
      (item) =>
        item.batchId === batchId &&
        item.locationId === locationId &&
        item.date === date
    );
  }

  function getRecordsByLocation(
    locationId: string
  ) {
    return records
      .filter(
        (item) =>
          item.locationId === locationId
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date)
      );
  }

  function getRecordsByBatch(
    batchId: string
  ) {
    return records
      .filter(
        (item) =>
          item.batchId === batchId
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date)
      );
  }

  function getTotals(
    filters?: EggProductionFilters
  ): EggTotals {
    const selectedRecords = records.filter(
      (record) => {
        if (
          filters?.locationId &&
          record.locationId !==
            filters.locationId
        ) {
          return false;
        }

        if (
          filters?.batchId &&
          record.batchId !==
            filters.batchId
        ) {
          return false;
        }

        if (
          filters?.fromDate &&
          record.date < filters.fromDate
        ) {
          return false;
        }

        if (
          filters?.toDate &&
          record.date > filters.toDate
        ) {
          return false;
        }

        return true;
      }
    );

    return calculateEggTotals(selectedRecords);
  }

  return (
    <EggProductionContext.Provider
      value={{
        records,
        saveProduction,
        getProduction,
        getRecordsByLocation,
        getRecordsByBatch,
        getTotals,
      }}
    >
      {children}
    </EggProductionContext.Provider>
  );
}

export function useEggProduction() {
  const context = useContext(
    EggProductionContext
  );

  if (!context) {
    throw new Error(
      "EggProductionProvider ulanmagan."
    );
  }

  return context;
}
