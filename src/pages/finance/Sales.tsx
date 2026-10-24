import { useState, type FormEvent, type ReactNode } from 'react';

import {
  AlertTriangle,
  Beef,
  CheckCircle2,
  Egg,
  Package,
  Plus,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react';
import { useMasterData } from '../../context/MasterDataContext';
import {
  PAYMENT_METHOD_LABELS,
  useSalesPayments,
  type PaymentMethod,
  type SaleKind,
} from '../../context/SalesPaymentContext';

import {
  EGG_CATEGORIES,
  useEggInventory,
  type EggCategory,
  type EggSaleLine,
} from '../../context/EggInventoryContext';

import { useMeatSales } from '../../context/MeatSalesContext';

import MoneyInput from '../../components/ui/MoneyInput';
import EggRevenueAttributionPanel from '../../components/poultry/EggRevenueAttributionPanel';
import { formatMoney, formatNumber } from '../../context/WarehouseContext';

type Tab = 'eggs' | 'meat';

interface EggFormRow {
  quantity: string;
  price: string;
}

type EggForm = Record<EggCategory, EggFormRow>;

function emptyEggForm(): EggForm {
  return {
    category1: { quantity: '', price: '' },
    category2: { quantity: '', price: '' },
    category3: { quantity: '', price: '' },
    category4: { quantity: '', price: '' },
  };
}

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Savdoni saqlashda xatolik yuz berdi.';
}

