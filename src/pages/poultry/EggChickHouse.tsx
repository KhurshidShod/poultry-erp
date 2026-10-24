import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  Bird,
  Egg,
  Eye,
  Plus,
  Skull,
  Wheat,
  X,
} from 'lucide-react';
import BatchCostPanel from '../../components/poultry/BatchCostPanel';
import LiveBirdSalePanel from '../../components/poultry/LiveBirdSalePanel';

import { useMemo, useState, type FormEvent } from 'react';

import { useFarmFeed } from '../../context/FarmFeedContext';
import { useLocations } from '../../context/LocationsContext';
import { useMasterData } from '../../context/MasterDataContext';
import { usePoultry } from '../../context/PoultryContext';

import { formatMoney, formatNumber } from '../../context/WarehouseContext';

import BatchPaymentPanel from '../../components/poultry/BatchPaymentPanel';
import FacilityFeedPanel from '../../components/poultry/FacilityFeedPanel';
import MoneyInput from '../../components/ui/MoneyInput';

type StatusFilter = 'active' | 'closed' | 'all';
type ActionType = 'mortality' | 'transfer' | 'close';

interface NewBatchForm {
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

interface ActionForm {
  date: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
  note: string;
}

function today(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function ageDays(start: string, end = today()) {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);

  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

function emptyBatchForm(locationId = ''): NewBatchForm {
  return {
    code: '',
    arrivalDate: today(),
    supplierId: '',
    locationId,
    initialCount: '',
    pricePerChick: '',
    paidAmount: '',
    paymentMethod: 'cash',
    note: '',
  };
}

function emptyActionForm(fromLocationId = ''): ActionForm {
  return {
    date: today(),
    fromLocationId,
    toLocationId: '',
    quantity: '',
    note: '',
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Amalni bajarishda xatolik yuz berdi.';
}

export default function EggChickHouse() {
  const {
    batches,
    events,
    addBatch,
    addMortality,
    transferBirds,
    closeBatch,
    getBalances,
    getBalanceAsOf,
    getMortality,
  } = usePoultry();

  const { locations } = useLocations();
  const { suppliers } = useMasterData();

  const { getBatchConsumptions } = useFarmFeed();

  const [status, setStatus] = useState<StatusFilter>('active');

  const [selectedId, setSelectedId] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const [batchForm, setBatchForm] = useState<NewBatchForm>(() =>
    emptyBatchForm()
  );

  const [action, setAction] = useState<ActionType | null>(null);

  const [actionForm, setActionForm] = useState<ActionForm>(() =>
    emptyActionForm()
  );

  const [actionError, setActionError] = useState('');

  // -----------------------------------
  // LOCATIONS
  // -----------------------------------

  const chickLocations = useMemo(
    () => locations.filter((item) => item.type === 'poultry'),
    [locations]
  );

  const activeChickLocations = useMemo(
    () => chickLocations.filter((item) => item.active),
    [chickLocations]
  );

  const eggFarmLocations = useMemo(
    () =>
      locations.filter((item) => item.type === 'egg-production' && item.active),
    [locations]
  );

  function locationName(id: string) {
    return locations.find((item) => item.id === id)?.name ?? id;
  }

  // -----------------------------------
  // EGG BATCHES ONLY
  // -----------------------------------

  const eggBatches = useMemo(
    () => batches.filter((batch) => batch.direction === 'egg'),
    [batches]
  );

  const displayedBatches = useMemo(
    () =>
      eggBatches
        .filter((batch) => status === 'all' || batch.status === status)
        .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate)),
    [eggBatches, status]
  );

  const selected = eggBatches.find((batch) => batch.id === selectedId);

  const activeBatches = eggBatches.filter((batch) => batch.status === 'active');

  // Count only birds physically in the
  // 110-day chick-house locations.
  function chicksInHouse(batchId: string) {
    return getBalances(batchId)
      .filter((balance) =>
        chickLocations.some((location) => location.id === balance.locationId)
      )
      .reduce((sum, balance) => sum + balance.quantity, 0);
  }

  function birdsAtEggFarms(batchId: string) {
    return getBalances(batchId)
      .filter((balance) =>
        locations.some(
          (location) =>
            location.id === balance.locationId &&
            location.type === 'egg-production'
        )
      )
      .reduce((sum, balance) => sum + balance.quantity, 0);
  }

  const totalChicks = activeBatches.reduce(
    (sum, batch) => sum + chicksInHouse(batch.id),
    0
  );

  const totalMoved = eggBatches.reduce(
    (sum, batch) => sum + birdsAtEggFarms(batch.id),
    0
  );

  const totalMortality = eggBatches.reduce(
    (sum, batch) => sum + getMortality(batch.id),
    0
  );

  // -----------------------------------
  // SELECTED BATCH
  // -----------------------------------

  const balances = selected ? getBalances(selected.id) : [];

  const chickBalances = balances.filter((balance) =>
    chickLocations.some((location) => location.id === balance.locationId)
  );

  const houseCount = selected ? chicksInHouse(selected.id) : 0;

  const farmCount = selected ? birdsAtEggFarms(selected.id) : 0;

  const totalAlive = balances.reduce(
    (sum, balance) => sum + balance.quantity,
    0
  );

  const selectedAge = selected
    ? ageDays(selected.arrivalDate, selected.closedAt ?? today())
    : 0;

  const history = selected
    ? events
        .filter((event) => event.batchId === selected.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const feedHistory = selected ? getBatchConsumptions(selected.id) : [];

  const totalFeed = feedHistory.reduce((sum, item) => sum + item.quantity, 0);

  // -----------------------------------
  // NEW BATCH
  // -----------------------------------

  function openNewBatch() {
    setBatchForm(emptyBatchForm(activeChickLocations[0]?.id ?? ''));

    setCreateError('');
    setCreateOpen(true);
  }

  function saveNewBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');

    const code = batchForm.code.trim().toUpperCase();

    const supplier = suppliers.find((item) => item.id === batchForm.supplierId);

    const location = activeChickLocations.find(
      (item) => item.id === batchForm.locationId
    );

    const count = Number(batchForm.initialCount);
    const price = Number(batchForm.pricePerChick);

    if (!code) {
      setCreateError('Partiya raqamini kiriting.');
      return;
    }

    if (batches.some((batch) => batch.code.trim().toUpperCase() === code)) {
      setCreateError('Bunday partiya raqami allaqachon mavjud.');
      return;
    }

    if (!supplier || !location) {
      setCreateError("Yetkazib beruvchi va 110 kunlik jo'jaxonani tanlang.");
      return;
    }

    if (!batchForm.arrivalDate || batchForm.arrivalDate > today()) {
      setCreateError("Kelgan sanani to'g'ri tanlang.");
      return;
    }

    if (
      batchForm.initialCount.trim() === '' ||
      !Number.isInteger(count) ||
      count <= 0
    ) {
      setCreateError("Jo'jalar soni musbat butun son bo'lishi kerak.");
      return;
    }

    if (
      batchForm.pricePerChick.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setCreateError("Bir jo'ja narxini to'g'ri kiriting.");
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

    const id = crypto.randomUUID();

    try {
      addBatch({
        id,
        code,
        direction: 'egg',
        arrivalDate: batchForm.arrivalDate,
        supplierId: supplier.id,
        supplierName: supplier.name,
        locationId: location.id,
        locationName: location.name,
        initialCount: count,
        pricePerChick: price,
        paidAmount: paidAmount,
        paymentMethod: batchForm.paymentMethod,
        status: 'active',
        closedAt: null,
        note: batchForm.note.trim(),
      });

      setCreateOpen(false);
      setStatus('active');
      setSelectedId(id);
    } catch (error) {
      setCreateError(errorMessage(error));
    }
  }

  // -----------------------------------
  // MORTALITY / TRANSFER / CLOSE
  // -----------------------------------

  function openAction(type: ActionType) {
    if (!selected) return;

    const first = chickBalances.find((item) => item.quantity > 0);

    setActionForm(emptyActionForm(first?.locationId ?? ''));
    setActionError('');
    setAction(type);
  }

  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || !action) return;

    setActionError('');

    try {
      if (
        !actionForm.date ||
        actionForm.date < selected.arrivalDate ||
        actionForm.date > today()
      ) {
        throw new Error("Amal sanasini to'g'ri tanlang.");
      }

      if (action === 'close') {
        if (houseCount !== 0) {
          throw new Error(
            "110 kunlik jo'jaxonada jo'jalar qolgan. Avval ularni ko'chiring."
          );
        }

        // A batch can still have living birds at egg farms.
        // The current PoultryContext closes only when all
        // living balances are zero. Do not bypass it.
        if (totalAlive !== 0) {
          throw new Error(
            'Bu partiyada tuxum fermalarida tirik tovuqlar bor. ' +
              "Partiya hali faol qoladi; jo'jaxonadagi qoldiq 0 bo'lishi yetarli."
          );
        }

        closeBatch(selected.id, actionForm.date);
      } else {
        const from = chickLocations.find(
          (location) => location.id === actionForm.fromLocationId
        );

        if (!from) {
          throw new Error("110 kunlik jo'jaxonani tanlang.");
        }

        const count = Number(actionForm.quantity);

        if (
          actionForm.quantity.trim() === '' ||
          !Number.isInteger(count) ||
          count <= 0
        ) {
          throw new Error("Jo'jalar soni musbat butun son bo'lishi kerak.");
        }

        const available = getBalanceAsOf(selected.id, from.id, actionForm.date);

        if (count > available) {
          throw new Error(
            `Tanlangan sanada ${formatNumber(available)} ta jo'ja mavjud.`
          );
        }

        if (action === 'mortality') {
          addMortality(
            selected.id,
            from.id,
            count,
            actionForm.date,
            actionForm.note.trim()
          );
        } else {
          const destination = eggFarmLocations.find(
            (location) => location.id === actionForm.toLocationId
          );

          if (!destination) {
            throw new Error('Tuxum fermasi №1 yoki №2 ni tanlang.');
          }

          transferBirds(
            selected.id,
            from.id,
            destination.id,
            count,
            actionForm.date,
            actionForm.note.trim()
          );
        }
      }

      setAction(null);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  // -----------------------------------
  // RENDER
  // -----------------------------------

  return (
    <div className="w-full space-y-5 pb-8">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bird size={26} className="text-accent" />

          <div>
            <h1 className="text-2xl font-semibold">110 kunlik jo'jaxona</h1>

            <p className="mt-1 text-sm text-muted">
              Tuxum yo'nalishidagi jo'jalar, yem rejasi, nobud bo'lish va tuxum
              fermalariga ko'chirish
            </p>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={openNewBatch}>
          <Plus size={16} />
          Yangi LY partiyasi
        </button>
      </header>

      {/* TOP STATS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Faol LY partiyalari"
          value={`${activeBatches.length} ta`}
        />

        <Stat
          label="Jo'jaxonadagi tirik jo'jalar"
          value={`${formatNumber(totalChicks)} ta`}
        />

        <Stat
          label="Tuxum fermalarida tirik"
          value={`${formatNumber(totalMoved)} ta`}
        />

        <Stat
          label="Jami nobud bo'lgan"
          value={`${formatNumber(totalMortality)} ta`}
        />
      </div>

      {/* BATCH TABLE */}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Tuxum yo'nalishidagi partiyalar</h2>

            <p className="mt-1 text-xs text-muted">
              LY partiyalari BR partiyalaridan alohida hisoblanadi.
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
                <th>Jo'jaxonada</th>
                <th>Tuxum fermalarida</th>
                <th>Nobud</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {displayedBatches.map((batch) => {
                const age = ageDays(
                  batch.arrivalDate,
                  batch.closedAt ?? today()
                );

                const inHouse = chicksInHouse(batch.id);

                const inFarms = birdsAtEggFarms(batch.id);

                return (
                  <tr key={batch.id}>
                    <td className="font-semibold">{batch.code}</td>

                    <td>{batch.arrivalDate}</td>

                    <td>
                      <span
                        className={
                          age >= 110 && inHouse > 0
                            ? 'font-semibold text-amber-500'
                            : ''
                        }
                      >
                        {age} kun
                      </span>
                    </td>

                    <td>{formatNumber(batch.initialCount)}</td>

                    <td className="font-semibold">{formatNumber(inHouse)}</td>

                    <td>{formatNumber(inFarms)}</td>

                    <td>{formatNumber(getMortality(batch.id))}</td>

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
                          selectedId === batch.id
                            ? 'primary-button !min-h-8 !px-2'
                            : 'secondary-button !min-h-8 !px-2'
                        }
                        onClick={() =>
                          setSelectedId(selectedId === batch.id ? '' : batch.id)
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
            Tuxum yo'nalishida partiyalar topilmadi.
          </p>
        )}
      </section>

      {/* SELECTED BATCH DETAILS */}

      {selected && (
        <section className="surface-card space-y-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selected.code} — 110 kunlik parvarish
              </h2>

              <p className="mt-1 text-xs text-muted">
                {selected.supplierName} • {selected.arrivalDate}
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

          <BatchPaymentPanel batch={selected} />

          {/* BATCH STATS */}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat
              label="Jo'ja xaridi"
              value={formatMoney(
                selected.initialCount * selected.pricePerChick
              )}
            />

            <Stat
              label="Jo'jaxonadagi tirik"
              value={`${formatNumber(houseCount)} ta`}
            />

            <Stat
              label="Tuxum fermalarida"
              value={`${formatNumber(farmCount)} ta`}
            />

            <Stat label="Parvarish yoshi" value={`${selectedAge} kun`} />
          </div>

          {houseCount > 0 && selectedAge >= 110 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 p-4">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-500"
              />

              <p className="text-sm text-muted">
                Partiya 110 kunlik parvarish muddatiga yetgan. Jo'jalarni tuxum
                fermalariga ko'chirish masalasini tekshiring. Ko'chirish
                avtomatik bajarilmaydi.
              </p>
            </div>
          )}

          <BatchCostPanel batchId={selected.id} />
          <LiveBirdSalePanel
            batch={selected}
            allowedLocationIds={chickLocations.map((location) => location.id)}
          />

          {/* LOCATION BALANCES */}

          <div>
            <h3 className="mb-3 text-sm font-semibold">
              Joylashuvlar bo'yicha parrandalar
            </h3>

            {balances.map((item) => (
              <div
                key={item.locationId}
                className="flex items-center justify-between border-b border-border-custom py-3 text-sm"
              >
                <span>{locationName(item.locationId)}</span>

                <strong>{formatNumber(item.quantity)} ta</strong>
              </div>
            ))}
          </div>

          {/* FEED PLAN / STOCK / REQUEST */}

          {selected.status === 'active' &&
            chickBalances.map((item) => (
              <div key={item.locationId} className="space-y-3">
                <FacilityFeedPanel
                  batchId={selected.id}
                  locationId={item.locationId}
                />
              </div>
            ))}

          {selected.status === 'closed' && (
            <p className="rounded-xl border border-border-custom p-4 text-sm text-muted">
              Partiya yakunlangan. Yangi yem rejasi yoki so'rov kiritib
              bo'lmaydi.
            </p>
          )}

          {/* ACTIONS */}

          {selected.status === 'active' && (
            <div className="flex flex-wrap gap-2 border-t border-border-custom pt-5">
              <button
                type="button"
                className="primary-button"
                disabled={houseCount <= 0}
                onClick={() => openAction('transfer')}
              >
                <ArrowRightLeft size={16} />
                Tuxum fermasiga ko'chirish
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={houseCount <= 0}
                onClick={() => openAction('mortality')}
              >
                <Skull size={16} />
                Nobud bo'lish
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={totalAlive !== 0}
                onClick={() => openAction('close')}
                title={
                  totalAlive !== 0
                    ? "Partiyada tirik parranda bor; hali yakunlab bo'lmaydi"
                    : 'Partiyani yakunlash'
                }
              >
                <Archive size={16} />
                Partiyani yakunlash
              </button>
            </div>
          )}

          {/* FEED HISTORY */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wheat size={17} />
              Jo'jaxonadagi yem sarfi tarixi
            </h3>

            <p className="text-sm text-muted">
              Partiyaga bog'langan jami haqiqiy yem sarfi:{' '}
              <strong>{formatNumber(totalFeed)} kg</strong>
            </p>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[630px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Retsept</th>
                    <th>Me'yor</th>
                    <th>Tirik</th>
                    <th>Sarf</th>
                    <th>Bo'lim</th>
                  </tr>
                </thead>

                <tbody>
                  {feedHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.recipeName}</td>
                      <td>
                        {item.normGrams === undefined
                          ? '—'
                          : `${formatNumber(item.normGrams)} g`}
                      </td>
                      <td>
                        {item.birdCount === undefined
                          ? '—'
                          : formatNumber(item.birdCount)}
                      </td>
                      <td>{formatNumber(item.quantity)} kg</td>
                      <td>{locationName(item.locationId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {feedHistory.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                Yem sarfi yozuvlari hali mavjud emas.
              </p>
            )}
          </div>

          {/* BIRD EVENTS */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRightLeft size={17} />
              Jo'jalar harakati va nobud bo'lish tarixi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[750px]">
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
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>

                      <td>
                        {item.type === 'transfer'
                          ? "Ko'chirish"
                          : item.type === 'mortality'
                            ? "Nobud bo'lish"
                            : "So'yish"}
                      </td>

                      <td>{locationName(item.fromLocationId)}</td>

                      <td>
                        {item.toLocationId
                          ? locationName(item.toLocationId)
                          : '—'}
                      </td>

                      <td>{formatNumber(item.quantity)} ta</td>

                      <td>{item.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {history.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                Bu partiya uchun harakatlar yo'q.
              </p>
            )}
          </div>

          {/* REMINDER */}

          <div className="flex items-start gap-3 rounded-xl border border-border-custom p-4">
            <Egg size={18} className="mt-0.5 shrink-0 text-accent" />

            <p className="text-xs leading-5 text-muted">
              Tuxum fermasiga ko'chirilgan jo'jalar LY partiyasiga tegishli
              bo'lib qoladi. Ularning soni jo'jaxonadan kamayadi va qabul
              qiluvchi tuxum fermasiga qo'shiladi. Go'sht yo'nalishidagi BR
              partiyalari o'zgarmaydi.
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
            aria-labelledby="egg-chick-create-title"
            className="surface-card max-h-[90vh] w-full max-w-[620px] overflow-y-auto"
          >
            <ModalHeader
              id="egg-chick-create-title"
              title="Yangi LY partiyasi"
              subtitle="110 kunlik jo'jaxonaga jo'jalarni qabul qilish"
              onClose={() => setCreateOpen(false)}
            />

            <form onSubmit={saveNewBatch} className="space-y-4 p-5">
              <div>
                <label className="form-label">Partiya raqami *</label>
                <input
                  required
                  className="form-input"
                  placeholder="Masalan: LY-002"
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
                <input readOnly className="form-input" value="Tuxum" />
              </div>

              <div>
                <label className="form-label">Kelgan sana *</label>
                <input
                  required
                  type="date"
                  max={today()}
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
                <label className="form-label">110 kunlik jo'jaxona *</label>

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

                  {activeChickLocations.map((location) => (
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
                    value={batchForm.initialCount}
                    onChange={(event) =>
                      setBatchForm({
                        ...batchForm,
                        initialCount: event.target.value,
                      })
                    }
                    placeholder="Masalan: 10000"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Bitta jo'ja narxi (so'm) *
                  </label>

                  <MoneyInput
                    required
                    min={0}
                    className="form-input"
                    value={batchForm.pricePerChick}
                    onChange={(value) =>
                      setBatchForm({
                        ...batchForm,
                        pricePerChick: value,
                      })
                    }
                    placeholder="Narxni kiriting"
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
                  className="form-input min-h-[75px]"
                  value={batchForm.note}
                  onChange={(event) =>
                    setBatchForm({
                      ...batchForm,
                      note: event.target.value,
                    })
                  }
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

      {/* ACTION MODAL */}

      {action && selected && (
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
            aria-labelledby="egg-chick-action-title"
            className="surface-card max-h-[90vh] w-full max-w-[570px] overflow-y-auto"
          >
            <ModalHeader
              id="egg-chick-action-title"
              title={
                action === 'transfer'
                  ? "Tuxum fermasiga ko'chirish"
                  : action === 'mortality'
                    ? "Nobud bo'lgan jo'jalar"
                    : 'Partiyani yakunlash'
              }
              subtitle={selected.code}
              onClose={() => setAction(null)}
            />

            <form onSubmit={saveAction} className="space-y-4 p-5">
              <div>
                <label className="form-label">Sana *</label>

                <input
                  required
                  type="date"
                  min={selected.arrivalDate}
                  max={today()}
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
                    <label className="form-label">Qaysi jo'jaxonadan *</label>

                    <select
                      required
                      className="form-input"
                      value={actionForm.fromLocationId}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          fromLocationId: event.target.value,
                        })
                      }
                    >
                      <option value="">Tanlang</option>

                      {chickLocations
                        .filter(
                          (location) =>
                            getBalanceAsOf(
                              selected.id,
                              location.id,
                              actionForm.date
                            ) > 0
                        )
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} —{' '}
                            {formatNumber(
                              getBalanceAsOf(
                                selected.id,
                                location.id,
                                actionForm.date
                              )
                            )}{' '}
                            ta
                          </option>
                        ))}
                    </select>
                  </div>

                  {action === 'transfer' && (
                    <div>
                      <label className="form-label">
                        Qaysi tuxum fermasiga *
                      </label>

                      <select
                        required
                        className="form-input"
                        value={actionForm.toLocationId}
                        onChange={(event) =>
                          setActionForm({
                            ...actionForm,
                            toLocationId: event.target.value,
                          })
                        }
                      >
                        <option value="">Ferma tanlang</option>

                        {eggFarmLocations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="form-label">
                      {action === 'transfer'
                        ? "Ko'chiriladigan jo'jalar soni *"
                        : "Nobud bo'lgan jo'jalar soni *"}
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      className="form-input"
                      value={actionForm.quantity}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          quantity: event.target.value,
                        })
                      }
                      placeholder="Soni"
                    />
                  </div>

                  <div>
                    <label className="form-label">Izoh</label>

                    <textarea
                      className="form-input min-h-[75px]"
                      value={actionForm.note}
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          note: event.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              {action === 'transfer' && (
                <p className="rounded-xl border border-border-custom p-3 text-xs text-muted">
                  Ko'chirilgan tovuqlar shu LY partiyasida qoladi. Jo'jaxonadagi
                  son kamayadi, tuxum fermasidagi son ortadi.
                </p>
              )}

              {action === 'close' && (
                <p className="rounded-xl border border-border-custom p-3 text-sm text-muted">
                  Partiyani yakunlash uchun barcha joylashuvlarda tirik tovuqlar
                  soni 0 bo'lishi kerak. Tuxum fermasiga ko'chirish partiyani
                  avtomatik yakunlamaydi.
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
                  {action === 'transfer' ? "Ko'chirishni saqlash" : 'Saqlash'}
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

function ModalHeader({
  id,
  title,
  subtitle,
  onClose,
}: {
  id: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-custom p-5">
      <div>
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>

      <button
        type="button"
        className="secondary-button !min-h-8 !px-2"
        onClick={onClose}
        aria-label="Yopish"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
    >
      {message}
    </p>
  );
}
