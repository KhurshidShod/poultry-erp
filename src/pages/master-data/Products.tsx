
import { useMemo, useState, type FormEvent } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  X,
  CheckCircle2,
  Ban,
  Boxes,
} from "lucide-react";

import {
  useMasterData,
  type Product,
} from "../../context/MasterDataContext";

import type {
  MaterialCategory,
  Material,
} from "../../types/warehouse";

const categories: MaterialCategory[] = [
  "Don mahsulotlari",
  "Yog' va qo'shimchalar",
  "Minerallar",
  "Boshqa",
];

type ProductForm = {
  name: string;
  code: string;
  category: MaterialCategory;
  unit: Material["unit"];
  minStock: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  code: "",
  category: "Don mahsulotlari",
  unit: "kg",
  minStock: "0",
  active: true,
};

export default function Products() {
  const { products, saveProduct } = useMasterData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = (
        product.name +
        " " +
        product.code +
        " " +
        product.category
      ).toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const activeCount = products.filter((p) => p.active).length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setError("");

    setForm({
      name: product.name,
      code: product.code,
      category: product.category,
      unit: product.unit,
      minStock: String(product.minStock),
      active: product.active,
    });

    setModalOpen(true);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const minStock = Number(form.minStock);

    if (!name || !code) {
      setError("Mahsulot nomi va kodini kiriting.");
      return;
    }

    if (!Number.isFinite(minStock) || minStock < 0) {
      setError("Minimal zaxira noto'g'ri.");
      return;
    }

    const duplicateName = products.some(
      (p) =>
        p.id !== editing?.id &&
        p.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateName) {
      setError("Bunday nomli mahsulot allaqachon mavjud.");
      return;
    }

    const duplicateCode = products.some(
      (p) =>
        p.id !== editing?.id &&
        p.code.toLowerCase() === code.toLowerCase()
    );

    if (duplicateCode) {
      setError("Bu mahsulot kodi allaqachon mavjud.");
      return;
    }

    // Existing product IDs and inventory values are preserved.
    const product: Product = editing
      ? {
          ...editing,
          name,
          code,
          category: form.category,
          unit: form.unit,
          minStock,
          active: form.active,
        }
      : {
          id: crypto.randomUUID(),
          name,
          code,
          category: form.category,
          unit: form.unit,
          quantity: 0,
          reserved: 0,
          minStock,
          unitCost: 0,
          currency: "UZS",
          warehouse: "Asosiy ombor",
          lastUpdated: new Date().toISOString().slice(0, 10),
          active: form.active,
        };

    saveProduct(product);
    setModalOpen(false);
  }

  function toggleActive(product: Product) {
    saveProduct({
      ...product,
      active: !product.active,
    });
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Package size={24} className="text-[var(--accent)]" />
            <h1 className="text-2xl font-semibold text-[var(--text-main)]">
              Mahsulotlar
            </h1>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Mahsulotlar katalogi va ularni boshqarish
          </p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={17} />
          Yangi mahsulot
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Jami mahsulotlar"
          value={products.length}
          icon={<Boxes size={20} />}
        />
        <StatCard
          label="Faol mahsulotlar"
          value={activeCount}
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          label="Nofaol mahsulotlar"
          value={products.length - activeCount}
          icon={<Ban size={20} />}
        />
      </div>

      {/* Table */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Mahsulotlar ro'yxati</h2>
            <p className="section-description mt-1">
              Barcha ro'yxatdan o'tgan mahsulotlar
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                className="form-input !w-[230px] !pl-9"
                placeholder="Mahsulot qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-input !w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[720px]">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Mahsulot nomi</th>
                <th>Kategoriya</th>
                <th>Birlik</th>
                <th>Minimal zaxira</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="font-medium">
                    {product.code}
                  </td>
                  <td className="font-semibold">
                    {product.name}
                  </td>
                  <td>{product.category}</td>
                  <td>{product.unit}</td>
                  <td>
                    {product.minStock.toLocaleString()} {product.unit}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        product.active
                          ? "status-success"
                          : "status-neutral"
                      }`}
                    >
                      {product.active ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="secondary-button !min-h-8 !px-2"
                        title="Tahrirlash"
                        aria-label={`${product.name} ni tahrirlash`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(product)}
                        className="secondary-button !min-h-8 !px-2"
                        title={
                          product.active
                            ? "Nofaol qilish"
                            : "Faollashtirish"
                        }
                        aria-label={`${product.name} holatini o'zgartirish`}
                      >
                        {product.active ? (
                          <Ban size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-[var(--muted)]">
            Mahsulot topilmadi
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="surface-card w-full max-w-[520px] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border-custom p-5">
              <div>
                <h2
                  id="product-modal-title"
                  className="text-lg font-semibold"
                >
                  {editing
                    ? "Mahsulotni tahrirlash"
                    : "Yangi mahsulot"}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Mahsulot ma'lumotlarini kiriting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Yopish"
                className="secondary-button !min-h-8 !px-2"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              <div>
                <label className="form-label">Mahsulot nomi *</label>
                <input
                  className="form-input"
                  required
                  placeholder="Masalan: Bug'doy"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="form-label">Mahsulot kodi *</label>
                <input
                  className="form-input"
                  required
                  placeholder="Masalan: RAW-007"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="form-label">Kategoriya</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value as MaterialCategory,
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">O'lchov birligi</label>
                  <select
                    className="form-input"
                    value={form.unit}
                    disabled={Boolean(editing)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit: e.target.value as Material["unit"],
                      })
                    }
                  >
                    <option value="kg">Kilogramm (kg)</option>
                    <option value="litr">Litr</option>
                    <option value="dona">Dona</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Minimal zaxira</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={form.minStock}
                    onChange={(e) =>
                      setForm({ ...form, minStock: e.target.value })
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Faol mahsulot
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface-card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-custom text-[var(--accent)]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="mt-1 text-2xl font-semibold">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
