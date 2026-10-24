import { useMemo } from 'react';
import { useEggProduction } from '../../context/EggProductionContext';
import { useEggInventory } from '../../context/EggInventoryContext';
import { usePoultry } from '../../context/PoultryContext';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';
import { allocateEggRevenueFIFO } from '../../utils/eggRevenueAllocation';

export default function EggRevenueAttributionPanel() {
  const { records } = useEggProduction();
  const { sales } = useEggInventory();
  const { batches } = usePoultry();
  const report = useMemo(() => allocateEggRevenueFIFO(records, sales), [records, sales]);
  const names = useMemo(() => new Map(batches.map((batch) => [batch.id, batch.code])), [batches]);

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h2 className="section-title">Tuxum savdosining LY partiyalarga taqsimoti (taxminiy FIFO)</h2>
        <p className="mt-1 text-xs text-muted">
          Bu faqat hisobot: mavjud savdo, to'lov va ombor yozuvlari o'zgartirilmaydi.
          Bir kategoriya ichida avval yig'ilgan tuxum avval sotilgan deb hisoblanadi.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-custom p-4"><p className="text-xs text-muted">Taqsimlangan tuxum</p><p className="mt-2 font-semibold">{formatNumber(report.allocatedQuantity)} ta</p></div>
        <div className="rounded-xl border border-border-custom p-4"><p className="text-xs text-muted">Taqsimlangan savdo qiymati</p><p className="mt-2 font-semibold">{formatMoney(report.allocatedRevenue)}</p></div>
        <div className="rounded-xl border border-border-custom p-4"><p className="text-xs text-muted">Manbasi aniqlanmagan savdo</p><p className="mt-2 font-semibold">{formatNumber(report.unallocatedQuantity)} ta / {formatMoney(report.unallocatedRevenue)}</p></div>
      </div>
      <div className="overflow-x-auto">
        <table className="erp-table min-w-[560px] w-full">
          <thead><tr><th>LY partiya</th><th>Taqsimlangan tuxum</th><th className="text-right">Savdo qiymati</th></tr></thead>
          <tbody>{report.batches.map((item) => (
            <tr key={item.batchId}><td className="font-semibold">{names.get(item.batchId) ?? item.batchId}</td><td>{formatNumber(item.quantity)} ta</td><td className="text-right">{formatMoney(item.revenue)}</td></tr>
          ))}</tbody>
        </table>
        {report.batches.length === 0 && <p className="p-4 text-sm text-muted">Partiyalarga bog'lash uchun tuxum yig'imi va savdo yozuvlari topilmadi.</p>}
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Diqqat: bu tasdiqlangan partiya daromadi yoki sof foyda emas. Eski ombor boshlang'ich qoldig'i,
        aralash yig'imlar va bir kun ichidagi amallar ketma-ketligi aniqlanmagan bo'lishi mumkin.
        {report.sameDayAllocation ? " Bir kun ichidagi yig'im va savdo tartibi noma'lum." : ''}
        Tarixiy yig'imlar tahrirlansa, taxminiy taqsimot qayta hisoblanadi.
      </p>
    </section>
  );
}
