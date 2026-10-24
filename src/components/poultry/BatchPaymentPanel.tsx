import { useState, type FormEvent } from 'react';
import { CreditCard, X } from 'lucide-react';
import { usePoultry, type PoultryBatch, type BatchPaymentMethod } from '../../context/PoultryContext';
import MoneyInput from '../ui/MoneyInput';
import { formatMoney } from '../../context/WarehouseContext';

const methods: Record<BatchPaymentMethod, string> = {
  cash: 'Naqd', card: 'Karta', bank: "Bank o'tkazmasi",
};
function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Bir xil partiya to'lov paneli LY va BR sahifalarda qayta ishlatiladi. */
export default function BatchPaymentPanel({ batch }: { batch: PoultryBatch }) {
  const { purchasePayments, addPurchasePayment, getBatchPaidAmount, getBatchDebt } = usePoultry();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(localDay);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BatchPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const paid = getBatchPaidAmount(batch.id);
  const debt = getBatchDebt(batch.id);
  const total = batch.initialCount * batch.pricePerChick;
  const history = purchasePayments.filter(p => p.batchId === batch.id)
    .sort((a,b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date));

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || debt === null || n > debt + 0.001) {
      setError("To'lov summasi qolgan qarzdan oshmasligi kerak."); return;
    }
    try {
      addPurchasePayment({ id: crypto.randomUUID(), batchId: batch.id, date,
        amount: n, method, note: note.trim(), createdAt: new Date().toISOString() });
      setOpen(false); setAmount(''); setNote('');
    } catch(err) { setError(err instanceof Error ? err.message : "To'lovni saqlash xatosi."); }
  }

  return <section className="space-y-4 rounded-xl border border-border-custom p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-base font-semibold">Jo'ja xaridi to'lovlari</h3>
      {debt !== null && debt > 0.001 && <button type="button" className="primary-button" onClick={() => { setError(''); setDate(localDay()); setOpen(true); }}>
        <CreditCard size={16}/> To'lov qilish
      </button>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div><p className="text-xs text-muted">Jami xarid</p><p className="font-semibold">{formatMoney(total)}</p></div>
      <div><p className="text-xs text-muted">To'langan</p><p className="font-semibold !text-emerald-600">{paid === null ? 'Noma’lum' : formatMoney(paid)}</p></div>
      <div><p className="text-xs text-muted">Qolgan qarz</p><p className="font-semibold !text-red-600">{debt === null ? 'Aniqlanmagan' : formatMoney(debt)}</p></div>
    </div>
    {paid === null && <p className="text-sm text-muted">Eski partiyaning to'lov ma'lumoti yo'q. Qarz avtomatik hisoblanmaydi.</p>}
    {history.length > 0 && <div className="overflow-x-auto"><table className="erp-table w-full min-w-[560px]"><thead><tr><th>Sana</th><th>To'lov usuli</th><th>Summa</th><th>Izoh</th></tr></thead><tbody>{history.map(p => <tr key={p.id}><td>{p.date}</td><td>{methods[p.method]}</td><td><span className="font-semibold !text-emerald-600">{formatMoney(p.amount)}</span></td><td>{p.note || '—'}</td></tr>)}</tbody></table></div>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={e => { if(e.target === e.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Jo'ja xaridi qarzini to'lash" className="surface-card w-full max-w-[530px] space-y-4 p-5">
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{batch.code} — qarzni to'lash</h3><button type="button" className="secondary-button !min-h-8 !px-2" onClick={() => setOpen(false)}><X size={17}/></button></div>
        <p className="text-sm text-muted">Qolgan qarz: <strong>{formatMoney(debt ?? 0)}</strong></p>
        <form className="space-y-4" onSubmit={save}>
          <div><label className="form-label">To'lov sanasi</label><input className="form-input" type="date" min={batch.arrivalDate.slice(0,10)} max={localDay()} required value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div><label className="form-label">To'lov summasi (so'm)</label><MoneyInput required min={0} className="form-input" value={amount} onChange={setAmount} placeholder="Summani kiriting" /></div>
          <div><label className="form-label">To'lov usuli</label><select className="form-input" value={method} onChange={e=>setMethod(e.target.value as BatchPaymentMethod)}>{Object.entries(methods).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
          <div><label className="form-label">Izoh</label><textarea className="form-input" value={note} onChange={e=>setNote(e.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>Bekor qilish</button><button className="primary-button" type="submit">To'lovni saqlash</button></div>
        </form>
      </div>
    </div>}
  </section>;
}
