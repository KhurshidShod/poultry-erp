
import { useMemo, useState, type FormEvent } from "react";
import {
  Users,
  Plus,
  Search,
  Pencil,
  X,
  CheckCircle2,
  Ban,
  Truck,
  UserRound,
  Phone,
  Building2,
} from "lucide-react";

import {
  useMasterData,
  type Partner,
  type PartnerRole,
} from "../../context/MasterDataContext";

type PartnerForm = {
  name: string;
  role: PartnerRole;
  phone: string;
  note: string;
  active: boolean;
};

const emptyForm: PartnerForm = {
  name: "",
  role: "supplier",
  phone: "",
  note: "",
  active: true,
};

const roleLabels: Record<PartnerRole, string> = {
  supplier: "Yetkazib beruvchi",
  customer: "Mijoz",
  both: "Yetkazib beruvchi va mijoz",
};

function getRoleClasses(role: PartnerRole) {
  switch (role) {
    case "supplier":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "customer":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "both":
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
  }
}

export default function Partners() {
  const { partners, savePartner } = useMasterData();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: partners.length,
      suppliers: partners.filter(
        (p) =>
          p.active &&
          (p.role === "supplier" || p.role === "both")
      ).length,
      customers: partners.filter(
        (p) =>
          p.active &&
          (p.role === "customer" || p.role === "both")
      ).length,
      inactive: partners.filter((p) => !p.active).length,
    };
  }, [partners]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return partners.filter((partner) => {
      const matchesSearch = [
        partner.name,
        partner.phone,
        partner.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        partner.role === roleFilter ||
        (roleFilter === "supplier" && partner.role === "both") ||
        (roleFilter === "customer" && partner.role === "both");

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && partner.active) ||
        (statusFilter === "inactive" && !partner.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [partners, search, roleFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setModalOpen(true);
  }

  function openEdit(partner: Partner) {
    setEditing(partner);
    setForm({
      name: partner.name,
      role: partner.role,
      phone: partner.phone,
      note: partner.note,
      active: partner.active,
    });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError("");
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const note = form.note.trim();

    if (!name) {
      setError("Hamkor nomini kiriting.");
      return;
    }

    const duplicate = partners.some(
      (partner) =>
        partner.id !== editing?.id &&
        partner.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicate) {
      setError("Bunday nomli hamkor allaqachon mavjud.");
      return;
    }

    const partner: Partner = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      role: form.role,
      phone,
      note,
      active: form.active,
    };

    savePartner(partner);
    closeModal();
  }

  function toggleActive(partner: Partner) {
    savePartner({
      ...partner,
      active: !partner.active,
    });
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Users
              size={24}
              className="text-[var(--accent)]"
            />
            <h1 className="text-2xl font-semibold text-[var(--text-main)]">
              Hamkorlar
            </h1>
          </div>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Yetkazib beruvchilar va mijozlarni boshqarish
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="primary-button"
        >
          <Plus size={17} />
          Yangi hamkor
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Jami hamkorlar"
          value={stats.total}
          icon={<Users size={20} />}
          color="text-[var(--accent)]"
        />

        <StatCard
          title="Yetkazib beruvchilar"
          value={stats.suppliers}
          icon={<Truck size={20} />}
          color="text-blue-500"
        />

        <StatCard
          title="Mijozlar"
          value={stats.customers}
          icon={<UserRound size={20} />}
          color="text-emerald-500"
        />

        <StatCard
          title="Nofaol hamkorlar"
          value={stats.inactive}
          icon={<Ban size={20} />}
          color="text-amber-500"
        />
      </div>

      {/* TABLE CONTAINER */}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="section-title">
                Hamkorlar ro'yxati
              </h2>
              <p className="section-description mt-1">
                {filtered.length} ta hamkor ko'rsatilmoqda
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  className="form-input !w-[220px] !pl-9"
                  placeholder="Hamkor qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Role filter */}
              <select
                className="form-input !w-auto"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Hamkor turi bo'yicha filter"
              >
                <option value="all">Barcha turlar</option>
                <option value="supplier">
                  Yetkazib beruvchilar
                </option>
                <option value="customer">Mijozlar</option>
                <option value="both">Ikkalasi</option>
              </select>

              {/* Status filter */}
              <select
                className="form-input !w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Holat bo'yicha filter"
              >
                <option value="all">Barcha holatlar</option>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="erp-table min-w-[800px]">
            <thead>
              <tr>
                <th>Hamkor nomi</th>
                <th>Turi</th>
                <th>Telefon</th>
                <th>Izoh</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((partner) => (
                <tr key={partner.id}>
                  {/* Name */}
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-custom bg-[var(--card)]">
                        <Building2
                          size={17}
                          className="text-[var(--muted)]"
                        />
                      </div>
                      <span className="font-semibold text-[var(--text-main)]">
                        {partner.name}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleClasses(
                        partner.role
                      )}`}
                    >
                      {roleLabels[partner.role]}
                    </span>
                  </td>

                  {/* Phone */}
                  <td>
                    {partner.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone
                          size={14}
                          className="text-[var(--muted)]"
                        />
                        <span>{partner.phone}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">
                        —
                      </span>
                    )}
                  </td>

                  {/* Notes */}
                  <td>
                    <span
                      className="block max-w-[220px] truncate text-[var(--muted)]"
                      title={partner.note}
                    >
                      {partner.note || "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className={`status-badge ${
                        partner.active
                          ? "status-success"
                          : "status-neutral"
                      }`}
                    >
                      {partner.active ? "Faol" : "Nofaol"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => openEdit(partner)}
                        title="Tahrirlash"
                        aria-label={`${partner.name} ni tahrirlash`}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="secondary-button !min-h-8 !px-2"
                        onClick={() => toggleActive(partner)}
                        title={
                          partner.active
                            ? "Nofaol qilish"
                            : "Faollashtirish"
                        }
                        aria-label={`${partner.name} holatini o'zgartirish`}
                      >
                        {partner.active ? (
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

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <Users size={34} className="text-[var(--muted)]" />
            <p className="font-medium">
              Hamkorlar topilmadi
            </p>
            <p className="text-sm text-[var(--muted)]">
              Qidiruvni o'zgartiring yoki yangi hamkor qo'shing.
            </p>
          </div>
        )}

        <div className="border-t border-border-custom px-5 py-3 text-xs text-[var(--muted)]">
          Jami: {filtered.length} ta
        </div>
      </section>

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-modal-title"
            className="surface-card max-h-[90vh] w-full max-w-[540px] overflow-y-auto"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-border-custom p-5">
              <div>
                <h2
                  id="partner-modal-title"
                  className="text-lg font-semibold"
                >
                  {editing
                    ? "Hamkorni tahrirlash"
                    : "Yangi hamkor qo'shish"}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Hamkor ma'lumotlarini kiriting
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="secondary-button !min-h-8 !px-2"
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave} className="space-y-4 p-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="partner-name"
                  className="form-label"
                >
                  Hamkor nomi *
                </label>

                <input
                  id="partner-name"
                  className="form-input"
                  placeholder="Masalan: Agro Trading"
                  value={form.name}
                  required
                  maxLength={150}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="partner-role"
                  className="form-label"
                >
                  Hamkor turi *
                </label>

                <select
                  id="partner-role"
                  className="form-input"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as PartnerRole,
                    })
                  }
                >
                  <option value="supplier">
                    Yetkazib beruvchi
                  </option>
                  <option value="customer">
                    Mijoz
                  </option>
                  <option value="both">
                    Yetkazib beruvchi va mijoz
                  </option>
                </select>

                <p className="mt-2 text-xs text-[var(--muted)]">
                  Yetkazib beruvchi xaridlarda, mijoz esa savdoda
                  tanlanadi.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="partner-phone"
                  className="form-label"
                >
                  Telefon raqami
                </label>

                <input
                  id="partner-phone"
                  className="form-input"
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  maxLength={30}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              {/* Note */}
              <div>
                <label
                  htmlFor="partner-note"
                  className="form-label"
                >
                  Qo'shimcha ma'lumot
                </label>

                <textarea
                  id="partner-note"
                  className="form-input min-h-[100px] resize-y"
                  placeholder="Hamkor haqida qo'shimcha ma'lumot..."
                  value={form.note}
                  maxLength={1000}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      note: e.target.value,
                    })
                  }
                />
              </div>

              {/* Active */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-custom p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      active: e.target.checked,
                    })
                  }
                />

                <div>
                  <p className="text-sm font-medium">
                    Faol hamkor
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Faol hamkorlar tegishli tanlash ro'yxatlarida
                    ko'rsatiladi.
                  </p>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                >
                  {error}
                </div>
              )}

              {/* Buttons */}
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
                  {editing ? "Saqlash" : "Hamkor qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable statistic card */

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="surface-card flex items-center gap-4 p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-custom ${color}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">
          {title}
        </p>

        <p className="mt-1 text-2xl font-semibold text-[var(--text-main)]">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
