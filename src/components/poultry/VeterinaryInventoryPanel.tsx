import { useState, type FormEvent } from 'react';

import { ChevronDown, Package, Plus, ShoppingCart, Syringe } from 'lucide-react';

import { usePoultry } from '../../context/PoultryContext';

import {
  useVeterinaryInventory,
  type MedicinePaymentMethod,
  type MedicineType,
  type MedicineUnit,
} from '../../context/VeterinaryInventoryContext';

import MoneyInput from '../ui/MoneyInput';

import DateRangeFilter, {
  presetRange,
  type DatePreset,
  type DateRange,
} from '../warehouse/DateRangeFilter';

import { formatMoney, formatNumber } from '../../context/WarehouseContext';

type Tab = 'stock' | 'purchase' | 'usage';

const METHODS: Record<MedicinePaymentMethod, string> = {
  cash: 'Naqd',
  card: 'Karta',
  bank: "Bank o'tkazmasi",
};

const UNITS: MedicineUnit[] = ['dona', 'flakon', 'ml', 'litr', 'gramm', 'kg'];

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ma'lumotni saqlashda xatolik yuz berdi.";
}

export default function VeterinaryInventoryPanel() {
  const { batches } = usePoultry();

  const {
    medicines,
    purchases,
    usages,
    balances,
    purchaseExpense,
    addMedicine,
    addPurchase,
    addUsage,
  } = useVeterinaryInventory();

  const [tab, setTab] = useState<Tab>('stock');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState<DateRange>(() => presetRange('today'));
  const [showNewMedicine, setShowNewMedicine] = useState(false);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [usageFormOpen, setUsageFormOpen] = useState(false);

  const [medicineName, setMedicineName] = useState('');
  const [medicineType, setMedicineType] = useState<MedicineType>('medicine');
  const [medicineUnit, setMedicineUnit] = useState<MedicineUnit>('dona');

  const [purchaseMedicineId, setPurchaseMedicineId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseMethod, setPurchaseMethod] =
    useState<MedicinePaymentMethod>('cash');
  const [purchaseNote, setPurchaseNote] = useState('');

  const [usageMedicineId, setUsageMedicineId] = useState('');
  const [usageBatchId, setUsageBatchId] = useState('');
  const [usageQty, setUsageQty] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');
  const [usageNote, setUsageNote] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedPurchaseMedicine = medicines.find(
    (item) => item.id === purchaseMedicineId
  );

  const selectedUsageBalance = balances.find(
    (item) => item.medicine.id === usageMedicineId
  );

  const purchaseTotal =
    (Number(purchaseQty) || 0) * (Number(purchasePrice) || 0);

  const validDateRange =
    Boolean(dateRange.start && dateRange.end) &&
    dateRange.start <= dateRange.end;

  const filteredPurchases = validDateRange
    ? purchases.filter(
        (item) => item.date >= dateRange.start && item.date <= dateRange.end
      )
    : [];

  const filteredUsages = validDateRange
    ? usages.filter(
        (item) => item.date >= dateRange.start && item.date <= dateRange.end
      )
    : [];

  const filteredPurchaseExpense = filteredPurchases.reduce(
    (sum, item) => sum + item.amount,
    0
  );


  function changeTab(next: Tab) {
    setTab(next);
    setError('');
    setSuccess('');
  }

  function saveMedicine(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      addMedicine({
        name: medicineName,
        type: medicineType,
        unit: medicineUnit,
      });

      setMedicineName('');
      setShowNewMedicine(false);
      setError('');
      setSuccess("Yangi dori yoki vaksina qo'shildi.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function savePurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      addPurchase({
        medicineId: purchaseMedicineId,
        date: today(),
        quantity: Number(purchaseQty),
        unitPrice: Number(purchasePrice),
        paymentMethod: purchaseMethod,
        supplierName,
        note: purchaseNote,
      });

      setPurchaseMedicineId('');
      setPurchaseQty('');
      setPurchasePrice('');
      setSupplierName('');
      setPurchaseNote('');
      setError('');
      setSuccess("Dori kirimi saqlandi. Xarajat Moliya bo'limida ko'rinadi.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function saveUsage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      addUsage({
        medicineId: usageMedicineId,
        batchId: usageBatchId,
        date: today(),
        quantity: Number(usageQty),
        purpose: usagePurpose,
        note: usageNote,
      });

      setUsageMedicineId('');
      setUsageBatchId('');
      setUsageQty('');
      setUsagePurpose('');
      setUsageNote('');
      setError('');
      setSuccess("Dori partiyaga sarflandi. Ombor qoldig'i kamaydi.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="surface-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Dori va vaksina ombori</h2>

          <p className="mt-1 text-xs text-muted">
            Dori kirimi, LY / BR partiyalariga sarf va qoldiqlar
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setShowNewMedicine((prev) => !prev);
            setError('');
            setSuccess('');
          }}
        >
          <Plus size={16} />
          Yangi dori / vaksina
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat
          label="Dori va vaksinalar"
          value={`${medicines.length} tur`}
        />
        <MiniStat label="Kirim hujjatlari" value={`${purchases.length} ta`} />
        <MiniStat
          label="Dori xaridlariga sarflangan"
          value={formatMoney(purchaseExpense)}
        />
      </div>

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {showNewMedicine && (
        <form
          onSubmit={saveMedicine}
          className="space-y-3 rounded-xl border border-border-custom p-4"
        >
          <h3 className="font-semibold">Yangi mahsulot</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label">Nomi *</label>
              <input
                required
                className="form-input"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                placeholder="Dori / vaksina nomi"
              />
            </div>

            <div>
              <label className="form-label">Turi</label>
              <select
                className="form-input"
                value={medicineType}
                onChange={(e) =>
                  setMedicineType(e.target.value as MedicineType)
                }
              >
                <option value="medicine">Dori</option>
                <option value="vaccine">Vaksina</option>
              </select>
            </div>

            <div>
              <label className="form-label">O'lchov birligi</label>
              <select
                className="form-input"
                value={medicineUnit}
                onChange={(e) =>
                  setMedicineUnit(e.target.value as MedicineUnit)
                }
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="primary-button">
            Saqlash
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`sales-tab ${tab === 'stock' ? 'active' : ''}`}
          onClick={() => changeTab('stock')}
        >
          <Package size={16} />
          Zaxiralar
        </button>

        <button
          type="button"
          className={`sales-tab ${tab === 'purchase' ? 'active' : ''}`}
          onClick={() => changeTab('purchase')}
        >
          <ShoppingCart size={16} />
          Dori xaridi
        </button>

        <button
          type="button"
          className={`sales-tab ${tab === 'usage' ? 'active' : ''}`}
          onClick={() => changeTab('usage')}
        >
          <Syringe size={16} />
          Partiyaga sarf
        </button>
      </div>

      {tab !== 'stock' && (
        <div className="space-y-2">
          <DateRangeFilter
            preset={datePreset}
            range={dateRange}
            onChange={(preset, range) => {
              setDatePreset(preset);
              setDateRange(range);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {tab === 'purchase'
                ? `Tanlangan davrda ${filteredPurchases.length} ta kirim`
                : `Tanlangan davrda ${filteredUsages.length} ta sarf`}
            </span>
            {tab === 'purchase' && (
              <strong className="!text-emerald-600 dark:!text-emerald-400">
                Davr xarajatlari: {formatMoney(filteredPurchaseExpense)}
              </strong>
            )}
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[650px] w-full">
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Turi</th>
                  <th>Kirim</th>
                  <th>Sarf</th>
                  <th>Qoldiq</th>
                </tr>
              </thead>

              <tbody>
                {balances.map((item) => (
                  <tr key={item.medicine.id}>
                    <td className="font-semibold">{item.medicine.name}</td>

                    <td>
                      {item.medicine.type === 'vaccine' ? 'Vaksina' : 'Dori'}
                    </td>

                    {/* KIRIM — YASHIL */}
                    <td>
                      <span className="font-semibold !text-emerald-600 dark:!text-emerald-400">
                        {formatNumber(item.purchased)} {item.medicine.unit}
                      </span>
                    </td>

                    {/* SARF — SARIQ */}
                    <td>
                      <span className="font-semibold !text-amber-600 dark:!text-amber-400">
                        {formatNumber(item.used)} {item.medicine.unit}
                      </span>
                    </td>

                    {/* QOLDIQ — 0 BO'LSA QIZIL */}
                    <td>
                      <span
                        className={`font-bold ${
                          item.remaining <= 0
                            ? '!text-red-600 dark:!text-red-400'
                            : ''
                        }`}
                      >
                        {formatNumber(item.remaining)} {item.medicine.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {balances.length === 0 && (
            <p className="text-center text-sm text-muted">
              Dori va vaksinalar hali qo'shilmagan.
            </p>
          )}
        </div>
      )}

      {tab === 'purchase' && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-border-custom">
            <button
              type="button"
              aria-expanded={purchaseFormOpen}
              aria-controls="medicine-purchase-form"
              onClick={() => setPurchaseFormOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold transition-colors hover:bg-[var(--hover-bg)]"
            >
              <span>Omborga dori kiritish</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-muted transition-transform duration-200 ${purchaseFormOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {purchaseFormOpen && (
              <form
                id="medicine-purchase-form"
                onSubmit={savePurchase}
                className="space-y-4 border-t border-border-custom p-4"
              >

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="form-label">Dori yoki vaksina *</label>
                <select
                  required
                  className="form-input"
                  value={purchaseMedicineId}
                  onChange={(e) => setPurchaseMedicineId(e.target.value)}
                >
                  <option value="">Tanlang</option>

                  {medicines
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label">Yetkazib beruvchi</label>
                <input
                  className="form-input"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nomi (ixtiyoriy)"
                />
              </div>

              <div>
                <label className="form-label">
                  Miqdor *
                  {selectedPurchaseMedicine
                    ? ` (${selectedPurchaseMedicine.unit})`
                    : ''}
                </label>

                <input
                  required
                  type="number"
                  min="0.000001"
                  step="any"
                  className="form-input"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  placeholder="Miqdor"
                />
              </div>

              <div>
                <label className="form-label">Birlik narxi (so'm) *</label>

                <MoneyInput
                  required
                  className="form-input"
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                  placeholder="Narx"
                />
              </div>

              <div>
                <label className="form-label">To'lov usuli</label>
                <select
                  className="form-input"
                  value={purchaseMethod}
                  onChange={(e) =>
                    setPurchaseMethod(e.target.value as MedicinePaymentMethod)
                  }
                >
                  {Object.entries(METHODS).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Jami xarajat</label>
                <div className="rounded-lg border border-border-custom px-3 py-2 font-semibold">
                  {formatMoney(purchaseTotal)}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Izoh</label>
              <textarea
                className="form-input min-h-[65px]"
                value={purchaseNote}
                onChange={(e) => setPurchaseNote(e.target.value)}
              />
            </div>

            <button type="submit" className="primary-button">
              <Plus size={16} />
              Kirimni saqlash
            </button>
              </form>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table min-w-[750px] w-full">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Mahsulot</th>
                  <th>Miqdor</th>
                  <th>Birlik narxi</th>
                  <th>Jami</th>
                  <th>To'lov</th>
                  <th>Yetkazib beruvchi</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredPurchases].reverse().map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.medicineName}</td>
                    <td>
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td>{formatMoney(item.unitPrice)}</td>
                    <td className="font-semibold">
                      {formatMoney(item.amount)}
                    </td>
                    <td>{METHODS[item.paymentMethod]}</td>
                    <td>{item.supplierName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-border-custom">
            <button
              type="button"
              aria-expanded={usageFormOpen}
              aria-controls="medicine-usage-form"
              onClick={() => setUsageFormOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold transition-colors hover:bg-[var(--hover-bg)]"
            >
              <span>Parranda partiyasiga dori sarflash</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-muted transition-transform duration-200 ${usageFormOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {usageFormOpen && (
              <form
                id="medicine-usage-form"
                onSubmit={saveUsage}
                className="space-y-4 border-t border-border-custom p-4"
              >

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="form-label">Dori yoki vaksina *</label>

                <select
                  required
                  className="form-input"
                  value={usageMedicineId}
                  onChange={(e) => setUsageMedicineId(e.target.value)}
                >
                  <option value="">Tanlang</option>

                  {balances
                    .filter(
                      (item) => item.medicine.active && item.remaining > 0
                    )
                    .map((item) => (
                      <option key={item.medicine.id} value={item.medicine.id}>
                        {item.medicine.name} — {formatNumber(item.remaining)}{' '}
                        {item.medicine.unit}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label">Parranda partiyasi *</label>

                <select
                  required
                  className="form-input"
                  value={usageBatchId}
                  onChange={(e) => setUsageBatchId(e.target.value)}
                >
                  <option value="">Partiyani tanlang</option>

                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.code} — {batch.direction === 'egg' ? 'LY' : 'BR'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Sarf miqdori *
                  {selectedUsageBalance
                    ? ` (${selectedUsageBalance.medicine.unit})`
                    : ''}
                </label>

                <input
                  required
                  type="number"
                  min="0.000001"
                  step="any"
                  className="form-input"
                  value={usageQty}
                  onChange={(e) => setUsageQty(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Ombor qoldig'i</label>

                <div className="rounded-lg border border-border-custom px-3 py-2 font-semibold">
                  {selectedUsageBalance
                    ? `${formatNumber(
                        selectedUsageBalance.remaining
                      )} ${selectedUsageBalance.medicine.unit}`
                    : 'Dorini tanlang'}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Sarf sababi *</label>

              <input
                required
                className="form-input"
                value={usagePurpose}
                onChange={(e) => setUsagePurpose(e.target.value)}
                placeholder="Masalan: Emlash yoki davolash"
              />
            </div>

            <div>
              <label className="form-label">Izoh</label>

              <textarea
                className="form-input min-h-[65px]"
                value={usageNote}
                onChange={(e) => setUsageNote(e.target.value)}
              />
            </div>

            <button type="submit" className="primary-button">
              <Syringe size={16} />
              Sarfni saqlash
            </button>
              </form>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table min-w-[700px] w-full">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Partiya</th>
                  <th>Mahsulot</th>
                  <th>Miqdor</th>
                  <th>Sabab</th>
                  <th>Izoh</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredUsages].reverse().map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td className="font-semibold">{item.batchCode}</td>
                    <td>{item.medicineName}</td>
                    <td>
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td>{item.purpose}</td>
                    <td>{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        Dori xaridi pul chiqimi sifatida Moliya bo'limida hisoblanadi. Partiyaga
        sarflash esa faqat ombor qoldig'ini kamaytiradi.
      </p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-custom p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
