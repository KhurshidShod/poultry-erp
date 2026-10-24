
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Wheat,
  Pencil,
  Save,
  X,
  CheckCircle2,
  Package,
  Calculator,
  Send,
  AlertTriangle,
} from "lucide-react";

import { useMasterData } from "../../context/MasterDataContext";
import { usePoultry } from "../../context/PoultryContext";
import { useFarmFeed } from "../../context/FarmFeedContext";
import { useFeedPlanning } from "../../context/FeedPlanningContext";
import {
  feedKey,
  formatNumber,
} from "../../context/WarehouseContext";

interface Props {
  batchId: string;
  locationId: string;
}

function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Amalni bajarishda xatolik.";
}

export default function FacilityFeedPanel({
  batchId,
  locationId,
}: Props) {
  const { feedTypes, recipes } = useMasterData();
  const { batches, getBalanceAsOf } = usePoultry();

  const {
    getBalancesAsOf,
    addConsumption,
    getBatchConsumptions,
  } = useFarmFeed();

  const {
    getPlan,
    savePlan,
    sendRequest,
    requests,
  } = useFeedPlanning();

  const batch = batches.find(
    (b) => b.id === batchId
  );

  const plan = getPlan(batchId, locationId);

  const [editing, setEditing] = useState(!plan);
  const [feedTypeId, setFeedTypeId] = useState(
    plan?.feedTypeId ?? ""
  );
  const [recipeId, setRecipeId] = useState(
    plan?.recipeId ?? ""
  );
  const [grams, setGrams] = useState(
    plan ? String(plan.gramsPerBird) : ""
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedingNote, setFeedingNote] = useState("");
  const [requestKg, setRequestKg] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Keep the form synchronized with persisted plans.
  useEffect(() => {
    setEditing(!plan);
    setFeedTypeId(plan?.feedTypeId ?? "");
    setRecipeId(plan?.recipeId ?? "");
    setGrams(
      plan ? String(plan.gramsPerBird) : ""
    );
    setConfirmOpen(false);
  }, [
    batchId,
    locationId,
    plan?.feedTypeId,
    plan?.recipeId,
    plan?.gramsPerBird,
  ]);

  const currentDay = today();

  const birds = batch
    ? getBalanceAsOf(
        batch.id,
        locationId,
        currentDay
      )
    : 0;

  const chosenFeedType = feedTypes.find(
    (t) => t.id === feedTypeId && t.active
  );

  const filteredRecipes = recipes.filter(
    (r) =>
      r.active &&
      r.feedTypeId === feedTypeId
  );

  const chosenRecipe = filteredRecipes.find(
    (r) => r.id === recipeId
  );

  const gramsNumber =
    grams.trim() ? Number(grams) : NaN;

  const previewKg =
    Number.isFinite(gramsNumber) &&
    gramsNumber > 0
      ? (birds * gramsNumber) / 1000
      : 0;

  // Actual feeding uses ONLY the saved plan.
  const dailyKg = plan
    ? (birds * plan.gramsPerBird) / 1000
    : 0;

  const farmStocks = getBalancesAsOf(currentDay).filter(
    (stock) => stock.locationId === locationId
  );

  const effectiveFeedTypeName = editing
    ? chosenFeedType?.name
    : plan?.feedTypeName;

  const effectiveRecipeName = editing
    ? chosenRecipe?.name
    : plan?.recipeName;

  const currentStock = farmStocks.find(
    (s) =>
      effectiveFeedTypeName &&
      effectiveRecipeName &&
      feedKey(s.feedType, s.recipeName) ===
        feedKey(
          effectiveFeedTypeName,
          effectiveRecipeName
        )
  );

  const planStock = farmStocks.find(
    (s) =>
      plan &&
      feedKey(s.feedType, s.recipeName) ===
        feedKey(
          plan.feedTypeName,
          plan.recipeName
        )
  );

  const stockKg = currentStock?.remaining ?? 0;
  const planStockKg = planStock?.remaining ?? 0;

  const todayFeed = getBatchConsumptions(batchId).find(
    (c) =>
      c.locationId === locationId &&
      c.date.slice(0, 10) === currentDay
  );

  const catalogHasSavedRecipe = Boolean(
    plan &&
      feedTypes.some(
        (t) =>
          t.id === plan.feedTypeId &&
          t.active
      ) &&
      recipes.some(
        (r) =>
          r.id === plan.recipeId &&
          r.feedTypeId === plan.feedTypeId &&
          r.active
      )
  );

  const canFeed =
    batch?.status === "active" &&
    Boolean(plan) &&
    birds > 0 &&
    dailyKg > 0 &&
    planStockKg + 0.000001 >= dailyKg &&
    !todayFeed &&
    !editing &&
    catalogHasSavedRecipe;

  const myRequests = requests
    .filter(
      (r) =>
        r.batchId === batchId &&
        r.locationId === locationId
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date)
    );

  function startEditing() {
    setFeedTypeId(plan?.feedTypeId ?? "");
    setRecipeId(plan?.recipeId ?? "");
    setGrams(
      plan ? String(plan.gramsPerBird) : ""
    );
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEditing() {
    setFeedTypeId(plan?.feedTypeId ?? "");
    setRecipeId(plan?.recipeId ?? "");
    setGrams(
      plan ? String(plan.gramsPerBird) : ""
    );
    setError("");
    setEditing(false);
  }

  function handleSavePlan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!batch || batch.status !== "active") {
      setError("Faol partiya topilmadi.");
      return;
    }

    if (!chosenFeedType || !chosenRecipe) {
      setError(
        "Faol yem turi va retseptni tanlang."
      );
      return;
    }

    if (
      !Number.isFinite(gramsNumber) ||
      gramsNumber <= 0
    ) {
      setError("Yem me'yorini to'g'ri kiriting.");
      return;
    }

    try {
      savePlan({
        key: JSON.stringify([
          batchId,
          locationId,
        ]),
        batchId,
        locationId,
        feedTypeId: chosenFeedType.id,
        feedTypeName: chosenFeedType.name,
        recipeId: chosenRecipe.id,
        recipeName: chosenRecipe.name,
        gramsPerBird: gramsNumber,
        updatedAt: new Date().toISOString(),
      });

      setEditing(false);
      setSuccess(
        "Yem rejasi saqlandi. Sahifani yangilaganda ham saqlanib qoladi."
      );
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function sendFeedRequest() {
    setError("");
    setSuccess("");

    if (
      !plan ||
      !batch ||
      batch.status !== "active"
    ) {
      setError(
        "Avval faol partiya uchun yem rejasini saqlang."
      );
      return;
    }

    const quantity = Number(requestKg);

    if (
      !requestKg.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "So'ralayotgan yem miqdorini kiriting."
      );
      return;
    }

    try {
      sendRequest({
        date: currentDay,
        batchId,
        batchCode: batch.code,
        locationId,
        locationName: batch.locationName,
        feedTypeId: plan.feedTypeId,
        feedTypeName: plan.feedTypeName,
        recipeId: plan.recipeId,
        recipeName: plan.recipeName,
        quantity,
        note: requestNote.trim(),
      });

      setRequestKg("");
      setRequestNote("");

      setSuccess(
        "So'rov omborga yuborildi. Transfer hali amalga oshirilmagan."
      );
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function confirmFeeding() {
    setError("");
    setSuccess("");

    if (
      !plan ||
      !batch ||
      batch.status !== "active" ||
      editing ||
      !catalogHasSavedRecipe
    ) {
      setConfirmOpen(false);
      setError(
        "Yem rejasini yoki retseptlar katalogini tekshiring."
      );
      return;
    }

    const currentBirds = getBalanceAsOf(
      batchId,
      locationId,
      currentDay
    );

    const quantity =
      (currentBirds * plan.gramsPerBird) / 1000;

    if (
      currentBirds <= 0 ||
      quantity <= 0 ||
      planStockKg + 0.000001 < quantity
    ) {
      setConfirmOpen(false);
      setError(
        "Yetarli yem yoki tirik parranda mavjud emas."
      );
      return;
    }

    if (
      getBatchConsumptions(batchId).some(
        (c) =>
          c.locationId === locationId &&
          c.date.slice(0, 10) === currentDay
      )
    ) {
      setConfirmOpen(false);
      setError(
        "Bugungi yem allaqachon qayd etilgan."
      );
      return;
    }

    try {
      addConsumption({
        id: crypto.randomUUID(),
        batchId,
        locationId,
        locationName: batch.locationName,
        date: currentDay,
        feedTypeId: plan.feedTypeId,
        feedType: plan.feedTypeName,
        recipeId: plan.recipeId,
        recipeName: plan.recipeName,
        quantity,
        normGrams: plan.gramsPerBird,
        birdCount: currentBirds,
        expectedKg: quantity,
        note: feedingNote.trim(),
      });

      setConfirmOpen(false);
      setFeedingNote("");
      setSuccess(
        `${formatNumber(quantity)} kg yem ferma zaxirasidan chiqarildi.`
      );
    } catch (err) {
      setConfirmOpen(false);
      setError(messageOf(err));
    }
  }

  return (
    <section className="space-y-4">
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wheat
            size={20}
            className="text-accent"
          />
          <div>
            <h3 className="font-semibold">
              Kunlik yem boshqaruvi
            </h3>
            <p className="text-xs text-muted">
              {batch?.code} — yem rejasi va zaxira
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!canFeed}
          title={
            todayFeed
              ? "Bugungi yem allaqachon berilgan"
              : editing
                ? "Avval rejani saqlang"
                : planStockKg < dailyKg
                  ? "Ferma zaxirasi yetarli emas"
                  : "Bugungi yemni berish"
          }
          onClick={() => {
            setError("");
            setSuccess("");
            setConfirmOpen(true);
          }}
        >
          <CheckCircle2 size={17} />
          {todayFeed
            ? "Bugungi yem berilgan"
            : "Bugungi yemni berish"}
        </button>
      </div>

      {/* PLAN CARD */}

      <div className="space-y-4 rounded-xl border border-border-custom p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">
              Yem retsepti va me'yori
            </h4>

            {plan && !editing && (
              <p className="mt-1 text-xs text-emerald-500">
                <CheckCircle2
                  size={13}
                  className="mr-1 inline"
                />
                Reja saqlangan
              </p>
            )}
          </div>

          {plan &&
            batch?.status === "active" &&
            !editing && (
              <button
                type="button"
                className="primary-button"
                onClick={startEditing}
              >
                <Pencil size={16} />
                Rejani o'zgartirish
              </button>
            )}
        </div>

        {editing ? (
          <form
            onSubmit={handleSavePlan}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="form-label">
                  Yem turi *
                </label>
                <select
                  required
                  className="form-input"
                  value={feedTypeId}
                  onChange={(e) => {
                    setFeedTypeId(e.target.value);
                    setRecipeId("");
                  }}
                >
                  <option value="">
                    Yem turini tanlang
                  </option>
                  {feedTypes
                    .filter((t) => t.active)
                    .map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                      >
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Yem retsepti *
                </label>
                <select
                  required
                  className="form-input"
                  value={recipeId}
                  disabled={!feedTypeId}
                  onChange={(e) =>
                    setRecipeId(e.target.value)
                  }
                >
                  <option value="">
                    Retseptni tanlang
                  </option>
                  {filteredRecipes.map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Kunlik me'yor (g/bosh) *
                </label>
                <input
                  required
                  type="number"
                  min="0.001"
                  step="any"
                  className="form-input"
                  value={grams}
                  onChange={(e) =>
                    setGrams(e.target.value)
                  }
                  placeholder="Masalan: 120"
                />
              </div>

              <div>
                <label className="form-label">
                  Tirik parrandalar soni
                </label>
                <input
                  readOnly
                  className="form-input"
                  value={`${formatNumber(birds)} ta`}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {plan && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelEditing}
                >
                  <X size={16} />
                  Bekor qilish
                </button>
              )}

              <button
                type="submit"
                className="secondary-button"
              >
                <Save size={16} />
                Rejani saqlash
              </button>
            </div>
          </form>
        ) : plan ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField
              label="Yem turi"
              value={plan.feedTypeName}
            />

            <ReadOnlyField
              label="Yem retsepti"
              value={plan.recipeName}
            />

            <ReadOnlyField
              label="Kunlik me'yor"
              value={`${formatNumber(
                plan.gramsPerBird
              )} g/bosh`}
            />

            <ReadOnlyField
              label="Tirik parrandalar"
              value={`${formatNumber(birds)} ta`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Ushbu partiya uchun hali yem rejasi
            belgilanmagan.
          </p>
        )}

        {/* CALCULATED VALUES */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border-custom p-4">
            <p className="flex items-center gap-2 text-xs text-muted">
              <Calculator size={15} />
              Kunlik hisoblangan ehtiyoj
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatNumber(
                editing ? previewKg : dailyKg
              )}{" "}
              kg
            </p>
          </div>

          <div className="rounded-xl border border-border-custom p-4">
            <p className="flex items-center gap-2 text-xs text-muted">
              <Package size={15} />
              Tanlangan retsept zaxirasi
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatNumber(stockKg)} kg
            </p>

            {(editing ? previewKg : dailyKg) >
              stockKg && (
              <p className="mt-2 text-xs text-amber-500">
                Bir kunlik ehtiyoj uchun{" "}
                {formatNumber(
                  (editing ? previewKg : dailyKg) -
                    stockKg
                )}{" "}
                kg yetishmayapti.
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          Rejani saqlash yemni kamaytirmaydi.
          Faqat “Bugungi yemni berish” tasdiqlanganda
          ferma zaxirasidan sarflanadi.
        </p>

        {plan && !catalogHasSavedRecipe && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 p-3 text-xs text-amber-500">
            <AlertTriangle size={16} />
            <span>
              Saqlangan retsept mavjud, ammo hozirgi
              katalogda uning faol yozuvi topilmadi.
              Retseptni katalogda tiklash yoki faol
              retseptni qayta tanlash kerak.
            </span>
          </div>
        )}
      </div>

      {/* STOCK */}

      <div className="space-y-3 rounded-xl border border-border-custom p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Package size={17} />
          Bo'limdagi mavjud yemlar
        </h4>

        {farmStocks.length === 0 ? (
          <p className="text-sm text-muted">
            Bu bo'limga hali yem kelmagan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[450px]">
              <thead>
                <tr>
                  <th>Yem turi</th>
                  <th>Retsept</th>
                  <th>Qolgan</th>
                </tr>
              </thead>
              <tbody>
                {farmStocks.map((s) => (
                  <tr key={s.key}>
                    <td>{s.feedType}</td>
                    <td>{s.recipeName}</td>
                    <td>
                      {formatNumber(s.remaining)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REQUEST */}

      <div className="space-y-3 rounded-xl border border-border-custom p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Send size={17} />
          Omborga yem so'rovi
        </h4>

        <p className="text-xs text-muted">
          So'rov saqlangan retsept uchun yuboriladi.
          Tasdiqlanmaguncha zaxira o'zgarmaydi.
        </p>

        <div>
          <label className="form-label">
            Miqdor (kg)
          </label>
          <input
            type="number"
            min="0.001"
            step="any"
            className="form-input"
            placeholder="Masalan: 1000"
            value={requestKg}
            onChange={(e) =>
              setRequestKg(e.target.value)
            }
          />
        </div>

        <div>
          <label className="form-label">
            Izoh
          </label>
          <textarea
            className="form-input min-h-[70px]"
            value={requestNote}
            onChange={(e) =>
              setRequestNote(e.target.value)
            }
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="secondary-button"
            disabled={
              !plan ||
              editing ||
              batch?.status !== "active"
            }
            onClick={sendFeedRequest}
          >
            <Send size={16} />
            So'rov yuborish
          </button>
        </div>
      </div>

      {/* REQUEST HISTORY */}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">
          Yuborilgan so'rovlar
        </h4>

        {myRequests.length === 0 ? (
          <p className="text-sm text-muted">
            Hozircha so'rov yo'q.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[550px]">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Retsept</th>
                  <th>Miqdor</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.recipeName}</td>
                    <td>
                      {formatNumber(r.quantity)} kg
                    </td>
                    <td>
                      {r.status === "pending"
                        ? "Kutilmoqda"
                        : r.status === "approved"
                          ? "Tasdiqlangan"
                          : "Rad etilgan"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {todayFeed && (
        <p className="rounded-xl border border-emerald-500/30 p-3 text-sm text-emerald-500">
          <CheckCircle2
            size={17}
            className="mr-2 inline"
          />
          Bugungi yem berilgan:{" "}
          {formatNumber(todayFeed.quantity)} kg.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 p-3 text-sm text-emerald-500"
        >
          {success}
        </p>
      )}

      {/* CONFIRMATION */}

      {confirmOpen && plan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-confirm-title"
            className="surface-card w-full max-w-[470px] space-y-4 p-5"
          >
            <div className="flex items-center justify-between">
              <h3
                id="feed-confirm-title"
                className="text-lg font-semibold"
              >
                Bugungi yemni tasdiqlash
              </h3>

              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={() => setConfirmOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-border-custom p-4 text-sm">
              <p>
                Partiya: <strong>{batch?.code}</strong>
              </p>
              <p>
                Retsept: <strong>{plan.recipeName}</strong>
              </p>
              <p>
                Tirik:{" "}
                <strong>
                  {formatNumber(birds)} ta
                </strong>
              </p>
              <p>
                Me'yor:{" "}
                <strong>
                  {formatNumber(plan.gramsPerBird)} g
                </strong>
              </p>
              <p>
                Sarflanadi:{" "}
                <strong>
                  {formatNumber(dailyKg)} kg
                </strong>
              </p>
              <p>
                Keyin qoladi:{" "}
                <strong>
                  {formatNumber(
                    planStockKg - dailyKg
                  )}{" "}
                  kg
                </strong>
              </p>
            </div>

            <div>
              <label className="form-label">
                Izoh
              </label>
              <textarea
                className="form-input min-h-[70px]"
                value={feedingNote}
                onChange={(e) =>
                  setFeedingNote(e.target.value)
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmOpen(false)}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={confirmFeeding}
              >
                <CheckCircle2 size={16} />
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border-custom p-3">
      <p className="text-xs text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}
