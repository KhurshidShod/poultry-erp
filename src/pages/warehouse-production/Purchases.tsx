
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Wallet,
  PackagePlus,
  Receipt,
} from "lucide-react";

import {
  useWarehouse,
  formatNumber,
  formatMoney,
} from "../../context/WarehouseContext";

import {
  useMasterData,
} from "../../context/MasterDataContext";

import {
  formatDateTime,
} from "../../components/warehouse/DateRangeFilter";

import {
  WarehouseModal,
  WarehousePageHeader,
  WarehouseMetric,
  PageDateFilter,
  useWarehouseDateFilter,
  EmptyTable,
  FormError,
  ModalActions,
} from "../../components/warehouse/WarehouseUI";
import MoneyInput from "../../components/ui/MoneyInput";

function nowInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function Purchases() {
  const { purchases, purchasePayments, addPurchase, addPurchasePayment, getPurchasePaid } = useWarehouse();

  const {
    products,
    activeProducts,
    suppliers,
  } = useMasterData();

  const filter = useWarehouseDateFilter();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [payingPurchaseId, setPayingPurchaseId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    date: nowInput(), amount: "", method: "cash" as "cash" | "card" | "bank",
  });
  const payingPurchase = purchases.find((purchase) => purchase.id === payingPurchaseId);
  const paymentDue = payingPurchase
    ? Math.max(0, payingPurchase.quantity * payingPurchase.unitPrice - getPurchasePaid(payingPurchase.id))
    : 0;

  function openPayment(purchaseId: string) {
    setPayingPurchaseId(purchaseId);
    setPaymentError("");
    setPaymentForm({ date: nowInput(), amount: "", method: "cash" });
  }

  function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payingPurchase) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > paymentDue + 0.00001) {
      setPaymentError("Summa 0 dan katta va qolgan qarzdan oshmagan bo'lishi kerak.");
      return;
    }
    try {
      addPurchasePayment({
        id: crypto.randomUUID(),
        purchaseId: payingPurchase.id,
        date: paymentForm.date,
        amount,
        method: paymentForm.method,
        createdAt: new Date().toISOString(),
      });
      setPayingPurchaseId(null);
      setPaymentError("");
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "To'lov saqlanmadi.");
    }
  }


  const [form, setForm] = useState({
    date: nowInput(),
    supplierId: "",
    materialId: "",
    quantity: "",
    unitPrice: "",
    paidAmount: "",
    paymentMethod: "cash" as "cash" | "card" | "bank",
  });

  const selectedProduct = products.find(
    (product) => product.id === form.materialId
  );

  const selectedSupplier = suppliers.find(
    (partner) => partner.id === form.supplierId
  );

  const filtered = purchases
    .filter((purchase) => filter.inRange(purchase.date))
    .filter((purchase) => {
      const product = products.find(
        (item) => item.id === purchase.materialId
      );

      const query = search.trim().toLowerCase();

      return `${product?.name ?? ""} ${purchase.supplier}`
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const received = filtered.filter(
    (purchase) => purchase.status === "received"
  );

  const totalValue = received.reduce(
    (sum, purchase) =>
      sum + purchase.quantity * purchase.unitPrice,
    0
  );

  const totalQuantity = received.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );

  const previewTotal =
    (Number(form.quantity) || 0) *
    (Number(form.unitPrice) || 0);

  const previewPaid = Number(form.paidAmount) || 0;
  const previewDebt = Math.max(0, previewTotal - previewPaid);

  function resetForm() {
    setForm({
      date: nowInput(),
      supplierId: "",
      materialId: "",
      quantity: "",
      unitPrice: "",
      paidAmount: "",
      paymentMethod: "cash",
    });

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

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (!selectedSupplier) {
      setError("Yetkazib beruvchini tanlang.");
      return;
    }

    if (!selectedProduct || !selectedProduct.active) {
      setError("Mahsulotni tanlang.");
      return;
    }

    if (!form.date) {
      setError("Sanani kiriting.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Miqdorni to'g'ri kiriting.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Narxni to'g'ri kiriting.");
      return;
    }

    const paidAmount = form.paidAmount.trim() ? Number(form.paidAmount) : 0;
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > quantity * unitPrice) {
      setError("To'langan summa xarid qiymatidan oshmasligi kerak.");
      return;
    }

    try {
      addPurchase({
        id: crypto.randomUUID(),
        date: form.date,
        supplier: selectedSupplier.name,
        materialId: selectedProduct.id,
        quantity,
        unitPrice,
        status: "received",
        paidAmount,
        paymentMethod: form.paymentMethod,
      });

      closeModal();
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Xaridni saqlashda xatolik yuz berdi."
      );
    }
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* HEADER */}
      <WarehousePageHeader
        title="Xaridlar"
        description="Xomashyo xaridlari va yetkazib beruvchilar"
        icon={ShoppingCart}
        buttonLabel="Yangi xarid"
        onAdd={openModal}
      />

      {/* DATE FILTER */}
      <PageDateFilter filter={filter} />

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WarehouseMetric
          label="Jami xarid qiymati"
          value={formatMoney(totalValue)}
          icon={Wallet}
          tone="green"
          note="Tanlangan davr"
        />

        <WarehouseMetric
          label="Qabul qilingan xomashyo"
          value={`${formatNumber(totalQuantity)} birlik`}
          icon={PackagePlus}
          tone="blue"
          note="Tanlangan davr"
        />

        <WarehouseMetric
          label="Xaridlar soni"
          value={`${filtered.length} ta`}
          icon={Receipt}
          tone="amber"
          note="Tanlangan davr"
        />
      </div>

      {/* PURCHASE HISTORY */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
          <div>
            <h2 className="section-title">
              Xaridlar tarixi
            </h2>

            <p className="section-description mt-1">
              Sanasi, miqdori va xarid qiymati
            </p>
          </div>

          <input
            className="form-input !w-[230px]"
            placeholder="Mahsulot yoki yetkazib beruvchi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[800px]">
            <thead>
              <tr>
                <th>Sana / vaqt</th>
                <th>Mahsulot</th>
                <th>Yetkazib beruvchi</th>
                <th>Miqdor</th>
                <th>Birlik narxi</th>
                <th>Jami</th>
                <th>To'langan</th>
                <th>Qarz</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((purchase) => {
                const product = products.find(
                  (item) => item.id === purchase.materialId
                );

                return (
                  <tr key={purchase.id}>
                    <td>
                      {formatDateTime(purchase.date)}
                    </td>

                    <td className="font-medium">
                      {product?.name ?? "Noma'lum mahsulot"}
                    </td>

                    <td>{purchase.supplier}</td>

                    <td>
                      {formatNumber(purchase.quantity)}{" "}
                      {product?.unit ?? ""}
                    </td>

                    <td>
                      {formatMoney(purchase.unitPrice)}
                    </td>

                    <td className="font-semibold">
                      {formatMoney(
                        purchase.quantity * purchase.unitPrice
                      )}
                    </td>

                    <td>
                      {purchase.paidAmount === undefined && !purchasePayments.some((p) => p.purchaseId === purchase.id)
                        ? <span className="text-xs text-muted">Ma'lum emas</span>
                        : <span className="font-semibold !text-emerald-600 dark:!text-emerald-400">{formatMoney(getPurchasePaid(purchase.id))}</span>}
                    </td>
                    <td>
                      {purchase.paidAmount === undefined && !purchasePayments.some((p) => p.purchaseId === purchase.id)
                        ? <span className="text-xs text-muted">Aniqlanmagan</span>
                        : <span className="font-semibold !text-red-600 dark:!text-red-400">{formatMoney(Math.max(0, purchase.quantity * purchase.unitPrice - getPurchasePaid(purchase.id)))}</span>}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          purchase.status === "received"
                            ? "status-success"
                            : "status-neutral"
                        }`}
                      >
                        {purchase.status === "received"
                          ? "Qabul qilingan"
                          : "Qoralama"}
                      </span>
                    </td>
                    <td>
                      {purchase.status === "received" &&
                        (purchase.paidAmount !== undefined || purchasePayments.some((p) => p.purchaseId === purchase.id)) &&
                        purchase.quantity * purchase.unitPrice - getPurchasePaid(purchase.id) > 0.00001 && (
                        <button
                          type="button"
                          className="rounded-lg border border-border-custom px-3 py-1.5 text-xs font-semibold text-accent hover:bg-[var(--hover-bg)]"
                          onClick={() => openPayment(purchase.id)}
                        >
                          To'lov qilish
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyTable message="Tanlangan davrda xarid topilmadi" />
        )}
      </section>

      {/* NEW PURCHASE MODAL */}
      <WarehouseModal
        open={open}
        title="Yangi xarid"
        description="Xomashyo xaridini omborga kirim qilish"
        onClose={closeModal}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* DATE */}
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
                })
              }
            />
          </div>

          {/* SUPPLIER FROM HAMKORLAR */}
          <div>
            <label className="form-label">
              Yetkazib beruvchi
            </label>

            <select
              required
              className="form-input"
              value={form.supplierId}
              onChange={(e) =>
                setForm({
                  ...form,
                  supplierId: e.target.value,
                })
              }
            >
              <option value="">
                Yetkazib beruvchini tanlang
              </option>

              {suppliers.map((partner) => (
                <option
                  key={partner.id}
                  value={partner.id}
                >
                  {partner.name}
                </option>
              ))}
            </select>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {suppliers.length} ta faol yetkazib beruvchi
              </span>

              <Link
                to="/partners"
                className="text-xs font-medium text-accent hover:underline"
              >
                + Yangi hamkor qo'shish
              </Link>
            </div>
          </div>

          {/* PRODUCT FROM MAHSULOTLAR */}
          <div>
            <label className="form-label">
              Mahsulot
            </label>

            <select
              required
              className="form-input"
              value={form.materialId}
              onChange={(e) =>
                setForm({
                  ...form,
                  materialId: e.target.value,
                })
              }
            >
              <option value="">
                Mahsulotni tanlang
              </option>

              {activeProducts.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {activeProducts.length} ta faol mahsulot
              </span>

              <Link
                to="/products"
                className="text-xs font-medium text-accent hover:underline"
              >
                + Yangi mahsulot qo'shish
              </Link>
            </div>
          </div>

          {/* QUANTITY AND PRICE */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">
                Miqdor ({selectedProduct?.unit ?? "kg"})
              </label>

              <input
                required
                type="number"
                min="0.001"
                step="any"
                className="form-input"
                placeholder="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="form-label">
                Birlik narxi (so'm)
              </label>

              <MoneyInput
                required
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={form.unitPrice}
                onChange={(value) =>
                  setForm({
                    ...form,
                    unitPrice: value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">To'langan summa (so'm)</label>
              <MoneyInput className="form-input" value={form.paidAmount}
                onChange={(value) => setForm((old) => ({ ...old, paidAmount: value }))}
                placeholder="0 — qarzga xarid" />
            </div>
            <div>
              <label className="form-label">To'lov usuli</label>
              <select className="form-input" value={form.paymentMethod} disabled={previewPaid <= 0}
                onChange={(e) => setForm((old) => ({ ...old, paymentMethod: e.target.value as "cash" | "card" | "bank" }))}>
                <option value="cash">Naqd</option><option value="card">Karta</option><option value="bank">Bank o'tkazmasi</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-xs text-muted">Qolgan qarz</p>
            <p className="mt-1 text-xl font-bold !text-amber-600 dark:!text-amber-400">{formatMoney(previewDebt)}</p>
          </div>

          {/* TOTAL */}
          <div className="rounded-xl border border-border-custom bg-[var(--table-head)] p-4">
            <p className="text-xs text-muted">
              Jami xarid qiymati
            </p>

            <p className="mt-1 text-[22px] font-semibold text-accent">
              {formatMoney(previewTotal)}
            </p>
          </div>

          <FormError message={error} />

          <ModalActions
            onCancel={closeModal}
            submitLabel="Xaridni saqlash"
          />
        </form>
      </WarehouseModal>

      <WarehouseModal
        open={Boolean(payingPurchaseId)}
        title="Xarid qarzini to'lash"
        description={payingPurchase ? `${payingPurchase.supplier} — qolgan qarz: ${formatMoney(paymentDue)}` : ""}
        onClose={() => { setPayingPurchaseId(null); setPaymentError(""); }}
      >
        <form onSubmit={savePayment} className="space-y-4">
          <div>
            <label className="form-label">To'lov sanasi va vaqti</label>
            <input type="datetime-local" required className="form-input"
              value={paymentForm.date} max={nowInput()}
              min={payingPurchase?.date.slice(0, 16)}
              onChange={(e) => setPaymentForm((old) => ({ ...old, date: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">To'lov summasi (so'm)</label>
            <MoneyInput required className="form-input" value={paymentForm.amount}
              onChange={(value) => setPaymentForm((old) => ({ ...old, amount: value }))}
              placeholder="To'lanadigan summa" />
            <button type="button" className="mt-1 text-xs font-medium text-accent hover:underline"
              onClick={() => setPaymentForm((old) => ({ ...old, amount: String(paymentDue) }))}>
              Qolgan qarzni to'liq to'lash
            </button>
          </div>
          <div>
            <label className="form-label">To'lov usuli</label>
            <select className="form-input" value={paymentForm.method}
              onChange={(e) => setPaymentForm((old) => ({ ...old, method: e.target.value as "cash" | "card" | "bank" }))}>
              <option value="cash">Naqd</option><option value="card">Karta</option><option value="bank">Bank o'tkazmasi</option>
            </select>
          </div>
          <FormError message={paymentError} />
          <ModalActions onCancel={() => setPayingPurchaseId(null)} submitLabel="To'lovni saqlash" />
        </form>
      </WarehouseModal>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border-custom p-5"><h2 className="section-title">Xomashyo xaridlari to'lovlari tarixi</h2></div>
        <div className="overflow-x-auto">
          <table className="erp-table min-w-[750px] w-full">
            <thead><tr><th>Sana</th><th>Yetkazib beruvchi</th><th>To'lov usuli</th><th>Summa</th></tr></thead>
            <tbody>
              {purchasePayments.filter((payment) => filter.inRange(payment.date))
                .slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
                .map((payment) => {
                  const purchase = purchases.find((item) => item.id === payment.purchaseId);
                  return <tr key={payment.id}>
                    <td>{formatDateTime(payment.date)}</td>
                    <td>{purchase?.supplier ?? "Noma'lum yetkazib beruvchi"}</td>
                    <td>{payment.method === "cash" ? "Naqd" : payment.method === "card" ? "Karta" : "Bank"}</td>
                    <td><span className="font-semibold !text-red-600 dark:!text-red-400">{formatMoney(payment.amount)}</span></td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
