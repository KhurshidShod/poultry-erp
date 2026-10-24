
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { feedKey, useWarehouse } from "./WarehouseContext";
import { useLocations } from "./LocationsContext";
import { usePoultry } from "./PoultryContext";

export interface FeedConsumption {
  id: string;
  date: string;
  locationId: string;
  locationName: string;
  feedType: string;
  recipeName: string;
  quantity: number;
  note: string;

  // New fields; optional for older transactions
  batchId?: string;
  feedTypeId?: string;
  recipeId?: string;
  normGrams?: number;
  birdCount?: number;
  expectedKg?: number;
}

export interface FarmFeedBalance {
  key: string;
  locationId: string;
  locationName: string;
  feedType: string;
  recipeName: string;
  received: number;
  consumed: number;
  remaining: number;
}

interface FarmFeedContextValue {
  consumptions: FeedConsumption[];
  balances: FarmFeedBalance[];
  addConsumption: (item: FeedConsumption) => void;
  getBalancesAsOf: (date: string) => FarmFeedBalance[];
  getBatchConsumptions: (
    batchId: string
  ) => FeedConsumption[];
}

const STORAGE_KEY = "poultry-erp-farm-feed-consumption-v1";
const EPS = 0.00001;

const FarmFeedContext =
  createContext<FarmFeedContextValue | null>(null);

const dayOf = (value: string) => value.slice(0, 10);

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function readConsumptions(): FeedConsumption[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is FeedConsumption =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.date === "string" &&
        typeof item.locationId === "string" &&
        typeof item.locationName === "string" &&
        typeof item.feedType === "string" &&
        typeof item.recipeName === "string" &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        typeof item.note === "string"
    );
  } catch {
    return [];
  }
}

export function FarmFeedProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { transfers, productions, openingFeeds } =
    useWarehouse();

  const { locations, feedDestinations } =
    useLocations();

  const {
    batches,
    getBalanceAsOf,
  } = usePoultry();

  const [consumptions, setConsumptions] =
    useState<FeedConsumption[]>(readConsumptions);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(consumptions)
      );
    } catch (error) {
      console.error("Yem sarfini saqlash xatosi:", error);
    }
  }, [consumptions]);

  const lots = useMemo(() => {
    const map = new Map<
      string,
      { feedType: string; recipeName: string }
    >();

    for (const p of productions) {
      map.set(p.id, {
        feedType: p.feedType,
        recipeName: p.recipeName,
      });
    }

    for (const p of openingFeeds) {
      map.set(p.id, {
        feedType: p.feedType,
        recipeName: p.recipeName,
      });
    }

    return map;
  }, [productions, openingFeeds]);

  function calculateBalances(
    endDate: string,
    usages: FeedConsumption[]
  ): FarmFeedBalance[] {
    const map = new Map<string, FarmFeedBalance>();

    function row(
      locationId: string,
      locationName: string,
      feedType: string,
      recipeName: string
    ) {
      const key = JSON.stringify([
        locationId,
        feedKey(feedType, recipeName),
      ]);

      let value = map.get(key);

      if (!value) {
        value = {
          key,
          locationId,
          locationName,
          feedType,
          recipeName,
          received: 0,
          consumed: 0,
          remaining: 0,
        };

        map.set(key, value);
      }

      return value;
    }

    // Transfers arriving at the farm
    for (const transfer of transfers) {
      if (
        transfer.status === "draft" ||
        dayOf(transfer.date) > endDate
      ) continue;

      const lot = lots.get(transfer.productionId);
      if (!lot) continue;

      const location = locations.find(
        (l) => l.name === transfer.to
      );

      if (!location) continue;

      row(
        location.id,
        location.name,
        lot.feedType,
        lot.recipeName
      ).received += transfer.quantity;
    }

    // Farm consumption
    for (const usage of usages) {
      if (dayOf(usage.date) > endDate) continue;

      const location = locations.find(
        (l) => l.id === usage.locationId
      );

      row(
        usage.locationId,
        location?.name ?? usage.locationName,
        usage.feedType,
        usage.recipeName
      ).consumed += usage.quantity;
    }

    return Array.from(map.values())
      .map((item) => {
        const remaining = item.received - item.consumed;

        return {
          ...item,
          remaining:
            Math.abs(remaining) < EPS ? 0 : remaining,
        };
      })
      .sort(
        (a, b) =>
          a.locationName.localeCompare(b.locationName) ||
          a.feedType.localeCompare(b.feedType) ||
          a.recipeName.localeCompare(b.recipeName)
      );
  }

  function addConsumption(item: FeedConsumption) {
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error("Yem miqdori 0 dan katta bo'lishi kerak.");
    }

    const operationDay = dayOf(item.date);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(operationDay) ||
      Number.isNaN(new Date(item.date).getTime()) ||
      operationDay > today()
    ) {
      throw new Error("Yem sarfi sanasi noto'g'ri.");
    }

    const location = feedDestinations.find(
      (l) => l.id === item.locationId
    );

    if (!location) {
      throw new Error("Faol bo'limni tanlang.");
    }

    if (
      !item.feedType.trim() ||
      !item.recipeName.trim()
    ) {
      throw new Error("Yem turi va retseptni tanlang.");
    }

    if (consumptions.some((c) => c.id === item.id)) {
      throw new Error("Bu sarf yozuvi allaqachon mavjud.");
    }

    // Batch-specific verification
    if (item.batchId) {
      const batch = batches.find(
        (b) => b.id === item.batchId
      );

      if (!batch || batch.status !== "active") {
        throw new Error("Faol parranda partiyasi topilmadi.");
      }

      if (
        operationDay < batch.arrivalDate ||
        (batch.closedAt && operationDay > batch.closedAt)
      ) {
        throw new Error("Sana partiya davriga mos emas.");
      }

      const birds = getBalanceAsOf(
        batch.id,
        item.locationId,
        operationDay
      );

      if (birds <= 0) {
        throw new Error(
          "Tanlangan bo'limda bu partiyaga tegishli parranda yo'q."
        );
      }

      if (
        !Number.isFinite(item.normGrams) ||
        (item.normGrams ?? -1) < 0 ||
        item.birdCount !== birds ||
        item.expectedKg === undefined ||
        Math.abs(
          item.expectedKg -
          birds * (item.normGrams ?? 0) / 1000
        ) > EPS
      ) {
        throw new Error("Yem me'yori hisobida xatolik bor.");
      }
    }
