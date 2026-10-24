
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, Factory, PackageCheck, Wheat } from "lucide-react";

import {
  formatMoney,
  formatNumber,
  useWarehouse,
} from "../../context/WarehouseContext";

import { useMasterData } from "../../context/MasterDataContext";
import { formatDateTime } from "../../components/warehouse/DateRangeFilter";

import {
  EmptyTable,
  FormError,
  ModalActions,
  PageDateFilter,
  useWarehouseDateFilter,
  WarehouseMetric,
  WarehouseModal,
  WarehousePageHeader,
} from "../../components/warehouse/WarehouseUI";

import type {
  FeedProduction as Production,
} from "../../types/warehouse";

function nowInput() {
  const date = new Date();
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
}

export default function FeedProduction() {
  const {
    productions,
    addProduction,
    getMaterialsAsOf,
  } = useWarehouse();

  const {
    products,
    feedTypes,
    activeFeedTypes,
    recipes,
    getRecipesByFeedType,
  } = useMasterData();

  const filter = useWarehouseDateFilter();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Production | null>(null);

  const [form, setForm] = useState({
    date: nowInput(),
    feedTypeId: "",
    recipeId: "",
    quantity: "",
  });

  const availableRecipes =
    getRecipesByFeedType(form.feedTypeId);

  const selectedFeedType = feedTypes.find(
    (item) => item.id === form.feedTypeId
  );

  const selectedRecipe = recipes.find(
    (item) =>
      item.id === form.recipeId &&
      item.feedTypeId === form.feedTypeId
  );

  const quantity = Number(form.quantity) || 0;

  /* Calculate ingredient quantities from percentages */
  const calculatedIngredients = useMemo(() => {
    if (!selectedRecipe || quantity <= 0) return [];

    return selectedRecipe.ingredients.map((ingredient) => {
      const product = products.find(
        (p) => p.id === ingredient.materialId
      );

      return {
        materialId: ingredient.materialId,
        name: product?.name ?? "Noma'lum mahsulot",
        percentage: ingredient.percentage,
        quantity: quantity * ingredient.percentage / 100,
        unitCost: product?.unitCost ?? 0,
        active: product?.active ?? false,
        unit: product?.unit ?? "",
      };
    });
  }, [selectedRecipe, quantity, products]);

  const availableMaterials = getMaterialsAsOf(
    form.date.slice(0, 10)
  );

  const totalIngredients = calculatedIngredients.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  const totalCost = calculatedIngredients.reduce(
    (sum, item) => sum + item.quantity * item.unitCost, 0
  );

  const costPerKg = quantity > 0 ? totalCost / quantity : 0;

  const visible = productions
    .filter((p) => filter.inRange(p.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = visible.filter(
    (p) => p.status === "completed"
  );

  const totalProduced = completed.reduce(
    (sum, p) => sum + p.quantity, 0
  );

  const totalConsumed = completed.reduce(
    (sum, p) =>
      sum + p.ingredients.reduce(
        (s, i) => s + i.quantity, 0
      ),
    0
  );

  const hasStockError = calculatedIngredients.some((item) => {
    const material = availableMaterials.find(
      (m) => m.id === item.materialId
    );

    return (
      !material ||
      material.quantity - material.reserved + 0.00001 <
        item.quantity
    );
  });

  function openModal() {
    setForm({
      date: nowInput(),
      feedTypeId: "",
      recipeId: "",
      quantity: "",
    });
    setError("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError("");
  }

  function handleFeedTypeChange(feedTypeId: string) {
    setForm((prev) => ({
      ...prev,
      feedTypeId,
      recipeId: "",
    }));
    setError("");
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedFeedType?.active) {
      setError("Faol yem turini tanlang.");
      return;
    }

    if (!selectedRecipe?.active) {
      setError("Faol retseptni tanlang.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Tayyor yem miqdorini to'g'ri kiriting.");
      return;
    }

    const percentageTotal = selectedRecipe.ingredients.reduce(
      (sum, i) => sum + i.percentage, 0
    );

    if (Math.abs(percentageTotal - 100) > 0.0001) {
      setError("Retseptdagi jami foiz 100% emas.");
      return;
    }

    if (calculatedIngredients.some(
      (i) => !i.active || i.unit !== "kg"
    )) {
      setError(
        "Retseptda nofaol yoki kg birligida bo'lmagan mahsulot bor."
      );
      return;
    }

    if (hasStockError) {
      setError(
        "Xomashyo zaxirasi yetarli emas. Ombor qoldig'ini tekshiring."
      );
      return;
    }

    try {
      addProduction({
        id: `YEM-${crypto.randomUUID().slice(0, 8)}`,
        date: form.date,
        feedType: selectedFeedType.name,
        recipeName: selectedRecipe.name,
        quantity,
        ingredients: calculatedIngredients.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantity,
        })),
        status: "completed",
      });

      closeModal();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Xatolik yuz berdi."
      );
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <WarehousePageHeader
        title="Yem ishlab chiqarish"
        description="Retsept asosida xomashyodan tayyor yem ishlab chiqarish"
        icon={Factory}
        buttonLabel="Yem ishlab chiqarish"
        onAdd={openModal}
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
          <table className="erp-table min-w-[720px]">
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
                      <Eye size={15} /> Ko'rish
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
        description="Yem turi va retsept bo'yicha avtomatik xomashyo hisoblash"
        onClose={closeModal}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Sana va vaqt</label>
            <input
              required
              type="datetime-local"
              className="form-input"
              value={form.date}
              onChange={(e) => setForm({
                ...form, date: e.target.value,
              })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Yem turi *</label>
              <select
                required
                className="form-input"
                value={form.feedTypeId}
                onChange={(e) =>
                  handleFeedTypeChange(e.target.value)
                }
              >
                <option value="">Yem turini tanlang</option>
                {activeFeedTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <Link
                to="/feed-types"
                className="mt-2 inline-block text-xs text-accent hover:underline"
              >
                + Yem turini boshqarish
              </Link>
            </div>

            <div>
              <label className="form-label">Retsept *</label>
              <select
                required
                disabled={!form.feedTypeId}
                className="form-input"
                value={form.recipeId}
                onChange={(e) => setForm({
                  ...form, recipeId: e.target.value,
                })}
              >
                <option value="">Retseptni tanlang</option>
                {availableRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
              <Link
                to="/recipes"
                className="mt-2 inline-block text-xs text-accent hover:underline"
              >
                + Retseptni boshqarish
              </Link>
            </div>
          </div>

          {form.feedTypeId && availableRecipes.length === 0 && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
              Bu yem turi uchun faol retsept yo'q. Avval Retseptlar
              sahifasida retsept yarating.
            </p>
          )}

          <div>
            <label className="form-label">
              Tayyor yem miqdori (kg) *
            </label>
            <input
              required
              type="number"
              min="0.001"
              step="any"
              className="form-input"
              placeholder="Masalan: 500"
              value={form.quantity}
              onChange={(e) => setForm({
                ...form, quantity: e.target.value,
              })}
            />
          </div>

          {selectedRecipe && quantity > 0 && (
            <div className="rounded-xl border border-border-custom p-4">
              <h3 className="text-sm font-semibold">
                Retsept bo'yicha sarflanadigan xomashyo
              </h3>
              <p className="mt-1 text-xs text-muted">
                Miqdorlar retsept foizlariga ko'ra avtomatik hisoblandi.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="erp-table min-w-[470px]">
                  <thead>
                    <tr>
                      <th>Mahsulot</th>
                      <th>Foiz</th>
                      <th>Kerak</th>
                      <th>Mavjud</th>
                      <th>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedIngredients.map((item) => {
                      const material = availableMaterials.find(
                        (m) => m.id === item.materialId
                      );
                      const available = material
                        ? material.quantity - material.reserved
                        : 0;

                      const enough = available + 0.00001 >=
                        item.quantity;

                      return (
                        <tr key={item.materialId}>
                          <td className="font-medium">{item.name}</td>
                          <td>{formatNumber(item.percentage)}%</td>
                          <td>{formatNumber(item.quantity)} kg</td>
                          <td>{formatNumber(available)} kg</td>
                          <td>
                            <span className={
                              enough
                                ? "text-emerald-500"
                                : "text-red-500"
                            }>
                              {enough ? "Yetarli" : "Yetarli emas"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-500/10 p-4">
              <p className="text-xs text-muted">
                Sarflanadigan xomashyo
              </p>
              <p className="mt-1 text-xl font-semibold text-blue-500">
                {formatNumber(totalIngredients)} kg
              </p>
            </div>

            <div className="rounded-xl bg-emerald-500/10 p-4">
              <p className="text-xs text-muted">
                Taxminiy 1 kg tannarx
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-500">
                {formatMoney(costPerKg)}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted">
            Tannarx hozircha katalogdagi xomashyo narxlariga
            asoslangan. Haqiqiy xarid tannarxi keyinchalik
            alohida hisoblanadi.
          </p>

          <FormError message={error} />
          <ModalActions
            onCancel={closeModal}
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
                      {products.find(
                        (p) => p.id === i.materialId
                      )?.name ?? i.materialId}
                    </td>
                    <td>{formatNumber(i.quantity)} kg</td>
                    <td>
                      {formatNumber(
                        selected.quantity > 0
                          ? i.quantity / selected.quantity * 100
                          : 0
                      )}%
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
