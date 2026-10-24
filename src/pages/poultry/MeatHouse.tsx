import BatchCostPanel from '../../components/poultry/BatchCostPanel';
import LiveBirdSalePanel from '../../components/poultry/LiveBirdSalePanel';

import {
  AlertTriangle,
  Archive,
  Beef,
  ClipboardList,
  Eye,
  Plus,
  Skull,
  X,
} from 'lucide-react';

import { useMemo, useState, type FormEvent } from 'react';

import { useFarmFeed } from '../../context/FarmFeedContext';
import { useLocations } from '../../context/LocationsContext';
import { useMasterData } from '../../context/MasterDataContext';
import { usePoultry } from '../../context/PoultryContext';

import { formatMoney, formatNumber } from '../../context/WarehouseContext';

import BatchPaymentPanel from '../../components/poultry/BatchPaymentPanel';
import FacilityFeedPanel from '../../components/poultry/FacilityFeedPanel';
import MoneyInput from '../../components/ui/MoneyInput';

type ActionType = 'slaughter' | 'mortality' | 'close';

type StatusFilter = 'active' | 'closed' | 'all';

interface ActionForm {
  date: string;
  locationId: string;
  quantity: string;
  meatKg: string;
  note: string;
}

interface BatchForm {
  code: string;
  arrivalDate: string;
  supplierId: string;
  locationId: string;
  initialCount: string;
  pricePerChick: string;
  paidAmount: string;
  paymentMethod: 'cash' | 'card' | 'bank';
  note: string;
}

function localDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function daysBetween(start: string, end = localDate()): number {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  return Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
  );
}

function emptyActionForm(): ActionForm {
  return {
    date: localDate(),
    locationId: '',
    quantity: '',
    meatKg: '',
    note: '',
  };
}

function emptyBatchForm(locationId = ''): BatchForm {
  return {
    code: '',
    arrivalDate: localDate(),
    supplierId: '',
    locationId,
    initialCount: '',
    pricePerChick: '',
    paidAmount: '',
    paymentMethod: 'cash',
    note: '',
  };
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Amalni bajarishda xatolik yuz berdi.';
}

