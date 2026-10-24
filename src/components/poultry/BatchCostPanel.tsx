import { useMemo } from 'react';
import { usePoultry } from '../../context/PoultryContext';
import { useFarmFeed } from '../../context/FarmFeedContext';
import { useLocations } from '../../context/LocationsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { calculateFeedCosts } from '../../utils/feedCost';
import { calculateMedicineCosts } from '../../utils/medicineCost';
import { useVeterinaryInventory } from '../../context/VeterinaryInventoryContext';
import { useVeterinary } from '../../context/VeterinaryContext';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';
import { calculateBatchCost, type DatedBatchCost } from '../../utils/batchCost';

interface Props { batchId: string; locationId?: string }

function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-');
}

/** Phase 1: identifiable mortality loss, not yet a full profit/loss ledger. */
export default function BatchCostPanel({ batchId, locationId }: Props) {
  const { batches, events } = usePoultry();
  const { records } = useVeterinary();
  const { purchases: medicinePurchases, usages: medicineUsages } = useVeterinaryInventory();
  const medicineCosts = useMemo(() => calculateMedicineCosts(medicinePurchases, medicineUsages), [medicinePurchases, medicineUsages]);
  const batchMedicine = medicineCosts.filter(c => c.batchId === batchId);
  const incompleteMedicine = batchMedicine.some(c => !c.complete);
  const totalMedicineValued = batchMedicine.reduce((n, c) => n + c.estimatedCost, 0);
  const { consumptions } = useFarmFeed();
  const { transfers, feedLots } = useWarehouse();
  const { locations } = useLocations();
  const feedCosts = useMemo(() => calculateFeedCosts(
    consumptions, transfers, feedLots, new Map(locations.map(l => [l.name, l.id]))
  ), [consumptions, transfers, feedLots, locations]);
  const incompleteFeed = feedCosts.some(c => c.batchId === batchId && !c.complete);
  const pricedFeed = feedCosts.filter(c => c.batchId === batchId && c.valuedQuantity > 0);
  const totalFeedValued = pricedFeed.reduce((n, c) => n + c.estimatedCost, 0);
  const batch = batches.find(b => b.id === batchId);
  const report = useMemo(() => {
    if (!batch) return null;
    const datedCosts = records.filter(r => r.batchId === batchId && r.amount > 0)
      .map(r => ({ id: r.id, batchId: r.batchId, date: r.date,
        amount: r.amount, category: 'veterinary-service' as const }));
    const withFeed: DatedBatchCost[] = [...datedCosts, ...feedCosts
      .filter(c => c.batchId === batchId && c.valuedQuantity > 0)
      .map(c => ({ id: `feed-${c.consumptionId}`, batchId, date: c.date,
        amount: c.estimatedCost, category: 'feed' as const }))];
    const withMedicine: DatedBatchCost[] = [...withFeed, ...batchMedicine
      .filter(c => c.valuedQuantity > 0)
      .map(c => ({ id: `medicine-${c.usageId}`, batchId, date: c.date,
        amount: c.estimatedCost, category: 'medicine' as const }))];
    return calculateBatchCost(batch, events, withMedicine, today());
  }, [batch, batchId, events, records, feedCosts, medicineCosts]);
  if (!batch || !report) return null;
  const displayedRows = locationId ? report.rows.filter(row => row.locationId === locationId) : report.rows;
  const displayedCount = displayedRows.reduce((sum, row) => sum + row.quantity, 0);
  const displayedPurchaseLoss = displayedRows.reduce((sum, row) => sum + row.purchaseLoss, 0);
  const displayedTotalLoss = displayedRows.reduce((sum, row) => sum + row.identifiedLoss, 0);
  const displayedFeedLoss = displayedRows.reduce((sum, row) => sum + row.allocatedFeedLoss, 0);
  const displayedMedicineLoss = displayedRows.reduce((sum, row) => sum + row.allocatedMedicineLoss, 0);
  const displayedServiceLoss = displayedRows.reduce((sum, row) => sum + row.allocatedServiceLoss, 0);
  return (
    <section className="space-y-4 rounded-xl border border-border-custom p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold">Nobud bo‘lish — aniqlangan iqtisodiy yo‘qotish</h3>
        <p className="mt-1 text-xs text-muted">
          {locationId ? "Faqat tanlangan tuxum fermasidagi nobud bo‘lishlar. Xarajatlar avval umumiy LY partiya kesimida taqsimlanadi." : "Barcha joylashuvlardagi nobud bo‘lishlar."} Bosqich 3: jo‘ja xaridi, veterinariya xizmati, yem va dori-vaksina sarflarining
          taxminiy tannarxi asosida hisob. Bu hali to‘liq foyda/zarar emas.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border-custom p-3">
          <p className="text-xs text-muted">Nobud bo‘lgan</p>
          <p className="mt-1 text-lg font-bold">{formatNumber(displayedCount)} ta</p>
        </div>
        <div className="rounded-lg border border-border-custom p-3">
          <p className="text-xs text-muted">Jo‘jalar xarid qiymati yo‘qotilishi</p>
          <p className="mt-1 text-lg font-bold !text-red-600 dark:!text-red-400">{formatMoney(displayedPurchaseLoss)}</p>
        </div>
        <div className="rounded-lg border border-border-custom p-3">
          <p className="text-xs text-muted">Jami aniqlangan yo‘qotish</p>
          <p className="mt-1 text-lg font-bold !text-red-600 dark:!text-red-400">{formatMoney(displayedTotalLoss)}</p>
        </div>
      </div>
      <p className="text-xs text-muted">
        Yem sarfi bo‘yicha hisoblangan jami taxminiy qiymat: {formatMoney(totalFeedValued)}.
        Nobud bo‘lganlarga ajratilgan yem ulushi: {formatMoney(displayedFeedLoss)}.
        {incompleteFeed ? ' Ayrim yem sarflarining omborga kelish manbai yoki narxi to‘liq topilmadi.' : ''}
        {' '}Dori/vaksina sarflarining baholangan jami qiymati: {formatMoney(totalMedicineValued)}.
        Nobud bo‘lganlarga ajratilgan dori/vaksina ulushi: {formatMoney(displayedMedicineLoss)}.
        {incompleteMedicine ? ' Ayrim dori/vaksina sarflari uchun o‘sha sanadagi xarid partiyasi yetarli emas.' : ''}
        {' '}Veterinariya xizmatlari ulushi: {formatMoney(displayedServiceLoss)}.
        Har bir xizmat xarajati shu kundagi tirik qushlar soniga teng ulushlarda
        taqsimlandi; kun ichida xizmat nobud bo‘lishdan oldin deb olindi.
      </p>
      <div className="overflow-x-auto">
        <table className="erp-table min-w-[1050px] w-full">
          <thead><tr>
            <th>Sana</th><th>Joylashuv ID</th><th>Nobud</th>
            <th>Jo‘ja qiymati</th><th>Yem ulushi (taxminiy)</th><th>Dori/vaksina ulushi</th><th>Vet. xizmat ulushi</th><th>Jami</th>
          </tr></thead>
          <tbody>
            {displayedRows.map(row => <tr key={row.id}>
              <td>{row.date}</td><td>{locations.find(l => l.id === row.locationId)?.name ?? row.locationId}</td>
              <td>{formatNumber(row.quantity)} ta</td>
              <td>{formatMoney(row.purchaseLoss)}</td>
              <td>{formatMoney(row.allocatedFeedLoss)}</td>
              <td>{formatMoney(row.allocatedMedicineLoss)}</td>
              <td>{formatMoney(row.allocatedServiceLoss)}</td>
              <td><strong className="!text-red-600 dark:!text-red-400">{formatMoney(row.identifiedLoss)}</strong></td>
            </tr>)}
          </tbody>
        </table>
        {!displayedRows.length && <p className="p-4 text-center text-sm text-muted">Nobud bo‘lish qayd etilmagan.</p>}
      </div>
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <p className="text-sm font-semibold">To‘liq iqtisodiy hisob uchun hali ulanmagan:</p>
        <p className="mt-1 text-xs text-muted">{report.incompleteCategories.join('; ')}.</p>
        <p className="mt-2 text-xs text-muted">Dori va vaksina bahosi xarid partiyalarining saqlangan birlik narxidan FIFO asosida olinadi. Narxi topilmagan miqdor bahoga kiritilmaydi; bir kunda qilingan sarf nobud bo‘lishdan oldin deb faraz qilinadi.</p>
        <p className="mt-2 text-xs text-muted">Yemning unitCost qiymati joriy katalog narxidan qayta hisoblanishi mumkin; eski yozuvlarda tarixiy narx saqlanmagan. Shuning uchun yem ulushi taxminiy bo‘lib, haqiqiy tarixiy tannarx sifatida talqin qilinmaydi.</p>
        <p className="mt-2 text-xs text-muted">
          Ushbu hisob Moliyaga qayta pul chiqimi yozmaydi va allaqachon tuxum tannarxiga
          o‘tkazilgan qiymatni ayirish mexanizmini hali bajarmaydi.
        </p>
      </div>
    </section>
  );
}
