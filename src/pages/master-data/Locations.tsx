
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Building2,
  Plus,
  Search,
  Pencil,
  Ban,
  CheckCircle2,
  Warehouse,
  Truck,
  X,
} from "lucide-react";

import {
  useLocations,
  locationTypeLabels,
  type Location,
  type LocationType,
} from "../../context/LocationsContext";

type LocationForm = {
  name: string;
  code: string;
  type: LocationType;
  description: string;
  active: boolean;
  canReceiveFeed: boolean;
  isFeedSource: boolean;
};

const emptyForm: LocationForm = {
  name: "",
  code: "",
  type: "other",
  description: "",
  active: true,
  canReceiveFeed: false,
  isFeedSource: false,
};

const locationTypes = Object.entries(
  locationTypeLabels
) as [LocationType, string][];

export default function Locations() {
  const {
    locations,
    feedDestinations,
    saveLocation,
  } = useLocations();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return locations.filter((location) => {
      const q = search.trim().toLowerCase();

      const matchesSearch = [
        location.name,
        location.code,
        location.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);

      const matchesType =
        typeFilter === "all" ||
        location.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.active) ||
        (statusFilter === "inactive" && !location.active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [locations, search, typeFilter, statusFilter]);

  const activeCount = locations.filter(
    (item) => item.active
  ).length;

  const warehouseCount = locations.filter(
    (item) =>
      item.type === "warehouse" ||
      item.type === "feed-warehouse"
  ).length;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setForm({
      name: location.name,
      code: location.code,
      type: location.type,
      description: location.description,
      active: location.active,
      canReceiveFeed: location.canReceiveFeed,
      isFeedSource: location.isFeedSource,
    });
    setError("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setError("");
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();

    if (!name || !code) {
      setError("Bo'lim nomi va kodini kiriting.");
      return;
    }

    const sameName = locations.some(
      (item) =>
        item.id !== editing?.id &&
        item.name.toLocaleLowerCase() ===
          name.toLocaleLowerCase()
    );

    const sameCode = locations.some(
      (item) =>
        item.id !== editing?.id &&
        item.code.toLowerCase() === code.toLowerCase()
    );

    if (sameName) {
      setError("Bunday nomli bo'lim mavjud.");
      return;
    }

    if (sameCode) {
      setError("Bu kod boshqa bo'limga tegishli.");
      return;
    }

    // The current warehouse engine has one fixed feed source.
    if (editing?.id === "feed-warehouse") {
      if (
        !form.active ||
        !form.isFeedSource ||
        form.name !== "Yem ombori"
      ) {
        setError(
          "Yem ombori hozir asosiy manba hisoblanadi. " +
          "Uning nomi va manba holatini o'zgartirib bo'lmaydi."
        );
        return;
      }
    } else if (form.isFeedSource) {
      setError(
        "Hozir faqat Yem ombori manba sifatida ishlaydi."
      );
      return;
    }

    const location: Location = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      code,
      type: form.type,
      description: form.description.trim(),
      active: form.active,
      canReceiveFeed: form.canReceiveFeed,
      isFeedSource: form.isFeedSource,
    };

    saveLocation(location);
    closeModal();
  }

  function toggleActive(location: Location) {
    if (location.id === "feed-warehouse") {
      return;
    }

    saveLocation({
      ...location,
      active: !location.active,
    });
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Building2
              size={24}
              className="text-accent"
            />
            <h1 className="text-2xl font-semibold">
              Omborlar va bo'limlar
            </h1>
          </div>

          <p className="mt-2 text-sm text-muted">
            Omborlar, fermalar va ishlab chiqarish
            bo'limlarini boshqarish
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreate}
        >
          <Plus size={17} />
          Yangi bo'lim
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jami joylar"
          value={locations.length}
          icon={<Building2 size={20} />}
        />

        <StatCard
          label="Faol joylar"
          value={activeCount}
          icon={<CheckCircle2 size={20} />}
        />

        <StatCard
          label="Omborlar"
          value={warehouseCount}
          icon={<Warehouse size={20} />}
        />

        <StatCard
          label="Yem qabul qiluvchi bo'limlar"
          value={feedDestinations.length}
          icon={<Truck size={20} />}
        />
      </div>

      {/* LIST */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">
              Omborlar va bo'limlar ro'yxati
            </h2>
            <p className="section-description mt-1">
              {filtered.length} ta joy ko'rsatilmoqda
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className="form-input !w-[200px] !pl-9"
                placeholder="Qidirish..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <select
              className="form-input !w-auto"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
            >
              <option value="all">Barcha turlar</option>
              {locationTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="form-input !w-auto"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="all">Barcha holatlar</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[950px]">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Nomi</th>
                <th>Turi</th>
                <th>Yem qabul qilish</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((location) => (
                <tr key={location.id}>
                  <td className="font-medium">
                    {location.code}
                  </td>

                  <td>
                    <p className="font-semibold">
                      {location.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {location.description || "—"}
                    </p>
                  </td>

                  <td>
                    {locationTypeLabels[location.type]}
                  </td>

                  <td>
                    {location.isFeedSource ? (
                      <span className="text-blue-500">
                        Yem manbasi
                      </span>
                    ) : location.canReceiveFeed ? (
                      <span className="text-emerald-500">
                        Qabul qiladi
                      </span>
                    ) : (
                      <span className="text-muted">
                        Belgilanmagan
                      </span>
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        location.active
                          ? "status-badge status-success"
                          : "status-badge status-neutral"
                      }
                    >
                      {location.active
                        ? "Faol"
                        : "Nofaol"}
                    </span>
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => openEdit(location)}
                        title="Tahrirlash"
                        aria-label={`${location.name}ni tahrirlash`}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => toggleActive(location)}
                        disabled={
                          location.id === "feed-warehouse"
                        }
                        title={
                          location.active
                            ? "Nofaol qilish"
                            : "Faollashtirish"
                        }
                        aria-label={`${location.name} holatini o'zgartirish`}
                      >
                        {location.active ? (
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
          <p className="p-10 text-center text-muted">
            Hech qanday bo'lim topilmadi.
          </p>
        )}
      </section>

      {/* ADD / EDIT MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-modal-title"
            className="surface-card max-h-[90vh] w-full max-w-[570px] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-border-custom p-5">
              <div>
                <h2
                  id="location-modal-title"
                  className="text-lg font-semibold"
                >
                  {editing
                    ? "Bo'limni tahrirlash"
                    : "Yangi ombor yoki bo'lim"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Ombor yoki bo'lim ma'lumotlarini kiriting
                </p>
              </div>

              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={closeModal}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-4 p-5"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="form-label">
                    Bo'lim nomi *
                  </label>
                  <input
                    className="form-input"
                    required
                    maxLength={120}
                    placeholder="Masalan: Yangi ferma"
                    value={form.name}
                    disabled={
                      editing?.id === "feed-warehouse"
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="form-label">
                    Bo'lim kodi *
                  </label>
                  <input
                    className="form-input"
                    required
                    maxLength={30}
                    placeholder="Masalan: FER-003"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Bo'lim turi
                </label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as LocationType,
                    })
                  }
                >
                  {locationTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Izoh
                </label>
                <textarea
                  className="form-input min-h-[90px] resize-y"
                  maxLength={500}
                  placeholder="Bo'lim haqida qo'shimcha ma'lumot..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-custom p-3">
                <input
                  type="checkbox"
                  checked={form.canReceiveFeed}
                  disabled={
                    editing?.id === "feed-warehouse"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      canReceiveFeed: e.target.checked,
                    })
                  }
                />
                <div>
                  <p className="text-sm font-medium">
                    Yem qabul qiluvchi bo'lim
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Ombor harakatlarida "Qayerga"
                    ro'yxatida ko'rsatiladi.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-custom p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  disabled={
                    editing?.id === "feed-warehouse"
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      active: e.target.checked,
                    })
                  }
                />
                <div>
                  <p className="text-sm font-medium">
                    Faol bo'lim
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Nofaol bo'lim yangi transferda
                    tanlanmaydi.
                  </p>
                </div>
              </label>

              {editing?.id === "feed-warehouse" && (
                <p className="text-xs text-muted">
                  Asosiy yem ombori hozirgi inventar
                  hisobining doimiy manbasi hisoblanadi.
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editing
                    ? "O'zgarishlarni saqlash"
                    : "Bo'limni qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* REUSABLE STAT CARD */

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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-custom text-accent">
        {icon}
      </div>

      <div>
        <p className="text-xs text-muted">
          {label}
        </p>

        <p className="mt-1 text-2xl font-semibold">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
