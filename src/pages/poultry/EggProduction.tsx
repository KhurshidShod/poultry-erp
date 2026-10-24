
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Egg,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";

import {
  useEggProduction,
  calculateEggTotals,
} from "../../context/EggProductionContext";

import { usePoultry } from "../../context/PoultryContext";
import { useLocations } from "../../context/LocationsContext";

import { formatNumber } from "../../context/WarehouseContext";

import EggFarmBirdManagement from '../../components/poultry/EggFarmBirdManagement';

import DateRangeFilter, {
  presetRange,
  type DatePreset,
  type DateRange,
} from "../../components/warehouse/DateRangeFilter";

function localDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

// These names match the current EggFarm input order.
const CATEGORIES = [
  { key: "category1", name: "Mayda" },
  { key: "category2", name: "2-kategoriya" },
  { key: "category3", name: "1-kategoriya" },
  { key: "category4", name: "Egizak" },
] as const;

export default function EggProduction() {
  const { records } = useEggProduction();
  const { batches, getBalanceAsOf } = usePoultry();
  const { locations } = useLocations();

  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>(() => presetRange("today"));
  const [locationId, setLocationId] = useState("all");
  const [batchId, setBatchId] = useState("all");

  const eggFarms = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.type === "egg-production"
      ),
    [locations]
  );

  const eggBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.direction === "egg"
      ),
    [batches]
  );

  const rangeValid =
    Boolean(dateRange.start && dateRange.end) &&
    dateRange.start <= dateRange.end;

  // Only egg-farm records participate in this report.
  const filteredRecords = useMemo(() => {
    if (!rangeValid) return [];

    const validLocationIds = new Set(
      eggFarms.map((farm) => farm.id)
    );

    return records
      .filter((record) => {
        if (!validLocationIds.has(record.locationId)) {
          return false;
        }

        if (
          locationId !== "all" &&
          record.locationId !== locationId
        ) {
          return false;
        }

        if (
          batchId !== "all" &&
          record.batchId !== batchId
        ) {
          return false;
        }

        if (
          record.date < dateRange.start ||
          record.date > dateRange.end
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt)
      );
  }, [
    records,
    eggFarms,
    locationId,
    batchId,
    dateRange.start,
    dateRange.end,
    rangeValid,
  ]);

  const totals = useMemo(
    () => calculateEggTotals(filteredRecords),
    [filteredRecords]
  );

  const totalAlive = eggBatches
    .filter((batch) => batch.status === "active")
    .reduce(
      (sum, batch) =>
        sum +
        eggFarms
          .filter(
            (farm) =>
              locationId === "all" ||
              farm.id === locationId
          )
          .reduce(
            (farmSum, farm) =>
              farmSum +
              Math.max(
                0,
                getBalanceAsOf(
                  batch.id,
                  farm.id,
                  localDate()
                )
              ),
            0
          ),
      0
    );

  const farmSummaries = eggFarms
    .filter(
      (farm) =>
        locationId === "all" ||
        farm.id === locationId
    )
    .map((farm) => {
      const ownRecords = filteredRecords.filter(
        (record) => record.locationId === farm.id
      );

      const ownTotals = calculateEggTotals(ownRecords);

      return {
        id: farm.id,
        name: farm.name,
        recordsCount: ownRecords.length,
        ...ownTotals,
      };
    });

  const brokenPercent =
    totals.totalCollected > 0
      ? (totals.brokenCount /
          totals.totalCollected) *
        100
      : 0;

  function getBatchCode(id: string) {
    return (
      batches.find((batch) => batch.id === id)?.code ??
      id
    );
  }

  function getLocationName(id: string) {
    return (
      locations.find((location) => location.id === id)
        ?.name ?? id
    );
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* HEADER */}

      <header className="flex flex-wrap items-center gap-3">
        <Egg size={27} className="text-accent" />

        <div>
          <h1 className="text-2xl font-semibold">
            Tuxum ishlab chiqarish
          </h1>

          <p className="mt-1 text-sm text-muted">
            Tuxum fermalari bo'yicha yig'im,
            kategoriyalar, singan tuxumlar
            va umumiy hisobot
          </p>
        </div>
      </header>

      {/* DATE FILTER — SHARED WITH WAREHOUSE & FINANCE */}
      <DateRangeFilter
        preset={datePreset}
        range={dateRange}
        onChange={(preset, range) => {
          setDatePreset(preset);
          setDateRange(range);
        }}
      />

      {/* FARM AND BATCH FILTERS */}
      <section className="surface-card space-y-4 p-4 sm:p-5">
        <h2 className="text-[13px] font-semibold">Qo'shimcha filtrlar</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">
              Tuxum fermasi
            </label>

            <select
              className="form-input"
              value={locationId}
              onChange={(event) =>
                setLocationId(event.target.value)
              }
            >
              <option value="all">
                Barcha tuxum fermalari
              </option>

              {eggFarms.map((farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Parranda partiyasi
            </label>

            <select
              className="form-input"
              value={batchId}
              onChange={(event) =>
                setBatchId(event.target.value)
              }
            >
              <option value="all">
                Barcha LY partiyalari
              </option>

              {eggBatches.map((batch) => (
                <option
                  key={batch.id}
                  value={batch.id}
                >
                  {batch.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-muted">
          Hisobotda {filteredRecords.length} ta
          kunlik yig'im yozuvi topildi.
        </p>
      </section>

      {/* PRIMARY METRICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Sotishga yaroqli tuxum"
          value={`${formatNumber(totals.sellable)} ta`}
          icon={<CheckCircle2 size={18} />}
        />

        <Stat
          label="Singan tuxumlar"
          value={`${formatNumber(
            totals.brokenCount
          )} ta`}
          icon={<AlertTriangle size={18} />}
        />

        <Stat
          label="Jami yig'ilgan"
          value={`${formatNumber(
            totals.totalCollected
          )} ta`}
          icon={<Egg size={18} />}
        />

        <Stat
          label="Hozir fermalarda tirik"
          value={`${formatNumber(totalAlive)} ta`}
          icon={<Layers size={18} />}
        />
      </div>

      {/* CATEGORY TOTALS */}

      <section className="surface-card space-y-4 p-5">
        <div>
          <h2 className="section-title">
            Tuxum kategoriyalari
          </h2>

          <p className="mt-1 text-xs text-muted">
            Tanlangan davr va fermalar bo'yicha
            sotishga yaroqli tuxumlar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="rounded-xl border border-border-custom p-4"
            >
              <p className="text-xs text-muted">
                {category.name}
              </p>

              <p className="mt-2 text-xl font-semibold">
                {formatNumber(
                  totals[category.key]
                )}{" "}
                ta
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-3 rounded-xl border border-border-custom p-4">
          <span className="text-sm text-muted">
            Singan tuxumlar ulushi
          </span>

          <strong>
            {brokenPercent.toFixed(2)}%
          </strong>
        </div>
      </section>

      {/* FARM COMPARISON */}

      <section className="surface-card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Building2
            size={19}
            className="text-accent"
          />

          <h2 className="section-title">
            Fermalar bo'yicha taqqoslash
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[650px]">
            <thead>
              <tr>
                <th>Ferma</th>
                <th>Yaroqli</th>
                <th>Singan</th>
                <th>Jami</th>
                <th>Yozuvlar</th>
              </tr>
            </thead>

            <tbody>
              {farmSummaries.map((farm) => (
                <tr key={farm.id}>
                  <td className="font-semibold">
                    {farm.name}
                  </td>

                  <td>
                    {formatNumber(farm.sellable)}
                  </td>

                  <td>
                    {formatNumber(farm.brokenCount)}
                  </td>

                  <td className="font-semibold">
                    {formatNumber(
                      farm.totalCollected
                    )}
                  </td>

                  <td>{farm.recordsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* COMPLETE HISTORY */}

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5">
          <h2 className="section-title">
            Tuxum yig'imi tarixi
          </h2>

          <p className="mt-1 text-xs text-muted">
            Barcha fermalarda kiritilgan
            asl kunlik yozuvlar
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[1050px]">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Ferma</th>
                <th>LY partiya</th>
                <th>Mayda</th>
                <th>2-kat.</th>
                <th>1-kat.</th>
                <th>Egizak</th>
                <th>Yaroqli</th>
                <th>Singan</th>
                <th>Jami</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => {
                const sellable =
                  record.category1 +
                  record.category2 +
                  record.category3 +
                  record.category4;

                return (
                  <tr key={record.id}>
                    <td>{record.date}</td>

                    <td>
                      {getLocationName(
                        record.locationId
                      )}
                    </td>

                    <td className="font-semibold">
                      {getBatchCode(
                        record.batchId
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        record.category1
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        record.category2
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        record.category3
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        record.category4
                      )}
                    </td>

                    <td>
                      {formatNumber(sellable)}
                    </td>

                    <td>
                      {formatNumber(
                        record.brokenCount
                      )}
                    </td>

                    <td className="font-semibold">
                      {formatNumber(
                        sellable +
                          record.brokenCount
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            Tanlangan davrda tuxum yig'imi
            mavjud emas.
          </p>
        )}
      </section>

      {/* Separate location-scoped bird controls for egg farm 1 and 2. */}
      <section className="space-y-4">
        <h2 className="section-title">Tuxum fermalaridagi tirik parrandalarni boshqarish</h2>
        <p className="text-sm text-muted">
          Har bir fermada faqat o‘sha joydagi tovuqlar sotiladi yoki nobud bo‘lgan deb qayd etiladi.
          110 kunlik jo‘jaxonadan ko‘chirilgan tovuqlar jo‘jaxonadan boshqarilmaydi.
        </p>
        {eggFarms
          .filter((farm) => locationId === 'all' || farm.id === locationId)
          .map((farm) => (
            <EggFarmBirdManagement key={farm.id} locationId={farm.id} />
          ))}
      </section>

      <p className="text-xs text-muted">
        Bu sahifa hisobot uchun mo'ljallangan.
        Tuxum yig'imi va singan tuxumlar
        №1 yoki №2 ferma sahifalarida
        kiritiladi va tahrirlanadi.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <p className="text-xs">{label}</p>
      </div>

      <p className="mt-3 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}