export default function MeatHouse() {
  // ====================================
  // CONTEXTS
  // ====================================

  const {
    batches,
    events,
    addBatch,
    addMortality,
    addSlaughter,
    closeBatch,
    getBalances,
    getBalanceAsOf,
    getMortality,
    getSlaughtered,
    getMeatKg,
  } = usePoultry();

  const { locations } = useLocations();

  const { suppliers } = useMasterData();

  const { getBatchConsumptions } = useFarmFeed();

  // ====================================
  // STATE
  // ====================================

  const [status, setStatus] = useState<StatusFilter>('active');

  const [selectedId, setSelectedId] = useState('');

  const [createOpen, setCreateOpen] = useState(false);

  const [batchForm, setBatchForm] = useState<BatchForm>(() => emptyBatchForm());

  const [createError, setCreateError] = useState('');

  const [action, setAction] = useState<ActionType | null>(null);

  const [actionForm, setActionForm] = useState<ActionForm>(emptyActionForm);

  const [actionError, setActionError] = useState('');

  // ====================================
  // LOCATIONS
  // ====================================

  const meatLocations = useMemo(
    () => locations.filter((location) => location.type === 'meat-production'),
    [locations]
  );

  const activeMeatLocations = useMemo(
    () => meatLocations.filter((location) => location.active),
    [meatLocations]
  );

  function getLocationName(id: string) {
    return locations.find((location) => location.id === id)?.name ?? id;
  }

  // ====================================
  // MEAT BATCHES ONLY
  // ====================================

  const allMeatBatches = useMemo(
    () => batches.filter((batch) => batch.direction === 'meat'),
    [batches]
  );

  const displayedBatches = useMemo(
    () =>
      allMeatBatches
        .filter((batch) => status === 'all' || batch.status === status)
        .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate)),
    [allMeatBatches, status]
  );

  const activeBatches = allMeatBatches.filter(
    (batch) => batch.status === 'active'
  );

  const selectedBatch = allMeatBatches.find((batch) => batch.id === selectedId);

  // ====================================
  // TOTAL STATISTICS
  // ====================================

  const totalAlive = activeBatches.reduce(
    (sum, batch) =>
      sum +
      getBalances(batch.id).reduce((count, item) => count + item.quantity, 0),
    0
  );

  const totalSlaughtered = allMeatBatches.reduce(
    (sum, batch) => sum + getSlaughtered(batch.id),
    0
  );

  const totalMeatKg = allMeatBatches.reduce(
    (sum, batch) => sum + getMeatKg(batch.id),
    0
  );

  // ====================================
  // SELECTED BATCH
  // ====================================

  const balances = selectedBatch ? getBalances(selectedBatch.id) : [];

  const alive = balances.reduce((sum, item) => sum + item.quantity, 0);

  const batchSlaughterEvents = selectedBatch
    ? events
        .filter(
          (event) =>
            event.batchId === selectedBatch.id && event.type === 'slaughter'
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const batchMortalityEvents = selectedBatch
    ? events
        .filter(
          (event) =>
            event.batchId === selectedBatch.id && event.type === 'mortality'
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  // Real consumption records, if any.
  // Feed plans are separate and do NOT appear here.
  const batchFeedHistory = selectedBatch
    ? getBatchConsumptions(selectedBatch.id)
    : [];

  const totalActualFeed = batchFeedHistory.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalHistoricalExpectedFeed = batchFeedHistory.reduce(
    (sum, item) => sum + (item.expectedKg ?? 0),
    0
  );

  // ====================================
  // CREATE BATCH
  // ====================================

  function openCreateBatch() {
    setBatchForm(emptyBatchForm(activeMeatLocations[0]?.id ?? ''));

    setCreateError('');
    setCreateOpen(true);
  }

  function saveNewBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');

    const code = batchForm.code.trim().toUpperCase();

    const supplier = suppliers.find((item) => item.id === batchForm.supplierId);

    const location = activeMeatLocations.find(
      (item) => item.id === batchForm.locationId
    );

    const initialCount = Number(batchForm.initialCount);

    const pricePerChick = Number(batchForm.pricePerChick);

    if (!code) {
      setCreateError('Partiya raqamini kiriting.');
      return;
    }

    if (batches.some((batch) => batch.code.trim().toUpperCase() === code)) {
      setCreateError('Bunday raqamli partiya allaqachon mavjud.');
      return;
    }

    if (!supplier) {
      setCreateError('Yetkazib beruvchini tanlang.');
      return;
    }

    if (!location) {
      setCreateError("Go'sht jo'jaxonasini tanlang.");
      return;
    }

    if (!batchForm.arrivalDate || batchForm.arrivalDate > localDate()) {
      setCreateError("Kelgan sanani to'g'ri tanlang.");
      return;
    }

    if (
      batchForm.initialCount.trim() === '' ||
      !Number.isInteger(initialCount) ||
      initialCount <= 0
    ) {
      setCreateError("Jo'jalar soni musbat butun son bo'lishi kerak.");
      return;
    }

    if (
      batchForm.pricePerChick.trim() === '' ||
      !Number.isFinite(pricePerChick) ||
      pricePerChick < 0
    ) {
      setCreateError("Jo'ja narxini to'g'ri kiriting.");
      return;
    }

    const paidAmount =
      batchForm.paidAmount.trim() === '' ? 0 : Number(batchForm.paidAmount);
    const purchaseTotal =
      Number(batchForm.initialCount) * Number(batchForm.pricePerChick);
    if (
      !Number.isFinite(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > purchaseTotal
    ) {
      setCreateError("To'langan summa jami xarid qiymatidan oshmasligi kerak.");
      return;
    }

    const batchId = crypto.randomUUID();

    try {
      addBatch({
        id: batchId,
        code,
        direction: 'meat',
        arrivalDate: batchForm.arrivalDate,
        supplierId: supplier.id,
        supplierName: supplier.name,
        locationId: location.id,
        locationName: location.name,
        initialCount,
        pricePerChick,
        paidAmount: paidAmount,
        paymentMethod: batchForm.paymentMethod,
        status: 'active',
        closedAt: null,
        note: batchForm.note.trim(),
      });

      setCreateOpen(false);
      setStatus('active');
      setSelectedId(batchId);
    } catch (error) {
      setCreateError(errorText(error));
    }
  }

  // ====================================
  // ACTIONS
  // ====================================

  function openAction(type: ActionType) {
    if (!selectedBatch) return;

    const firstLocation = balances.find(
      (item) =>
        item.quantity > 0 &&
        meatLocations.some((location) => location.id === item.locationId)
    );

    setActionForm({
      ...emptyActionForm(),
      locationId: firstLocation?.locationId ?? '',
    });

    setActionError('');
    setAction(type);
  }

  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBatch || !action) return;

    setActionError('');

    try {
      if (
        !actionForm.date ||
        actionForm.date < selectedBatch.arrivalDate ||
        actionForm.date > localDate()
      ) {
        throw new Error("Amal sanasini to'g'ri tanlang.");
      }

      if (action === 'close') {
        if (alive !== 0) {
          throw new Error(
            "Partiyani yakunlash uchun barcha tirik parrandalar soni 0 bo'lishi kerak."
          );
        }

        closeBatch(selectedBatch.id, actionForm.date);
      } else {
        const location = meatLocations.find(
          (item) => item.id === actionForm.locationId
        );

        if (!location) {
          throw new Error("Go'sht jo'jaxonasini tanlang.");
        }

        const quantity = Number(actionForm.quantity);

        if (
          actionForm.quantity.trim() === '' ||
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error("Parrandalar soni musbat butun son bo'lishi kerak.");
        }

        const available = getBalanceAsOf(
          selectedBatch.id,
          location.id,
          actionForm.date
        );

        if (quantity > available) {
          throw new Error(
            `Tanlangan sanada ${formatNumber(available)} ta parranda mavjud.`
          );
        }

        if (action === 'slaughter') {
          const meatKg = Number(actionForm.meatKg);

          if (
            actionForm.meatKg.trim() === '' ||
            !Number.isFinite(meatKg) ||
            meatKg <= 0
          ) {
            throw new Error("Olingan go'sht miqdorini to'g'ri kiriting.");
          }

          addSlaughter(
            selectedBatch.id,
            location.id,
            quantity,
            meatKg,
            actionForm.date,
            actionForm.note.trim()
          );
        } else {
          addMortality(
            selectedBatch.id,
            location.id,
            quantity,
            actionForm.date,
            actionForm.note.trim()
          );
        }
      }

      setAction(null);
    } catch (error) {
      setActionError(errorText(error));
    }
  }

  // ====================================
  // RENDER
  // ====================================

  return (
    <div className="w-full space-y-5 pb-8">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Beef size={26} className="text-accent" />

          <div>
            <h1 className="text-2xl font-semibold">Go'sht jo'jaxonasi</h1>

            <p className="mt-1 text-sm text-muted">
              Broyler partiyalari, yem rejasi, omborga so'rov, nobud bo'lish va
              so'yish hisobi
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateBatch}
        >
          <Plus size={16} />
          Yangi partiya
        </button>
      </header>

      {/* TOTAL STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Faol partiyalar" value={`${activeBatches.length} ta`} />

        <Stat
          label="Tirik broylerlar"
          value={`${formatNumber(totalAlive)} ta`}
        />

        <Stat
          label="Jami so'yilgan"
          value={`${formatNumber(totalSlaughtered)} ta`}
        />

        <Stat
          label="Olingan go'sht"
          value={`${formatNumber(totalMeatKg)} kg`}
        />
      </div>

      {/* BATCH LIST */}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Go'sht partiyalari</h2>

            <p className="mt-1 text-xs text-muted">
              Har bir BR partiyasi alohida hisoblanadi.
            </p>
          </div>

          <select
            className="form-input !w-auto"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="active">Faol partiyalar</option>

            <option value="closed">Yakunlanganlar</option>

            <option value="all">Barchasi</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[900px]">
            <thead>
              <tr>
                <th>Partiya</th>
                <th>Kelgan sana</th>
                <th>Yoshi</th>
                <th>Kelgan</th>
                <th>Tirik</th>
                <th>Nobud</th>
                <th>So'yilgan</th>
                <th>Go'sht</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {displayedBatches.map((batch) => {
                const remaining = getBalances(batch.id).reduce(
                  (sum, item) => sum + item.quantity,
                  0
                );

                const isSelected = selectedId === batch.id;

                return (
                  <tr key={batch.id}>
                    <td className="font-semibold">{batch.code}</td>

                    <td>{batch.arrivalDate}</td>

                    <td>
                      {daysBetween(
                        batch.arrivalDate,
                        batch.closedAt ?? localDate()
                      )}{' '}
                      kun
                    </td>

                    <td>{formatNumber(batch.initialCount)}</td>

                    <td className="font-semibold">{formatNumber(remaining)}</td>

                    <td>{formatNumber(getMortality(batch.id))}</td>

                    <td>{formatNumber(getSlaughtered(batch.id))}</td>

                    <td>{formatNumber(getMeatKg(batch.id))} kg</td>

                    <td>
                      <span
                        className={
                          batch.status === 'active'
                            ? 'status-badge status-success'
                            : 'status-badge status-neutral'
                        }
                      >
                        {batch.status === 'active' ? 'Faol' : 'Yakunlangan'}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          isSelected
                            ? 'primary-button !min-h-8 !px-2'
                            : 'secondary-button !min-h-8 !px-2'
                        }
                        onClick={() =>
                          setSelectedId(isSelected ? '' : batch.id)
                        }
                        title="Batafsil"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {displayedBatches.length === 0 && (
          <p className="p-10 text-center text-sm text-muted">
            Ushbu holatda go'sht partiyalari mavjud emas.
          </p>
        )}
      </section>

      {/* SELECTED BATCH */}

      {selectedBatch && (
        <section className="surface-card space-y-6 p-5">
          {/* BATCH HEADER */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedBatch.code} — partiya boshqaruvi
              </h2>

              <p className="mt-1 text-xs text-muted">
                {selectedBatch.supplierName} • {selectedBatch.arrivalDate}
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedId('')}
            >
              <X size={16} />
              Yopish
            </button>
          </div>

          <BatchPaymentPanel batch={selectedBatch} />

          {/* BATCH STATISTICS */}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat
              label="Jo'ja xaridi"
              value={formatMoney(
                selectedBatch.initialCount * selectedBatch.pricePerChick
              )}
            />

            <Stat label="Tirik" value={`${formatNumber(alive)} ta`} />

            <Stat
              label="Nobud bo'lgan"
              value={`${formatNumber(getMortality(selectedBatch.id))} ta`}
            />

            <Stat
              label="So'yilgan"
              value={`${formatNumber(getSlaughtered(selectedBatch.id))} ta`}
            />
          </div>

          <BatchCostPanel batchId={selectedBatch.id} />
          <LiveBirdSalePanel batch={selectedBatch} />

          {/* LOCATION BALANCES */}

          <div>
            <h3 className="mb-3 text-sm font-semibold">
              Bo'lim bo'yicha parrandalar
            </h3>

            {balances.length === 0 ? (
              <p className="text-sm text-muted">Qoldiq ma'lumoti yo'q.</p>
            ) : (
              balances.map((item) => (
                <div
                  key={item.locationId}
                  className="flex items-center justify-between border-b border-border-custom py-3 text-sm"
                >
                  <span>{getLocationName(item.locationId)}</span>

                  <strong>{formatNumber(item.quantity)} ta</strong>
                </div>
              ))
            )}
          </div>

          {/* FEED MANAGEMENT:
              PLAN + AVAILABLE STOCK + REQUESTS */}

          <div className="space-y-4">
            {balances
              .filter((item) =>
                meatLocations.some(
                  (location) => location.id === item.locationId
                )
              )
              .map((item) => (
                <div key={item.locationId} className="space-y-3">
                  {balances.length > 1 && (
                    <h4 className="text-sm font-medium">
                      {getLocationName(item.locationId)}
                    </h4>
                  )}

                  {selectedBatch.status === 'active' ? (
                    <FacilityFeedPanel
                      batchId={selectedBatch.id}
                      locationId={item.locationId}
                    />
                  ) : (
                    <p className="rounded-xl border border-border-custom p-4 text-sm text-muted">
                      Partiya yakunlangan. Yangi yem rejasi yoki so'rov kiritib
                      bo'lmaydi.
                    </p>
                  )}
                </div>
              ))}

            {!balances.some((item) =>
              meatLocations.some((location) => location.id === item.locationId)
            ) && (
              <p className="text-sm text-muted">
                Go'sht jo'jaxonasi bo'yicha ma'lumot topilmadi.
              </p>
            )}
          </div>

          {/* ACTION BUTTONS */}

          {selectedBatch.status === 'active' && (
            <div className="flex flex-wrap gap-2 border-t border-border-custom pt-5">
              <button
                type="button"
                className="primary-button"
                disabled={alive <= 0}
                onClick={() => openAction('slaughter')}
              >
                <Beef size={16} />
                So'yish kiritish
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={alive <= 0}
                onClick={() => openAction('mortality')}
              >
                <Skull size={16} />
                Nobud bo'lish
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={alive !== 0}
                onClick={() => openAction('close')}
                title={
                  alive !== 0
                    ? 'Partiyani yakunlash uchun tirik parranda qolmasligi kerak'
                    : 'Partiyani yakunlash'
                }
              >
                <Archive size={16} />
                Partiyani yakunlash
              </button>
            </div>
          )}

          {/* HISTORICAL ACTUAL FEED */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList size={17} />
                Haqiqiy yem sarfi tarixi
              </h3>

              <span className="text-xs text-muted">
                {batchFeedHistory.length} ta yozuv
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniStat
                label="Jami haqiqiy sarf"
                value={`${formatNumber(totalActualFeed)} kg`}
              />

              <MiniStat
                label="Tarixiy me'yor bo'yicha"
                value={`${formatNumber(totalHistoricalExpectedFeed)} kg`}
              />
            </div>

            <p className="text-xs text-muted">
              Bu jadval faqat oldindan saqlangan haqiqiy yem sarflarini
              ko'rsatadi. Yuqoridagi yem rejasini saqlash bu jadvalga sarf
              qo'shmaydi.
            </p>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[850px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Bo'lim</th>
                    <th>Yem turi</th>
                    <th>Retsept</th>
                    <th>Tirik</th>
                    <th>Me'yor</th>
                    <th>Haqiqiy sarf</th>
                  </tr>
                </thead>

                <tbody>
                  {batchFeedHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>

                      <td>{getLocationName(item.locationId)}</td>

                      <td>{item.feedType}</td>

                      <td>{item.recipeName}</td>

                      <td>
                        {item.birdCount === undefined
                          ? '—'
                          : formatNumber(item.birdCount)}
                      </td>

                      <td>
                        {item.normGrams === undefined
                          ? '—'
                          : `${formatNumber(item.normGrams)} g`}
                      </td>

                      <td className="font-semibold">
                        {formatNumber(item.quantity)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchFeedHistory.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                Ushbu partiya uchun haqiqiy yem sarfi yozuvlari hali yo'q.
              </p>
            )}
          </div>

          {/* SLAUGHTER HISTORY */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Beef size={17} />
              So'yish tarixi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[600px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Bo'lim</th>
                    <th>So'yilgan</th>
                    <th>Go'sht</th>
                    <th>Izoh</th>
                  </tr>
                </thead>

                <tbody>
                  {batchSlaughterEvents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>

                      <td>{getLocationName(item.fromLocationId)}</td>

                      <td>{formatNumber(item.quantity)} ta</td>

                      <td>{formatNumber(item.meatKg ?? 0)} kg</td>

                      <td>{item.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchSlaughterEvents.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                So'yish yozuvlari mavjud emas.
              </p>
            )}
          </div>

          {/* MORTALITY HISTORY */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Skull size={17} />
              Nobud bo'lish tarixi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[550px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Bo'lim</th>
                    <th>Nobud bo'lgan</th>
                    <th>Izoh</th>
                  </tr>
                </thead>

                <tbody>
                  {batchMortalityEvents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>

                      <td>{getLocationName(item.fromLocationId)}</td>

                      <td>{formatNumber(item.quantity)} ta</td>

                      <td>{item.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchMortalityEvents.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                Nobud bo'lish yozuvlari mavjud emas.
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border-custom p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-muted" />

            <p className="text-xs leading-5 text-muted">
              BR partiyasidagi so'yish va nobud bo'lish faqat shu partiyaning
              tirik sonini kamaytiradi. LY tuxum partiyalariga ta'sir qilmaydi.
              Rejalashtirilgan yem ehtiyoji haqiqiy sarf yoki ombor transferi
              hisoblanmaydi.
            </p>
          </div>
        </section>
      )}

      {/* NEW BATCH MODAL */}

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCreateOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-meat-batch-title"
            className="surface-card max-h-[90vh] w-full max-w-[620px] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border-custom p-5">
              <div>
                <h2 id="new-meat-batch-title" className="text-lg font-semibold">
                  Yangi go'sht partiyasi
                </h2>

                <p className="mt-1 text-xs text-muted">
                  Broyler jo'jalarini qabul qilish
                </p>
              </div>

              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={() => setCreateOpen(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveNewBatch} className="space-y-4 p-5">
              <div>
                <label className="form-label">Partiya raqami *</label>

                <input
                  required
                  className="form-input"
                  placeholder="Masalan: BR-002"
                  value={batchForm.code}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      code: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="form-label">Yo'nalish</label>

                <input className="form-input" value="Go'sht" readOnly />
              </div>

              <div>
                <label className="form-label">Kelgan sana *</label>

                <input
                  required
                  type="date"
                  max={localDate()}
                  className="form-input"
                  value={batchForm.arrivalDate}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      arrivalDate: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="form-label">Yetkazib beruvchi *</label>

                <select
                  required
                  className="form-input"
                  value={batchForm.supplierId}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      supplierId: event.target.value,
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
              </div>

              <div>
                <label className="form-label">Go'sht jo'jaxonasi *</label>

                <select
                  required
                  className="form-input"
                  value={batchForm.locationId}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      locationId: event.target.value,
                    })
                  }
                >
                  <option value="">Tanlang</option>

                  {activeMeatLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="form-label">Jo'jalar soni *</label>

                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    placeholder="Masalan: 5000"
                    value={batchForm.initialCount}
                    onChange={(event) =>
                      setBatchForm({
                        ...batchForm,
                        initialCount: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="form-label">
                    Bitta jo'ja narxi (so'm) *
                  </label>

                  <MoneyInput
                    required
                    min="0"
                    step="any"
                    className="form-input"
                    placeholder="Narxni kiriting"
                    value={batchForm.pricePerChick}
                    onChange={(value) =>
                      setBatchForm({
                        ...batchForm,
                        pricePerChick: value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Jami xarid qiymati</label>

                <div className="rounded-xl border border-border-custom p-4">
                  <p className="text-xl font-semibold text-accent">
                    {formatMoney(
                      (Number(batchForm.initialCount) || 0) *
                        (Number(batchForm.pricePerChick) || 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="form-label">
                    Boshlang'ich to'lov (so'm)
                  </label>
                  <MoneyInput
                    className="form-input"
                    min={0}
                    value={batchForm.paidAmount}
                    onChange={(value) =>
                      setBatchForm((prev) => ({ ...prev, paidAmount: value }))
                    }
                    placeholder="0 — qarzga"
                  />
                </div>
                <div>
                  <label className="form-label">To'lov usuli</label>
                  <select
                    className="form-input"
                    disabled={Number(batchForm.paidAmount) <= 0}
                    value={batchForm.paymentMethod}
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as
                          | 'cash'
                          | 'card'
                          | 'bank',
                      }))
                    }
                  >
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                    <option value="bank">Bank o'tkazmasi</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-muted">
                Qolgan qarz:{' '}
                <strong className="!text-red-600">
                  {formatMoney(
                    Math.max(
                      0,
                      (Number(batchForm.initialCount) || 0) *
                        (Number(batchForm.pricePerChick) || 0) -
                        (Number(batchForm.paidAmount) || 0)
                    )
                  )}
                </strong>
              </p>

              <div>
                <label className="form-label">Izoh</label>

                <textarea
                  className="form-input min-h-[80px]"
                  value={batchForm.note}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      note: event.target.value,
                    })
                  }
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>

              {createError && <ErrorMessage message={createError} />}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCreateOpen(false)}
                >
                  Bekor qilish
                </button>

                <button type="submit" className="primary-button">
                  <Plus size={16} />
                  Partiyani saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MORTALITY / SLAUGHTER / CLOSE MODAL */}

      {action && selectedBatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAction(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meat-action-title"
            className="surface-card max-h-[90vh] w-full max-w-[540px] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border-custom p-5">
              <div>
                <h2 id="meat-action-title" className="text-lg font-semibold">
                  {action === 'slaughter'
                    ? "So'yish va go'sht chiqimi"
                    : action === 'mortality'
                      ? "Nobud bo'lgan parrandalar"
                      : 'Partiyani yakunlash'}
                </h2>

                <p className="mt-1 text-xs text-muted">{selectedBatch.code}</p>
              </div>

              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={() => setAction(null)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveAction} className="space-y-4 p-5">
              <div>
                <label className="form-label">Sana *</label>

                <input
                  required
                  type="date"
                  min={selectedBatch.arrivalDate}
                  max={localDate()}
                  className="form-input"
                  value={actionForm.date}
                  onChange={(event) =>
                    setActionForm({
                      ...actionForm,
                      date: event.target.value,
                    })
                  }
                />
              </div>

              {action !== 'close' && (
                <>
                  <div>
                    <label className="form-label">Go'sht jo'jaxonasi *</label>

                    <select
                      required
                      className="form-input"
                      value={actionForm.locationId}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          locationId: event.target.value,
                        })
                      }
                    >
                      <option value="">Tanlang</option>

                      {meatLocations
                        .filter(
                          (location) =>
                            getBalanceAsOf(
                              selectedBatch.id,
                              location.id,
                              actionForm.date
                            ) > 0
                        )
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} —{' '}
                            {formatNumber(
                              getBalanceAsOf(
                                selectedBatch.id,
                                location.id,
                                actionForm.date
                              )
                            )}{' '}
                            ta
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      {action === 'slaughter'
                        ? "So'yilgan tovuqlar soni *"
                        : "Nobud bo'lgan son *"}
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      placeholder="Soni"
                      value={actionForm.quantity}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          quantity: event.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {action === 'slaughter' && (
                <div>
                  <label className="form-label">Olingan go'sht (kg) *</label>

                  <input
                    required
                    type="number"
                    min="0.001"
                    step="any"
                    className="form-input"
                    placeholder="Masalan: 450"
                    value={actionForm.meatKg}
                    onChange={(event) =>
                      setActionForm({
                        ...actionForm,
                        meatKg: event.target.value,
                      })
                    }
                  />
                </div>
              )}

              {action !== 'close' && (
                <div>
                  <label className="form-label">Izoh</label>

                  <textarea
                    className="form-input min-h-[85px]"
                    value={actionForm.note}
                    onChange={(event) =>
                      setActionForm({
                        ...actionForm,
                        note: event.target.value,
                      })
                    }
                  />
                </div>
              )}

              {action === 'close' && (
                <p className="rounded-xl border border-border-custom p-4 text-sm text-muted">
                  Partiyaning parvarish bosqichi yakunlanadi. Tarixiy
                  ma'lumotlar saqlanadi. Bu moliyaviy hisob yopildi degani emas.
                </p>
              )}

              {actionError && <ErrorMessage message={actionError} />}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAction(null)}
                >
                  Bekor qilish
                </button>

                <button type="submit" className="primary-button">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs text-muted">{label}</p>

      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-custom p-4">
      <p className="text-xs text-muted">{label}</p>

      <p className="mt-2 text-lg font-semibold">{value}</p>
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
