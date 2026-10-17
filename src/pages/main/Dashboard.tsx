
import { useState } from "react";
import {
  ArrowUpRight,
  AlertTriangle,
  Bird,
  CalendarDays,
  Download,
  Egg,
  Factory,
  Info,
  TrendingUp,
  Wallet,
  Wheat,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import StatCard from "../../components/ui/StatCard";
import { useTheme } from "../../context/ThemeContext";

/* ==========================================
   DEMONSTRATION DATA
   Replace with backend API responses later.
========================================== */

const monthlyData = [
  { month: "May", revenue: 36000, expenses: 30000 },
  { month: "Iyun", revenue: 39500, expenses: 32100 },
  { month: "Iyul", revenue: 41200, expenses: 33500 },
  { month: "Avg", revenue: 43500, expenses: 35200 },
  { month: "Sen", revenue: 44900, expenses: 34300 },
  { month: "Okt", revenue: 48250, expenses: 36830 },
];

const facilities = [
  {
    id: 1,
    name: "Tuxum fermasi №1",
    type: "Tuxum ishlab chiqarish",
    chickens: 7200,
    status: "Faol",
    production: "5 820 dona",
  },
  {
    id: 2,
    name: "Tuxum fermasi №2",
    type: "Tuxum ishlab chiqarish",
    chickens: 6800,
    status: "Faol",
    production: "5 310 dona",
  },
  {
    id: 3,
    name: "Go'sht fermasi",
    type: "Broiler yetishtirish",
    chickens: 4450,
    status: "Yetishtirilmoqda",
    production: "32-kun",
  },
];

const eggCategories = [
  { name: "1-toifa", count: 54800 },
  { name: "2-toifa", count: 42364 },
  { name: "Mayda", count: 22428 },
  { name: "Ikki sariqli", count: 5008 },
];

const alerts = [
  {
    id: 1,
    title: "Makkajo'xori zaxirasi kamaymoqda",
    description:
      "Ombordagi mavjud miqdorni tekshirish kerak.",
    type: "warning" as const,
  },
  {
    id: 2,
    title: "Broiler partiyasining sotuv muddati yaqin",
    description:
      "B-026 partiyasi bo'yicha rejalashtirilgan muddat.",
    type: "info" as const,
  },
  {
    id: 3,
    title: "Tuxum yig'ish ma'lumotlari",
    description:
      "Bugungi tuxum yig'ish hisobotini tekshiring.",
    type: "info" as const,
  },
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatMoney = (value: number) =>
  "$" + formatNumber(value);

/* ==========================================
   DASHBOARD
========================================== */

export default function Dashboard() {
  const [period, setPeriod] = useState<"3" | "6">("6");

  const { theme } = useTheme();

  /* Chart theme colors */

  const isDark = theme === "dark";

  const colors = {
    primary: isDark ? "#FFFFFF" : "#191919",
    accent: isDark ? "#1DB954" : "#1900D5",
    muted: isDark ? "#A1A1A1" : "#7C7C7C",
    grid: isDark ? "#3C3C3C" : "#E8E8E8",
    card: isDark ? "#232323" : "#FFFFFF",
  };

  const chartData =
    period === "3"
      ? monthlyData.slice(-3)
      : monthlyData;

  const eggTotal = eggCategories.reduce(
    (sum, category) => sum + category.count,
    0
  );

  const categoryColors = [
    colors.primary,
    isDark ? "#A7A7A7" : "#777777",
    colors.accent,
    isDark ? "#5F5F5F" : "#C4C4C4",
  ];

  const revenue = 48250;
  const expenses = 36830;
  const profit = revenue - expenses;
  const margin = (profit / revenue) * 100;

  return (
    <div className="w-full min-w-0 space-y-6 pb-6 text-text-main">

      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title">
            Boshqaruv paneli
          </h1>

          <p className="page-description mt-1">
            Ferma faoliyatining umumiy ko'rsatkichlari
          </p>

          <p className="mt-1 text-[11px] text-muted">
            Namoyish ma'lumotlari — haqiqiy hisob-kitob emas
          </p>
        </div>

        <div className="print-hidden flex flex-wrap items-center gap-2">
          <div className="secondary-button">
            <CalendarDays size={16} strokeWidth={1.8} />
            <span>Oktabr 2026</span>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
          >
            <Download size={16} strokeWidth={1.8} />
            <span>Chop etish</span>
          </button>
        </div>
      </div>

      {/* ====================================
          KPI CARDS
      ==================================== */}

      <div
        className="
          grid min-w-0 grid-cols-1 gap-4
          sm:grid-cols-2 xl:grid-cols-3
          2xl:grid-cols-6
        "
      >
        <StatCard
          title="Jami daromad"
          value="$48,250"
          icon={Wallet}
          change="+12.4%"
          trend="up"
          description="o'tgan oyga nisbatan"
        />

        <StatCard
          title="Sof foyda"
          value="$11,420"
          icon={TrendingUp}
          change="+8.2%"
          trend="up"
          description="o'tgan oyga nisbatan"
        />

        <StatCard
          title="Jami parrandalar"
          value="18,450"
          icon={Bird}
          description="3 ta faol ferma"
        />

        <StatCard
          title="Yig'ilgan tuxumlar"
          value="124,600"
          icon={Egg}
          change="+6.5%"
          trend="up"
          description="shu oy"
        />

        <StatCard
          title="Yem zaxirasi"
          value="27,800 kg"
          icon={Wheat}
          description="barcha omborlarda"
        />

        <StatCard
          title="Yem sarfi"
          value="61,200 kg"
          icon={Factory}
          description="shu oy davomida"
        />
      </div>

      {/* ====================================
          REVENUE CHART + EGG DISTRIBUTION
      ==================================== */}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">

        {/* REVENUE CHART */}

        <section className="surface-card min-w-0 p-5 sm:p-6 xl:col-span-2">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">
                Daromad va xarajatlar
              </h2>

              <p className="section-description mt-1">
                Moliyaviy ko'rsatkichlar dinamikasi
              </p>
            </div>

            <select
              aria-label="Grafik davri"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as "3" | "6")
              }
              className="form-input !w-auto"
            >
              <option value="6">So'nggi 6 oy</option>
              <option value="3">So'nggi 3 oy</option>
            </select>
          </div>

          <div className="h-[300px] w-full min-w-0 sm:h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 12,
                  left: -12,
                  bottom: 4,
                }}
              >
                <defs>
                  <linearGradient
                    id="revenueFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={colors.primary}
                      stopOpacity={0.13}
                    />

                    <stop
                      offset="100%"
                      stopColor={colors.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="expenseFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={colors.accent}
                      stopOpacity={0.18}
                    />

                    <stop
                      offset="100%"
                      stopColor={colors.accent}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke={colors.grid}
                  strokeDasharray="3 5"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  dy={12}
                  tick={{
                    fill: colors.muted,
                    fontSize: 11,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: colors.muted,
                    fontSize: 11,
                  }}
                  tickFormatter={(value: number) =>
                    `${value / 1000}k`
                  }
                />

                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value ?? 0)),
                    name === "revenue"
                      ? "Daromad"
                      : "Xarajatlar",
                  ]}
                  contentStyle={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.grid}`,
                    borderRadius: "10px",
                    color: colors.primary,
                    fontFamily: "Poppins",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: colors.primary,
                  }}
                  itemStyle={{
                    color: colors.primary,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="revenue"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="expenses"
                  stroke={colors.accent}
                  strokeWidth={2.5}
                  fill="url(#expenseFill)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
            <div className="chart-legend">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: colors.primary,
                }}
              />

              Daromad
            </div>

            <div className="chart-legend">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: colors.accent,
                }}
              />

              Xarajatlar
            </div>
          </div>
        </section>

        {/* EGG CATEGORIES */}

        <section className="surface-card min-w-0 p-5 sm:p-6">
          <div>
            <h2 className="section-title">
              Tuxumlar taqsimoti
            </h2>

            <p className="section-description mt-1">
              Toifalar bo'yicha ishlab chiqarish
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {eggCategories.map((category, index) => {
              const percentage =
                eggTotal > 0
                  ? (category.count / eggTotal) * 100
                  : 0;

              return (
                <div key={category.name}>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {category.name}
                    </span>

                    <span className="text-[13px] font-semibold text-text-main">
                      {formatNumber(category.count)}
                    </span>
                  </div>

                  <div className="h-[8px] overflow-hidden rounded-full bg-[var(--chart-track)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          categoryColors[index],
                      }}
                    />
                  </div>

                  <p className="mt-1.5 text-right text-[11px] text-muted">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-border-custom pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted">
                Jami tuxumlar
              </span>

              <span className="text-[20px] font-semibold text-text-main">
                {formatNumber(eggTotal)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================
          FACILITY TABLE
      ==================================== */}

      <section className="surface-card min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border-custom p-5 sm:px-6">
          <div>
            <h2 className="section-title">
              Fermalar holati
            </h2>

            <p className="section-description mt-1">
              Parrandalar va ishlab chiqarish holati
            </p>
          </div>

          <span className="status-badge status-neutral">
            {facilities.length} ta ferma
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="erp-table min-w-[650px]">
            <thead>
              <tr>
                <th>Ferma</th>
                <th>Parrandalar</th>
                <th>Ishlab chiqarish</th>
                <th>Holati</th>
              </tr>
            </thead>

            <tbody>
              {facilities.map((facility) => (
                <tr key={facility.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex h-9 w-9 shrink-0
                          items-center justify-center
                          rounded-lg
                          bg-[var(--hover-bg)]
                          text-text-main
                        "
                      >
                        <Bird size={18} />
                      </div>

                      <div>
                        <p className="font-medium text-text-main">
                          {facility.name}
                        </p>

                        <p className="mt-0.5 text-[11px] text-muted">
                          {facility.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    {formatNumber(facility.chickens)}
                  </td>

                  <td>
                    {facility.production}
                  </td>

                  <td>
                    <span
                      className={`
                        status-badge
                        ${
                          facility.status === "Faol"
                            ? "status-success"
                            : "status-warning"
                        }
                      `}
                    >
                      {facility.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====================================
          ALERTS + FINANCIAL SUMMARY
      ==================================== */}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">

        {/* ALERTS */}

        <section className="surface-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="section-title">
              Bildirishnomalar
            </h2>

            <span className="status-badge status-neutral">
              {alerts.length} ta
            </span>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="
                  flex items-start gap-3
                  rounded-[10px]
                  border border-border-custom
                  bg-[var(--table-head)]
                  p-4
                "
              >
                <div
                  className={`
                    flex h-9 w-9 shrink-0
                    items-center justify-center
                    rounded-lg
                    ${
                      alert.type === "warning"
                        ? "status-warning"
                        : "text-accent bg-[var(--accent-soft)]"
                    }
                  `}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Info size={18} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-6 text-text-main">
                    {alert.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    {alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINANCIAL SUMMARY */}

        <section className="surface-card p-5 sm:p-6">
          <h2 className="section-title">
            Moliyaviy xulosa
          </h2>

          <p className="section-description mt-1">
            Oktabr 2026
          </p>

          <div className="mt-7 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-muted">
                Jami daromad
              </span>

              <span className="text-[14px] font-semibold text-text-main">
                {formatMoney(revenue)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-muted">
                Jami xarajatlar
              </span>

              <span className="text-[14px] font-semibold text-text-main">
                {formatMoney(expenses)}
              </span>
            </div>

            <div className="border-t border-border-custom pt-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-text-main">
                  Sof foyda
                </span>

                <span className="text-[25px] font-semibold tracking-tight text-text-main">
                  {formatMoney(profit)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[12px] text-positive">
                <ArrowUpRight size={16} />
                O'tgan oyga nisbatan +8.2%
              </div>
            </div>

            <div
              className="
                rounded-[10px]
                border border-border-custom
                bg-[var(--table-head)]
                p-4
              "
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] text-muted">
                  Foyda marjasi
                </span>

                <span className="text-[13px] font-semibold text-text-main">
                  {margin.toFixed(1)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[var(--chart-track)]">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(
                      Math.max(margin, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}

      <div className="pt-2 text-center">
        <p className="text-[11px] text-muted">
          Poultry ERP · Boshqaruv tizimi
        </p>
      </div>
    </div>
  );
}
