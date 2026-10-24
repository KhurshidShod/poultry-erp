
import {
  useState,
  type FormEvent,
} from "react";

import {
  Building2,
  Package,
  Wheat,
  ClipboardList,
  Plus,
  Search,
} from "lucide-react";

import {
  feedKey,
  formatNumber,
} from "../../context/WarehouseContext";

import {
  useLocations,
} from "../../context/LocationsContext";

import {
  useFarmFeed,
  type FeedConsumption,
  type FarmFeedBalance,
} from "../../context/FarmFeedContext";

import {
  formatDateTime,
} from "../../components/warehouse/DateRangeFilter";

import {
  WarehouseMetric,
  WarehouseModal,
  PageDateFilter,
  useWarehouseDateFilter,
  EmptyTable,
  FormError,
  ModalActions,
} from "../../components/warehouse/WarehouseUI";

/* =====================================
   HELPERS
===================================== */

function nowInput() {
  const date = new Date();

  return new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
}

function todayString() {
  return nowInput().slice(0, 10);
}

function emptyForm() {
  return {
    date: nowInput(),
    locationId: "",
    feedKey: "",
    quantity: "",
    note: "",
  };
}

/* =====================================
   PAGE
===================================== */

export default function FarmFeedInventory() {
  const {
    consumptions,
    getBalancesAsOf,
    addConsumption,
  } = useFarmFeed();

  const {
    feedDestinations,
    locations,
  } = useLocations();


  const filter = useWarehouseDateFilter();

  const [locationFilter, setLocationFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState(emptyForm);

  const selectedLocation = locations.find(
    (item) => item.id === form.locationId
  );

  const selectedDate = form.date.slice(0, 10);

  /* =====================================
     STOCK AS OF SELECTED DATE
  ===================================== */


/* =====================================
   DATE RANGE BALANCES

   Kelgan = selected period incoming
   Sarflangan = selected period consumption
   Qolgan = balance at end of period
===================================== */

const rangeStart = filter.range.start;
const rangeEnd = filter.range.end || todayString();

/* Balance at the END of selected period */
const endBalances = getBalancesAsOf(rangeEnd);

/* Balance BEFORE selected period */
const startDate = new Date(`${rangeStart}T00:00:00Z`);
startDate.setUTCDate(startDate.getUTCDate() - 1);

const previousDay = startDate.toISOString().slice(0, 10);

const startBalances = getBalancesAsOf(previousDay);

/* Fast lookup by stable balance key */
const startMap = new Map(
  startBalances.map((item) => [item.key, item])
);

const endMap = new Map(
  endBalances.map((item) => [item.key, item])
);

/*
 * Include both opening and closing rows,
 * including feed completely consumed
 * during the selected date range.
 */
const historicalBalances: FarmFeedBalance[] = Array.from(
  new Set([
    ...startMap.keys(),
    ...endMap.keys(),
  ])
).map((key) => {
  const opening = startMap.get(key);
  const closing = endMap.get(key);

  const row = closing ?? opening!;

  const received =
    (closing?.received ?? 0) -
    (opening?.received ?? 0);

  const consumed =
    (closing?.consumed ?? 0) -
    (opening?.consumed ?? 0);

  return {
    ...row,

    /* Period-specific activity */
    received,
    consumed,

    /* Closing stock remains cumulative */
    remaining: closing?.remaining ?? 0,
  };
});

const filteredBalances = historicalBalances.filter(
  (item) => {
    const query = search.trim().toLowerCase();

    const matchesLocation =
      locationFilter === "all" ||
      item.locationId === locationFilter;

    const matchesSearch = [
      item.locationName,
      item.feedType,
      item.recipeName,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);

    return matchesLocation && matchesSearch;
  }
);


  /* =====================================
     FILTERED CONSUMPTION HISTORY
  ===================================== */

  const filteredConsumptions = consumptions
    .filter((item) => filter.inRange(item.date))
    .filter(
      (item) =>
        locationFilter === "all" ||
        item.locationId === locationFilter
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date)
    );

  /* =====================================
     FORM FEED OPTIONS

     Only feed already transferred into
     the selected farm is available.
  ===================================== */

  const farmBalances = getBalancesAsOf(
    selectedDate
  ).filter(
    (item) =>
      item.locationId === form.locationId &&
      item.remaining > 0.00001
  );

  const selectedFeed = farmBalances.find(
    (item) =>
      feedKey(item.feedType, item.recipeName) ===
      form.feedKey
  );

  const quantity = Number(form.quantity);

  const validQuantity =
    form.quantity.trim() !== "" &&
    Number.isFinite(quantity) &&
    quantity > 0;

  const remainingAfter =
    selectedFeed && validQuantity
      ? selectedFeed.remaining - quantity
      : null;

  /* =====================================
     SUMMARY
  ===================================== */

  const totalReceived = filteredBalances.reduce(
    (sum, item) => sum + item.received,
    0
  );

  const totalConsumed = filteredBalances.reduce(
    (sum, item) => sum + item.consumed,
    0
  );

  const totalRemaining = filteredBalances.reduce(
    (sum, item) => sum + item.remaining,
    0
  );

  const activeFarmCount = new Set(
    filteredBalances
      .filter((item) => item.received > 0)
      .map((item) => item.locationId)
  ).size;

  /* =====================================
     FORM ACTIONS
  ===================================== */

  function openModal() {
    setError("");

    setForm({
      ...emptyForm(),
      locationId:
        locationFilter !== "all"
          ? locationFilter
          : "",
    });

    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError("");
  }

  function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!selectedLocation) {
      setError("Fermani tanlang.");
      return;
    }

    if (!selectedFeed) {
      setError("Yem turi va retseptni tanlang.");
      return;
    }

    if (!validQuantity) {
      setError("Yem sarfi miqdorini to'g'ri kiriting.");
      return;
    }

    if (
      quantity > selectedFeed.remaining + 0.00001
    ) {
      setError("Yem zaxirasi yetarli emas.");
      return;
    }

    const usage: FeedConsumption = {
      id: crypto.randomUUID(),
      date: form.date,
      locationId: selectedLocation.id,
      locationName: selectedLocation.name,
      feedType: selectedFeed.feedType,
      recipeName: selectedFeed.recipeName,
      quantity,
      note: form.note.trim(),
    };

    try {
      addConsumption(usage);
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Yem sarfini saqlashda xatolik."
      );
    }
  }

  /* =====================================
     VIEW
  ===================================== */

  return (
    <div className="w-full space-y-5 pb-8">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-accent">
              <Wheat size={22} />
            </div>

            <div>
              <h1 className="page-title">
                Fermalar yem zaxirasi
              </h1>

              <p className="page-description mt-1">
                Fermalarga yuborilgan yem,
                sarf va qolgan zaxiralarni boshqarish
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openModal}
        >
          <Plus size={17} />
          Yangi yem sarfi
        </button>
      </div>

      {/* DATE FILTER */}
      <PageDateFilter filter={filter} />

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WarehouseMetric
  label="Fermalarga kelgan yem"
  value={`${formatNumber(totalReceived)} kg`}
  icon={Package}
  tone="blue"
  note="Tanlangan davr"
