
import { useState } from "react";
import {
  ArrowRightLeft,
  Truck,
  Package,
  Building2,
} from "lucide-react";

import {
  useWarehouse,
  formatNumber,
} from "../../context/WarehouseContext";

import { formatDateTime } from "../../components/warehouse/DateRangeFilter";

import {
  WarehousePageHeader,
  WarehouseMetric,
  WarehouseModal,
  PageDateFilter,
  useWarehouseDateFilter,
  EmptyTable,
  FormError,
  ModalActions,
} from "../../components/warehouse/WarehouseUI";

const nowInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function InventoryTransfers() {
  const {
    transfers,
    addTransfer,
    getFeedGroupsAsOf,
    feedLots,
  } = useWarehouse();

  const filter = useWarehouseDateFilter();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: nowInput(),
    feedKey: "",
    destination: "Tuxum fermasi №1",
    quantity: "",
  });

  const availableGroups = getFeedGroupsAsOf(
    form.date.slice(0, 10)
  ).filter((group) => group.remaining > 0);

  const selectedGroup = availableGroups.find(
    (group) => group.key === form.feedKey
  );

  const visible = transfers
    .filter((t) => filter.inRange(t.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalTransferred = visible
    .filter((t) => t.status !== "draft")
    .reduce((sum, t) => sum + t.quantity, 0);

  const destinations = new Set(
    visible
      .filter((t) => t.status !== "draft")
      .map((t) => t.to)
  );

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);

    if (
      !form.date ||
      !form.feedKey ||
      !form.destination ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError("Barcha ma'lumotlarni to'g'ri kiriting.");
      return;
    }

    try {
      addTransfer(
        form.feedKey,
        form.date,
        form.destination,
        quantity
      );

      setOpen(false);
      setForm({
        date: nowInput(),
        feedKey: "",
        destination: "Tuxum fermasi №1",
        quantity: "",
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
        title="Ombor harakatlari"
        description="Bo'limlar o'rtasida yem o'tkazish"
        icon={ArrowRightLeft}
        buttonLabel="Yangi transfer"
        onAdd={() => {
          setError("");
          setOpen(true);
        }}
      />

      <PageDateFilter filter={filter} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WarehouseMetric
          label="Jo'natilgan yem"
          value={`${formatNumber(totalTransferred)} kg`}
          icon={Truck}
          tone="blue"
          note="Tanlangan davr"
        />

        <WarehouseMetric
          label="Transfer yozuvlari"
          value={`${visible.length} ta`}
          icon={Package}
          tone="green"
        />

        <WarehouseMetric
          label="Qabul qiluvchi bo'limlar"
          value={`${destinations.size} ta`}
          icon={Building2}
          tone="amber"
        />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">
            Transferlar tarixi
          </h2>
          <p className="section-description mt-1">
            Qayerdan, qayerga va qancha yem yuborilgan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[780px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Yem turi</th>
                <th>Partiya</th>
                <th>Qayerdan</th>
                <th>Qayerga</th>
                <th>Miqdor</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const lot = feedLots.find(
                  (l) => l.id === t.productionId
                );

                return (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.date)}</td>
                    <td className="font-medium">
                      {lot?.feedType ?? "—"}
                    </td>
                    <td>{t.productionId}</td>
                    <td>{t.from}</td>
                    <td>{t.to}</td>
                    <td className="font-semibold">
                      {formatNumber(t.quantity)} kg
                    </td>
                    <td>
                      <span className={`status-badge ${
                        t.status === "received"
                          ? "status-success"
                          : t.status === "sent"
                            ? "status-warning"
                            : "status-neutral"
                      }`}>
                        {t.status === "received"
                          ? "Qabul qilingan"
                          : t.status === "sent"
                            ? "Jo'natilgan"
                            : "Qoralama"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <EmptyTable />}
      </section>

      <WarehouseModal
        open={open}
        title="Yangi yem transferi"
        description="Yem omboridan boshqa bo'limga jo'natish"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">
              Sana va vaqt
            </label>
            <input
              type="datetime-local"
              required
              className="form-input"
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date: e.target.value,
                  feedKey: "",
                })
              }
            />
          </div>

          <div>
            <label className="form-label">
              Qayerdan
            </label>
            <input
              readOnly
              className="form-input"
              value="Yem ombori"
            />
          </div>

          <div>
            <label className="form-label">
              Yem turi va retsept
            </label>
            <select
              required
              className="form-input"
              value={form.feedKey}
              onChange={(e) =>
                setForm({
                  ...form,
                  feedKey: e.target.value,
                })
              }
            >
              <option value="">
                Yem turini tanlang
              </option>

              {availableGroups.map((group) => (
                <option
                  key={group.key}
                  value={group.key}
                >
                  {group.feedType} / {group.recipeName} (
                  {formatNumber(group.remaining)} kg)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Qayerga
            </label>
            <select
              className="form-input"
              value={form.destination}
              onChange={(e) =>
                setForm({
                  ...form,
                  destination: e.target.value,
                })
              }
            >
              <option value="Tuxum fermasi №1">
                Tuxum fermasi №1
              </option>
              <option value="Tuxum fermasi №2">
                Tuxum fermasi №2
              </option>
              <option value="Go'sht fermasi">
                Go'sht fermasi
              </option>
              <option value="Jo'jalar bo'limi">
                Jo'jalar bo'limi
              </option>
            </select>
          </div>

          <div>
            <label className="form-label">
              Yuboriladigan miqdor (kg)
            </label>
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

          {selectedGroup && (
            <div className="rounded-xl bg-emerald-500/10 p-4">
              <p className="text-[12px] text-muted">
                Omborda mavjud
              </p>
              <p className="mt-1 text-[23px] font-semibold text-emerald-500">
                {formatNumber(selectedGroup.remaining)} kg
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Transfer eng eski partiyalardan ajratiladi
              </p>
            </div>
          )}

          <FormError message={error} />

          <ModalActions
            onCancel={() => setOpen(false)}
            submitLabel="Transferni jo'natish"
          />
        </form>
      </WarehouseModal>
    </div>
  );
}
