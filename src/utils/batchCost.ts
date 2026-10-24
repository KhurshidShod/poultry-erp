import type { PoultryBatch, PoultryEvent } from '../context/PoultryContext';

/** Costs with a verifiable batch/date/amount. Never use supplier payments as costs again. */
export interface DatedBatchCost {
  id: string;
  batchId: string;
  date: string;
  amount: number;
  category: 'veterinary-service' | 'feed' | 'medicine' | 'other';
}

export interface MortalityCostRow {
  id: string;
  date: string;
  locationId: string;
  quantity: number;
  purchaseLoss: number;
  allocatedServiceLoss: number;
  allocatedFeedLoss: number;
  allocatedMedicineLoss: number;
  identifiedLoss: number;
}

export interface BatchCostReport {
  batchId: string;
  acquisitionCost: number;
  totalMortality: number;
  purchaseLoss: number;
  allocatedServiceLoss: number;
  allocatedFeedLoss: number;
  allocatedMedicineLoss: number;
  identifiedMortalityLoss: number;
  remainingBirds: number;
  serviceCostToDate: number;
  estimatedFeedCostToDate: number;
  estimatedMedicineCostToDate: number;
  rows: MortalityCostRow[];
  /** This is an identified-cost estimate, NOT full economic loss. */
  incompleteCategories: string[];
}

const day = (value: string) => value.slice(0, 10);

/**
 * Batch-level allocation convention:
 * - The unit purchase cost stays attached to each bird.
 * - Dated service costs are shared equally among birds alive at the start of that day.
 * - Mortality is processed after that day's service spending.
 * - Later costs do not affect earlier deaths.
 * - Transfers are excluded: birds keep their cost when changing locations.
 * Does NOT deduct costs from cashflow, create ledger entries, or claim full IFRS valuation.
 */
export function calculateBatchCost(
  batch: PoultryBatch,
  allEvents: PoultryEvent[],
  allCosts: DatedBatchCost[],
  asOf: string
): BatchCostReport {
  const end = day(asOf);
  const start = day(batch.arrivalDate);
  const acquisitionCost = batch.initialCount * batch.pricePerChick;
  const mortality = allEvents.filter(e =>
    e.batchId === batch.id && e.type === 'mortality' &&
    day(e.date) >= start && day(e.date) <= end && e.quantity > 0
  );
  const sold = allEvents.filter(e => e.batchId === batch.id && e.type === 'live-sale' &&
    day(e.date) >= start && day(e.date) <= end && e.quantity > 0);
  const slaughter = allEvents.filter(e =>
    e.batchId === batch.id && e.type === 'slaughter' &&
    day(e.date) >= start && day(e.date) <= end && e.quantity > 0
  );
  const costs = allCosts.filter(c =>
    c.batchId === batch.id && day(c.date) >= start && day(c.date) <= end &&
    Number.isFinite(c.amount) && c.amount >= 0
  );
  const dates = [...new Set([...mortality, ...slaughter, ...sold, ...costs].map(e => day(e.date)))].sort();
  let alive = batch.initialCount;
  let unitAccumulatedCost = 0;
  let serviceCostToDate = 0;
  let estimatedFeedCostToDate = 0;
  let unitAccumulatedFeed = 0;
  let unitAccumulatedMedicine = 0;
  let estimatedMedicineCostToDate = 0;
  const rows: MortalityCostRow[] = [];
  for (const date of dates) {
    const expenses = costs.filter(c => day(c.date) === date);
    const costToday = expenses.reduce((s, e) => s + e.amount, 0);
    const feedToday = expenses.filter(e => e.category === 'feed').reduce((sum, e) => sum + e.amount, 0);
    const medicineToday = expenses.filter(e => e.category === 'medicine').reduce((sum, e) => sum + e.amount, 0);
    const servicesToday = costToday - feedToday - medicineToday;
    serviceCostToDate += servicesToday;
    estimatedFeedCostToDate += feedToday;
    estimatedMedicineCostToDate += medicineToday;
    if (alive > 0) {
      unitAccumulatedCost += servicesToday / alive;
      unitAccumulatedFeed += feedToday / alive;
      unitAccumulatedMedicine += medicineToday / alive;
    }
    // Allocation on identical dates is inherently approximate without timestamps.
    for (const event of mortality.filter(e => day(e.date) === date)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      const qty = Math.min(Math.max(0, alive), event.quantity);
      if (!qty) continue;
      rows.push({
        id: event.id,
        date,
        locationId: event.fromLocationId,
        quantity: qty,
        purchaseLoss: qty * batch.pricePerChick,
        allocatedServiceLoss: qty * unitAccumulatedCost,
        allocatedFeedLoss: qty * unitAccumulatedFeed,
        allocatedMedicineLoss: qty * unitAccumulatedMedicine,
        identifiedLoss: qty * (batch.pricePerChick + unitAccumulatedCost + unitAccumulatedFeed + unitAccumulatedMedicine),
      });
      alive -= qty;
    }
    // Slaughtered birds are no longer alive, but are NOT a mortality loss.
    const slaughteredToday = slaughter.filter(e => day(e.date) === date)
      .reduce((s, e) => s + e.quantity, 0);
    alive = Math.max(0, alive - slaughteredToday - sold.filter(e => day(e.date) === date).reduce((s,e) => s + e.quantity, 0));
  }
  const sum = (field: 'quantity' | 'purchaseLoss' | 'allocatedServiceLoss' | 'allocatedFeedLoss' | 'allocatedMedicineLoss' | 'identifiedLoss') =>
    rows.reduce((s, row) => s + row[field], 0);
  return {
    batchId: batch.id,
    acquisitionCost,
    totalMortality: sum('quantity'),
    purchaseLoss: sum('purchaseLoss'),
    allocatedServiceLoss: sum('allocatedServiceLoss'),
    allocatedFeedLoss: sum('allocatedFeedLoss'),
    allocatedMedicineLoss: sum('allocatedMedicineLoss'),
    identifiedMortalityLoss: sum('identifiedLoss'),
    remainingBirds: alive,
    serviceCostToDate,
    estimatedFeedCostToDate,
    estimatedMedicineCostToDate,
    rows,
    incompleteCategories: [
      'Yemning tarixiy qatʼiy (narxi saqlangan) tannarxi',
      'Dori/vaksina narxi topilmagan yoki tarixiy yozuvlari yetishmaydigan sarflar',
      'Ish haqi, elektr va boshqa parvarish xarajatlari',
      'Tuxum tannarxiga ajratiladigan parranda qiymati',
    ],
  };
}
