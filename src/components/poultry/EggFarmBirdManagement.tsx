import { useMemo, useState, type FormEvent } from 'react';
import { useLocations } from '../../context/LocationsContext';
import { usePoultry } from '../../context/PoultryContext';
import { formatNumber } from '../../context/WarehouseContext';
import BatchCostPanel from './BatchCostPanel';
import LiveBirdSalePanel from './LiveBirdSalePanel';

function localDay() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Place inside each egg farm page with the precise egg-production location ID. */
export default function EggFarmBirdManagement({
  locationId,
}: {
  locationId: string;
}) {
  const { locations } = useLocations();
  const { batches, events, getBalances, getBalanceAsOf, addMortality } =
    usePoultry();
  const farm = locations.find((item) => item.id === locationId);
  const farmBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          batch.direction === 'egg' &&
          (getBalances(batch.id).some(
            (row) => row.locationId === locationId && row.quantity > 0
          ) ||
            events.some(
              (event) =>
                event.batchId === batch.id &&
                event.fromLocationId === locationId
            ))
      ),
    [batches, events, locationId]
  );
  const [selectedId, setSelectedId] = useState('');
  const selected =
    farmBatches.find((batch) => batch.id === selectedId) ?? farmBatches[0];
  const [date, setDate] = useState(() => localDay());
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentCount = selected
    ? (getBalances(selected.id).find((row) => row.locationId === locationId)
        ?.quantity ?? 0)
    : 0;
  const mortality = selected
    ? events
        .filter(
          (event) =>
            event.batchId === selected.id &&
            event.type === 'mortality' &&
            event.fromLocationId === locationId
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  function recordMortality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (!farm || farm.type !== 'egg-production')
        throw new Error('Faqat tuxum fermasida amalga oshiriladi.');
      if (!selected) throw new Error('Partiyani tanlang.');
      const count = Number(quantity);
      if (!Number.isInteger(count) || count <= 0)
        throw new Error("Nobud bo'lgan sonni to'g'ri kiriting.");
      const available = getBalanceAsOf(selected.id, locationId, date);
      if (count > available)
        throw new Error(
          `Tanlangan sanada ushbu fermada ${formatNumber(available)} ta mavjud.`
        );
      addMortality(selected.id, locationId, count, date, note);
      setQuantity('');
      setNote('');
      setSuccess('Nobud bo‘lish fermaga bog‘lab saqlandi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Amalni saqlab bo‘lmadi.');
    }
  }

  if (!farm || farm.type !== 'egg-production')
    return (
      <p className="text-sm text-red-500">
        Tuxum fermasining locationId qiymati noto‘g‘ri.
      </p>
    );
  return (
    <section className="surface-card space-y-5 p-5">
      <header>
        <h2 className="section-title">
          {farm.name} — tirik tovuqlarni boshqarish
        </h2>
        <p className="mt-1 text-sm text-muted">
          Bu yerda faqat aynan shu fermaga ko‘chirilgan parrandalar
          boshqariladi.
        </p>
      </header>
      {farmBatches.length === 0 ? (
        <p className="text-sm text-muted">
          Bu fermada parranda partiyasi yoki tarixiy amal topilmadi.
        </p>
      ) : (
        <>
          <div>
            <label className="form-label">Partiya</label>
            <select
              className="form-input"
              value={selected?.id ?? ''}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError('');
                setSuccess('');
              }}
            >
              {farmBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code} —{' '}
                  {formatNumber(
                    getBalances(batch.id).find(
                      (row) => row.locationId === locationId
                    )?.quantity ?? 0
                  )}{' '}
                  ta
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <>
              <p className="font-semibold">
                Ushbu fermadagi tirik qoldiq: {formatNumber(currentCount)} ta
              </p>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  1. Tirik parranda sotish
                </h3>
                <LiveBirdSalePanel
                  batch={selected}
                  allowedLocationIds={[locationId]}
                />
              </div>
              <form
                onSubmit={recordMortality}
                className="space-y-3 rounded-xl border border-border-custom p-4"
              >
                <h3 className="font-semibold">
                  2. Ushbu fermada nobud bo‘lish
                </h3>
                <div>
                  <label className="form-label">Sana</label>
                  <input
                    className="form-input"
                    required
                    type="date"
                    min={selected.arrivalDate}
                    max={localDay()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Nobud bo‘lgan son</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Tanlangan sanada shu fermada{' '}
                    {formatNumber(
                      getBalanceAsOf(selected.id, locationId, date)
                    )}{' '}
                    ta mavjud.
                  </p>
                </div>
                <div>
                  <label className="form-label">Izoh</label>
                  <textarea
                    className="form-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-500">
                    {error}
                  </p>
                )}
                {success && (
                  <p role="status" className="text-sm text-emerald-500">
                    {success}
                  </p>
                )}
                <button className="primary-button" type="submit">
                  Nobud bo‘lishni saqlash
                </button>
              </form>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  3. Ushbu fermadagi nobud bo‘lish zarari
                </h3>
                <BatchCostPanel batchId={selected.id} locationId={locationId} />
              </div>
              {mortality.length > 0 && (
                <div className="overflow-x-auto">
                  <h3 className="mb-2 font-semibold">
                    Ushbu fermadagi nobud bo‘lish tarixi
                  </h3>
                  <table className="erp-table w-full">
                    <thead>
                      <tr>
                        <th>Sana</th>
                        <th>Soni</th>
                        <th>Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mortality.map((event) => (
                        <tr key={event.id}>
                          <td>{event.date}</td>
                          <td>{formatNumber(event.quantity)}</td>
                          <td>{event.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
