import { useMemo, useState, type FormEvent } from 'react';

import {
  Archive,
  ArrowLeftRight,
  Bird,
  Eye,
  CreditCard,
  HeartPulse,
  Plus,
  Search,
  X,
} from 'lucide-react';

import {
  usePoultry,
  type BatchDirection,
  type PoultryBatch,
} from '../../context/PoultryContext';

import { useLocations } from '../../context/LocationsContext';
import { useMasterData } from '../../context/MasterDataContext';

import MoneyInput from '../../components/ui/MoneyInput';
import BatchCostPanel from '../../components/poultry/BatchCostPanel';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';

type ModalMode = 'create' | 'mortality' | 'transfer' | 'payment' | null;

function todayString() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function ageInDays(date: string) {
  const start = new Date(`${date}T00:00:00Z`);
  const now = new Date(`${todayString()}T00:00:00Z`);

  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
}

function createEmptyForm() {
  return {
    code: '',
    direction: 'egg' as BatchDirection,
    arrivalDate: todayString(),
    supplierId: '',
    locationId: '',
    initialCount: '',
    pricePerChick: '',
    paidAmount: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'bank',
    note: '',
  };
}

function actionEmptyForm() {
  return {
    date: todayString(),
    fromLocationId: '',
    toLocationId: '',
    quantity: '',
    note: '',
  };
}

