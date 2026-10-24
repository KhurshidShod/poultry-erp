import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  Syringe,
  Wallet,
  X,
} from 'lucide-react';
import DateRangeFilter, {
  presetRange,
  type DatePreset,
  type DateRange,
} from "../../components/warehouse/DateRangeFilter";
import { usePoultry } from '../../context/PoultryContext';
import {
  useVeterinary,
  VETERINARY_PAYMENT_METHODS,
  VETERINARY_TYPES,
  type VeterinaryPaymentMethod,
  type VeterinaryType,
} from '../../context/VeterinaryContext';
import { useVeterinaryInventory } from '../../context/VeterinaryInventoryContext';

import VeterinaryInventoryPanel from '../../components/poultry/VeterinaryInventoryPanel';
import MoneyInput from '../../components/ui/MoneyInput';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Yozuvni saqlashda xatolik yuz berdi.';
}

export default function Veterinary() {
  const { batches } = usePoultry();

  const { records, addRecord, removeRecord, totalExpense } = useVeterinary();

  const { medicines, usages, getBalance, addUsage } = useVeterinaryInventory();

  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(today());
  const [type, setType] = useState<VeterinaryType>('vaccination');
  const [title, setTitle] = useState('');
  const [medicine, setMedicine] = useState('');
  const [medicineId, setMedicineId] = useState('');
  const [medicineQuantity, setMedicineQuantity] = useState('');
  const [birdCount, setBirdCount] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<VeterinaryPaymentMethod>('cash');
  const [nextDate, setNextDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filterBatch, setFilterBatch] = useState('all');

  const [filterType, setFilterType] = useState('all');

const [datePreset, setDatePreset] =
  useState<DatePreset>("today");

const [dateRange, setDateRange] =
  useState<DateRange>(() => presetRange("today"));

  const selectedBatch = batches.find((batch) => batch.id === batchId);
  const selectedMedicine = medicines.find((item) => item.id === medicineId);

  const selectedMedicineBalance = medicineId ? getBalance(medicineId) : 0;
  const filteredRecords = [...records]
    .filter((record) => {
      if (filterBatch !== 'all' && record.batchId !== filterBatch) return false;

      if (filterType !== 'all' && record.type !== filterType) return false;

if (
  !dateRange.start ||
  !dateRange.end ||
  dateRange.start > dateRange.end
) {
  return false;
}

if (
  record.date < dateRange.start ||
  record.date > dateRange.end
) {
  return false;
}

      return true;
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );

  const filteredExpense = filteredRecords.reduce(
    (sum, record) => sum + record.amount,
    0
  );

  const upcoming = records
    .filter((record) => record.nextDate >= today())
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  function openModal() {
    setBatchId('');
    setDate(today());
    setType('vaccination');
    setTitle('');
    setMedicine('');
    setMedicineId('');
    setMedicineQuantity('');
    setBirdCount('');
    setAmount('');
    setPaymentMethod('cash');
    setNextDate('');
    setNote('');
    setError('');
    setOpen(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingRef.current) return;

    setError('');
    savingRef.current = true;
    setSaving(true);

    try {
      // Ombor sarfi hozircha faqat bugungi sana uchun.
      if (medicineId && date !== today()) {
        throw new Error(
          'Ombordan avtomatik sarf qilish faqat bugungi sana uchun mumkin.'
        );
      }

      if (medicineId) {
        if (!selectedMedicine || !selectedMedicine.active) {
          throw new Error('Dori yoki vaksinani tanlang.');
        }

        const quantity = Number(medicineQuantity);

        if (
          !medicineQuantity.trim() ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error("Sarflanadigan dori miqdorini to'g'ri kiriting.");
        }

        if (quantity > getBalance(medicineId) + 0.000001) {
          throw new Error(
            `Omborda faqat ${getBalance(medicineId)} ` +
              `${selectedMedicine.unit} mavjud.`
          );
        }
      }

      // 1. Veterinariya tadbirini saqlash
      const record = addRecord({
        batchId,
        date,
        type,
        title,
        medicine: selectedMedicine?.name || medicine,
        birdCount: Number(birdCount),
        amount: amount.trim() ? Number(amount) : 0,
        paymentMethod,
        nextDate,
        note,
      });

      // 2. Ombordan avtomatik sarflash
      if (selectedMedicine) {
        try {
          addUsage({
            medicineId: selectedMedicine.id,
            batchId,
            date,
            quantity: Number(medicineQuantity),
            purpose: title.trim(),
            note,
            veterinaryRecordId: record.id,
          });
        } catch (usageError) {
          // Sarf xato bersa, yangi tadbirni qaytarish
          try {
            removeRecord(record.id);
          } catch {
            throw new Error(
              'Dori sarfi saqlanmadi, veterinariya ' +
                "yozuvini qaytarib bo'lmadi. " +
                'Sahifani yangilab tarixni tekshiring. ' +
                'Tadbirni qayta saqlamang.'
            );
          }

          throw usageError;
        }
      }

      setOpen(false);

      setSuccess(
        selectedMedicine
          ? 'Veterinariya tadbiri saqlandi va ' + 'dori omboridan sarflandi.'
          : 'Veterinariya tadbiri saqlandi.'
      );
    } catch (err) {
      setError(message(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Syringe size={26} className="text-accent" />

          <div>
            <h1 className="text-2xl font-semibold">Veterinariya</h1>
            <p className="mt-1 text-sm text-muted">
              Emlash, davolash, profilaktika va veterinariya xarajatlari
            </p>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={openModal}>
          <Plus size={17} />
          Yangi tadbir
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          icon={<ClipboardList size={18} />}
          label="Jami tadbirlar"
          value={`${formatNumber(records.length)} ta`}
        />

        <Stat
          icon={<Wallet size={18} />}
          label="Veterinariya xarajatlari"
          value={formatMoney(totalExpense)}
        />

        <Stat
          icon={<CalendarClock size={18} />}
          label="Kelgusi rejalashtirilgan sanalar"
          value={`${formatNumber(upcoming.length)} ta`}
        />
      </div>

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="surface-card space-y-3 p-5">
          <h2 className="section-title">
            Yaqinlashayotgan veterinariya sanalari
          </h2>

          <p className="text-xs text-muted">
            Bu sanalar eslatma sifatida ko'rsatiladi; tadbir bajarilganini
            avtomatik tasdiqlamaydi.
          </p>

          <div className="space-y-2">
            {upcoming.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-custom p-3"
              >
                <div>
                  <strong className="text-sm">{record.batchCode}</strong>
                  <p className="text-xs text-muted">{record.title}</p>
                </div>

                <span className="text-sm font-medium">{record.nextDate}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <VeterinaryInventoryPanel />
      {/* VETERINARIYA HISOBOT DAVRI */}

<DateRangeFilter
  preset={datePreset}
  range={dateRange}
  onChange={(preset, range) => {
    setDatePreset(preset);
    setDateRange(range);
  }}
/>
      <section className="surface-card overflow-hidden">
        <div className="space-y-4 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Veterinariya tarixi</h2>
            <p className="mt-1 text-xs text-muted">
              Partiya, tur va sana bo'yicha filtr
            </p>
          </div>



          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-muted">
              {filteredRecords.length} ta yozuv
            </span>

            <strong>Tanlangan xarajat: {formatMoney(filteredExpense)}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[1100px] w-full">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Partiya</th>
                <th>Yo'nalish</th>
                <th>Tadbir</th>
                <th>Dori / vaksina</th>
                <th>Ombordan sarf</th>
                <th>Parrandalar</th>
                <th>Xarajat</th>
                <th>To'lov</th>
                <th>Keyingi sana</th>
                <th>Izoh</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap">{record.date}</td>

                  <td className="font-semibold">{record.batchCode}</td>

                  <td>
                    {
                      VETERINARY_TYPES.find(
                        (item) => item.value === record.type
                      )?.label
                    }
                  </td>

                  <td>{record.title}</td>

                  <td>{record.medicine || '—'}</td>
                  <td>
                    {usages
                      .filter((usage) => usage.veterinaryRecordId === record.id)
                      .map(
                        (usage) =>
                          `${formatNumber(usage.quantity)} ${usage.unit}`
                      )
                      .join(', ') || '—'}
                  </td>
                  <td>{formatNumber(record.birdCount)} ta</td>

                  <td className="whitespace-nowrap font-semibold">
                    {formatMoney(record.amount)}
                  </td>

                  <td>{VETERINARY_PAYMENT_METHODS[record.paymentMethod]}</td>

                  <td>{record.nextDate || '—'}</td>
                  <td>{record.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            Hozircha veterinariya yozuvlari yo'q.
          </p>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="veterinary-modal-title"
            className="surface-card max-h-[92vh] w-full max-w-[720px] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border-custom px-5 py-5 sm:px-6">
              <div>
                <h2
                  id="veterinary-modal-title"
                  className="text-lg font-semibold"
                >
                  Yangi veterinariya tadbiri
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Partiya bo'yicha yozuv va xarajat
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="secondary-button !p-2"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={save}
              className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Parranda partiyasi *</label>

                  <select
                    required
                    className="form-input"
                    value={batchId}
                    onChange={(e) => {
                      setBatchId(e.target.value);
                      setBirdCount('');
                    }}
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
                  <label className="form-label">Sana *</label>
                  <input
                    required
                    type="date"
                    className="form-input"
                    min={selectedBatch?.arrivalDate.slice(0, 10)}
                    max={today()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Tadbir turi *</label>
                  <select
                    className="form-input"
                    value={type}
                    onChange={(e) => setType(e.target.value as VeterinaryType)}
                  >
                    {VETERINARY_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Parrandalar soni *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={selectedBatch?.initialCount}
                    step="1"
                    className="form-input"
                    value={birdCount}
                    onChange={(e) => setBirdCount(e.target.value)}
                    placeholder="Masalan: 5000"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Tadbir nomi *</label>
                <input
                  required
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Navbatdagi emlash"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border-custom p-4">
                <div>
                  <label className="form-label">Ombordagi dori / vaksina</label>

                  <select
                    className="form-input"
                    value={medicineId}
                    onChange={(event) => {
                      setMedicineId(event.target.value);
                      setMedicineQuantity('');

                      if (event.target.value) {
                        setMedicine('');
                      }
                    }}
                  >
                    <option value="">Ombordan sarf qilinmaydi</option>

                    {medicines
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit}) — qoldiq{' '}
                          {formatNumber(getBalance(item.id))}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedMedicine ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="form-label">
                        Sarf miqdori ({selectedMedicine.unit}) *
                      </label>

                      <input
                        required
                        type="number"
                        min="0.000001"
                        step="any"
                        className="form-input"
                        value={medicineQuantity}
                        onChange={(event) =>
                          setMedicineQuantity(event.target.value)
                        }
                        placeholder="Masalan: 3"
                      />
                    </div>

                    <div className="flex items-end text-xs text-muted">
                      Mavjud zaxira: {formatNumber(selectedMedicineBalance)}{' '}
                      {selectedMedicine.unit}. Ombor sarfi Moliya bo'limida
                      qayta xarajat hisoblanmaydi.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">
                      Ombordan olinmagan dori nomi (ixtiyoriy)
                    </label>

                    <input
                      className="form-input"
                      value={medicine}
                      onChange={(event) => setMedicine(event.target.value)}
                      placeholder="Nomini kiriting (zaxira kamaymaydi)"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Xarajat summasi (so'm)</label>
                  <MoneyInput
                    min="0"
                    step="any"
                    className="form-input"
                    value={amount}
                    onChange={(value) => setAmount(value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="form-label">To'lov usuli</label>
                  <select
                    className="form-input"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as VeterinaryPaymentMethod
                      )
                    }
                  >
                    {Object.entries(VETERINARY_PAYMENT_METHODS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Keyingi tadbir sanasi</label>
                <input
                  type="date"
                  min={date}
                  className="form-input"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Izoh</label>
                <textarea
                  className="form-input min-h-[85px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Veterinar xulosasi..."
                />
              </div>

              <p className="rounded-lg border border-border-custom p-3 text-xs text-muted">
                Xarajat summasi 0 dan katta bo'lsa, u Moliya bo'limida avtomatik
                chiqim sifatida hisoblanadi.
              </p>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setOpen(false)}
                >
                  Bekor qilish
                </button>

                <button
  type="submit"
  className="primary-button"
  disabled={saving}
>
  {saving ? "Saqlanmoqda..." : "Saqlash"}
</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>

      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}
