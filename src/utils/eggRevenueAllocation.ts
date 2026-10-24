/**
 * Read-only, provisional FIFO attribution. NEVER changes inventory or sales.
 * Not a booked profit/loss number: older opening stock and same-day order may
 * be unknown, and edited historical production can change allocations.
 */
export const EGG_CATEGORY_KEYS = ['category1', 'category2', 'category3', 'category4'] as const;
export type EggCategoryKey = (typeof EGG_CATEGORY_KEYS)[number];

export interface AttributionProduction {
  id: string;
  date: string;
  batchId: string;
  locationId: string;
  category1: number;
  category2: number;
  category3: number;
  category4: number;
}
export interface AttributionSale {
  id: string;
  date: string;
  createdAt?: string;
  lines: ReadonlyArray<{ category: EggCategoryKey; quantity: number; unitPrice: number }>;
}
export interface AttributedBatchRevenue {
  batchId: string;
  quantity: number;
  revenue: number;
}
export interface AttributionResult {
  batches: AttributedBatchRevenue[];
  allocatedQuantity: number;
  allocatedRevenue: number;
  unallocatedQuantity: number;
  unallocatedRevenue: number;
  soldQuantity: number;
  soldRevenue: number;
  sameDayAllocation: boolean;
}

export function allocateEggRevenueFIFO(
  productions: readonly AttributionProduction[],
  sales: readonly AttributionSale[],
): AttributionResult {
  const lots = EGG_CATEGORY_KEYS.flatMap((category) =>
    productions.flatMap((p) => {
      const quantity = p[category];
      return Number.isSafeInteger(quantity) && quantity > 0
        ? [{ id: p.id, date: p.date, batchId: p.batchId, category, remaining: quantity }]
        : [];
    }),
  ).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const results = new Map<string, AttributedBatchRevenue>();
  let allocatedQuantity = 0;
  let allocatedRevenue = 0;
  let unallocatedQuantity = 0;
  let unallocatedRevenue = 0;
  let soldQuantity = 0;
  let soldRevenue = 0;
  let sameDayAllocation = false;

  const sortedSales = [...sales].sort((a, b) =>
    a.date.localeCompare(b.date) ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
    a.id.localeCompare(b.id),
  );
  for (const sale of sortedSales) {
    for (const line of sale.lines) {
      if (!EGG_CATEGORY_KEYS.includes(line.category) || !Number.isSafeInteger(line.quantity) ||
          line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0) continue;
      soldQuantity += line.quantity;
      soldRevenue += line.quantity * line.unitPrice;
      let needed = line.quantity;
      for (const lot of lots) {
        if (needed === 0) break;
        if (lot.category !== line.category || lot.date > sale.date || lot.remaining <= 0) continue;
        const take = Math.min(needed, lot.remaining);
        if (lot.date === sale.date) sameDayAllocation = true;
        lot.remaining -= take;
        needed -= take;
        allocatedQuantity += take;
        allocatedRevenue += take * line.unitPrice;
        const previous = results.get(lot.batchId) ?? { batchId: lot.batchId, quantity: 0, revenue: 0 };
        previous.quantity += take;
        previous.revenue += take * line.unitPrice;
        results.set(lot.batchId, previous);
      }
      unallocatedQuantity += needed;
      unallocatedRevenue += needed * line.unitPrice;
    }
  }
  return {
    batches: [...results.values()].sort((a, b) => b.revenue - a.revenue),
    allocatedQuantity, allocatedRevenue, unallocatedQuantity, unallocatedRevenue,
    soldQuantity, soldRevenue, sameDayAllocation,
  };
}