/>

<WarehouseMetric
  label="Sarflangan yem"
  value={`${formatNumber(totalConsumed)} kg`}
  icon={Wheat}
  tone="amber"
  note="Tanlangan davr"
/>

<WarehouseMetric
  label="Qolgan yem"
  value={`${formatNumber(totalRemaining)} kg`}
  icon={ClipboardList}
  tone="green"
  note="Davr oxiridagi qoldiq"
/>

        <WarehouseMetric
          label="Yem kirimi bor bo'limlar"
          value={`${activeFarmCount} ta`}
          icon={Building2}
          tone="accent"
          note="Tanlangan sanagacha"
        />
      </div>

      {/* FILTERS */}
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">
              Zaxira filtrlari
            </h2>
            <p className="section-description mt-1">
              Bo'lim yoki yem nomi bo'yicha qidirish
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="form-input !w-auto"
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(event.target.value)
              }
            >
              <option value="all">
                Barcha bo'limlar
              </option>

              {locations
                .filter(
                  (item) =>
                    item.canReceiveFeed ||
                    historicalBalances.some(
                      (balance) =>
                        balance.locationId === item.id
                    )
                )
                .map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                ))}
            </select>

            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />

              <input
                className="form-input !w-[240px] !pl-9"
                placeholder="Yem turi, retsept..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* FARM STOCK TABLE */}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">
            Fermalar bo'yicha yem qoldig'i
          </h2>

          <p className="section-description mt-1">
            Yem turi va retsept kesimida kirim,
            sarf hamda mavjud miqdor
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[850px]">
            <thead>
              <tr>
                <th>Ferma / bo'lim</th>
                <th>Yem turi</th>
                <th>Retsept</th>
                <th>Kelgan</th>
                <th>Sarflangan</th>
                <th>Qolgan</th>
                <th>Holat</th>
              </tr>
            </thead>

            <tbody>
              {filteredBalances.map((item) => {
                const enough =
                  item.remaining > 0.00001;

                return (
                  <tr key={item.key}>
                    <td className="font-semibold">
                      {item.locationName}
                    </td>

                    <td>{item.feedType}</td>

                    <td>{item.recipeName}</td>

                    <td>
                      {formatNumber(item.received)} kg
                    </td>

                    <td>
                      {formatNumber(item.consumed)} kg
                    </td>

                    <td className="font-semibold">
                      {formatNumber(item.remaining)} kg
                    </td>

                    <td>
                      <span
                        className={
                          enough
                            ? "status-badge status-success"
                            : "status-badge status-neutral"
                        }
                      >
                        {enough
                          ? "Mavjud"
                          : "Tugagan"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBalances.length === 0 && (
          <EmptyTable
            message="Tanlangan bo'limda yem zaxirasi topilmadi"
          />
        )}
      </section>

      {/* CONSUMPTION HISTORY */}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">
            Yem sarfi tarixi
          </h2>

          <p className="section-description mt-1">
            Bo'limlarda sarflangan yem yozuvlari
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[750px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Ferma</th>
                <th>Yem turi</th>
                <th>Retsept</th>
                <th>Sarf</th>
                <th>Izoh</th>
              </tr>
            </thead>

            <tbody>
              {filteredConsumptions.map((item) => (
                <tr key={item.id}>
                  <td>
                    {formatDateTime(item.date)}
                  </td>

                  <td className="font-medium">
                    {locations.find(
                      (loc) => loc.id === item.locationId
                    )?.name ?? item.locationName}
                  </td>

                  <td>{item.feedType}</td>
                  <td>{item.recipeName}</td>

                  <td className="font-semibold text-amber-500">
                    -{formatNumber(item.quantity)} kg
                  </td>

                  <td className="text-muted">
                    {item.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredConsumptions.length === 0 && (
          <EmptyTable
            message="Tanlangan davrda yem sarfi mavjud emas"
          />
        )}
      </section>

      {/* NEW CONSUMPTION MODAL */}
      <WarehouseModal
        open={open}
        title="Yangi yem sarfi"
        description="Ferma zaxirasidan sarflangan yemni hisobdan chiqarish"
        onClose={closeModal}
      >
        <form
          onSubmit={handleSave}
          className="space-y-4"
        >
          <div>
            <label className="form-label">
              Sana va vaqt *
            </label>

            <input
              required
              type="datetime-local"
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

          <div>
            <label className="form-label">
              Ferma / bo'lim *
            </label>

            <select
              required
              className="form-input"
              value={form.locationId}
              onChange={(event) =>
                setForm({
                  ...form,
                  locationId: event.target.value,
                  feedKey: "",
                })
              }
            >
              <option value="">
                Bo'limni tanlang
              </option>

              {feedDestinations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Yem turi va retsept *
            </label>

            <select
              required
              className="form-input"
              disabled={!form.locationId}
              value={form.feedKey}
              onChange={(event) =>
                setForm({
                  ...form,
                  feedKey: event.target.value,
                })
              }
            >
              <option value="">
                Yemni tanlang
              </option>

              {farmBalances.map((item) => (
                <option
                  key={item.key}
                  value={feedKey(
                    item.feedType,
                    item.recipeName
                  )}
                >
                  {item.feedType} / {item.recipeName}
                  {" — "}
                  {formatNumber(item.remaining)} kg
                </option>
              ))}
            </select>

            {form.locationId &&
              farmBalances.length === 0 && (
                <p className="mt-2 text-xs text-amber-500">
                  Bu bo'limda tanlangan sana bo'yicha
                  mavjud yem yo'q.
                </p>
              )}
          </div>

          <div>
            <label className="form-label">
              Sarflangan miqdor (kg) *
            </label>

            <input
              required
              type="number"
              min="0.001"
              step="any"
              className="form-input"
              placeholder="Miqdor kiriting"
              value={form.quantity}
              onChange={(event) =>
                setForm({
                  ...form,
                  quantity: event.target.value,
                })
              }
            />
          </div>

          {/* PREVIEW */}
          {selectedFeed && (
            <div className="rounded-xl border border-border-custom p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">
                    Hozir mavjud
                  </p>

                  <p className="mt-1 text-xl font-semibold text-emerald-500">
                    {formatNumber(
                      selectedFeed.remaining
                    )} kg
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted">
                    Sarfdan keyin
                  </p>

                  <p
                    className={`mt-1 text-xl font-semibold ${
                      remainingAfter !== null &&
                      remainingAfter < -0.00001
                        ? "text-red-500"
                        : "text-accent"
                    }`}
                  >
                    {remainingAfter === null
                      ? "—"
                      : `${formatNumber(remainingAfter)} kg`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="form-label">
              Izoh
            </label>

            <textarea
              className="form-input min-h-[85px] resize-y"
              placeholder="Masalan: Kunlik oziqlantirish"
              maxLength={500}
              value={form.note}
              onChange={(event) =>
                setForm({
                  ...form,
                  note: event.target.value,
                })
              }
            />
          </div>

          <FormError message={error} />

          <ModalActions
            onCancel={closeModal}
            submitLabel="Yem sarfini saqlash"
          />
        </form>
      </WarehouseModal>
    </div>
  );
}
