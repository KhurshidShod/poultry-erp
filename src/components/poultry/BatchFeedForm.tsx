
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { Wheat, X, CheckCircle2 } from "lucide-react";

import {
  usePoultry,
} from "../../context/PoultryContext";

import {
  useMasterData,
} from "../../context/MasterDataContext";

import {
  useFarmFeed,
} from "../../context/FarmFeedContext";

import {
  feedKey,
  formatNumber,
} from "../../context/WarehouseContext";

interface Props {
  batchId: string;
  locationId: string;
  onClose: () => void;
}

function localToday() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function BatchFeedForm({
  batchId,
  locationId,
  onClose,
}: Props) {
  const { batches, getBalanceAsOf } = usePoultry();

  const {
    feedTypes,
    recipes,
  } = useMasterData();

  const {
    addConsumption,
    getBalancesAsOf,
  } = useFarmFeed();

  const [date, setDate] = useState(localToday());
  const [feedTypeId, setFeedTypeId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [norm, setNorm] = useState("");
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const batch = batches.find((b) => b.id === batchId);

  const birds = batch
    ? getBalanceAsOf(batchId, locationId, date)
    : 0;

  const type = feedTypes.find(
    (t) => t.id === feedTypeId && t.active
  );

  const availableRecipes = recipes.filter(
    (r) => r.active && r.feedTypeId === feedTypeId
  );

  const recipe = availableRecipes.find(
    (r) => r.id === recipeId
  );

  // Farm stock for the chosen date
  const stock = getBalancesAsOf(date);

  const matchingStock = useMemo(() => {
    if (!type || !recipe) return undefined;

    return stock.find(
      (item) =>
        item.locationId === locationId &&
        feedKey(item.feedType, item.recipeName) ===
          feedKey(type.name, recipe.name)
    );
  }, [stock, locationId, type, recipe]);

  const normValue = norm.trim() === "" ? NaN : Number(norm);
  const actualValue =
    actual.trim() === "" ? NaN : Number(actual);

  const expected =
    Number.isFinite(normValue) && birds > 0
      ? birds * normValue / 1000
      : 0;

  const difference =
    Number.isFinite(actualValue)
      ? actualValue - expected
      : null;

  const available = matchingStock?.remaining ?? 0;

  const enough =
    Number.isFinite(actualValue) &&
    actualValue > 0 &&
    actualValue <= available + 0.00001;

  const previousNorm = useFarmFeed()
    .getBatchConsumptions(batchId)
    .find(
      (c) =>
        c.locationId === locationId &&
        c.normGrams !== undefined
    )?.normGrams;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!batch || batch.status !== "active") {
      setError("Faol partiya topilmadi.");
      return;
    }

    if (!type || !recipe) {
      setError("Yem turi va retseptni tanlang.");
      return;
    }

    if (birds <= 0) {
      setError(
        "Bu sanada ushbu bo'limda parranda mavjud emas."
      );
      return;
    }

    if (
      !Number.isFinite(normValue) ||
      normValue < 0
    ) {
      setError("Yem me'yorini to'g'ri kiriting.");
      return;
    }

    if (
      !Number.isFinite(actualValue) ||
      actualValue <= 0
    ) {
      setError("Haqiqiy yem sarfini kiriting.");
      return;
    }

    if (!enough) {
      setError(
        "Tanlangan retsept bo'yicha fermada yem yetarli emas."
      );
      return;
    }

    try {
      addConsumption({
        id: crypto.randomUUID(),
        batchId,
        locationId,
        locationName: batch.locationName,
        date,
        feedType: type.name,
        recipeName: recipe.name,
        feedTypeId: type.id,
        recipeId: recipe.id,
        quantity: actualValue,
        normGrams: normValue,
        birdCount: birds,
        expectedKg: expected,
        note,
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Yem sarfini saqlashda xatolik."
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-feed-title"
        className="surface-card max-h-[90vh] w-full max-w-[620px] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border-custom p-5">
          <div className="flex items-center gap-3">
            <Wheat size={22} className="text-accent" />
            <div>
              <h2
                id="batch-feed-title"
                className="text-lg font-semibold"
              >
                Kunlik yem boshqaruvi
              </h2>
              <p className="mt-1 text-xs text-muted">
                {batch?.code ?? "Partiya"} — yem sarfi
              </p>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button !min-h-8 !px-2"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-4 p-5">
          <div>
            <label className="form-label">Sana *</label>
            <input
              type="date"
              required
              min={batch?.arrivalDate}
              max={localToday()}
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">
              Partiyadagi tirik tovuqlar
            </label>
            <input
              className="form-input"
              readOnly
              value={`${formatNumber(birds)} ta`}
            />
          </div>

          <div>
            <label className="form-label">Yem turi *</label>
            <select
              required
              className="form-input"
              value={feedTypeId}
              onChange={(e) => {
                setFeedTypeId(e.target.value);
                setRecipeId("");
              }}
            >
              <option value="">Yem turini tanlang</option>
              {feedTypes.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Yem retsepti *</label>
            <select
              required
              className="form-input"
              disabled={!feedTypeId}
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
            >
              <option value="">Retseptni tanlang</option>
              {availableRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {recipe && (
            <div className="rounded-xl border border-border-custom p-3">
              <p className="text-xs text-muted">
                Fermada mavjud shu retseptdagi yem
              </p>
              <p className="mt-1 text-xl font-semibold">
                {formatNumber(available)} kg
              </p>
              {!matchingStock && (
                <p className="mt-2 text-xs text-amber-500">
                  Bu retseptdagi yem fermaga transfer qilinmagan.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">
                Kunlik me'yor (g/bosh) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder={
                  previousNorm !== undefined
                    ? `Oldingi: ${previousNorm} g`
                    : "Me'yorni kiriting"
                }
                value={norm}
                onChange={(e) => setNorm(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">
                Haqiqiy berilgan yem (kg) *
              </label>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                className="form-input"
                placeholder="Miqdorni kiriting"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border-custom p-4">
              <p className="text-xs text-muted">
                Hisoblangan ehtiyoj
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatNumber(expected)} kg
              </p>
            </div>

            <div className="rounded-xl border border-border-custom p-4">
              <p className="text-xs text-muted">
                Me'yordan farq
              </p>
              <p className="mt-2 text-xl font-semibold">
                {difference === null
                  ? "—"
                  : `${difference > 0 ? "+" : ""}${formatNumber(difference)} kg`}
              </p>
            </div>
          </div>

          <div>
            <label className="form-label">Izoh</label>
            <textarea
              className="form-input min-h-[75px]"
              maxLength={500}
              placeholder="Kunlik oziqlantirish..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

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
              onClick={onClose}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!batch || birds <= 0}
            >
              <CheckCircle2 size={16} />
              Yem sarfini saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