export default function ChickenBatches() {
  const {
    batches,
    events,
    addBatch,
    purchasePayments,
    addPurchasePayment,
    getBatchPaidAmount,
    getBatchDebt,
    addMortality,
    transferBirds,
    getBalances,
    getMortality,
  } = usePoultry();

  const { suppliers } = useMasterData();
  const { locations } = useLocations();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [directionFilter, setDirectionFilter] = useState('all');

  const [modal, setModal] = useState<ModalMode>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState(createEmptyForm);

  const [action, setAction] = useState(actionEmptyForm);

  const [error, setError] = useState('');
  const [paymentForm, setPaymentForm] = useState({ date: todayString(), amount: '', method: 'cash' as 'cash' | 'card' | 'bank', note: '' });

  const selected = batches.find((batch) => batch.id === selectedId);

  // Bir partiyaning barcha bo'limlardagi harakatlari, tarixiy qoldiqlari.
  const selectedMortality = selected
    ? events.filter((event) => event.batchId === selected.id && event.type === 'mortality')
    : [];
  const selectedBalances = selected ? getBalances(selected.id) : [];
  const selectedLocationIds = selected ? Array.from(new Set([
    selected.locationId,
    ...selectedBalances.map((row) => row.locationId),
    ...events.filter((event) => event.batchId === selected.id)
      .flatMap((event) => [event.fromLocationId, event.toLocationId].filter((id): id is string => Boolean(id))),
  ])) : [];
  const locationRows = selectedLocationIds.map((id) => {
    const dead = selectedMortality.filter((event) => event.fromLocationId === id)
      .reduce((sum, event) => sum + event.quantity, 0);
    const alive = selectedBalances.find((row) => row.locationId === id)?.quantity ?? 0;
    const sold = events.filter((event) => event.batchId === selected?.id && event.type === 'live-sale' && event.fromLocationId === id)
      .reduce((sum, event) => sum + event.quantity, 0);
    const slaughtered = events.filter((event) => event.batchId === selected?.id && event.type === 'slaughter' && event.fromLocationId === id)
      .reduce((sum, event) => sum + event.quantity, 0);
    return { id, alive, dead, sold, slaughtered };
  });
  const selectedDeadTotal = selectedMortality.reduce((sum, event) => sum + event.quantity, 0);
  const selectedSoldTotal = locationRows.reduce((sum, row) => sum + row.sold, 0);
  const selectedSlaughteredTotal = locationRows.reduce((sum, row) => sum + row.slaughtered, 0);


  const poultryLocations = locations.filter(
    (location) =>
      location.type === 'poultry' ||
      location.type === 'egg-production' ||
      location.type === 'meat-production'
  );

  const filtered = useMemo(
    () =>
      batches.filter((batch) => {
        const query = search.trim().toLowerCase();

        return (
          `${batch.code} ${batch.supplierName} ${batch.locationName}`
            .toLowerCase()
            .includes(query) &&
          (statusFilter === 'all' || batch.status === statusFilter) &&
          (directionFilter === 'all' || batch.direction === directionFilter)
        );
      }),
    [batches, search, statusFilter, directionFilter]
  );

  const activeBatches = batches.filter((batch) => batch.status === 'active');

  const totalAlive = activeBatches.reduce(
    (sum, batch) =>
      sum +
      getBalances(batch.id).reduce((result, row) => result + row.quantity, 0),
    0
  );

  const totalDeaths = batches.reduce(
    (sum, batch) => sum + getMortality(batch.id),
    0
  );

  function nameOfLocation(id: string) {
    return locations.find((location) => location.id === id)?.name ?? id;
  }

  function aliveCount(batch: PoultryBatch) {
    return getBalances(batch.id).reduce((sum, row) => sum + row.quantity, 0);
  }

  function openCreate() {
    setForm(createEmptyForm());
    setError('');
    setModal('create');
  }

  function openAction(mode: 'mortality' | 'transfer') {
    if (!selected) return;

    const firstLocation = getBalances(selected.id).find(
      (row) => row.quantity > 0 && locations.some((location) =>
        location.id === row.locationId &&
        (selected.direction === 'egg'
          ? location.type === 'poultry'
          : location.type === 'meat-production')
      )
    );

    setAction({
      ...actionEmptyForm(),
      fromLocationId: firstLocation?.locationId ?? '',
    });
    setError('');
    setModal(mode);
  }

  function openPayment() {
    setError('');
    setPaymentForm({ date: todayString(), amount: '', method: 'cash', note: '' });
    setModal('payment');
  }

  function closeModal() {
    setModal(null);
    setError('');
  }

  function saveBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const supplier = suppliers.find((item) => item.id === form.supplierId);

    const location = poultryLocations.find(
      (item) => item.id === form.locationId && item.active
    );

    if (!supplier || !location) {
      setError("Yetkazib beruvchi va jo'jaxonani tanlang.");
      return;
    }

    const initialCount = Number(form.initialCount);
    const pricePerChick = Number(form.pricePerChick);
    const paidAmount = form.paidAmount.trim() ? Number(form.paidAmount) : 0;
    const totalCost = initialCount * pricePerChick;
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || !Number.isFinite(totalCost) || paidAmount > totalCost) {
      setError("To'langan summa jami xarid qiymatidan oshmasligi kerak.");
      return;
    }

    try {
      addBatch({
        id: crypto.randomUUID(),
        code: form.code.trim().toUpperCase(),
        direction: form.direction,
        arrivalDate: form.arrivalDate,
        supplierId: supplier.id,
        supplierName: supplier.name,
        locationId: location.id,
        locationName: location.name,
        initialCount,
        pricePerChick,
        paidAmount,
        paymentMethod: paidAmount > 0 ? form.paymentMethod : undefined,
        status: 'active',
        closedAt: null,
        note: form.note.trim(),
      });

      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Partiyani saqlashda xatolik.'
      );
    }
  }

  function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError('');
    const amount = Number(paymentForm.amount);
    const remaining = getBatchDebt(selected.id);
    if (remaining === null || !Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.001) {
      setError("To'lov miqdori qolgan qarzdan oshmasligi kerak.");
      return;
    }
    try {
      addPurchasePayment({
        id: crypto.randomUUID(),
        batchId: selected.id,
        date: paymentForm.date,
        amount,
        method: paymentForm.method,
        note: paymentForm.note.trim(),
        createdAt: new Date().toISOString(),
      });
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "To'lovni saqlashda xatolik.");
    }
  }

  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !modal) return;

    setError('');
    const quantity = Number(action.quantity);

    try {
      const fromLocation = locations.find((location) => location.id === action.fromLocationId);
      if (!fromLocation || (selected.direction === 'egg'
        ? fromLocation.type !== 'poultry'
        : fromLocation.type !== 'meat-production')) {
        throw new Error("Bu bo'limdagi parrandalarni o'sha ferma sahifasidan boshqaring.");
      }
      if (modal === 'mortality') {
        addMortality(
          selected.id,
          action.fromLocationId,
          quantity,
          action.date,
          action.note
        );
      } else if (modal === 'transfer') {
        const destination = poultryLocations.find(
          (item) => item.id === action.toLocationId && item.active
        );

        if (!destination) {
          setError("Qabul qiluvchi bo'limni tanlang.");
          return;
        }

        if (
          selected.direction === 'egg' &&
          destination.type === 'meat-production'
        ) {
          setError(
            "Tuxum yo'nalishidagi partiyani go'sht jo'jaxonasiga ko'chirib bo'lmaydi."
          );
          return;
        }

        if (
          selected.direction === 'meat' &&
          destination.type === 'egg-production'
        ) {
          setError("Go'sht partiyasini tuxum fermasiga ko'chirib bo'lmaydi.");
          return;
        }

        transferBirds(
          selected.id,
          action.fromLocationId,
          action.toLocationId,
          quantity,
          action.date,
          action.note
        );
      }

      closeModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Amalni saqlashda xatolik.'
      );
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Bird size={25} className="text-[var(--accent)]" />
            <h1 className="text-2xl font-semibold">Parranda partiyalari</h1>
          </div>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Jo'ja xaridlari, partiyalar va parranda harakatlari
          </p>
        </div>

        <button type="button" onClick={openCreate} className="primary-button">
          <Plus size={17} />
          Yangi partiya
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Jami partiyalar" value={batches.length} />
        <Stat label="Faol partiyalar" value={activeBatches.length} />
        <Stat label="Tirik parrandalar" value={totalAlive} />
        <Stat label="Jami nobud bo'lgan" value={totalDeaths} />
      </div>

      {/* FILTERS AND TABLE */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <h2 className="section-title">Partiyalar ro'yxati</h2>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                className="form-input !w-[200px] !pl-9"
                placeholder="Partiya qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input !w-auto"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
            >
              <option value="all">Barcha yo'nalishlar</option>
              <option value="egg">Tuxum</option>
              <option value="meat">Go'sht</option>
            </select>

            <select
              className="form-input !w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">Faol</option>
              <option value="closed">Arxiv</option>
              <option value="all">Barchasi</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[950px]">
            <thead>
              <tr>
                <th>Partiya</th>
                <th>Yo'nalish</th>
                <th>Kelgan sana</th>
                <th>Yoshi</th>
                <th>Kelgan</th>
                <th>Tirik</th>
                <th>Nobud</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((batch) => (
                <tr key={batch.id}>
                  <td className="font-semibold">{batch.code}</td>

                  <td>{batch.direction === 'egg' ? 'Tuxum' : "Go'sht"}</td>

                  <td>{batch.arrivalDate}</td>

                  <td>{ageInDays(batch.arrivalDate)} kun</td>

                  <td>{formatNumber(batch.initialCount)}</td>

                  <td className="font-semibold">
                    {formatNumber(aliveCount(batch))}
                  </td>

                  <td>{formatNumber(getMortality(batch.id))}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        batch.status === 'active'
                          ? 'status-success'
                          : 'status-neutral'
                      }`}
                    >
                      {batch.status === 'active' ? 'Faol' : 'Yakunlangan'}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="secondary-button !min-h-8 !px-2"
                      onClick={() => setSelectedId(batch.id)}
                      title="Partiya tafsilotlari"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-[var(--muted)]">
            Partiya topilmadi.
          </div>
        )}
      </section>

      {/* BATCH DETAILS */}
      {selected && (
        <section className="surface-card space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selected.code} — partiya tafsilotlari
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {selected.supplierName} • {selected.arrivalDate}
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setSelectedId(null)}
            >
              <X size={16} />
              Yopish
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Jo'jalar xarid qiymati"
              value={formatMoney(
                selected.initialCount * selected.pricePerChick
              )}
            />
            <Stat label="Hozir tirik" value={aliveCount(selected)} />
            <Stat label="Nobud bo'lgan" value={getMortality(selected.id)} />
          </div>

          <div className="rounded-xl border border-border-custom p-4 space-y-3">
            <h3 className="font-semibold">Jo'ja xaridi to'lovlari</h3>
            {getBatchDebt(selected.id) === null ? (
              <p className="text-sm text-muted">Eski partiya: boshlang'ich to'lov holati noma'lum. Qarz avtomatik hisoblanmaydi.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat label="Jami to'langan" value={formatMoney(getBatchPaidAmount(selected.id) ?? 0)} />
                  <Stat label="Qolgan qarz" value={formatMoney(getBatchDebt(selected.id) ?? 0)} />
                </div>
                {(getBatchDebt(selected.id) ?? 0) > 0.001 && (
                  <button type="button" className="primary-button" onClick={openPayment}>
                    <CreditCard size={17} /> To'lov qilish
                  </button>
                )}
              </>
            )}
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[560px]">
                <thead><tr><th>Sana</th><th>Tur</th><th>Usul</th><th>Summa</th><th>Izoh</th></tr></thead>
                <tbody>
                  {selected.paidAmount !== undefined && selected.paidAmount > 0 && (
                    <tr>
                      <td>{selected.arrivalDate}</td><td>Boshlang'ich to'lov</td>
                      <td>{selected.paymentMethod === 'cash' ? 'Naqd' : selected.paymentMethod === 'card' ? 'Karta' : selected.paymentMethod === 'bank' ? 'Bank' : '—'}</td>
                      <td><span className="!text-emerald-600 font-semibold">{formatMoney(selected.paidAmount)}</span></td><td>—</td>
                    </tr>
                  )}
                  {purchasePayments.filter((p) => p.batchId === selected.id).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map((p) => (
                    <tr key={p.id}>
                      <td>{p.date}</td><td>Qarz to'lovi</td>
                      <td>{p.method === 'cash' ? 'Naqd' : p.method === 'card' ? 'Karta' : 'Bank'}</td>
                      <td><span className="!text-emerald-600 font-semibold">{formatMoney(p.amount)}</span></td><td>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barcha joylashuvlar bo'yicha umumiy partiya hisobi */}
          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="text-base font-semibold">Partiya bo'yicha umumiy natija</h3>
            <p className="text-xs text-muted">
              110 kunlik jo'jaxona, tuxum fermalari yoki go'sht jo'jaxonasidagi
              barcha qaydlar birlashtirilgan. Ko'chirish nobud bo'lish hisoblanmaydi.
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Dastlab kelgan" value={selected.initialCount} />
              <Stat label="Jami nobud bo'lgan" value={selectedDeadTotal} />
              <Stat label="Jami tirik sotilgan" value={selectedSoldTotal} />
              <Stat label="Jami so'yilgan" value={selectedSlaughteredTotal} />
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table min-w-[760px] w-full">
                <thead><tr>
                  <th>Joylashuv</th><th>Hozir tirik</th><th>Nobud bo'lgan</th>
                  <th>Tirik sotilgan</th><th>So'yilgan</th><th>Nobud bo'lganlarning xarid qiymati</th>
                </tr></thead>
                <tbody>
                  {locationRows.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">{nameOfLocation(row.id)}</td>
                      <td>{formatNumber(row.alive)} ta</td>
                      <td>{formatNumber(row.dead)} ta</td>
                      <td>{formatNumber(row.sold)} ta</td>
                      <td>{formatNumber(row.slaughtered)} ta</td>
                      <td className="font-semibold !text-red-600 dark:!text-red-400">
                        {formatMoney(row.dead * selected.pricePerChick)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td>Jami</td><td>{formatNumber(aliveCount(selected))} ta</td>
                    <td>{formatNumber(selectedDeadTotal)} ta</td>
                    <td>{formatNumber(selectedSoldTotal)} ta</td>
                    <td>{formatNumber(selectedSlaughteredTotal)} ta</td>
                    <td className="!text-red-600 dark:!text-red-400">
                      {formatMoney(selectedDeadTotal * selected.pricePerChick)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              Bu jadvalda faqat nobud bo'lgan parrandalarning dastlabki xarid qiymati
              berilgan. Yem, dori va veterinariya ulushlari bilan to'liqroq
              iqtisodiy yo'qotish quyidagi hisobotda jamlanadi.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">
              Fermalar bo'yicha parrandalar
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {getBalances(selected.id)
                .filter((row) => row.quantity > 0)
                .map((row) => (
                  <div
                    key={row.locationId}
                    className="rounded-xl border border-border-custom p-4"
                  >
                    <p className="text-xs text-[var(--muted)]">
                      {nameOfLocation(row.locationId)}
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatNumber(row.quantity)} ta
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border-custom pt-5">
            <h3 className="text-base font-semibold">Umumiy nobud bo'lish va iqtisodiy yo'qotish</h3>
            <p className="text-xs text-muted">
              Barcha joylashuvlar bo'yicha jamlangan natija. Xarajatlar bu yerda
              pul chiqimi sifatida qayta yozilmaydi.
            </p>
            <BatchCostPanel batchId={selected.id} />
          </div>

          {selected.status === 'active' && (
            <div className="flex flex-wrap gap-2">
              <button
                className="secondary-button"
                onClick={() => openAction('mortality')}
              >
                <HeartPulse size={16} />
                Nobud bo'lish
              </button>

              <button
                className="secondary-button"
                onClick={() => openAction('transfer')}
              >
                <ArrowLeftRight size={16} />
                Ko'chirish
              </button>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold">
              Partiya harakatlari tarixi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[650px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Amal</th>
                    <th>Qayerdan</th>
                    <th>Qayerga</th>
                    <th>Soni</th>
                    <th>Izoh</th>
                  </tr>
                </thead>

                <tbody>
                  {events
                    .filter((event) => event.batchId === selected.id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((event) => (
                      <tr key={event.id}>
                        <td>{event.date}</td>

                        <td>
                          {event.type === 'mortality'
                            ? "Nobud bo'lish"
                            : event.type === 'live-sale'
                              ? 'Tirik parranda savdosi'
                            : event.type === 'slaughter'
                              ? "So'yish"
                              : "Ko'chirish"}
                        </td>

                        <td>{nameOfLocation(event.fromLocationId)}</td>

                        <td>
                          {event.toLocationId
                            ? nameOfLocation(event.toLocationId)
                            : '—'}
                        </td>

                        <td>{formatNumber(event.quantity)}</td>

                        <td>{event.note || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border-custom p-3 text-xs text-[var(--muted)]">
            <Archive size={16} className="shrink-0" />
            <span>
              Partiyani yakunlash, so'yish va yakuniy moliyaviy hisob
              funksiyalari keyingi bosqichda ulanadi.
            </span>
          </div>
        </section>
      )}

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <Modal title="Yangi parranda partiyasi" onClose={closeModal}>
          <form onSubmit={saveBatch} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Partiya raqami *">
                <input
                  required
                  className="form-input"
                  placeholder="LY-001 yoki BR-001"
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Yo'nalish *">
                <select
                  className="form-input"
                  value={form.direction}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      direction: e.target.value as BatchDirection,
                      locationId: '',
                    })
                  }
                >
                  <option value="egg">Tuxum</option>
                  <option value="meat">Go'sht</option>
                </select>
              </Field>

              <Field label="Kelgan sana *">
                <input
                  required
                  type="date"
                  max={todayString()}
                  className="form-input"
                  value={form.arrivalDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      arrivalDate: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Yetkazib beruvchi *">
                <select
                  required
                  className="form-input"
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supplierId: e.target.value,
                    })
                  }
                >
                  <option value="">Tanlang</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Boshlang'ich jo'jaxona *">
                <select
                  required
                  className="form-input"
                  value={form.locationId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      locationId: e.target.value,
                    })
                  }
                >
                  <option value="">Tanlang</option>
                  {poultryLocations
                    .filter(
                      (item) =>
                        item.active &&
                        (form.direction === 'egg'
                          ? item.type === 'poultry'
                          : item.type === 'meat-production')
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Jo'jalar soni *">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  placeholder="Masalan: 5000"
                  value={form.initialCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      initialCount: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Bitta jo'ja narxi (so'm) *">
                <MoneyInput
                  required
                  min={0}
                  className="form-input"
                  placeholder="0"
                  value={form.pricePerChick}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      pricePerChick: value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="rounded-xl border border-border-custom p-4">
              <p className="text-xs text-muted">Jami jo'ja xarid qiymati</p>
              <p className="mt-1 text-xl font-bold text-accent">{formatMoney((Number(form.initialCount) || 0) * (Number(form.pricePerChick) || 0))}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Boshlang'ich to'lov (so'm)">
                <MoneyInput min={0} className="form-input" placeholder="0 — qarzga xarid" value={form.paidAmount} onChange={(value) => setForm((prev) => ({ ...prev, paidAmount: value }))} />
              </Field>
              <Field label="To'lov usuli">
                <select className="form-input" value={form.paymentMethod} disabled={!(Number(form.paidAmount) > 0)} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value as 'cash' | 'card' | 'bank' }))}>
                  <option value="cash">Naqd</option><option value="card">Karta</option><option value="bank">Bank o'tkazmasi</option>
                </select>
              </Field>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-xs text-muted">Qolgan qarz</p>
              <p className="mt-1 text-xl font-bold !text-amber-600">{formatMoney(Math.max(0, (Number(form.initialCount) || 0) * (Number(form.pricePerChick) || 0) - (Number(form.paidAmount) || 0)))}</p>
            </div>

            <Field label="Izoh">
              <textarea
                className="form-input min-h-[80px]"
                value={form.note}
                onChange={(e) =>
                  setForm({
                    ...form,
                    note: e.target.value,
                  })
                }
              />
            </Field>

            {error && <ErrorMessage message={error} />}

            <ModalButtons onCancel={closeModal} />
          </form>
        </Modal>
      )}

      {modal === 'payment' && selected && (
        <Modal title={`${selected.code} — qarz to'lovi`} onClose={closeModal}>
          <form onSubmit={savePayment} className="space-y-4">
            <div className="rounded-xl border border-border-custom p-4">
              <p className="text-xs text-muted">Qolgan qarz</p>
              <p className="mt-1 text-xl font-semibold !text-red-600">{formatMoney(getBatchDebt(selected.id) ?? 0)}</p>
            </div>
            <Field label="To'lov sanasi *">
              <input type="date" required min={selected.arrivalDate.slice(0,10)} max={todayString()} className="form-input" value={paymentForm.date} onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))} />
            </Field>
            <Field label="To'lanadigan summa *">
              <MoneyInput required min={0} className="form-input" placeholder="Summa" value={paymentForm.amount} onChange={(value) => setPaymentForm((prev) => ({ ...prev, amount: value }))} />
            </Field>
            <Field label="To'lov usuli *">
              <select className="form-input" value={paymentForm.method} onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value as 'cash' | 'card' | 'bank' }))}>
                <option value="cash">Naqd</option><option value="card">Karta</option><option value="bank">Bank o'tkazmasi</option>
              </select>
            </Field>
            <Field label="Izoh">
              <textarea className="form-input" value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} />
            </Field>
            {error && <ErrorMessage message={error} />}
            <ModalButtons onCancel={closeModal} />
          </form>
        </Modal>
      )}

      {/* MORTALITY / TRANSFER MODAL */}
      {(modal === 'mortality' || modal === 'transfer') && selected && (
        <Modal
          title={
            modal === 'mortality'
              ? "Nobud bo'lgan parrandalar"
              : "Parrandalarni ko'chirish"
          }
          onClose={closeModal}
        >
          <form onSubmit={saveAction} className="space-y-4">
            <Field label="Sana *">
              <input
                type="date"
                required
                min={selected.arrivalDate}
                max={todayString()}
                className="form-input"
                value={action.date}
                onChange={(e) =>
                  setAction({
                    ...action,
                    date: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Qaysi bo'limdan *">
              <select
                required
                className="form-input"
                value={action.fromLocationId}
                onChange={(e) =>
                  setAction({
                    ...action,
                    fromLocationId: e.target.value,
                  })
                }
              >
                <option value="">Tanlang</option>
                {getBalances(selected.id)
                  .filter((row) => row.quantity > 0 && locations.some((location) =>
                    location.id === row.locationId && (selected.direction === 'egg'
                      ? location.type === 'poultry' : location.type === 'meat-production')
                  ))
                  .map((row) => (
                    <option key={row.locationId} value={row.locationId}>
                      {nameOfLocation(row.locationId)}
                      {' — '}
                      {row.quantity} ta
                    </option>
                  ))}
              </select>
            </Field>

            {modal === 'transfer' && (
              <Field label="Qaysi bo'limga *">
                <select
                  required
                  className="form-input"
                  value={action.toLocationId}
                  onChange={(e) =>
                    setAction({
                      ...action,
                      toLocationId: e.target.value,
                    })
                  }
                >
                  <option value="">Tanlang</option>
                  {poultryLocations
                    .filter(
                      (item) =>
                        item.active &&
                        item.id !== action.fromLocationId &&
                        (selected.direction === 'egg'
                          ? item.type !== 'meat-production'
                          : item.type === 'meat-production')
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}

            <Field label="Parrandalar soni *">
              <input
                required
                type="number"
                min="1"
                step="1"
                className="form-input"
                value={action.quantity}
                onChange={(e) =>
                  setAction({
                    ...action,
                    quantity: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Izoh">
              <textarea
                className="form-input min-h-[80px]"
                value={action.note}
                onChange={(e) =>
                  setAction({
                    ...action,
                    note: e.target.value,
                  })
                }
              />
            </Field>

            {error && <ErrorMessage message={error} />}

            <ModalButtons onCancel={closeModal} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poultry-modal-title"
        className="surface-card max-h-[90vh] w-full max-w-[650px] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border-custom p-5">
          <h2 id="poultry-modal-title" className="text-lg font-semibold">
            {title}
          </h2>

          <button
            className="secondary-button !min-h-8 !px-2"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
    >
      {message}
    </p>
  );
}

function ModalButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
      <button type="button" className="secondary-button" onClick={onCancel}>
        Bekor qilish
      </button>
      <button type="submit" className="primary-button">
        Saqlash
      </button>
    </div>
  );
}
