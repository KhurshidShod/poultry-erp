import { useMemo, useState, type ReactNode } from 'react';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Landmark,
  Scale,
  Wallet,
} from 'lucide-react';

import {
  PAYMENT_METHOD_LABELS,
  useSalesPayments,
  type PaymentMethod,
} from '../../context/SalesPaymentContext';
import DateRangeFilter, {
  presetRange,
  type DatePreset,
  type DateRange,
} from "../../components/warehouse/DateRangeFilter";
import { usePoultry } from '../../context/PoultryContext';
import { useVeterinary } from '../../context/VeterinaryContext';
import { useVeterinaryInventory } from '../../context/VeterinaryInventoryContext';

import { formatMoney, useWarehouse } from '../../context/WarehouseContext';

type FinanceEntry = {
  id: string;
  date: string;
  createdAt: string;
  kind: 'income' | 'expense';
  source: string;
  description: string;
  method: PaymentMethod;
  amount: number;
};

function getMethodColor(method: PaymentMethod) {
  switch (method) {
    case 'cash':
      return '!text-sky-600 dark:!text-sky-400';

    case 'card':
      return '!text-violet-600 dark:!text-violet-400';

    case 'bank':
      return '!text-orange-600 dark:!text-orange-400';
  }
}

function getSourceColor(source: string) {
  switch (source) {
    case 'Tuxum savdosi':
      return '!text-cyan-600 dark:!text-cyan-400';

    case "Go'sht savdosi":
      return '!text-purple-600 dark:!text-purple-400';

    case 'Veterinariya':
      return '!text-red-600 dark:!text-red-400';

    case 'Dori va vaksina xaridi':
      return '!text-orange-600 dark:!text-orange-400';

    case 'Xomashyo qarzi to‘lovi':
      return '!text-amber-600 dark:!text-amber-400';

    case 'Tirik parranda savdosi':
      return '!text-emerald-600 dark:!text-emerald-400';

    case "Jo'ja xaridi":
      return '!text-fuchsia-600 dark:!text-fuchsia-400';

    case "Jo'ja qarzi to'lovi":
      return '!text-fuchsia-600 dark:!text-fuchsia-400';

    case 'Xomashyo xaridi':
      return '!text-amber-600 dark:!text-amber-400';

    default:
      return 'text-text-main';
  }
}
export default function Finance() {
  const { payments } = useSalesPayments();
  const { batches, events: poultryEvents, purchasePayments: batchPurchasePayments } = usePoultry();
  const { purchases: materialPurchases, purchasePayments } = useWarehouse();
  const { records } = useVeterinary();
  const { purchases: medicinePurchases } = useVeterinaryInventory();

const [datePreset, setDatePreset] =
  useState<DatePreset>("today");

const [dateRange, setDateRange] =
  useState<DateRange>(() => presetRange("today"));

  const [method, setMethod] = useState('all');
  const [kind, setKind] = useState('all');

  const allEntries = useMemo<FinanceEntry[]>(() => {
    const income: FinanceEntry[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.date,
      createdAt: payment.createdAt,
      kind: 'income',
      source: payment.saleKind === 'eggs' ? 'Tuxum savdosi' : "Go'sht savdosi",
      description: payment.note || "Savdo bo'yicha to'lov",
      method: payment.method,
      amount: payment.amount,
    }));

    const veterinaryExpenses: FinanceEntry[] = records
      .filter((record) => record.amount > 0)
      .map((record) => ({
        id: `veterinary-${record.id}`,
        date: record.date,
        createdAt: record.createdAt,
        kind: 'expense',
        source: 'Veterinariya',
        description:
          `${record.batchCode} — ${record.title}` +
          (record.medicine ? ` (${record.medicine})` : ''),
        method: record.paymentMethod,
        amount: record.amount,
      }));

    const medicineExpenses: FinanceEntry[] = medicinePurchases
      .filter((purchase) => purchase.amount > 0)
      .map((purchase) => ({
        id: `medicine-purchase-${purchase.id}`,
        date: purchase.date,
        createdAt: purchase.createdAt,
        kind: 'expense',
        source: 'Dori va vaksina xaridi',
        description:
          `${purchase.medicineName} — ` +
          `${purchase.quantity} ${purchase.unit}` +
          (purchase.supplierName ? ` (${purchase.supplierName})` : ''),
        method: purchase.paymentMethod,
        amount: purchase.amount,
      }));

    // Only money actually paid to the supplier is a cash outflow.
    // Legacy purchases without payment details are intentionally excluded.
    const materialExpenses: FinanceEntry[] = materialPurchases
      .filter(
        (purchase) =>
          purchase.status === 'received' &&
          typeof purchase.paidAmount === 'number' &&
          Number.isFinite(purchase.paidAmount) &&
          purchase.paidAmount > 0 &&
          (purchase.paymentMethod === 'cash' ||
            purchase.paymentMethod === 'card' ||
            purchase.paymentMethod === 'bank')
      )
      .map((purchase) => ({
        id: `material-purchase-${purchase.id}`,
        date: purchase.date.slice(0, 10),
        createdAt: purchase.date,
        kind: 'expense' as const,
        source: 'Xomashyo xaridi',
        description: `${purchase.supplier} — ${purchase.quantity} birlik`,
        method: purchase.paymentMethod as PaymentMethod,
        amount: purchase.paidAmount as number,
      }));

    const debtRepayments: FinanceEntry[] = purchasePayments
      .filter((payment) => payment.amount > 0)
      .map((payment) => {
        const purchase = materialPurchases.find((item) => item.id === payment.purchaseId);
        return {
          id: `material-debt-payment-${payment.id}`,
          date: payment.date.slice(0, 10),
          createdAt: payment.date,
          kind: 'expense' as const,
          source: 'Xomashyo qarzi to‘lovi',
          description: `${purchase?.supplier ?? 'Yetkazib beruvchi'} — qarzni to'lash`,
          method: payment.method,
          amount: payment.amount,
        };
      });

    const chickInitialPayments: FinanceEntry[] = batches
      .filter((batch) =>
        typeof batch.paidAmount === 'number' &&
        Number.isFinite(batch.paidAmount) &&
        batch.paidAmount > 0 &&
        (batch.paymentMethod === 'cash' || batch.paymentMethod === 'card' || batch.paymentMethod === 'bank')
      )
      .map((batch) => ({
        id: `chick-initial-${batch.id}`,
        date: batch.arrivalDate.slice(0,10),
        createdAt: batch.createdAt ?? batch.arrivalDate,
        kind: 'expense' as const,
        source: "Jo'ja xaridi",
        description: `${batch.code} — ${batch.supplierName} (${batch.initialCount} ta)`,
        method: batch.paymentMethod as PaymentMethod,
        amount: batch.paidAmount as number,
      }));

    const chickDebtPayments: FinanceEntry[] = batchPurchasePayments
      .filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0)
      .map((payment) => {
        const batch = batches.find((item) => item.id === payment.batchId);
        return {
          id: `chick-debt-${payment.id}`,
          date: payment.date.slice(0, 10),
          createdAt: payment.createdAt ?? payment.date,
          kind: 'expense' as const,
          source: "Jo'ja qarzi to'lovi",
          description: `${batch?.code ?? 'Partiya'} — ${batch?.supplierName ?? 'Yetkazib beruvchi'}` + (payment.note ? ` (${payment.note})` : ''),
          method: payment.method,
          amount: payment.amount,
        };
      });

    const liveBirdSales: FinanceEntry[] = batches.flatMap(batch =>
      poultryEvents.filter(event => event.batchId === batch.id && event.type === 'live-sale' &&
        typeof event.unitPrice === 'number' && Number.isFinite(event.unitPrice) &&
        (event.paymentMethod === 'cash' || event.paymentMethod === 'card' || event.paymentMethod === 'bank'))
      .map(event => ({
        id: `live-bird-sale-${event.id}`,
        date: event.date.slice(0,10),
        createdAt: event.createdAt ?? event.date,
        kind: 'income' as const,
        source: 'Tirik parranda savdosi',
        description: `${batch.code} — ${event.quantity} ta × ${event.unitPrice} so'm` + (event.note ? ` (${event.note})` : ''),
        method: event.paymentMethod as PaymentMethod,
        amount: event.quantity * (event.unitPrice ?? 0),
      }))
    );

    return [
      ...income,
      ...veterinaryExpenses,
      ...medicineExpenses,
      ...materialExpenses,
      ...debtRepayments,
      ...chickInitialPayments,
      ...chickDebtPayments,
      ...liveBirdSales,
    ].sort((a, b) => {
      const parseTime = (entry: FinanceEntry) => {
        const value = new Date(entry.createdAt).getTime();
        return Number.isFinite(value) ? value : 0;
      };
      return parseTime(b) - parseTime(a);
    });
  }, [payments, records, medicinePurchases, materialPurchases, purchasePayments, batches, poultryEvents, batchPurchasePayments]);

    const entries = allEntries.filter((entry) => {
  // Sana oralig'i noto'g'ri bo'lsa,
  // jadvalga ma'lumot chiqarmaymiz.
  if (
    !dateRange.start ||
    !dateRange.end ||
    dateRange.start > dateRange.end
  ) {
    return false;
  }

  if (
    entry.date < dateRange.start ||
    entry.date > dateRange.end
  ) {
    return false;
  }

  if (
    method !== "all" &&
    entry.method !== method
  ) {
    return false;
  }

  if (
    kind !== "all" &&
    entry.kind !== kind
  ) {
    return false;
  }

  return true;
});

  const income = entries
    .filter((entry) => entry.kind === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const expense = entries
    .filter((entry) => entry.kind === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const net = income - expense;

  function balanceByMethod(targetMethod: PaymentMethod) {
    const filtered = entries.filter((entry) => entry.method === targetMethod);

    const inTotal = filtered
      .filter((entry) => entry.kind === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const outTotal = filtered
      .filter((entry) => entry.kind === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    return inTotal - outTotal;
  }

  const cashNet = balanceByMethod('cash');
  const cardNet = balanceByMethod('card');
  const bankNet = balanceByMethod('bank');

  return (
    <div className="w-full space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Wallet size={26} className="text-accent" />

        <div>
          <h1 className="text-2xl font-semibold">Moliya</h1>
          <p className="mt-1 text-sm text-muted">
            Savdo tushumlari, jo'ja, xomashyo, dori xaridlari va veterinariya pul harakati
          </p>
        </div>
      </header>

{/* DATE RANGE — ASOSIY OMBOR BILAN BIR XIL */}

<DateRangeFilter
  preset={datePreset}
  range={dateRange}
  onChange={(preset, range) => {
    setDatePreset(preset);
    setDateRange(range);
  }}
/>

{/* QO'SHIMCHA FILTRLAR */}

<section className="surface-card p-4 sm:p-5">
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <label className="form-label">
        Harakat turi
      </label>

      <select
        className="form-input"
        value={kind}
        onChange={(event) =>
          setKind(event.target.value)
        }
      >
        <option value="all">Barchasi</option>
        <option value="income">Kirim</option>
        <option value="expense">Chiqim</option>
      </select>
    </div>

    <div>
      <label className="form-label">
        To'lov usuli
      </label>

      <select
        className="form-input"
        value={method}
        onChange={(event) =>
          setMethod(event.target.value)
        }
      >
        <option value="all">
          Barcha usullar
        </option>

        {Object.entries(PAYMENT_METHOD_LABELS).map(
          ([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          )
        )}
      </select>
    </div>
  </div>
</section>

      {/* TOP SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorStat
          icon={<ArrowDownLeft size={20} />}
          label="Kirim"
          value={formatMoney(income)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
          containerClassName="border-emerald-500/25 bg-emerald-500/10"
          iconWrapClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />

        <ColorStat
          icon={<ArrowUpRight size={20} />}
          label="Chiqim"
          value={formatMoney(expense)}
          valueClassName="text-red-600 dark:text-red-400"
          containerClassName="border-red-500/25 bg-red-500/10"
          iconWrapClassName="bg-red-500/15 text-red-600 dark:text-red-400"
        />

        <ColorStat
          icon={<Scale size={20} />}
          label="Sof pul oqimi"
          value={formatMoney(net)}
          valueClassName={
            net >= 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
          }
          containerClassName={
            net >= 0
              ? 'border-amber-500/25 bg-amber-500/10'
              : 'border-red-500/25 bg-red-500/10'
          }
          iconWrapClassName={
            net >= 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-red-500/15 text-red-600 dark:text-red-400'
          }
        />
      </div>

      {/* METHOD SUMMARY */}
      <section className="surface-card space-y-4 p-5">
        <div>
          <h2 className="section-title">
            To'lov usullari bo'yicha sof harakat
          </h2>

          <p className="mt-1 text-xs text-muted">
            Kirimdan chiqim ayirilgan natija. Bu bank yoki kassaning haqiqiy
            qoldig'i emas: boshlang'ich qoldiqlar va boshqa xarajatlar hali
            kiritilmagan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ColorStat
            icon={<Banknote size={19} />}
            label="Naqd pul harakati"
            value={formatMoney(cashNet)}
            valueClassName="text-sky-600 dark:text-sky-400"
            containerClassName="border-sky-500/25 bg-sky-500/10"
            iconWrapClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
          />

          <ColorStat
            icon={<CreditCard size={19} />}
            label="Karta harakati"
            value={formatMoney(cardNet)}
            valueClassName="text-violet-600 dark:text-violet-400"
            containerClassName="border-violet-500/25 bg-violet-500/10"
            iconWrapClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
          />

          <ColorStat
            icon={<Landmark size={19} />}
            label="Bank harakati"
            value={formatMoney(bankNet)}
            valueClassName="text-orange-600 dark:text-orange-400"
            containerClassName="border-orange-500/25 bg-orange-500/10"
            iconWrapClassName="bg-orange-500/15 text-orange-600 dark:text-orange-400"
          />
        </div>
      </section>

      {/* TABLE */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">Moliyaviy harakatlar</h2>

            <p className="mt-1 text-xs text-muted">
              Savdo to'lovlari, jo'ja, xomashyo va dori xaridlari hamda veterinariya chiqimlari
            </p>
          </div>

          <span className="text-sm text-muted">{entries.length} ta yozuv</span>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Harakat</th>
                <th>Manba</th>
                <th>Tavsif</th>
                <th>To'lov usuli</th>
                <th className="text-right">Summa</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  {/* SANA */}
                  <td className="whitespace-nowrap">{entry.date}</td>

                  {/* KIRIM / CHIQIM */}
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        entry.kind === 'income'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {entry.kind === 'income' ? 'Kirim' : 'Chiqim'}
                    </span>
                  </td>

                  {/* MANBA */}
                  <td>
                    <span className={`font-semibold ${getSourceColor(entry.source)}`}>
                      {entry.source}
                    </span>
                  </td>

                  {/* TAVSIF */}
                  <td className="text-text-main">{entry.description}</td>

                  {/* TO'LOV USULI */}
                  <td>
                    <span
                      className={`font-semibold ${getMethodColor(
                        entry.method
                      )}`}
                    >
                      {PAYMENT_METHOD_LABELS[entry.method]}
                    </span>
                  </td>

                  {/* SUMMA */}
                  <td className="whitespace-nowrap text-right">
                    <span
                      className={`inline-block font-bold ${
                        entry.kind === 'income'
                          ? '!text-emerald-600 dark:!text-emerald-400'
                          : '!text-red-600 dark:!text-red-400'
                      }`}
                    >
                      {entry.kind === 'income' ? '+' : '−'}
                      {formatMoney(entry.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            Tanlangan filtrlar bo'yicha moliyaviy harakatlar mavjud emas.
          </p>
        )}
      </section>

      <p className="text-xs text-muted">
        Hisobot savdo to'lovlari, veterinariya xarajatlari, dori-vaksina va
        xomashyo va jo'ja xaridlarining to'langan qismini qamrab oladi. Eski xaridlarda
        to'lov ma'lumoti bo'lmasa, ular pul chiqimiga kiritilmaydi.
      </p>
    </div>
  );
}

function ColorStat({
  icon,
  label,
  value,
  containerClassName,
  iconWrapClassName,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  containerClassName: string;
  iconWrapClassName: string;
  valueClassName: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${containerClassName}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrapClassName}`}
        >
          {icon}
        </div>

        <span className="text-sm font-medium text-muted">{label}</span>
      </div>

      <p className={`mt-4 text-3xl font-bold tracking-tight ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}