export default function Sales() {
  const { customers } = useMasterData();
  const {
    getSalePaymentSummary,
    addPayment,
    addPayments,
    totalPaid,
    totalDebt,
  } = useSalesPayments();

  const [paymentTarget, setPaymentTarget] = useState<{
    kind: SaleKind;
    saleId: string;
    customerName: string;
  } | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [initialCash, setInitialCash] = useState('');
  const [initialCard, setInitialCard] = useState('');
  const [initialBank, setInitialBank] = useState('');

  function openPaymentModal(
    kind: SaleKind,
    saleId: string,
    customerName: string
  ) {
    const summary = getSalePaymentSummary(kind, saleId);

    setPaymentTarget({
      kind,
      saleId,
      customerName,
    });
    setPaymentAmount(summary.debt > 0 ? String(summary.debt) : '');
    setPaymentMethod('cash');
    setPaymentNote('');
    setPaymentError('');
  }

  function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentTarget) return;

    try {
      addPayment({
        saleKind: paymentTarget.kind,
        saleId: paymentTarget.saleId,
        amount: Number(paymentAmount),
        method: paymentMethod,
        note: paymentNote,
      });

      setPaymentTarget(null);
      setPaymentError('');
      setSuccess("To'lov muvaffaqiyatli saqlandi.");
    } catch (err) {
      setPaymentError(errorMessage(err));
    }
  }
  const {
    sales: eggSales,
    inventory: eggInventory,
    addSale: addEggSale,
  } = useEggInventory();

  const {
    sales: meatSales,
    inventory: meatInventory,
    addSale: addMeatSale,
  } = useMeatSales();

  // ======================================
  // SHARED STATE
  // ======================================

  const [tab, setTab] = useState<Tab>('eggs');
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [historyCustomer, setHistoryCustomer] = useState('all');

  // ======================================
  // EGG FORM
  // ======================================

  const [eggForm, setEggForm] = useState<EggForm>(emptyEggForm);

  // ======================================
  // MEAT FORM
  // ======================================

  const [meatBatchId, setMeatBatchId] = useState('');
  const [meatKg, setMeatKg] = useState('');
  const [meatPrice, setMeatPrice] = useState('');

  const customer =
    customerId === 'walk-in'
      ? {
          id: 'walk-in',
          name: 'Oddiy xaridor',
        }
      : customers.find((item) => item.id === customerId);

  const selectedMeatStock = meatInventory.stocks.find(
    (item) => item.batchId === meatBatchId
  );

  // ======================================
  // EGG TOTALS
  // ======================================

  const eggLines: EggSaleLine[] = EGG_CATEGORIES.flatMap((category) => {
    const row = eggForm[category.key];

    if (!row.quantity.trim()) {
      return [];
    }

    const quantity = Number(row.quantity);
    const unitPrice = Number(row.price);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      !row.price.trim() ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      return [];
    }

    return [
      {
        category: category.key,
        quantity,
        unitPrice,
      },
    ];
  });

  const eggQuantity = eggLines.reduce((sum, line) => sum + line.quantity, 0);

  const eggTotal = eggLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );

  const meatQuantity = Number(meatKg) || 0;
  const meatUnitPrice = Number(meatPrice) || 0;

  const meatTotal = meatQuantity * meatUnitPrice;
  const saleTotal = tab === 'eggs' ? eggTotal : meatTotal;

  const cashAmount = initialCash.trim() ? Number(initialCash) : 0;

  const cardAmount = initialCard.trim() ? Number(initialCard) : 0;

  const bankAmount = initialBank.trim() ? Number(initialBank) : 0;

  const initialPaid = cashAmount + cardAmount + bankAmount;

  const initialDebt = Math.max(0, saleTotal - initialPaid);

  const paymentAmountsValid =
    [initialCash, initialCard, initialBank].every(
      (value) =>
        value.trim() === '' ||
        (Number.isFinite(Number(value)) && Number(value) >= 0)
    ) && initialPaid <= saleTotal + 0.000001;
  // ======================================
  // HISTORY FILTER
  // ======================================

  function inHistoryRange(sale: { date: string; customerId: string }) {
    return (
      (!historyStart || sale.date >= historyStart) &&
      (!historyEnd || sale.date <= historyEnd) &&
      (historyCustomer === 'all' || sale.customerId === historyCustomer)
    );
  }

  const filteredEggSales = [...eggSales]
    .filter(inHistoryRange)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filteredMeatSales = [...meatSales]
    .filter(inHistoryRange)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const visibleRevenue =
    tab === 'eggs'
      ? filteredEggSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      : filteredMeatSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  const totalRevenue = eggInventory.revenue + meatInventory.revenue;

  // ======================================
  // ACTIONS
  // ======================================

  function switchTab(next: Tab) {
    setTab(next);
    setModalOpen(false);
    setError('');
    setSuccess('');
    setHistoryStart('');
    setHistoryEnd('');
    setHistoryCustomer('all');
  }

  function openSaleModal() {
    setCustomerId('');
    setNote('');
    setError('');
    setInitialCash('');
    setInitialCard('');
    setInitialBank('');
    setEggForm(emptyEggForm());
    setMeatBatchId('');
    setMeatKg('');
    setMeatPrice('');
    setModalOpen(true);
  }

  function updateEggRow(
    category: EggCategory,
    field: keyof EggFormRow,
    value: string
  ) {
    setEggForm((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
    setError('');
  }
  function saveInitialPayments(kind: SaleKind, saleId: string, total: number) {
    if (!paymentAmountsValid) {
      throw new Error("To'lov summalarini tekshiring.");
    }

    const entries: {
      method: PaymentMethod;
      amount: number;
    }[] = [
      { method: 'cash', amount: cashAmount },
      { method: 'card', amount: cardAmount },
      { method: 'bank', amount: bankAmount },
    ];

    const inputs = entries
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({
        saleKind: kind,
        saleId,
        method: entry.method,
        amount: entry.amount,
        note: "Savdo vaqtida olingan to'lov",
      }));

    addPayments(inputs, total);
  }
  function saveEggSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!customer) {
      setError('Xaridorni tanlang.');
      return;
    }

    const invalid = EGG_CATEGORIES.some((category) => {
      const row = eggForm[category.key];

      if (!row.quantity.trim()) {
        return Boolean(row.price.trim());
      }

      const quantity = Number(row.quantity);
      const price = Number(row.price);

      return (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        !row.price.trim() ||
        !Number.isFinite(price) ||
        price < 0
      );
    });

    if (invalid || eggLines.length === 0) {
      setError(
        "Tuxum sonini va har bir tanlangan kategoriyaning narxini to'g'ri kiriting."
      );
      return;
    }

    try {
      if (!paymentAmountsValid) {
        setError("To'lov summalarini tekshiring.");
        return;
      }

      const sale = addEggSale({
        date: today(),
        customerId: customer.id,
        customerName: customer.name,
        lines: eggLines,
        note,
      });

      saveInitialPayments('eggs', sale.id, sale.totalAmount);

      setModalOpen(false);

      setSuccess(
        `${formatNumber(eggQuantity)} ta tuxum ` +
          `${formatMoney(eggTotal)} ga sotildi.`
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function saveMeatSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!customer) {
      setError('Xaridorni tanlang.');
      return;
    }

    if (!selectedMeatStock) {
      setError("BR go'sht partiyasini tanlang.");
      return;
    }

    if (
      !meatKg.trim() ||
      !Number.isFinite(Number(meatKg)) ||
      Number(meatKg) <= 0
    ) {
      setError("Go'sht kilogrammini to'g'ri kiriting.");
      return;
    }

    if (
      !meatPrice.trim() ||
      !Number.isFinite(Number(meatPrice)) ||
      Number(meatPrice) < 0
    ) {
      setError("Bir kilogramm narxini to'g'ri kiriting.");
      return;
    }

    try {
      if (!paymentAmountsValid) {
        setError("To'lov summalarini tekshiring.");
        return;
      }

      const sale = addMeatSale({
        date: today(),
        batchId: selectedMeatStock.batchId,
        customerId: customer.id,
        customerName: customer.name,
        quantityKg: Number(meatKg),
        unitPrice: Number(meatPrice),
        note,
      });

      saveInitialPayments('meat', sale.id, sale.totalAmount);

      setModalOpen(false);

      setSuccess(
        `${formatNumber(Number(meatKg))} kg go'sht ` +
          `${formatMoney(meatTotal)} ga sotildi.`
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="w-full space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart size={26} className="text-accent" />

          <div>
            <h1 className="text-2xl font-semibold">Savdo</h1>

            <p className="mt-1 text-sm text-muted">
              Tuxum va go'sht savdosi, zaxira va xaridorlar
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openSaleModal}
        >
          <Plus size={16} />
          {tab === 'eggs' ? 'Tuxum sotish' : "Go'sht sotish"}
        </button>
      </header>

      {/* ALL SALES REVENUE */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Tuxum savdosi tushumi"
          value={formatMoney(eggInventory.revenue)}
          icon={<Egg size={18} />}
        />

        <Stat
          label="Go'sht savdosi tushumi"
          value={formatMoney(meatInventory.revenue)}
          icon={<Beef size={18} />}
        />

        <Stat
          label="Jami savdo summasi"
          value={formatMoney(totalRevenue)}
          icon={<Wallet size={18} />}
        />
        <Stat
          label="Haqiqiy olingan to'lovlar"
          value={formatMoney(totalPaid)}
          icon={<Wallet size={18} />}
        />

        <Stat
          label="Jami qarzdorlik"
          value={formatMoney(totalDebt)}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* TABS */}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`sales-tab ${tab === 'eggs' ? 'active' : ''}`}
          onClick={() => switchTab('eggs')}
        >
          <Egg size={17} />
          Tuxum savdosi
        </button>

        <button
          type="button"
          className={`sales-tab ${tab === 'meat' ? 'active' : ''}`}
          onClick={() => switchTab('meat')}
        >
          <Beef size={17} />
          Go'sht savdosi
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-500"
        >
          <CheckCircle2 size={17} />
          {success}
        </p>
      )}

      {/* EGG INVENTORY */}

      {tab === 'eggs' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Ishlab chiqarilgan tuxum"
              value={`${formatNumber(eggInventory.producedTotal)} ta`}
              icon={<Egg size={18} />}
            />

            <Stat
              label="Sotilgan tuxum"
              value={`${formatNumber(eggInventory.soldTotal)} ta`}
              icon={<ShoppingCart size={18} />}
            />

            <Stat
              label="Tuxum qoldig'i"
              value={`${formatNumber(eggInventory.remainingTotal)} ta`}
              icon={<Package size={18} />}
            />
          </div>

          <section className="surface-card space-y-4 p-5">
            <h2 className="section-title">Tuxum zaxirasi</h2>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[650px]">
                <thead>
                  <tr>
                    <th>Kategoriya</th>
                    <th>Ishlab chiqarilgan</th>
                    <th>Sotilgan</th>
                    <th>Qoldiq</th>
                  </tr>
                </thead>

                <tbody>
                  {EGG_CATEGORIES.map((category) => (
                    <tr key={category.key}>
                      <td className="font-semibold">{category.label}</td>

                      <td>
                        {formatNumber(eggInventory.produced[category.key])} ta
                      </td>

                      <td>
                        {formatNumber(eggInventory.sold[category.key])} ta
                      </td>

                      <td className="font-semibold">
                        {formatNumber(eggInventory.remaining[category.key])} ta
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted">
              Singan tuxumlar sotiladigan zaxiraga kiritilmaydi. Jami singan:{' '}
              {formatNumber(eggInventory.brokenCount)} ta.
            </p>
          </section>
        </>
      )}

      {tab === 'eggs' && <EggRevenueAttributionPanel />}

      {/* MEAT INVENTORY */}

      {tab === 'meat' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="So'yilgan go'sht"
              value={`${formatNumber(meatInventory.slaughteredKg)} kg`}
              icon={<Beef size={18} />}
            />

            <Stat
              label="Sotilgan go'sht"
              value={`${formatNumber(meatInventory.soldKg)} kg`}
              icon={<ShoppingCart size={18} />}
            />

            <Stat
              label="Go'sht qoldig'i"
              value={`${formatNumber(meatInventory.remainingKg)} kg`}
              icon={<Package size={18} />}
            />
          </div>

          <section className="surface-card space-y-4 p-5">
            <div>
              <h2 className="section-title">Go'sht zaxirasi — BR partiyalar</h2>
              <p className="mt-1 text-xs text-muted">
                Faqat so'yish natijasida olingan kilogrammlar hisoblanadi.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[620px]">
                <thead>
                  <tr>
                    <th>Partiya</th>
                    <th>Olingan</th>
                    <th>Sotilgan</th>
                    <th>Qoldiq</th>
                  </tr>
                </thead>

                <tbody>
                  {meatInventory.stocks.map((stock) => (
                    <tr key={stock.batchId}>
                      <td className="font-semibold">{stock.batchCode}</td>

                      <td>{formatNumber(stock.slaughteredKg)} kg</td>

                      <td>{formatNumber(stock.soldKg)} kg</td>

                      <td
                        className={
                          stock.remainingKg < 0
                            ? 'font-semibold text-red-500'
                            : 'font-semibold'
                        }
                      >
                        {formatNumber(stock.remainingKg)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meatInventory.stocks.length === 0 && (
              <p className="text-sm text-muted">
                Hali BR go'sht partiyalari mavjud emas.
              </p>
            )}
          </section>
        </>
      )}

      {/* SALES HISTORY */}

      <section className="surface-card overflow-hidden">
        <div className="space-y-4 border-b border-border-custom p-5">
          <h2 className="section-title">
            {tab === 'eggs' ? 'Tuxum savdosi tarixi' : "Go'sht savdosi tarixi"}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label">Boshlanish sanasi</label>
              <input
                type="date"
                className="form-input"
                value={historyStart}
                onChange={(event) => setHistoryStart(event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Tugash sanasi</label>
              <input
                type="date"
                className="form-input"
                value={historyEnd}
                onChange={(event) => setHistoryEnd(event.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Xaridor</label>

              <select
                className="form-input"
                value={historyCustomer}
                onChange={(event) => setHistoryCustomer(event.target.value)}
              >
                <option value="all">Barcha xaridorlar</option>

                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {tab === 'eggs'
                ? filteredEggSales.length
                : filteredMeatSales.length}{' '}
              ta yozuv
            </span>

            <strong>Davr tushumi: {formatMoney(visibleRevenue)}</strong>
          </div>
        </div>

        {tab === 'eggs' ? (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[820px]">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Xaridor</th>
                  <th>Kategoriyalar</th>
                  <th>Jami</th>
                  <th>Summa</th>
                  <th>To'langan</th>
                  <th>Qarz</th>
                  <th>Holat / To'lov</th>
                  <th>Izoh</th>
                </tr>
              </thead>

              <tbody>
                {filteredEggSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.date}</td>

                    <td className="font-semibold">{sale.customerName}</td>

                    <td>
                      {sale.lines.map((line) => (
                        <p key={line.category} className="text-xs">
                          {
                            EGG_CATEGORIES.find(
                              (category) => category.key === line.category
                            )?.label
                          }
                          : {formatNumber(line.quantity)} ta ×{' '}
                          {formatMoney(line.unitPrice)}
                        </p>
                      ))}
                    </td>

                    <td>
                      {formatNumber(
                        sale.lines.reduce((sum, line) => sum + line.quantity, 0)
                      )}{' '}
                      ta
                    </td>

                    <td className="font-semibold">
                      {formatMoney(sale.totalAmount)}
                    </td>

                    <td>{sale.note || '—'}</td>
                    <td>
                      {formatMoney(getSalePaymentSummary('eggs', sale.id).paid)}
                    </td>

                    <td className="font-semibold">
                      {formatMoney(getSalePaymentSummary('eggs', sale.id).debt)}
                    </td>

                    <td>
                      <PaymentAction
                        summary={getSalePaymentSummary('eggs', sale.id)}
                        onPay={() =>
                          openPaymentModal('eggs', sale.id, sale.customerName)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEggSales.length === 0 && <EmptyHistory />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[950px] w-full">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Partiya</th>
                  <th>Xaridor</th>
                  <th>Go'sht (kg)</th>
                  <th>Narx / kg</th>
                  <th>Summa</th>
                  <th>Izoh</th>
                  <th>To'langan</th>
                  <th>Qarz</th>
                  <th>Holat / To'lov</th>
                </tr>
              </thead>

              <tbody>
                {filteredMeatSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.date}</td>
                    <td className="font-semibold">{sale.batchCode}</td>
                    <td>{sale.customerName}</td>
                    <td>{formatNumber(sale.quantityKg)} kg</td>
                    <td>{formatMoney(sale.unitPrice)}</td>
                    <td className="font-semibold">
                      {formatMoney(sale.totalAmount)}
                    </td>
                    <td>{sale.note || '—'}</td>
                    <td>
                      {formatMoney(getSalePaymentSummary('meat', sale.id).paid)}
                    </td>

                    <td className="font-semibold">
                      {formatMoney(getSalePaymentSummary('meat', sale.id).debt)}
                    </td>

                    <td>
                      <PaymentAction
                        summary={getSalePaymentSummary('meat', sale.id)}
                        onPay={() =>
                          openPaymentModal('meat', sale.id, sale.customerName)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMeatSales.length === 0 && <EmptyHistory />}
          </div>
        )}
      </section>

      {/* MODAL */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-modal-title"
            className="surface-card max-h-[92vh] w-full max-w-[720px] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-custom px-5 py-5 sm:px-6">
              <div>
                <h2 id="sales-modal-title" className="text-lg font-semibold">
                  {tab === 'eggs'
                    ? 'Yangi tuxum savdosi'
                    : "Yangi go'sht savdosi"}
                </h2>

                <p className="mt-1 text-xs text-muted">
                  Zaxiradagi mavjud mahsulotni sotish
                </p>
              </div>

              <button
                type="button"
                className="secondary-button !min-h-9 !min-w-9 !p-2"
                onClick={() => setModalOpen(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={tab === 'eggs' ? saveEggSale : saveMeatSale}
              className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
            >
              {/* SHARED FIELDS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Sana</label>

                  <input
                    readOnly
                    type="date"
                    className="form-input"
                    value={today()}
                  />
                </div>

                <div>
                  <label className="form-label">Xaridor *</label>

                  <select
                    required
                    className="form-input"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                  >
                    <option value="">Xaridorni tanlang</option>

                    <option value="walk-in">Oddiy xaridor</option>

                    {customers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EGG FORM */}

              {tab === 'eggs' && (
                <>
                  <div className="overflow-x-auto">
                    <table className="erp-table min-w-[540px]">
                      <thead>
                        <tr>
                          <th>Kategoriya</th>
                          <th>Qoldiq</th>
                          <th>Sotish (ta)</th>
                          <th>Narx (so'm/ta)</th>
                        </tr>
                      </thead>

                      <tbody>
                        {EGG_CATEGORIES.map((category) => (
                          <tr key={category.key}>
                            <td className="font-semibold">{category.label}</td>

                            <td>
                              {formatNumber(
                                eggInventory.remaining[category.key]
                              )}{' '}
                              ta
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="form-input min-w-[100px]"
                                placeholder="0"
                                value={eggForm[category.key].quantity}
                                onChange={(event) =>
                                  updateEggRow(
                                    category.key,
                                    'quantity',
                                    event.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="form-input min-w-[120px]"
                                placeholder="Narx"
                                value={eggForm[category.key].price}
                                onChange={(event) =>
                                  updateEggRow(
                                    category.key,
                                    'price',
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="Jami tuxum"
                      value={`${formatNumber(eggQuantity)} ta`}
                    />

                    <MiniStat
                      label="Savdo summasi"
                      value={formatMoney(eggTotal)}
                    />
                  </div>
                </>
              )}

              {/* MEAT FORM */}

              {tab === 'meat' && (
                <>
                  <div>
                    <label className="form-label">Go'sht partiyasi *</label>

                    <select
                      required
                      className="form-input"
                      value={meatBatchId}
                      onChange={(event) => setMeatBatchId(event.target.value)}
                    >
                      <option value="">BR partiyani tanlang</option>

                      {meatInventory.stocks
                        .filter((stock) => stock.remainingKg > 0.000001)
                        .map((stock) => (
                          <option key={stock.batchId} value={stock.batchId}>
                            {stock.batchCode} —{' '}
                            {formatNumber(stock.remainingKg)} kg
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedMeatStock && (
                    <div className="rounded-xl border border-border-custom p-4">
                      <p className="text-xs text-muted">
                        Ushbu partiyadagi sotiladigan go'sht
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatNumber(selectedMeatStock.remainingKg)} kg
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="form-label">
                        Sotiladigan go'sht (kg) *
                      </label>

                      <input
                        required
                        type="number"
                        min="0.001"
                        step="any"
                        className="form-input"
                        placeholder="Masalan: 150"
                        value={meatKg}
                        onChange={(event) => setMeatKg(event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label">Narx (so'm/kg) *</label>

                      <input
                        required
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        placeholder="Masalan: 35000"
                        value={meatPrice}
                        onChange={(event) => setMeatPrice(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="Sotiladigan go'sht"
                      value={`${formatNumber(meatQuantity)} kg`}
                    />

                    <MiniStat
                      label="Savdo summasi"
                      value={formatMoney(meatTotal)}
                    />
                  </div>

                  {selectedMeatStock &&
                    meatQuantity > selectedMeatStock.remainingKg && (
                      <p className="text-sm text-red-500">
                        Go'sht miqdori partiya zaxirasidan oshib ketdi.
                      </p>
                    )}
                </>
              )}
              {/* INITIAL PAYMENT — YANGI BLOK */}

              <div className="space-y-4 rounded-xl border border-border-custom p-4">
                <h3 className="text-sm font-semibold">Dastlabki to'lov</h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="form-label">Naqd (so'm)</label>
                    <MoneyInput
                      min={0}
                      className="form-input"
                      placeholder="0"
                      value={initialCash}
                      onChange={setInitialCash}
                    />
                  </div>

                  <div>
                    <label className="form-label">Karta (so'm)</label>
                    <MoneyInput
                      className="form-input"
                      placeholder="0"
                      value={initialCard}
                      onChange={setInitialCard}
                    />
                  </div>

                  <div>
                    <label className="form-label">Bank o'tkazmasi (so'm)</label>
                    <MoneyInput
                      className="form-input"
                      placeholder="0"
                      value={initialBank}
                      onChange={setInitialBank}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Savdo summasi"
                    value={formatMoney(saleTotal)}
                  />

                  <MiniStat
                    label="To'langan"
                    value={formatMoney(initialPaid)}
                  />

                  <MiniStat
                    label="Qolgan qarz"
                    value={formatMoney(initialDebt)}
                  />
                </div>

                {!paymentAmountsValid && (
                  <p className="text-sm text-red-500">
                    To'lov summasi savdo summasidan oshmasligi kerak.
                  </p>
                )}
              </div>

              {/* SHARED NOTE */}

              <div>
                <label className="form-label">Izoh</label>

                <textarea
                  className="form-input min-h-[80px]"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    !paymentAmountsValid ||
                    (tab === 'eggs'
                      ? eggQuantity <= 0
                      : !selectedMeatStock || meatQuantity <= 0)
                  }
                >
                  <ShoppingCart size={16} />
                  Savdoni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PAYMENT MODAL */}

      {paymentTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPaymentTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="surface-card max-h-[90vh] w-full max-w-[500px] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-custom px-5 py-5 sm:px-6">
              <div>
                <h2 id="payment-modal-title" className="text-lg font-semibold">
                  Savdo uchun to'lov olish
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {paymentTarget.customerName}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button !p-2"
                onClick={() => setPaymentTarget(null)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={savePayment}
              className="space-y-4 px-5 py-5 sm:px-6"
            >
              {(() => {
                const summary = getSalePaymentSummary(
                  paymentTarget.kind,
                  paymentTarget.saleId
                );

                return (
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Savdo summasi"
                      value={formatMoney(summary.total)}
                    />
                    <MiniStat
                      label="Qolgan qarz"
                      value={formatMoney(summary.debt)}
                    />
                  </div>
                );
              })()}

              <div>
                <label className="form-label">To'lov summasi *</label>

                <input
                  required
                  type="number"
                  min="0.01"
                  step="any"
                  className="form-input"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </div>

              <div>
                <label className="form-label">To'lov usuli *</label>

                <select
                  className="form-input"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="form-label">Izoh</label>

                <textarea
                  className="form-input min-h-[75px]"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  placeholder="Ixtiyoriy..."
                />
              </div>

              {paymentError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
                >
                  {paymentError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-border-custom pt-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPaymentTarget(null)}
                >
                  Bekor qilish
                </button>

                <button type="submit" className="primary-button">
                  <Wallet size={16} />
                  To'lovni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-custom p-4">
      <p className="text-xs text-muted">{label}</p>

      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyHistory() {
  return (
    <p className="p-8 text-center text-sm text-muted">
      Tanlangan davrda savdo yozuvlari yo'q.
    </p>
  );
}
function PaymentAction({
  summary,
  onPay,
}: {
  summary: {
    paid: number;
    debt: number;
    status: 'paid' | 'partial' | 'unpaid';
  };
  onPay: () => void;
}) {
  const labels = {
    paid: "To'langan",
    partial: 'Qisman',
    unpaid: 'Qarzdor',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`status-badge ${
          summary.status === 'paid'
            ? 'text-emerald-500'
            : summary.status === 'partial'
              ? 'text-amber-500'
              : 'text-red-500'
        }`}
      >
        {labels[summary.status]}
      </span>

      {summary.debt > 0.000001 && (
        <button
          type="button"
          className="secondary-button !px-3 !py-1.5 text-xs"
          onClick={onPay}
        >
          To'lov olish
        </button>
      )}
    </div>
  );
}
