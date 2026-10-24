
import { useState, type FormEvent } from "react";
import {
  Wheat,
  Plus,
  Pencil,
  CheckCircle2,
  Ban,
  X,
} from "lucide-react";

import {
  useMasterData,
  type FeedType,
} from "../../context/MasterDataContext";

export default function FeedTypes() {
  const { feedTypes, saveFeedType, recipes } = useMasterData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeedType | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    active: true,
  });

  const filtered = feedTypes.filter((item) =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function newFeedType() {
    setEditing(null);
    setForm({ name: "", description: "", active: true });
    setError("");
    setOpen(true);
  }

  function editFeedType(item: FeedType) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      active: item.active,
    });
    setError("");
    setOpen(true);
  }

  function save(event: FormEvent) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Yem turi nomini kiriting.");
      return;
    }

    if (feedTypes.some(
      (item) =>
        item.id !== editing?.id &&
        item.name.trim().toLowerCase() === name.toLowerCase()
    )) {
      setError("Bunday yem turi allaqachon mavjud.");
      return;
    }

    saveFeedType({
      id: editing?.id ?? crypto.randomUUID(),
      name,
      description: form.description.trim(),
      active: form.active,
    });

    setOpen(false);
  }

  return (
    <div className="w-full space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Wheat size={25} className="text-accent" />
            <h1 className="text-2xl font-semibold">
              Yem turlari
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            Ishlab chiqariladigan yem turlarini boshqarish
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={newFeedType}
        >
          <Plus size={17} />
          Yangi yem turi
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Jami yem turlari", feedTypes.length],
          ["Faol yem turlari", feedTypes.filter(t => t.active).length],
          ["Retseptlar", recipes.length],
        ].map(([label, value]) => (
          <div className="surface-card p-5" key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <h2 className="section-title">Yem turlari ro'yxati</h2>
          <input
            className="form-input !w-[240px]"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[650px]">
            <thead>
              <tr>
                <th>Yem turi</th>
                <th>Izoh</th>
                <th>Retseptlar</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.name}</td>
                  <td className="text-muted">
                    {item.description || "—"}
                  </td>
                  <td>
                    {recipes.filter(
                      (r) => r.feedTypeId === item.id
                    ).length} ta
                  </td>
                  <td>
                    <span className={
                      item.active
                        ? "status-badge status-success"
                        : "status-badge status-neutral"
                    }>
                      {item.active ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => editFeedType(item)}
                        title="Tahrirlash"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => saveFeedType({
                          ...item,
                          active: !item.active,
                        })}
                        title={item.active ? "Nofaol qilish" : "Faollashtirish"}
                      >
                        {item.active
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
            Yem turi topilmadi.
          </p>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-type-title"
            className="surface-card w-full max-w-[500px]"
          >
            <div className="flex items-center justify-between border-b border-border-custom p-5">
              <h2 id="feed-type-title" className="text-lg font-semibold">
                {editing ? "Yem turini tahrirlash" : "Yangi yem turi"}
              </h2>
              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={() => setOpen(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4 p-5">
              <div>
                <label className="form-label">Yem turi nomi *</label>
                <input
                  className="form-input"
                  required
                  placeholder="Masalan: Tuxumchi tovuqlar yemi"
                  value={form.name}
                  onChange={(e) => setForm({
                    ...form, name: e.target.value,
                  })}
                />
              </div>
              <div>
                <label className="form-label">Izoh</label>
                <textarea
                  className="form-input min-h-[90px]"
                  value={form.description}
                  onChange={(e) => setForm({
                    ...form,
                    description: e.target.value,
                  })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({
                    ...form, active: e.target.checked,
                  })}
                />
                Faol yem turi
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
                <button className="primary-button" type="submit">
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
