
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRightLeft,
  Building2,
  Package,
  Truck,
  Plus,
  CalendarDays,
  ListFilter,
} from "lucide-react";

import {
  formatNumber,
  useWarehouse,
} from "../../context/WarehouseContext";

import { useLocations } from "../../context/LocationsContext";

import {
  formatDate,
  formatDateTime,
} from "../../components/warehouse/DateRangeFilter";

import WarehouseFeedRequests from "../../components/warehouse/WarehouseFeedRequests";

import {
  EmptyTable,
  FormError,
  ModalActions,
  WarehouseMetric,
  WarehouseModal,
} from "../../components/warehouse/WarehouseUI";

// ========================================
// TYPES
// ========================================

type RangeMode =
  | "all"
  | "today"
  | "3days"
  | "7days"
  | "10days"
  | "month"
  | "custom";

interface DateRange {
  start: string;
  end: string;
}

interface TransferForm {
  date: string;
  feedKey: string;
  destinationId: string;
  quantity: string;
}

// ========================================
// DATE HELPERS
// ========================================

function localToday(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nowInput(): string {
  const date = new Date();

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function dateOnly(value: string): string {
  // Warehouse transactions can use either:
  // YYYY-MM-DD or YYYY-MM-DDTHH:mm.
  return typeof value === "string"
    ? value.slice(0, 10)
    : "";
}

function getPresetRange(
  mode: RangeMode
): DateRange {
  const current = new Date();

  const end = localToday(current);

  const startDate = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate()
  );

  if (mode === "month") {
    startDate.setDate(1);
  } else {
    const days =
      mode === "3days"
        ? 3
        : mode === "7days"
          ? 7
          : mode === "10days"
            ? 10
            : 1;

    startDate.setDate(
      startDate.getDate() - days + 1
    );
  }

  return {
    start: localToday(startDate),
    end,
  };
}

function defaultForm(): TransferForm {
  return {
    date: nowInput(),
    feedKey: "",
    destinationId: "",
    quantity: "",
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Transferni saqlashda xatolik yuz berdi.";
}

// ========================================
// COMPONENT
// ========================================

export default function InventoryTransfers() {
  const {
    transfers,
    addTransfer,
    getFeedGroupsAsOf,
    feedLots,
  } = useWarehouse();

  const {
    feedDestinations,
    feedSource,
  } = useLocations();

  // ======================================
  // FILTER STATE
  // ======================================

  // Show all history by default.
  const [rangeMode, setRangeMode] =
    useState<RangeMode>("all");

  const [customRange, setCustomRange] =
    useState<DateRange>(() =>
      getPresetRange("7days")
    );

  const [filterError, setFilterError] =
    useState("");

  // ======================================
  // TRANSFER MODAL STATE
  // ======================================

  const [open, setOpen] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState<TransferForm>(defaultForm);

  // ======================================
  // DATE FILTER LOGIC
  // ======================================

  const activeRange =
    rangeMode === "all"
      ? null
      : rangeMode === "custom"
        ? customRange
        : getPresetRange(rangeMode);

  const rangeValid =
    rangeMode !== "custom" ||
    (
      Boolean(customRange.start) &&
      Boolean(customRange.end) &&
      customRange.start <= customRange.end
    );

  const visibleTransfers = useMemo(() => {
    if (!rangeValid) return [];

    return [...transfers]
      .filter((transfer) => {
        if (rangeMode === "all") {
          return true;
        }

        if (!activeRange) {
          return true;
        }

        const day = dateOnly(transfer.date);

        return (
          day >= activeRange.start &&
          day <= activeRange.end
        );
      })
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      );
  }, [
    transfers,
    rangeMode,
    customRange.start,
    customRange.end,
    rangeValid,
    activeRange?.start,
    activeRange?.end,
  ]);

  const totalTransferred = visibleTransfers
    .filter(
      (transfer) =>
        transfer.status !== "draft"
    )
    .reduce(
      (sum, transfer) =>
        sum + transfer.quantity,
      0
    );

  const destinationCount = new Set(
    visibleTransfers
      .filter(
        (transfer) =>
          transfer.status !== "draft"
      )
      .map(
        (transfer) => transfer.to
      )
  ).size;

  // ======================================
  // FEED STOCK FOR NEW TRANSFER
  // ======================================

  const availableGroups = getFeedGroupsAsOf(
    dateOnly(form.date)
  ).filter(
    (group) =>
      group.remaining > 0.00001
  );

  const selectedGroup =
    availableGroups.find(
      (group) =>
        group.key === form.feedKey
    );

  const selectedDestination =
    feedDestinations.find(
      (location) =>
        location.id === form.destinationId
    );

  const quantity =
    Number(form.quantity);

  const quantityValid =
    form.quantity.trim() !== "" &&
    Number.isFinite(quantity) &&
    quantity > 0;

  const enoughFeed =
    Boolean(selectedGroup) &&
    quantityValid &&
    quantity <=
      (selectedGroup?.remaining ?? 0) +
        0.00001;

  // ======================================
  // FILTER ACTIONS
  // ======================================

  function selectPreset(mode: RangeMode) {
    setRangeMode(mode);
    setFilterError("");

    if (mode === "custom") {
      // Keep existing custom dates.
      return;
    }
  }

  function changeCustomRange(
    field: keyof DateRange,
    value: string
  ) {
    const next = {
      ...customRange,
      [field]: value,
    };

    setCustomRange(next);
    setRangeMode("custom");

    if (
      next.start &&
      next.end &&
      next.start > next.end
    ) {
      setFilterError(
        "Boshlanish sanasi tugash sanasidan katta bo'lishi mumkin emas."
      );
    } else {
      setFilterError("");
    }
  }

  // ======================================
  // MODAL ACTIONS
  // ======================================

  function resetForm() {
    setForm(defaultForm());
    setError("");
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError("");
  }

  // ======================================
  // SAVE TRANSFER
  // ======================================

  function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!feedSource || !feedSource.active) {
      setError(
        "Faol yem ombori topilmadi."
      );
      return;
    }

    if (!feedSource.isFeedSource) {
      setError(
        "Yem ombori manba sifatida belgilanmagan."
      );
      return;
    }

    if (!form.date) {
      setError(
        "Transfer sanasini kiriting."
      );
      return;
    }

    const transferDay =
      dateOnly(form.date);

    if (
      transferDay > localToday() ||
      form.date > nowInput()
    ) {
      setError(
        "Kelajakdagi vaqt uchun transfer kiritib bo'lmaydi."
      );
      return;
    }

    if (!selectedGroup) {
      setError(
        "Yem turi va retseptni tanlang."
      );
      return;
    }

    if (!selectedDestination) {
      setError(
        "Qabul qiluvchi bo'limni tanlang."
      );
      return;
    }

    if (
      selectedDestination.id ===
      feedSource.id
    ) {
      setError(
        "Yemni aynan shu omborga transfer qilib bo'lmaydi."
      );
      return;
    }

    if (!quantityValid) {
      setError(
        "Yem miqdorini to'g'ri kiriting."
      );
      return;
    }

    if (!enoughFeed) {
      setError(
        "Tanlangan retsept bo'yicha omborda yem yetarli emas."
      );
      return;
    }

    try {
      // Existing WarehouseContext uses FIFO.
      // One call may create multiple lot allocations.
      addTransfer(
        form.feedKey,
        form.date,
        selectedDestination.name,
        quantity
      );

      closeModal();
      resetForm();

      // Show newly created transfers immediately.
      // No extra warehouse deduction is performed.
      setRangeMode("all");
      setFilterError("");
    } catch (error) {
      setError(getErrorMessage(error));
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="w-full space-y-5 pb-8">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-accent">
            <ArrowRightLeft size={23} />
          </div>

          <div>
            <h1 className="page-title">
              Ombor harakatlari
            </h1>

            <p className="page-description mt-0.5">
              Yem omboridan fermalarga
              transferlar va so'rovlar
            </p>

            <p className="mt-1 text-[11px] text-muted">
              Demo rejimi · Brauzerda saqlanadi
            </p>
          </div>
        </div>

        {/* REQUESTS + NEW TRANSFER */}

        <div className="flex flex-wrap items-center gap-2">
          <WarehouseFeedRequests />

          <button
            type="button"
            className="primary-button"
            onClick={openModal}
          >
            <Plus size={17} />
            Yangi transfer
          </button>
        </div>
      </header>

      {/* ==================================
          DATE FILTER
          ================================== */}

      <section className="surface-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays
              size={18}
              className="text-muted"
            />

            <h2 className="text-sm font-semibold">
              Transferlar davri
            </h2>
          </div>

          <div className="text-xs text-muted">
            {rangeMode === "all"
              ? "Barcha sanalar"
              : activeRange
                ? `${formatDate(activeRange.start)} — ${formatDate(activeRange.end)}`
                : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Barchasi"],
              ["today", "Bugun"],
              ["3days", "3 kun"],
              ["7days", "7 kun"],
              ["10days", "10 kun"],
              ["month", "Shu oy"],
              ["custom", "Sana tanlash"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                selectPreset(mode)
              }
              className={
                rangeMode === mode
                  ? "primary-button !min-h-9"
                  : "secondary-button !min-h-9"
              }
            >
              {mode === "all" && (
                <ListFilter size={15} />
              )}

              {label}
            </button>
          ))}
        </div>

        {rangeMode === "custom" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">
                Boshlanish sanasi
              </label>

              <input
                type="date"
                className="form-input"
                value={customRange.start}
                onChange={(event) =>
                  changeCustomRange(
                    "start",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="form-label">
                Tugash sanasi
              </label>

              <input
                type="date"
                className="form-input"
                value={customRange.end}
                onChange={(event) =>
                  changeCustomRange(
                    "end",
                    event.target.value
                  )
                }
              />
            </div>
          </div>
        )}

        {filterError && (
          <p
            role="alert"
            className="text-sm text-red-500"
          >
            {filterError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-custom pt-3">
          <p className="text-xs text-muted">
            {rangeValid
              ? `${visibleTransfers.length} ta transfer yozuvi ko'rsatilmoqda`
              : "Sana oralig'ini to'g'rilang"}
          </p>

          <p className="text-xs text-muted">
            Umumiy tarixda:{" "}
            <strong>
              {transfers.length} ta
            </strong>
          </p>
        </div>
      </section>

      {/* ==================================
          METRICS
          ================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WarehouseMetric
          label="Jo'natilgan yem"
          value={`${formatNumber(
            totalTransferred
          )} kg`}
          icon={Truck}
          tone="blue"
          note="Tanlangan davr bo'yicha"
        />

        <WarehouseMetric
          label="Transfer yozuvlari"
          value={`${visibleTransfers.length} ta`}
          icon={Package}
          tone="green"
          note="Tanlangan davr bo'yicha"
        />

        <WarehouseMetric
          label="Qabul qiluvchi bo'limlar"
          value={`${destinationCount} ta`}
          icon={Building2}
          tone="amber"
          note="Tanlangan davr bo'yicha"
        />
      </div>

      {/* ==================================
          TRANSFER HISTORY
          ================================== */}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">
              Transferlar tarixi
            </h2>

            <p className="section-description mt-1">
              Qo'lda yaratilgan va tasdiqlangan
              so'rovlar asosidagi transferlar
            </p>
          </div>

          <button
            type="button"
            className={
              rangeMode === "all"
                ? "primary-button"
                : "secondary-button"
            }
            onClick={() =>
              selectPreset("all")
            }
          >
            <ListFilter size={16} />
            Barcha transferlar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[850px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Yem turi</th>
                <th>Retsept</th>
                <th>Yem partiyasi</th>
                <th>Qayerdan</th>
                <th>Qayerga</th>
                <th>Miqdor</th>
                <th>Holat</th>
              </tr>
            </thead>

            <tbody>
              {visibleTransfers.map(
                (transfer) => {
                  const lot = feedLots.find(
                    (item) =>
                      item.id ===
                      transfer.productionId
                  );

                  return (
                    <tr key={transfer.id}>
                      <td className="whitespace-nowrap">
                        {formatDateTime(
                          transfer.date
                        )}
                      </td>

                      <td className="font-medium">
                        {lot?.feedType ?? "—"}
                      </td>

                      <td>
                        {lot?.recipeName ?? "—"}
                      </td>

                      <td className="text-xs">
                        {transfer.productionId}
                      </td>

                      <td>
                        {transfer.from}
                      </td>

                      <td className="font-medium">
                        {transfer.to}
                      </td>

                      <td className="font-semibold">
                        {formatNumber(
                          transfer.quantity
                        )}{" "}
                        kg
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            transfer.status ===
                            "received"
                              ? "status-success"
                              : transfer.status ===
                                  "sent"
                                ? "status-warning"
                                : "status-neutral"
                          }`}
                        >
                          {transfer.status ===
                          "received"
                            ? "Qabul qilingan"
                            : transfer.status ===
                                "sent"
                              ? "Jo'natilgan"
                              : "Qoralama"}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {visibleTransfers.length === 0 && (
          <EmptyTable
            message={
              rangeValid
                ? "Tanlangan davrda transfer topilmadi"
                : "Sana oralig'ini to'g'rilang"
            }
          />
        )}
      </section>

      {/* ==================================
          NEW TRANSFER MODAL
          ================================== */}

      <WarehouseModal
        open={open}
        title="Yangi yem transferi"
        description="Yem omboridan tanlangan bo'limga yem yuborish"
        onClose={closeModal}
      >
        <form
          onSubmit={handleSave}
          className="space-y-4"
        >
          {/* DATE */}

          <div>
            <label className="form-label">
              Sana va vaqt *
            </label>

            <input
              type="datetime-local"
              required
              max={nowInput()}
              className="form-input"
              value={form.date}
              onChange={(event) =>
                setForm({
                  ...form,
                  date: event.target.value,
                  feedKey: "",
                })
              }
            />
          </div>

          {/* SOURCE */}

          <div>
            <label className="form-label">
              Qayerdan
            </label>

            <input
              readOnly
              className="form-input"
              value={
                feedSource?.name ?? ""
              }
              placeholder="Faol yem ombori topilmadi"
            />

            <p className="mt-1 text-xs text-muted">
              Transfer ombordagi tayyor yem
              zaxirasidan ajratiladi.
            </p>
          </div>

          {/* FEED RECIPE */}

          <div>
            <label className="form-label">
              Yem turi va retsept *
            </label>

            <select
              required
              className="form-input"
              value={form.feedKey}
              onChange={(event) =>
                setForm({
                  ...form,
                  feedKey:
                    event.target.value,
                })
              }
            >
              <option value="">
                Yem turi va retseptni tanlang
              </option>

              {availableGroups.map(
                (group) => (
                  <option
                    key={group.key}
                    value={group.key}
                  >
                    {group.feedType} /{" "}
                    {group.recipeName}
                    {" — "}
                    {formatNumber(
                      group.remaining
                    )}{" "}
                    kg
                  </option>
                )
              )}
            </select>

            {availableGroups.length === 0 && (
              <p className="mt-2 text-xs text-amber-500">
                Tanlangan sanada omborda
                transfer uchun tayyor yem
                mavjud emas.
              </p>
            )}
          </div>

          {/* DESTINATION */}

          <div>
            <label className="form-label">
              Qayerga *
            </label>

            <select
              required
              className="form-input"
              value={form.destinationId}
              onChange={(event) =>
                setForm({
                  ...form,
                  destinationId:
                    event.target.value,
                })
              }
            >
              <option value="">
                Qabul qiluvchi bo'limni tanlang
              </option>

              {feedDestinations.map(
                (location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                )
              )}
            </select>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {feedDestinations.length} ta
                faol bo'lim
              </span>

              <Link
                to="/locations"
                className="text-xs font-medium text-accent hover:underline"
              >
                + Bo'limlarni boshqarish
              </Link>
            </div>
          </div>

          {/* QUANTITY */}

          <div>
            <label className="form-label">
              Yuboriladigan miqdor (kg) *
            </label>

            <input
              required
              type="number"
              min="0.001"
              step="any"
              className="form-input"
              placeholder="Masalan: 1000"
              value={form.quantity}
              onChange={(event) =>
                setForm({
                  ...form,
                  quantity:
                    event.target.value,
                })
              }
            />
          </div>

          {/* STOCK PREVIEW */}

          {selectedGroup && (
            <div className="rounded-xl border border-border-custom p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">
                    Omborda mavjud yem
                  </p>

                  <p className="mt-1 text-xl font-semibold text-emerald-500">
                    {formatNumber(
                      selectedGroup.remaining
                    )}{" "}
                    kg
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted">
                    Transferdan keyingi qoldiq
                  </p>

                  <p
                    className={`mt-1 text-xl font-semibold ${
                      quantityValid && !enoughFeed
                        ? "text-red-500"
                        : "text-accent"
                    }`}
                  >
                    {quantityValid
                      ? formatNumber(
                          selectedGroup.remaining -
                            quantity
                        )
                      : formatNumber(
                          selectedGroup.remaining
                        )}{" "}
                    kg
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted">
                Transfer eng eski mavjud
                yem partiyalaridan ajratiladi
                (FIFO).
              </p>

              {quantityValid &&
                !enoughFeed && (
                  <p className="mt-2 text-xs text-red-500">
                    Transfer miqdori ombordagi
                    yemdan ko'p.
                  </p>
                )}
            </div>
          )}

          <FormError message={error} />

          <ModalActions
            onCancel={closeModal}
            submitLabel="Transferni jo'natish"
          />
        </form>
      </WarehouseModal>
    </div>
  );
}
