import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  AlertTriangle,
  ClipboardList,
  Egg,
  Eye,
  Pencil,
  Plus,
  Save,
  Skull,
  Wheat,
  X,
} from 'lucide-react';

import {
  useEggProduction,
  type EggProductionInput,
} from '../../context/EggProductionContext';
import { useFarmFeed } from '../../context/FarmFeedContext';
import { useLocations } from '../../context/LocationsContext';
import { usePoultry } from '../../context/PoultryContext';
import { formatNumber } from '../../context/WarehouseContext';

import FacilityFeedPanel from '../../components/poultry/FacilityFeedPanel';
import LiveBirdSalePanel from '../../components/poultry/LiveBirdSalePanel';
import BatchCostPanel from '../../components/poultry/BatchCostPanel';

interface EggFarmProps {
  locationId: string;
}

type ProductionForm = {
  date: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  brokenCount: string;
  note: string;
};

type MortalityForm = {
  date: string;
  quantity: string;
  note: string;
};

type DateMode = 'all' | 'today' | '7days' | 'month' | 'custom';

function today(): string {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function emptyProduction(date = today()): ProductionForm {
  return {
    date,
    category1: '',
    category2: '',
    category3: '',
    category4: '',
    brokenCount: '',
    note: '',
  };
}

function emptyMortality(): MortalityForm {
  return {
    date: today(),
    quantity: '',
    note: '',
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Amalni bajarishda xatolik yuz berdi.';
}

function ageInDays(arrivalDate: string): number {
  const start = new Date(`${arrivalDate}T00:00:00Z`);
  const end = new Date(`${today()}T00:00:00Z`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export default function EggFarm({ locationId }: EggFarmProps) {
  const { batches, events, getBalances, getBalanceAsOf, addMortality } =
    usePoultry();

  const { locations } = useLocations();

  const { records, saveProduction, getProduction, getTotals } =
    useEggProduction();

  const { getBatchConsumptions } = useFarmFeed();

  const location = locations.find(
    (item) => item.id === locationId && item.type === 'egg-production'
  );

  // =====================================
  // LOCAL STATE
  // =====================================

  const [selectedId, setSelectedId] = useState('');

  const [productionOpen, setProductionOpen] = useState(false);
  const [productionForm, setProductionForm] = useState<ProductionForm>(() =>
    emptyProduction()
  );

  const [productionError, setProductionError] = useState('');
  const [productionSuccess, setProductionSuccess] = useState('');

  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [mortalityForm, setMortalityForm] =
    useState<MortalityForm>(emptyMortality);
  const [mortalityError, setMortalityError] = useState('');

  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [customStart, setCustomStart] = useState(daysAgo(6));
  const [customEnd, setCustomEnd] = useState(today());

  // Clear selection if route changes between farm 1 and 2.
  useEffect(() => {
    setSelectedId('');
    setProductionOpen(false);
    setMortalityOpen(false);
    setDateMode('all');
  }, [locationId]);

  // =====================================
  // PARTIES AT THIS EXACT FARM
  // =====================================

  const eggBatches = useMemo(
    () => batches.filter((batch) => batch.direction === 'egg'),
    [batches]
  );

  const farmBatches = eggBatches
    .filter((batch) => {
      const hasCurrentBirds = getBalances(batch.id).some(
        (row) => row.locationId === locationId && row.quantity > 0
      );

      // Keep formerly transferred batches in history.
      const hasTransferHistory = events.some(
        (event) =>
          event.batchId === batch.id &&
          event.type === 'transfer' &&
          event.toLocationId === locationId
      );

      const hasProduction = records.some(
        (record) =>
          record.batchId === batch.id && record.locationId === locationId
      );

      return hasCurrentBirds || hasTransferHistory || hasProduction;
    })
    .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));

  const selectedBatch = farmBatches.find((batch) => batch.id === selectedId);

  const aliveFor = (batchId: string) =>
    getBalanceAsOf(batchId, locationId, today());

  const activeBatches = farmBatches.filter(
    (batch) => batch.status === 'active' && aliveFor(batch.id) > 0
  );

  const totalAlive = farmBatches.reduce(
    (sum, batch) => sum + Math.max(0, aliveFor(batch.id)),
    0
  );

  // =====================================
  // DATE FILTER
  // =====================================

  const activeStart =
    dateMode === 'today'
      ? today()
      : dateMode === '7days'
        ? daysAgo(6)
        : dateMode === 'month'
          ? `${today().slice(0, 7)}-01`
          : dateMode === 'custom'
            ? customStart
            : '';

  const activeEnd = dateMode === 'custom' ? customEnd : today();

  const invalidRange =
    dateMode === 'custom' &&
    (!customStart || !customEnd || customStart > customEnd);

  const filteredRecords = records
    .filter((item) => item.locationId === locationId)
    .filter(
      (item) =>
        !invalidRange &&
        (dateMode === 'all' ||
          (item.date >= activeStart && item.date <= activeEnd))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredTotals = getTotals({
    locationId,
    ...(dateMode === 'all' || invalidRange
      ? {}
      : {
          fromDate: activeStart,
          toDate: activeEnd,
        }),
  });

  const shownTotals = invalidRange
    ? {
        category1: 0,
        category2: 0,
        category3: 0,
        category4: 0,
        brokenCount: 0,
        sellable: 0,
        totalCollected: 0,
      }
    : filteredTotals;

  const todayTotals = getTotals({
    locationId,
    fromDate: today(),
    toDate: today(),
  });

  // =====================================
  // SELECTED BATCH
  // =====================================

  const selectedAlive = selectedBatch ? aliveFor(selectedBatch.id) : 0;

  const selectedRecords = selectedBatch
    ? records
        .filter(
          (item) =>
            item.batchId === selectedBatch.id && item.locationId === locationId
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const selectedFeedHistory = selectedBatch
    ? getBatchConsumptions(selectedBatch.id).filter(
        (item) => item.locationId === locationId
      )
    : [];

  const selectedMortalityHistory = selectedBatch
    ? events
        .filter(
          (item) =>
            item.batchId === selectedBatch.id &&
            item.type === 'mortality' &&
            item.fromLocationId === locationId
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  // =====================================
  // DAILY EGG FORM
  // =====================================

  function openProductionForm(date = today()) {
    if (!selectedBatch) return;

    const existing = getProduction(selectedBatch.id, locationId, date);

    setProductionForm(
      existing
        ? {
            date: existing.date,
            category1: String(existing.category1),
            category2: String(existing.category2),
            category3: String(existing.category3),
            category4: String(existing.category4),
            brokenCount: String(existing.brokenCount),
            note: existing.note,
          }
        : emptyProduction(date)
    );

    setProductionError('');
    setProductionOpen(true);
  }

  function updateProductionDate(value: string) {
    if (!selectedBatch) return;

    const existing = getProduction(selectedBatch.id, locationId, value);

    setProductionForm(
      existing
        ? {
            date: value,
            category1: String(existing.category1),
            category2: String(existing.category2),
            category3: String(existing.category3),
            category4: String(existing.category4),
            brokenCount: String(existing.brokenCount),
            note: existing.note,
          }
        : emptyProduction(value)
    );

    setProductionError('');
  }

  const inputNumbers = [
    productionForm.category1,
    productionForm.category2,
    productionForm.category3,
    productionForm.category4,
    productionForm.brokenCount,
  ];

  const previewValid = inputNumbers.every(
    (value) =>
      value.trim() === '' ||
      (Number.isSafeInteger(Number(value)) && Number(value) >= 0)
  );

  const previewCounts = inputNumbers.map((value) => Number(value || 0));

  const previewSellable = previewCounts
    .slice(0, 4)
    .reduce((sum, n) => sum + n, 0);

  const previewTotal = previewSellable + previewCounts[4];

  function saveEggs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductionError('');

    if (!selectedBatch) return;

    if (!previewValid) {
      setProductionError(
        "Tuxum sonlari manfiy bo'lmagan butun sonlar bo'lishi kerak."
      );
      return;
    }

    const input: EggProductionInput = {
      date: productionForm.date,
      batchId: selectedBatch.id,
      locationId,
      category1: previewCounts[0],
      category2: previewCounts[1],
      category3: previewCounts[2],
      category4: previewCounts[3],
      brokenCount: previewCounts[4],
      note: productionForm.note,
    };

    try {
      saveProduction(input);
      setProductionOpen(false);
      setProductionSuccess(
        `${productionForm.date} sanasidagi tuxum yig'imi saqlandi.`
      );
    } catch (error) {
      setProductionError(getErrorMessage(error));
    }
  }

  // =====================================
  // MORTALITY FORM
  // =====================================

  function openMortalityForm() {
    setMortalityForm(emptyMortality());
    setMortalityError('');
    setMortalityOpen(true);
  }

  function saveMortality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMortalityError('');

    if (!selectedBatch) return;

    const quantity = Number(mortalityForm.quantity);

    if (
      mortalityForm.quantity.trim() === '' ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setMortalityError("Nobud bo'lgan tovuqlar sonini to'g'ri kiriting.");
      return;
    }

    const available = getBalanceAsOf(
      selectedBatch.id,
      locationId,
      mortalityForm.date
    );

    if (quantity > available) {
      setMortalityError(
        `Tanlangan sanada ${formatNumber(available)} ta tovuq mavjud.`
      );
      return;
    }

    try {
      addMortality(
        selectedBatch.id,
        locationId,
        quantity,
        mortalityForm.date,
        mortalityForm.note.trim()
      );

      setMortalityOpen(false);
    } catch (error) {
      setMortalityError(getErrorMessage(error));
    }
  }

  // =====================================
  // INVALID LOCATION
  // =====================================

  if (!location) {
    return (
      <div className="surface-card p-6">
        <h1 className="text-xl font-semibold">Tuxum fermasi topilmadi</h1>
        <p className="mt-2 text-sm text-muted">
          {locationId} identifikatorli tuxum fermasi LocationsContext ichida
          mavjud emas.
        </p>
      </div>
    );
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="w-full space-y-5 pb-8">
      {/* HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Egg size={27} className="text-accent" />

          <div>
            <h1 className="text-2xl font-semibold">{location.name}</h1>

            <p className="mt-1 text-sm text-muted">
              LY partiyalari, kunlik tuxum yig'imi, singan tuxumlar, yem va
              nobud bo'lish
            </p>
          </div>
        </div>
      </header>

      {/* METRICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Faol LY partiyalari"
          value={`${activeBatches.length} ta`}
        />

        <Stat label="Tirik tovuqlar" value={`${formatNumber(totalAlive)} ta`} />

        <Stat
          label="Bugun sotishga yaroqli"
          value={`${formatNumber(todayTotals.sellable)} ta`}
        />

        <Stat
          label="Bugun singan tuxumlar"
          value={`${formatNumber(todayTotals.brokenCount)} ta`}
        />
      </div>

      {/* BATCHES */}

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">Fermadagi LY partiyalari</h2>

          <p className="mt-1 text-xs text-muted">
            Jo'jaxonadan ko'chirilgan partiyalar avtomatik ko'rsatiladi. Yangi
            partiya yaratish shart emas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[700px]">
            <thead>
              <tr>
                <th>Partiya</th>
                <th>Kelgan sana</th>
                <th>Yoshi</th>
                <th>Fermada tirik</th>
                <th>Jami tuxum</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {farmBatches.map((batch) => {
                const alive = aliveFor(batch.id);

                const totals = getTotals({
                  locationId,
                  batchId: batch.id,
                });

                return (
                  <tr key={batch.id}>
                    <td className="font-semibold">{batch.code}</td>

                    <td>{batch.arrivalDate}</td>

                    <td>{ageInDays(batch.arrivalDate)} kun</td>

                    <td>{formatNumber(alive)} ta</td>

                    <td>{formatNumber(totals.totalCollected)} ta</td>

                    <td>
                      <span
                        className={
                          batch.status === 'active' && alive > 0
                            ? 'status-badge status-success'
                            : 'status-badge status-neutral'
                        }
                      >
                        {batch.status === 'active' && alive > 0
                          ? 'Faol'
                          : 'Tarix'}
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
                        onClick={() => {
                          setSelectedId(
                            selectedId === batch.id ? '' : batch.id
                          );
                          setProductionSuccess('');
                        }}
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

        {farmBatches.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            Bu fermaga hali LY partiyasi ko'chirilmagan. Avval 110 kunlik
            jo'jaxonadan transfer qiling.
          </p>
        )}
      </section>

      {/* SELECTED BATCH */}

      {selectedBatch && (
        <section className="surface-card space-y-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedBatch.code} — ferma boshqaruvi
              </h2>

              <p className="mt-1 text-xs text-muted">
                {location.name} • {formatNumber(selectedAlive)} ta tirik
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

          {/* ACTION BUTTONS */}

          {selectedBatch.status === 'active' && selectedAlive > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="primary-button"
                onClick={() => openProductionForm()}
              >
                <Plus size={16} />
                Kunlik tuxum kiritish
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={openMortalityForm}
              >
                <Skull size={16} />
                Nobud bo'lish
              </button>
            </div>
          )}

          {productionSuccess && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
              {productionSuccess}
            </p>
          )}

          {/* FARM-ONLY LIVE SALES AND MORTALITY ECONOMIC LOSS */}
          <div className="space-y-4 border-t border-border-custom pt-5">
            <div>
              <h3 className="text-base font-semibold">Tirik tovuq sotish — {location.name}</h3>
              <p className="mt-1 text-xs text-muted">
                Faqat ushbu fermadagi tirik tovuqlar sotiladi. Jo'jaxona va boshqa ferma qoldig'iga tegilmaydi.
              </p>
            </div>
            <LiveBirdSalePanel
              key={`${locationId}-${selectedBatch.id}`}
              batch={selectedBatch}
              allowedLocationIds={[locationId]}
            />
          </div>

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="text-base font-semibold">Nobud bo'lish — ushbu fermadagi iqtisodiy yo'qotish</h3>
            <BatchCostPanel batchId={selectedBatch.id} locationId={locationId} />
          </div>

          {/* FEED PANEL */}

          {selectedBatch.status === 'active' && (
            <FacilityFeedPanel
              batchId={selectedBatch.id}
              locationId={locationId}
            />
          )}

          {/* SELECTED PRODUCTION RECORDS */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList size={17} />
              Partiyaning tuxum yig'imi tarixi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[820px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>1-kat.</th>
                    <th>2-kat.</th>
                    <th>3-kat.</th>
                    <th>4-kat.</th>
                    <th>Singan</th>
                    <th>Jami</th>
                    <th>Amal</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.date}</td>
                      <td>{formatNumber(record.category1)}</td>
                      <td>{formatNumber(record.category2)}</td>
                      <td>{formatNumber(record.category3)}</td>
                      <td>{formatNumber(record.category4)}</td>
                      <td>{formatNumber(record.brokenCount)}</td>

                      <td className="font-semibold">
                        {formatNumber(
                          record.category1 +
                            record.category2 +
                            record.category3 +
                            record.category4 +
                            record.brokenCount
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="secondary-button !min-h-8 !px-2"
                          disabled={selectedBatch.status !== 'active'}
                          onClick={() => openProductionForm(record.date)}
                          title="Yozuvni tahrirlash"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRecords.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">
                Bu partiya uchun tuxum yig'imi yozilmagan.
              </p>
            )}
          </div>

          {/* FEED CONSUMPTION HISTORY */}

          <div className="space-y-3 border-t border-border-custom pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wheat size={17} />
              Fermadagi yem sarfi
            </h3>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Retsept</th>
                    <th>Me'yor</th>
                    <th>Haqiqiy sarf</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedFeedHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.recipeName}</td>
                      <td>
                        {item.normGrams === undefined
                          ? '—'
                          : `${formatNumber(item.normGrams)} g`}
                      </td>
                      <td>{formatNumber(item.quantity)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedFeedHistory.length === 0 && (
              <p className="text-sm text-muted">
                Yem sarfi hali qayd etilmagan.
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
              <table className="erp-table min-w-[530px]">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Soni</th>
                    <th>Izoh</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedMortalityHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{formatNumber(item.quantity)} ta</td>
                      <td>{item.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedMortalityHistory.length === 0 && (
              <p className="text-sm text-muted">
                Nobud bo'lish yozuvlari yo'q.
              </p>
            )}
          </div>
        </section>
      )}

      {/* FILTER AND FARM REPORT */}

      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">
              {location.name} — tuxum ishlab chiqarish
            </h2>
            <p className="mt-1 text-xs text-muted">
              Barcha LY partiyalari bo'yicha hisobot
            </p>
          </div>

          <select
            className="form-input !w-auto"
            value={dateMode}
            onChange={(event) => setDateMode(event.target.value as DateMode)}
          >
            <option value="all">Barcha sanalar</option>
            <option value="today">Bugun</option>
            <option value="7days">Oxirgi 7 kun</option>
            <option value="month">Shu oy</option>
            <option value="custom">Sana oralig'i</option>
          </select>
        </div>

        {dateMode === 'custom' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Boshlanish sanasi</label>
              <input
                type="date"
                className="form-input"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Tugash sanasi</label>
              <input
                type="date"
                className="form-input"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </div>
          </div>
        )}

        {invalidRange && (
          <p className="text-sm text-red-500">
            Sana oralig'ini to'g'ri kiriting.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MiniStat
            label="Mayda"
            value={`${formatNumber(shownTotals.category1)} ta`}
          />
          <MiniStat
            label="2-kategoriya"
            value={`${formatNumber(shownTotals.category2)} ta`}
          />
          <MiniStat
            label="1-kategoriya"
            value={`${formatNumber(shownTotals.category3)} ta`}
          />
          <MiniStat
            label="Egizak"
            value={`${formatNumber(shownTotals.category4)} ta`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniStat
            label="Sotishga yaroqli"
            value={`${formatNumber(shownTotals.sellable)} ta`}
          />
          <MiniStat
            label="Singan tuxumlar"
            value={`${formatNumber(shownTotals.brokenCount)} ta`}
          />
          <MiniStat
            label="Jami yig'ilgan"
            value={`${formatNumber(shownTotals.totalCollected)} ta`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[800px]">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Partiya</th>
                <th>Mayda</th>
                <th>2-kat.</th>
                <th>1-kat.</th>
                <th>Egiz.</th>
                <th>Singan</th>
                <th>Jami</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((item) => {
                const batch = batches.find((b) => b.id === item.batchId);

                return (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{batch?.code ?? item.batchId}</td>
                    <td>{formatNumber(item.category1)}</td>
                    <td>{formatNumber(item.category2)}</td>
                    <td>{formatNumber(item.category3)}</td>
                    <td>{formatNumber(item.category4)}</td>
                    <td>{formatNumber(item.brokenCount)}</td>
                    <td className="font-semibold">
                      {formatNumber(
                        item.category1 +
                          item.category2 +
                          item.category3 +
                          item.category4 +
                          item.brokenCount
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <p className="py-5 text-center text-sm text-muted">
            Tanlangan davrda tuxum yig'imi topilmadi.
          </p>
        )}
      </section>

      {/* PRODUCTION MODAL */}

      {productionOpen && selectedBatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProductionOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="egg-production-modal-title"
            className="surface-card max-h-[92vh] w-full max-w-[620px] overflow-y-auto"
          >
            <ModalHeader
              id="egg-production-modal-title"
              title="Kunlik tuxum yig'imi"
              subtitle={`${location.name} • ${selectedBatch.code}`}
              onClose={() => setProductionOpen(false)}
            />

            <form
              onSubmit={saveEggs}
              className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
            >
              <div>
                <label className="form-label">Yig'im sanasi *</label>

                <input
                  required
                  type="date"
                  max={today()}
                  min={selectedBatch.arrivalDate}
                  className="form-input"
                  value={productionForm.date}
                  onChange={(event) => updateProductionDate(event.target.value)}
                />
              </div>

              <p className="text-xs text-muted">
                Tanlangan sanada ushbu fermada tirik tovuqlar:{' '}
                <strong>
                  {formatNumber(
                    getBalanceAsOf(
                      selectedBatch.id,
                      locationId,
                      productionForm.date
                    )
                  )}{' '}
                  ta
                </strong>
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ['category1', 'Mayda'],
                    ['category2', '2-kategoriya'],
                    ['category3', '1-kategoriya'],
                    ['category4', 'Egizak'],
                    ['brokenCount', 'Singan tuxumlar'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="form-label">{label} (ta)</label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      placeholder="0"
                      value={productionForm[key]}
                      onChange={(event) =>
                        setProductionForm((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Sotishga yaroqli"
                  value={`${formatNumber(previewSellable)} ta`}
                />
                <MiniStat
                  label="Singan"
                  value={`${formatNumber(previewCounts[4])} ta`}
                />
                <MiniStat
                  label="Jami yig'im"
                  value={`${formatNumber(previewTotal)} ta`}
                />
              </div>

              <div>
                <label className="form-label">Izoh</label>
                <textarea
                  className="form-input min-h-[75px]"
                  value={productionForm.note}
                  onChange={(event) =>
                    setProductionForm({
                      ...productionForm,
                      note: event.target.value,
                    })
                  }
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>

              {productionError && <ErrorMessage message={productionError} />}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setProductionOpen(false)}
                >
                  Bekor qilish
                </button>

                <button type="submit" className="primary-button">
                  <Save size={16} />
                  Yig'imni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MORTALITY MODAL */}

      {mortalityOpen && selectedBatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMortalityOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="egg-mortality-modal-title"
            className="surface-card max-h-[90vh] w-full max-w-[520px] overflow-y-auto"
          >
            <ModalHeader
              id="egg-mortality-modal-title"
              title="Nobud bo'lgan tovuqlar"
              subtitle={`${location.name} • ${selectedBatch.code}`}
              onClose={() => setMortalityOpen(false)}
            />

            <form
              onSubmit={saveMortality}
              className="space-y-4 px-5 py-5 sm:px-6 sm:py-6"
            >
              <div>
                <label className="form-label">Sana *</label>
                <input
                  required
                  type="date"
                  min={selectedBatch.arrivalDate}
                  max={today()}
                  className="form-input"
                  value={mortalityForm.date}
                  onChange={(event) =>
                    setMortalityForm({
                      ...mortalityForm,
                      date: event.target.value,
                    })
                  }
                />
              </div>

              <p className="text-xs text-muted">
                Tanlangan sanada fermadagi tovuqlar:{' '}
                {formatNumber(
                  getBalanceAsOf(
                    selectedBatch.id,
                    locationId,
                    mortalityForm.date
                  )
                )}{' '}
                ta
              </p>

              <div>
                <label className="form-label">Nobud bo'lgan son *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={mortalityForm.quantity}
                  onChange={(event) =>
                    setMortalityForm({
                      ...mortalityForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="form-label">Izoh</label>
                <textarea
                  className="form-input min-h-[75px]"
                  value={mortalityForm.note}
                  onChange={(event) =>
                    setMortalityForm({
                      ...mortalityForm,
                      note: event.target.value,
                    })
                  }
                />
              </div>

              {mortalityError && <ErrorMessage message={mortalityError} />}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMortalityOpen(false)}
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
    <div className="flex items-start justify-between gap-4 border-b border-border-custom px-5 py-5 sm:px-6">
      <div className="min-w-0 space-y-1">
        <h2 id={id} className="text-lg font-semibold leading-6">
          {title}
        </h2>

        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      <button
        type="button"
        className="secondary-button !min-h-9 !min-w-9 !p-2"
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
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
    >
      <AlertTriangle size={17} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
