import type { FeedConsumption } from '../context/FarmFeedContext';
import type { FeedLot } from '../context/WarehouseContext';
import type { FeedTransfer } from '../types/warehouse';

/**
 * Reconstructs feed physically received and used at each farm.
 * FIFO within each (location, feed type, recipe), preserving source-lot prices.
 * Existing feed-lot costs are calculated from the CURRENT master-data prices:
 * these are estimates, not immutable historical acquisition costs.
 * Incomplete stock provenance never becomes a fabricated zero cost.
 */
export interface FeedCostResult {
  consumptionId: string;
  batchId?: string;
  date: string;
  quantity: number;
  valuedQuantity: number;
  estimatedCost: number;
  complete: boolean;
}

const day = (value: string) => value.slice(0, 10);
const key = (type: string, recipe: string) => JSON.stringify([type, recipe]);
const EPS = 0.000001;

export function calculateFeedCosts(
  consumptions: FeedConsumption[],
  transfers: FeedTransfer[],
  feedLots: FeedLot[],
  locationIdByName: Map<string, string>,
): FeedCostResult[] {
  type Item = { date: string; kind: 'transfer' | 'usage'; id: string; transfer?: FeedTransfer; usage?: FeedConsumption };
  type Stock = { remaining: number; unitCost: number | null };
  const lots = new Map(feedLots.map(lot => [lot.id, lot]));
  const ledger: Item[] = [
    ...transfers.filter(t => t.status !== 'draft').map(t => ({ date: day(t.date), kind: 'transfer' as const, id: t.id, transfer: t })),
    ...consumptions.map(c => ({ date: day(c.date), kind: 'usage' as const, id: c.id, usage: c })),
  ].sort((a, b) => a.date.localeCompare(b.date) ||
    (a.kind === b.kind ? 0 : a.kind === 'transfer' ? -1 : 1) || a.id.localeCompare(b.id));

  const buckets = new Map<string, Stock[]>();
  const results: FeedCostResult[] = [];

  for (const item of ledger) {
    if (item.transfer) {
      const transfer = item.transfer;
      const locationId = locationIdByName.get(transfer.to);
      const lot = lots.get(transfer.productionId);
      if (!locationId || !lot || !Number.isFinite(transfer.quantity) || transfer.quantity <= 0) continue;
      const stockKey = JSON.stringify([locationId, key(lot.feedType, lot.recipeName)]);
      const list = buckets.get(stockKey) ?? [];
      list.push({
        remaining: transfer.quantity,
        unitCost: Number.isFinite(lot.unitCost) && lot.unitCost >= 0 ? lot.unitCost : null,
      });
      buckets.set(stockKey, list);
    } else if (item.usage) {
      const usage = item.usage;
      const stockKey = JSON.stringify([usage.locationId, key(usage.feedType, usage.recipeName)]);
      const stocks = buckets.get(stockKey) ?? [];
      let outstanding = usage.quantity;
      let valuedQuantity = 0;
      let estimatedCost = 0;
      for (const stock of stocks) {
        if (outstanding <= EPS) break;
        const taken = Math.min(outstanding, Math.max(0, stock.remaining));
        if (taken <= EPS) continue;
        stock.remaining -= taken;
        outstanding -= taken;
        if (stock.unitCost !== null) {
          valuedQuantity += taken;
          estimatedCost += taken * stock.unitCost;
        }
      }
      results.push({
        consumptionId: usage.id,
        batchId: usage.batchId,
        date: day(usage.date),
        quantity: usage.quantity,
        valuedQuantity,
        estimatedCost,
        complete: outstanding <= EPS && Math.abs(valuedQuantity - usage.quantity) <= EPS,
      });
    }
  }
  return results;
}
