import { useMemo, useState, type FormEvent } from 'react';
import { usePoultry, type PoultryBatch, type BatchPaymentMethod } from '../../context/PoultryContext';
import { useLocations } from '../../context/LocationsContext';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';
import MoneyInput from '../ui/MoneyInput';

function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
export default function LiveBirdSalePanel({ batch, allowedLocationIds }: { batch: PoultryBatch; allowedLocationIds?: string[] }) {
  const { events, getBalances, getBalanceAsOf, addLiveSale } = usePoultry();
  const { locations } = useLocations();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [locationId, setLocationId] = useState('');
  const [count, setCount] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [method, setMethod] = useState<BatchPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const permitted = (id: string) => !allowedLocationIds || allowedLocationIds.includes(id);
  const balances = getBalances(batch.id).filter(b => b.quantity > 0 && permitted(b.locationId));
  const sales = useMemo(() => events.filter(e => e.batchId === batch.id && e.type === 'live-sale' && permitted(e.fromLocationId))
    .sort((a,b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date)), [events,batch.id]);
  const totalRevenue = sales.reduce((s,e) => s + e.quantity * (e.unitPrice ?? 0),0);
  const soldCount = sales.reduce((s,e) => s + e.quantity,0);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    try {
      const quantity = Number(count), price = Number(unitPrice);
      if (!locationId || !permitted(locationId)) throw new Error("Ushbu bo'limdan sotish mumkin emas.");
      if (!Number.isInteger(quantity) || quantity <= 0 || !count.trim()) throw new Error("Sotiladigan sonni to'g'ri kiriting.");
      if (!unitPrice.trim() || !Number.isFinite(price) || price < 0) throw new Error("Narxni to'g'ri kiriting.");
      addLiveSale(batch.id, locationId, quantity, price, method, date, note);
      setOpen(false); setCount(''); setUnitPrice(''); setNote('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Saqlashda xatolik.'); }
  }
  return <section className="rounded-xl border border-border-custom p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-semibold">Tirik parranda sotish</h3>
        <p className="mt-1 text-xs text-muted">Tirik sotilgan qushlar qoldiqdan ayriladi; tushum Moliya pul harakatlariga ulanadi. Bu hali yakuniy sof foyda emas.</p></div>
      {batch.status === 'active' && balances.length > 0 && <button type="button" className="primary-button" onClick={() => {setDate(today());setLocationId(balances[0]?.locationId ?? '');setError('');setOpen(true);}}>+ Tirik sotish</button>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border-custom p-3"><p className="text-xs text-muted">Sotilgan tirik parrandalar</p><p className="mt-1 text-xl font-bold">{formatNumber(soldCount)} ta</p></div>
      <div className="rounded-lg border border-border-custom p-3"><p className="text-xs text-muted">Sotish tushumi</p><p className="mt-1 text-xl font-bold">{formatMoney(totalRevenue)}</p></div>
    </div>
    {sales.length > 0 && <div className="overflow-x-auto"><table className="erp-table min-w-[650px] w-full"><thead><tr><th>Sana</th><th>Joylashuv</th><th>Soni</th><th>Birlik narxi</th><th>Jami</th><th>Usul</th></tr></thead><tbody>
      {sales.map(s => <tr key={s.id}><td>{s.date}</td><td>{locations.find(l=>l.id===s.fromLocationId)?.name ?? s.fromLocationId}</td><td>{formatNumber(s.quantity)} ta</td><td>{formatMoney(s.unitPrice ?? 0)}</td><td>{formatMoney(s.quantity * (s.unitPrice ?? 0))}</td><td>{s.paymentMethod === 'cash' ? 'Naqd' : s.paymentMethod === 'card' ? 'Karta' : 'Bank'}</td></tr>)}
    </tbody></table></div>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div role="dialog" aria-modal="true" aria-label="Tirik parranda sotish" className="surface-card max-h-[90vh] w-full max-w-[540px] overflow-y-auto p-5">
        <h3 className="text-lg font-semibold mb-4">{batch.code} — tirik parranda sotish</h3>
        <form onSubmit={save} className="space-y-4">
          <div><label className="form-label">Sotish sanasi *</label><input required type="date" min={batch.arrivalDate} max={today()} className="form-input" value={date} onChange={e=>setDate(e.target.value)} /></div>
          <div><label className="form-label">Qaysi joylashuvdan *</label><select required className="form-input" value={locationId} onChange={e=>setLocationId(e.target.value)}><option value="">Tanlang</option>{balances.map(b=><option key={b.locationId} value={b.locationId}>{locations.find(l=>l.id===b.locationId)?.name ?? b.locationId} — hozir {b.quantity} ta</option>)}</select></div>
          <div><p className="text-xs text-muted">Tanlangan sanada: {locationId ? formatNumber(getBalanceAsOf(batch.id,locationId,date)) : '—'} ta (shu kundagi operatsiyalar hisobga olingan)</p></div>
          <div><label className="form-label">Sotiladigan son *</label><input required type="number" min="1" step="1" className="form-input" value={count} onChange={e=>setCount(e.target.value)}/></div>
          <div><label className="form-label">Bir dona narxi (so'm) *</label><MoneyInput required min={0} className="form-input" value={unitPrice} onChange={setUnitPrice}/></div>
          <div className="rounded-lg border border-border-custom p-3"><span className="text-sm text-muted">Jami tushum: </span><strong>{formatMoney((Number(count)||0)*(Number(unitPrice)||0))}</strong></div>
          <div><label className="form-label">To'lov usuli *</label><select className="form-input" value={method} onChange={e=>setMethod(e.target.value as BatchPaymentMethod)}><option value="cash">Naqd</option><option value="card">Karta</option><option value="bank">Bank</option></select></div>
          <p className="text-xs text-muted">Bu bosqichda faqat to'liq to'langan sotuvlar qayd etiladi. Nasiya savdo hali ulanmagan.</p>
          <div><label className="form-label">Izoh</label><textarea className="form-input" value={note} onChange={e=>setNote(e.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>Bekor qilish</button><button type="submit" className="primary-button">Saqlash</button></div>
        </form>
      </div></div>}
  </section>;
}
