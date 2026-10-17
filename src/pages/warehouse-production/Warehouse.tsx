
import { useState } from "react";
import {
  Warehouse as WarehouseIcon,
  Wheat,
  Wallet,
  Package,
  AlertTriangle,
  Search,
} from "lucide-react";

import {
  useWarehouse,
  formatNumber,
  formatMoney,
} from "../../context/WarehouseContext";

import {
  getStockStatus,
} from "../../types/warehouse";

import {
  WarehouseMetric,
  PageDateFilter,
  useWarehouseDateFilter,
  EmptyTable,
} from "../../components/warehouse/WarehouseUI";

export default function Warehouse() {
  const {
    getMaterialsAsOf,
    getFeedGroupsAsOf,
    purchases,
    productions,
    transfers,
  } = useWarehouse();

  const filter = useWarehouseDateFilter();
  const [search, setSearch] = useState("");

  const materials = filter.valid
    ? getMaterialsAsOf(filter.range.end)
    : [];

  const feedGroups = filter.valid
    ? getFeedGroupsAsOf(filter.range.end)
    : [];

  const filtered = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
  );

  const rawKg = materials
    .filter((m) => m.unit === "kg")
    .reduce((sum, m) => sum + m.quantity, 0);

  const rawValue = materials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );

  const feedKg = feedGroups.reduce(
    (sum, f) => sum + f.remaining,
    0
  );

  const lowCount = materials.filter(
    (m) => getStockStatus(m) !== "available"
  ).length;

  const purchasedKg = purchases
    .filter(
      (p) =>
        p.status === "received" &&
        filter.inRange(p.date)
    )
    .reduce((sum, p) => sum + p.quantity, 0);

  const producedKg = productions
    .filter(
      (p) =>
        p.status === "completed" &&
        filter.inRange(p.date)
    )
    .reduce((sum, p) => sum + p.quantity, 0);

  const transferredKg = transfers
    .filter(
      (t) =>
        t.status !== "draft" &&
        filter.inRange(t.date)
    )
    .reduce((sum, t) => sum + t.quantity, 0);

  return (
    <div className="w-full space-y-5 pb-8 text-text-main">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-accent">
          <WarehouseIcon size={23} />
        </div>
        <div>
          <h1 className="page-title">Asosiy ombor</h1>
          <p className="page-description mt-1">
            Xomashyo va yem zaxiralari bo'yicha umumiy ma'lumot
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Demo rejimi · Brauzerda saqlanadi
          </p>
        </div>
      </div>

      <PageDateFilter filter={filter} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WarehouseMetric
          label="Xomashyo qoldig'i"
          value={`${formatNumber(rawKg)} kg`}
          note="Tanlangan davr oxiriga"
          icon={Wheat}
          tone="green"
        />
        <WarehouseMetric
          label="Xomashyo qiymati"
          value={formatMoney(rawValue)}
          icon={Wallet}
          tone="accent"
        />
        <WarehouseMetric
          label="Yem qoldig'i"
          value={`${formatNumber(feedKg)} kg`}
          icon={Package}
          tone="blue"
        />
        <WarehouseMetric
          label="Davrdagi xarid"
          value={`${formatNumber(purchasedKg)} kg`}
          icon={WarehouseIcon}
          tone="green"
        />
        <WarehouseMetric
          label="Davrdagi yem ishlab chiqarish"
          value={`${formatNumber(producedKg)} kg`}
          icon={Package}
          tone="blue"
        />
        <WarehouseMetric
          label="Davrdagi yem transferi"
          value={`${formatNumber(transferredKg)} kg`}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-500">
          <AlertTriangle size={19} />
          <p className="text-[12px] font-medium">
            {lowCount} ta xomashyo turi minimal zaxiraga
            yetgan yoki undan kamaygan.
          </p>
        </div>
      )}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">
              Xomashyo zaxiralari
            </h2>
            <p className="section-description mt-1">
              Joriy va tarixiy ombor qoldiqlari
            </p>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-lg border border-border-custom bg-[var(--input-bg)] px-3">
            <Search size={16} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-[165px] bg-transparent text-[12px] text-text-main outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[740px]">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Kategoriya</th>
                <th>Qoldiq</th>
                <th>Minimal zaxira</th>
                <th>Taxminiy qiymat</th>
                <th>Holat</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((m) => {
                const status = getStockStatus(m);

                return (
                  <tr key={m.id}>
                    <td>
                      <p className="font-semibold">{m.name}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {m.code}
                      </p>
                    </td>
                    <td>{m.category}</td>
                    <td>
                      {formatNumber(m.quantity)} {m.unit}
                    </td>
                    <td>
                      {formatNumber(m.minStock)} {m.unit}
                    </td>
                    <td>
                      {formatMoney(m.quantity * m.unitCost)}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        status === "available"
                          ? "status-success"
                          : status === "low"
                            ? "status-warning"
                            : "status-danger"
                      }`}>
                        {status === "available"
                          ? "Yetarli"
                          : status === "low"
                            ? "Kam qolgan"
                            : "Tugagan"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <EmptyTable />}
      </section>
    </div>
  );
}
