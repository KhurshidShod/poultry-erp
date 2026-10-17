import { Eye, Factory, PackageCheck, Wheat } from 'lucide-react';
import { useState } from 'react';

import {
  formatMoney,
  formatNumber,
  useWarehouse,
} from '../../context/WarehouseContext';

import { warehouseMaterials } from '../../data/warehouseData';

import { formatDateTime } from '../../components/warehouse/DateRangeFilter';

import {
  EmptyTable,
  FormError,
  ModalActions,
  PageDateFilter,
  useWarehouseDateFilter,
  WarehouseMetric,
  WarehouseModal,
  WarehousePageHeader,
} from '../../components/warehouse/WarehouseUI';

import type { FeedProduction as Production } from '../../types/warehouse';

const nowInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const defaultAmounts = () =>
  Object.fromEntries(warehouseMaterials.map((m) => [m.id, ''])) as Record<
    string,
    string
  >;

export default function FeedProduction() {
  const { productions, addProduction, getMaterialsAsOf } = useWarehouse();

  const filter = useWarehouseDateFilter();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Production | null>(null);

  const [form, setForm] = useState({
    date: nowInput(),
    feedType: 'Tuxumchi tovuqlar yemi',
    recipeName: 'Layer A',
    quantity: '',
    ingredients: defaultAmounts(),
  });

  const availableMaterials = getMaterialsAsOf(form.date.slice(0, 10));

  const inputQuantity = warehouseMaterials.reduce(
    (sum, m) => sum + (Number(form.ingredients[m.id]) || 0),
    0
  );

  const inputCost = warehouseMaterials.reduce(
    (sum, m) => sum + (Number(form.ingredients[m.id]) || 0) * m.unitCost,
    0
  );

  const finishedQuantity = Number(form.quantity) || 0;
  const costPerKg = finishedQuantity > 0 ? inputCost / finishedQuantity : 0;

  const visible = productions
    .filter((p) => filter.inRange(p.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = visible.filter((p) => p.status === 'completed');

  const totalProduced = completed.reduce((sum, p) => sum + p.quantity, 0);

  const totalConsumed = completed.reduce(
    (sum, p) => sum + p.ingredients.reduce((s, i) => s + i.quantity, 0),
    0
  );

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    const quantity = Number(form.quantity);

    const ingredients = warehouseMaterials
      .map((material) => ({
        materialId: material.id,
        quantity: Number(form.ingredients[material.id]) || 0,
      }))
      .filter((item) => item.quantity > 0);

    if (
      !form.date ||
      !form.feedType.trim() ||
      !form.recipeName.trim() ||
      quantity <= 0 ||
      !Number.isFinite(quantity)
    ) {
      setError("Ishlab chiqarish ma'lumotlarini tekshiring.");
      return;
    }

    if (
      Math.abs(
        ingredients.reduce((sum, item) => sum + item.quantity, 0) - quantity
      ) > 0.01
    ) {
      setError("Ingredientlar jami tayyor yem miqdoriga teng bo'lishi kerak.");
      return;
    }

    try {
      addProduction({
        id: `YEM-${crypto.randomUUID().slice(0, 8)}`,
        date: form.date,
        feedType: form.feedType.trim(),
        recipeName: form.recipeName.trim(),
        quantity,
        ingredients,
        status: 'completed',
      });

      setOpen(false);
      setForm({
        date: nowInput(),
        feedType: 'Tuxumchi tovuqlar yemi',
        recipeName: 'Layer A',
        quantity: '',
        ingredients: defaultAmounts(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi.');
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <WarehousePageHeader
        title="Yem ishlab chiqarish"
        description="Retseptlar, ingredientlar va tayyor yem"
        icon={Factory}
        buttonLabel="Yem ishlab chiqarish"
        onAdd={() => {
          setError('');
          setOpen(true);
        }}
      />

      <PageDateFilter filter={filter} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WarehouseMetric
          label="Ishlab chiqarilgan yem"
          value={`${formatNumber(totalProduced)} kg`}
          icon={Factory}
          tone="blue"
        />
        <WarehouseMetric
          label="Sarflangan xomashyo"
          value={`${formatNumber(totalConsumed)} kg`}
          icon={Wheat}
          tone="amber"
        />
        <WarehouseMetric
          label="Partiyalar soni"
          value={`${completed.length} ta`}
          icon={PackageCheck}
          tone="green"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">Ishlab chiqarish tarixi</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[700px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Partiya</th>
                <th>Yem turi</th>
                <th>Retsept</th>
                <th>Yem miqdori</th>
                <th>Tarkib</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.date)}</td>
                  <td className="font-medium">{p.id}</td>
                  <td>{p.feedType}</td>
                  <td>{p.recipeName}</td>
                  <td className="font-semibold">
                    {formatNumber(p.quantity)} kg
                  </td>
                  <td>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-accent hover:underline"
                      onClick={() => setSelected(p)}
                    >
                      <Eye size={15} />
                      Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <EmptyTable />}
      </section>

      <WarehouseModal
        open={open}
        title="Yangi yem ishlab chiqarish"
        description="Sarflangan mahsulotlarni va tayyor yem miqdorini kiriting"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Sana va vaqt</label>
            <input
              required
              type="datetime-local"
              className="form-input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Yem turi</label>
              <select
                className="form-input"
                value={form.feedType}
                onChange={(e) => setForm({ ...form, feedType: e.target.value })}
              >
                <option value="Tuxumchi tovuqlar yemi">
                  Tuxumchi tovuqlar yemi
                </option>
                <option value="Broiler yemi">Broiler yemi</option>
                <option value="Jo'jalar yemi">Jo'jalar yemi</option>
              </select>
            </div>

            <div>
              <label className="form-label">Retsept nomi</label>
              <input
                required
                className="form-input"
                value={form.recipeName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recipeName: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">Tayyor yem miqdori (kg)</label>
            <input
              required
              type="number"
              min="0.001"
              step="any"
              className="form-input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <div className="rounded-xl border border-border-custom p-4">
            <h3 className="text-[13px] font-semibold">Sarflangan xomashyo</h3>

            <p className="mt-1 text-[11px] text-muted">
              Haqiqiy ishlatilgan miqdorlarni kiriting
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {warehouseMaterials.map((material) => {
                const available = availableMaterials.find(
                  (m) => m.id === material.id
                );

                return (
                  <div key={material.id}>
                    <label className="form-label">{material.name} (kg)</label>

                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.ingredients[material.id] ?? ''}
                      onChange={(e) =>
                        setForm((previous) => ({
                          ...previous,
                          ingredients: {
                            ...previous.ingredients,
                            [material.id]: e.target.value,
                          },
                        }))
                      }
                    />

                    <p className="mt-1 text-[10px] text-muted">
                      Mavjud: {formatNumber(available?.quantity ?? 0)} kg
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-500/10 p-4">
              <p className="text-[11px] text-muted">Ingredientlar jami</p>
              <p className="mt-1 text-[19px] font-semibold text-blue-500">
                {formatNumber(inputQuantity)} kg
              </p>
            </div>

            <div className="rounded-xl bg-emerald-500/10 p-4">
              <p className="text-[11px] text-muted">Taxminiy 1 kg tannarx</p>
              <p className="mt-1 text-[19px] font-semibold text-emerald-500">
                {formatMoney(costPerKg)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-muted">
            Tannarx demo narxlar asosida hisoblanmoqda. Haqiqiy FIFO tannarxi
            backend bosqichida qo'shiladi.
          </p>

          <FormError message={error} />
          <ModalActions
            onCancel={() => setOpen(false)}
            submitLabel="Ishlab chiqarishni saqlash"
          />
        </form>
      </WarehouseModal>

      <WarehouseModal
        open={Boolean(selected)}
        title="Yem tarkibi"
        description={selected?.id}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Yem turi</span>
              <strong>{selected.feedType}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Retsept</span>
              <strong>{selected.recipeName}</strong>
            </div>

            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Miqdor</th>
                  <th>Ulush</th>
                </tr>
              </thead>
              <tbody>
                {selected.ingredients.map((i) => (
                  <tr key={i.materialId}>
                    <td>
                      {warehouseMaterials.find((m) => m.id === i.materialId)
                        ?.name ?? i.materialId}
                    </td>
                    <td>{formatNumber(i.quantity)} kg</td>
                    <td>
                      {formatNumber((i.quantity / selected.quantity) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WarehouseModal>
    </div>
  );
}
