import type { MedicinePurchase, MedicineUsage } from '../context/VeterinaryInventoryContext';

export interface ValuedMedicineUsage {
  usageId: string;
  batchId: string;
  date: string;
  medicineName: string;
  quantity: number;
  valuedQuantity: number;
  estimatedCost: number;
  complete: boolean;
}

/**
 * FIFO medicine inventory costing from actual purchase unit prices.
 * Purchases may be entered today only in the current UI. This function still
 * respects stored transaction dates and does not value usage before a purchase.
 * No inventory is mutated; this is a read-only management estimate.
 */
export function calculateMedicineCosts(
  purchases: MedicinePurchase[],
  usages: MedicineUsage[],
): ValuedMedicineUsage[] {
  const day = (date: string) => date.slice(0, 10);
  type Lot = { day: string; id: string; left: number; unitPrice: number };
  const lots = new Map<string, Lot[]>();
  for (const purchase of purchases) {
    if (!Number.isFinite(purchase.quantity) || purchase.quantity <= 0 ||
        !Number.isFinite(purchase.unitPrice) || purchase.unitPrice < 0) continue;
    const stock = lots.get(purchase.medicineId) ?? [];
    stock.push({ day: day(purchase.date), id: purchase.id, left: purchase.quantity, unitPrice: purchase.unitPrice });
    lots.set(purchase.medicineId, stock);
  }
  for (const stock of lots.values()) stock.sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));

  const results: ValuedMedicineUsage[] = [];
  const sorted = [...usages].sort((a, b) =>
    day(a.date).localeCompare(day(b.date)) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const usage of sorted) {
    if (!Number.isFinite(usage.quantity) || usage.quantity <= 0) continue;
    let needed = usage.quantity;
    let cost = 0;
    for (const lot of lots.get(usage.medicineId) ?? []) {
      if (lot.day > day(usage.date) || needed <= 0) break;
      const take = Math.min(needed, Math.max(0, lot.left));
      needed -= take;
      lot.left -= take;
      cost += take * lot.unitPrice;
    }
    results.push({
      usageId: usage.id,
      batchId: usage.batchId,
      date: day(usage.date),
      medicineName: usage.medicineName,
      quantity: usage.quantity,
      valuedQuantity: usage.quantity - needed,
      estimatedCost: cost,
      complete: needed <= 0.000001,
    });
  }
  return results;
}