if (
  item.batchId &&
  consumptions.some(
    (existing) =>
      existing.batchId === item.batchId &&
      existing.locationId === item.locationId &&
      existing.date.slice(0, 10) === item.date.slice(0, 10)
  )
) {
  throw new Error(
    "Bu partiyaga ushbu sana uchun yem allaqachon berilgan."
  );
}
    const candidate: FeedConsumption = {
      ...item,
      locationName: location.name,
      note: item.note.trim(),
    };

    const next = [...consumptions, candidate];

    // Validate all affected historical balances, including
    // backdated consumption.
    const dates = new Set<string>([
      operationDay,
      today(),
    ]);

    for (const t of transfers) {
      const d = dayOf(t.date);
      if (d >= operationDay && d <= today()) dates.add(d);
    }

    for (const c of next) {
      const d = dayOf(c.date);
      if (d >= operationDay && d <= today()) dates.add(d);
    }

    for (const date of dates) {
      const balances = calculateBalances(date, next);

      if (balances.some((b) => b.remaining < -EPS)) {
        throw new Error(
          "Bu yem sarfi tanlangan sanada yoki undan keyin " +
          "ferma zaxirasini manfiy qiladi."
        );
      }
    }

    setConsumptions(next);
  }

  const balances = calculateBalances(
    today(),
    consumptions
  );

  return (
    <FarmFeedContext.Provider
      value={{
        consumptions,
        balances,
        addConsumption,
        getBalancesAsOf: (date) =>
          calculateBalances(dayOf(date), consumptions),
        getBatchConsumptions: (batchId) =>
          consumptions
            .filter((c) => c.batchId === batchId)
            .sort((a, b) => b.date.localeCompare(a.date)),
      }}
    >
      {children}
    </FarmFeedContext.Provider>
  );
}

export function useFarmFeed() {
  const context = useContext(FarmFeedContext);

  if (!context) {
    throw new Error(
      "FarmFeedProvider mavjud emas."
    );
  }

  return context;
}
