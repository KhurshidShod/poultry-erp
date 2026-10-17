
import { useState } from "react";
import {
  ShoppingCart,
  Wallet,
  PackagePlus,
  Receipt,
} from "lucide-react";

import {
  useWarehouse,
  formatNumber,
  formatMoney,
} from "../../context/WarehouseContext";

import { warehouseMaterials } from "../../data/warehouseData";
import { formatDateTime } from "../../components/warehouse/DateRangeFilter";

import {
  WarehouseModal,
  WarehousePageHeader,
  WarehouseMetric,
  PageDateFilter,
  useWarehouseDateFilter,
  EmptyTable,
  FormError,
  ModalActions,
} from "../../components/warehouse/WarehouseUI";

const nowInput = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

export default function Purchases() {
  const { purchases, addPurchase } = useWarehouse();
  const filter = useWarehouseDateFilter();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    date: nowInput(),
    supplier: "",
    materialId: warehouseMaterials[0].id,
    quantity: "",
    unitPrice: "",
  });

  const filtered = purchases
    .filter((p) => filter.inRange(p.date))
    .filter((p) => {
      const product = warehouseMaterials.find(
        (m) => m.id === p.materialId
      );

      return `${product?.name ?? ""} ${p.supplier}`
        .toLowerCase()
        .includes(search.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const received = filtered.filter(
    (p) => p.status === "received"
  );

  const totalValue = received.reduce(
    (sum, p) => sum + p.quantity * p.unitPrice,
    0
  );

  const totalKg = received.reduce(
    (sum, p) => sum + p.quantity,
    0
  );

  const previewTotal =
    (Number(form.quantity) || 0) *
    (Number(form.unitPrice) || 0);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (
      !form.supplier.trim() ||
      !form.date ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      setError("Barcha majburiy maydonlarni tekshiring.");
      return;
    }

    try {
      addPurchase({
        id: crypto.randomUUID(),
        date: form.date,
        supplier: form.supplier.trim(),
        materialId: form.materialId,
        quantity,
        unitPrice,
        status: "received",
      });

      setOpen(false);
      setForm({
        date: nowInput(),
        supplier: "",
        materialId: warehouseMaterials[0].id,
        quantity: "",
        unitPrice: "",
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Xatolik yuz berdi."
      );
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <WarehousePageHeader
        title="Xaridlar"
        description="Xomashyo xaridlari va yetkazib beruvchilar"
        icon={ShoppingCart}
        buttonLabel="Yangi xarid"
        onAdd={() => {
          setError("");
          setOpen(true);
        }}
      />

      <PageDateFilter filter={filter} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WarehouseMetric
          label="Jami xarid qiymati"
          value={formatMoney(totalValue)}
          icon={Wallet}
          tone="green"
          note="Tanlangan davr"
        />
        <WarehouseMetric
          label="Qabul qilingan xomashyo"
          value={`${formatNumber(totalKg)} kg`}
          icon={PackagePlus}
          tone="blue"
          note="Tanlangan davr"
        />
        <WarehouseMetric
          label="Xaridlar soni"
          value={`${filtered.length} ta`}
          icon={Receipt}
          tone="amber"
          note="Tanlangan davr"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Xaridlar tarixi</h2>
            <p className="section-description mt-1">
              Sanasi, miqdori va xarid qiymati
            </p>
          </div>

          <input
            className="form-input !w-[220px]"
            placeholder="Mahsulot yoki yetkazib beruvchi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[750px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Mahsulot</th>
                <th>Yetkazib beruvchi</th>
                <th>Miqdor</th>
                <th>Narx/kg</th>
                <th>Jami</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const material = warehouseMaterials.find(
                  (m) => m.id === p.materialId
                );

                return (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.date)}</td>
                    <td className="font-medium">
                      {material?.name ?? "—"}
                    </td>
                    <td>{p.supplier}</td>
                    <td>{formatNumber(p.quantity)} kg</td>
                    <td>{formatMoney(p.unitPrice)}</td>
                    <td className="font-semibold">
                      {formatMoney(p.quantity * p.unitPrice)}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        p.status === "received"
                          ? "status-success"
                          : "status-neutral"
                      }`}>
                        {p.status === "received"
                          ? "Qabul qilingan"
                          : "Qoralama"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyTable message="Tanlangan davrda xarid topilmadi" />
        )}
      </section>

      <WarehouseModal
        open={open}
        title="Yangi xarid"
        description="Xomashyo xaridini omborga kirim qilish"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Sana va vaqt</label>
            <input
              type="datetime-local"
              required
              className="form-input"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />
          </div>

          <div>
            <label className="form-label">
              Yetkazib beruvchi
            </label>
            <input
              required
              className="form-input"
              placeholder="Masalan: Yetkazib beruvchi A"
              value={form.supplier}
              onChange={(e) =>
                setForm({ ...form, supplier: e.target.value })
              }
            />
          </div>

          <div>
            <label className="form-label">Mahsulot</label>
            <select
              className="form-input"
              value={form.materialId}
              onChange={(e) =>
                setForm({
                  ...form,
                  materialId: e.target.value,
                })
              }
            >
              {warehouseMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Miqdor (kg)</label>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                className="form-input"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="form-label">
                Birlik narxi (so'm)
              </label>
              <input
                required
                type="number"
                min="0"
                step="any"
                className="form-input"
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unitPrice: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-border-custom bg-[var(--table-head)] p-4">
            <p className="text-[12px] text-muted">
              Jami xarid qiymati
            </p>
            <p className="mt-1 text-[22px] font-semibold text-accent">
              {formatMoney(previewTotal)}
            </p>
          </div>

          <FormError message={error} />
          <ModalActions
            onCancel={() => setOpen(false)}
            submitLabel="Xaridni saqlash"
          />
        </form>
      </WarehouseModal>
    </div>
  );
}
