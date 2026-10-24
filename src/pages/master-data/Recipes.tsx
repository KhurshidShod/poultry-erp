
import { useMemo, useState, type FormEvent } from "react";
import {
  ClipboardList, Plus, Pencil, X, Trash2, Ban,
  CheckCircle2, Search,
} from "lucide-react";
import {
  useMasterData,
  type FeedRecipe,
  type RecipeIngredient,
} from "../../context/MasterDataContext";

type FormState = {
  name: string;
  feedTypeId: string;
  description: string;
  active: boolean;
  ingredients: RecipeIngredient[];
};

const emptyForm: FormState = {
  name: "",
  feedTypeId: "",
  description: "",
  active: true,
  ingredients: [],
};

export default function Recipes() {
  const {
    products, feedTypes, activeFeedTypes,
    recipes, saveRecipe,
  } = useMasterData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeedRecipe | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const eligibleProducts = products.filter(
    (p) => p.active && p.unit === "kg"
  );

  const total = form.ingredients.reduce(
    (sum, i) => sum + Number(i.percentage || 0), 0
  );

  const filtered = useMemo(() => recipes.filter((r) => {
    const feedName = feedTypes.find(
      (t) => t.id === r.feedTypeId
    )?.name ?? "";
    return (
      (typeFilter === "all" || r.feedTypeId === typeFilter) &&
      `${r.name} ${feedName}`.toLowerCase()
        .includes(query.toLowerCase())
    );
  }), [recipes, feedTypes, query, typeFilter]);

  function startNew() {
    setEditing(null);
    setForm({
      ...emptyForm,
      feedTypeId: activeFeedTypes[0]?.id ?? "",
      ingredients: [],
    });
    setError("");
    setOpen(true);
  }

  function startEdit(recipe: FeedRecipe) {
    setEditing(recipe);
    setForm({
      name: recipe.name,
      feedTypeId: recipe.feedTypeId,
      description: recipe.description,
      active: recipe.active,
      ingredients: recipe.ingredients.map(i => ({ ...i })),
    });
    setError("");
    setOpen(true);
  }

  function addIngredient() {
    const next = eligibleProducts.find(
      (p) => !form.ingredients.some(i => i.materialId === p.id)
    );
    if (!next) return;

    setForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { materialId: next.id, percentage: NaN },
      ],
    }));
  }

  function updateIngredient(
    index: number,
    changes: Partial<RecipeIngredient>
  ) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((i, n) =>
        n === index ? { ...i, ...changes } : i
      ),
    }));
  }

  function removeIngredient(index: number) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, n) => n !== index),
    }));
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.feedTypeId) {
      setError("Yem turini tanlang.");
      return;
    }

    if (!form.name.trim()) {
      setError("Retsept nomini kiriting.");
      return;
    }

    const duplicate = recipes.some(r =>
      r.id !== editing?.id &&
      r.feedTypeId === form.feedTypeId &&
      r.name.trim().toLowerCase() ===
        form.name.trim().toLowerCase()
    );

    if (duplicate) {
      setError("Bu yem turida bunday retsept mavjud.");
      return;
    }

    if (form.ingredients.length === 0) {
      setError("Kamida bitta mahsulot qo'shing.");
      return;
    }

    if (form.ingredients.some(i =>
      !Number.isFinite(i.percentage) || i.percentage <= 0
    )) {
      setError("Barcha mahsulotlar foizi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (Math.abs(total - 100) > 0.0001) {
      setError(`Jami 100% bo'lishi kerak. Hozir: ${total.toFixed(2)}%`);
      return;
    }

    try {
      saveRecipe({
        id: editing?.id ?? crypto.randomUUID(),
        name: form.name.trim(),
        feedTypeId: form.feedTypeId,
        description: form.description.trim(),
        active: form.active,
        ingredients: form.ingredients.map(i => ({ ...i })),
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ClipboardList size={24} className="text-accent" />
            <h1 className="text-2xl font-semibold">Retseptlar</h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            Yem tarkibi va xomashyo foizlarini boshqarish
          </p>
        </div>
        <button className="primary-button" onClick={startNew}>
          <Plus size={17} /> Yangi retsept
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Jami retseptlar", recipes.length],
          ["Faol retseptlar", recipes.filter(r => r.active).length],
          ["Yem turlari", feedTypes.length],
        ].map(([label, value]) => (
          <div className="surface-card p-5" key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <h2 className="section-title">Retseptlar ro'yxati</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-muted" />
              <input
                className="form-input !w-[210px] !pl-9"
                placeholder="Retsept qidirish..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <select
              className="form-input !w-auto"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">Barcha yem turlari</option>
              {feedTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[720px]">
            <thead>
              <tr>
                <th>Retsept</th>
                <th>Yem turi</th>
                <th>Mahsulotlar</th>
                <th>Jami foiz</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(recipe => (
                <tr key={recipe.id}>
                  <td>
                    <p className="font-semibold">{recipe.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {recipe.description}
                    </p>
                  </td>
                  <td>
                    {feedTypes.find(
                      t => t.id === recipe.feedTypeId
                    )?.name ?? "Noma'lum"}
                  </td>
                  <td>
                    {recipe.ingredients.map(i =>
                      products.find(p => p.id === i.materialId)?.name ??
                      "Noma'lum"
                    ).join(", ")}
                  </td>
                  <td>
                    {recipe.ingredients.reduce(
                      (s, i) => s + i.percentage, 0
                    ).toFixed(2)}%
                  </td>
                  <td>
                    <span className={
                      recipe.active
                        ? "status-badge status-success"
                        : "status-badge status-neutral"
                    }>
                      {recipe.active ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => startEdit(recipe)}
                        title="Tahrirlash"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => saveRecipe({
                          ...recipe,
                          active: !recipe.active,
                        })}
                        title="Holatini o'zgartirish"
                      >
                        {recipe.active
                          ? <Ban size={15} />
                          : <CheckCircle2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="p-10 text-center text-muted">
            Retsept topilmadi.
          </p>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-modal-title"
            className="surface-card max-h-[90vh] w-full max-w-[760px] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border-custom p-5">
              <div>
                <h2
                  id="recipe-modal-title"
                  className="text-lg font-semibold"
                >
                  {editing ? "Retseptni tahrirlash" : "Yangi retsept"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Ingredientlar miqdori foizlarda kiritiladi
                </p>
              </div>
              <button
                className="secondary-button !min-h-8 !px-2"
                onClick={() => setOpen(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="form-label">Yem turi *</label>
                  <select
                    required
                    className="form-input"
                    value={form.feedTypeId}
                    onChange={e => setForm({
                      ...form,
                      feedTypeId: e.target.value,
                    })}
                  >
                    <option value="">Tanlang</option>
                    {feedTypes.filter(t =>
                      t.active || t.id === editing?.feedTypeId
                    ).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Retsept nomi *</label>
                  <input
                    required
                    className="form-input"
                    placeholder="Masalan: Layer A"
                    value={form.name}
                    onChange={e => setForm({
                      ...form, name: e.target.value,
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Izoh</label>
                <input
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm({
                    ...form, description: e.target.value,
                  })}
                />
              </div>

              <div className="rounded-xl border border-border-custom p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Retsept tarkibi
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Mahsulotlarni tanlang va ulushini kiriting
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addIngredient}
                    disabled={form.ingredients.length >= eligibleProducts.length}
                  >
                    <Plus size={15} /> Mahsulot qo'shish
                  </button>
                </div>

                <div className="space-y-3">
                  {form.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_100px_36px] items-end gap-2"
                    >
                      <div>
                        <label className="form-label">Mahsulot</label>
                        <select
                          className="form-input"
                          value={ingredient.materialId}
                          onChange={e => updateIngredient(index, {
                            materialId: e.target.value,
                          })}
                        >
                          {products.filter(p =>
                            p.unit === "kg" &&
                            (
                              p.active ||
                              p.id === ingredient.materialId
                            ) &&
                            (
                              p.id === ingredient.materialId ||
                              !form.ingredients.some(
                                i => i.materialId === p.id
                              )
                            )
                          ).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Foiz (%)</label>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={ingredient.percentage}
                          onChange={e => updateIngredient(index, {
                            percentage: Number(e.target.value),
                          })}
                        />
                      </div>

                      <button
                        type="button"
                        className="secondary-button !min-h-10 !px-2"
                        onClick={() => removeIngredient(index)}
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {!form.ingredients.length && (
                    <p className="py-6 text-center text-sm text-muted">
                      Hozircha mahsulot qo'shilmagan.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Jami foiz</span>
                    <strong className={
                      Math.abs(total - 100) < 0.0001
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }>
                      {total.toFixed(2)} / 100%
                    </strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={
                        "h-full rounded-full " +
                        (Math.abs(total - 100) < 0.0001
                          ? "bg-emerald-500"
                          : "bg-amber-500")
                      }
                      style={{
                        width: `${Math.min(100, Math.max(0, total))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({
                    ...form, active: e.target.checked,
                  })}
                />
                Faol retsept
              </label>

              {error && (
                <p role="alert" className="text-sm text-red-500">
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
                  disabled={Math.abs(total - 100) > 0.0001}
                >
                  Retseptni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
