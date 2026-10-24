import {
  ChevronDown,
  ChevronRight,
  Layers,
  Package,
  Wallet,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatDateTime } from '../../components/warehouse/DateRangeFilter';
import {
  EmptyTable,
  FormError,
  ModalActions,
  PageDateFilter,
  TableSection,
  useWarehouseDateFilter,
  WarehouseMetric,
  WarehouseModal,
  WarehousePageHeader,
} from '../../components/warehouse/WarehouseUI';
import {
  feedKey,
  formatMoney,
  formatNumber,
  useWarehouse,
} from '../../context/WarehouseContext';
import MoneyInput from '../../components/ui/MoneyInput';
const nowInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export default function FeedInventory() {
  const { getFeedGroupsAsOf, feedLots, addOpeningFeed } = useWarehouse(),
    filter = useWarehouseDateFilter();
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [expanded, setExpanded] = useState<string[]>([]);
  const [form, setForm] = useState({
    date: nowInput(),
    feedType: 'Tuxumchi tovuqlar yemi',
    recipeName: 'Layer A',
    quantity: '',
    unitCost: '',
  });
  const groups = filter.valid ? getFeedGroupsAsOf(filter.range.end) : [];
  const total = groups.reduce((s, g) => s + g.remaining, 0),
    value = groups.reduce((s, g) => s + g.value, 0);
  function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    const quantity = Number(form.quantity),
      unitCost = Number(form.unitCost);
    if (
      !form.date ||
      !form.feedType.trim() ||
      !form.recipeName.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      setError('Barcha maydonlarni to‘g‘ri kiriting.');
      return;
    }
    try {
      addOpeningFeed({
        id: `OPEN-${crypto.randomUUID().slice(0, 8)}`,
        date: form.date,
        feedType: form.feedType.trim(),
        recipeName: form.recipeName.trim(),
        quantity,
        unitCost,
      });
      setOpen(false);
      setForm({
        date: nowInput(),
        feedType: 'Tuxumchi tovuqlar yemi',
        recipeName: 'Layer A',
        quantity: '',
        unitCost: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi.');
    }
  }
  return (
    <div className="w-full space-y-5 pb-8">
      <WarehousePageHeader
        title="Yem zaxiralari"
        description="Bir xil yem turi va retseptlar jamlangan qoldiqlar"
        icon={Package}
        buttonLabel="Yangi zaxira"
        onAdd={() => {
          setError('');
          setOpen(true);
        }}
      />
      <PageDateFilter filter={filter} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <WarehouseMetric
          label="Jami yem qoldig‘i"
          value={`${formatNumber(total)} kg`}
          icon={Package}
          note="Davr oxiridagi balans"
        />
        <WarehouseMetric
          label="Yem turlari / retseptlar"
          value={`${groups.length} ta`}
          icon={Layers}
        />
        <WarehouseMetric
          label="Taxminiy ombor qiymati"
          value={formatMoney(value)}
          icon={Wallet}
        />
      </div>
      <TableSection
        title="Jamlangan yem zaxiralari"
        description="Qatorni bosib partiyalarni ko‘ring"
        right={
          <span className="text-[12px] text-muted">
            {groups.length} ta guruh
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="erp-table min-w-[800px]">
            <thead>
              <tr>
                <th>Yem turi / retsept</th>
                <th>Partiyalar</th>
                <th>Ishlab chiqarilgan</th>
                <th>Qoldiq</th>
                <th>Qiymat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isOpen = expanded.includes(group.key);
                const lots = feedLots.filter(
                  (l) =>
                    feedKey(l.feedType, l.recipeName) === group.key &&
                    l.date.slice(0, 10) <= filter.range.end
                );
                return (
                  <tr key={group.key}>
                    <td colSpan={6} className="!p-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((s) =>
                            isOpen
                              ? s.filter((k) => k !== group.key)
                              : [...s, group.key]
                          )
                        }
                        className="grid w-full grid-cols-[2fr_1fr_1.4fr_1.2fr_1.5fr_22px] items-center gap-3 px-[19px] py-[16px] text-left hover:bg-[var(--table-hover)]"
                      >
                        <span>
                          <span className="block text-[12px] font-semibold text-text-main">
                            {group.feedType}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted">
                            {group.recipeName}
                          </span>
                        </span>
                        <span className="text-[12px] text-[var(--text-secondary)]">
                          {group.lots} ta
                        </span>
                        <span className="table-number">
                          {formatNumber(group.produced)} kg
                        </span>
                        <span className="table-number">
                          {formatNumber(group.remaining)} kg
                        </span>
                        <span className="table-number">
                          {formatMoney(group.value)}
                        </span>
                        {isOpen ? (
                          <ChevronDown size={16} className="text-muted" />
                        ) : (
                          <ChevronRight size={16} className="text-muted" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-border-custom bg-[var(--table-head)] px-4 py-3">
                          <p className="mb-2 text-[12px] font-medium">
                            Partiyalar tafsiloti
                          </p>
                          <div className="overflow-x-auto">
                            <table className="erp-table min-w-[560px]">
                              <thead>
                                <tr>
                                  <th>Partiya</th>
                                  <th>Sana</th>
                                  <th>Tayyorlangan</th>
                                  <th>Qoldiq</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lots.map((lot) => (
                                  <tr key={lot.id}>
                                    <td>
                                      <span className="table-code">
                                        {lot.id}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="table-date">
                                        {formatDateTime(lot.date)}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="table-number">
                                        {formatNumber(lot.quantity)} kg
                                      </span>
                                    </td>
                                    <td>
                                      <span className="table-number">
                                        {formatNumber(lot.remaining)} kg
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {groups.length === 0 && <EmptyTable />}
      </TableSection>
      <WarehouseModal
        open={open}
        title="Boshlang‘ich yem zaxirasi"
        description="ERP ishga tushishidan oldin mavjud bo‘lgan yem"
        onClose={() => setOpen(false)}
      >
        <form className="space-y-4" onSubmit={save}>
          <label className="block">
            <span className="form-label">Sana va vaqt</span>
            <input
              type="datetime-local"
              required
              className="form-input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="form-label">Yem turi</span>
            <input
              required
              className="form-input"
              value={form.feedType}
              onChange={(e) => setForm({ ...form, feedType: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="form-label">Retsept</span>
            <input
              required
              className="form-input"
              value={form.recipeName}
              onChange={(e) => setForm({ ...form, recipeName: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="form-label">Miqdor (kg)</span>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                className="form-input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </label>
            <label>
              <span className="form-label">Tannarx/kg</span>
              <MoneyInput
                required
                min="0"
                step="any"
                className="form-input"
                value={form.unitCost}
                onChange={(value) => setForm({ ...form, unitCost: value })}
              />
            </label>
          </div>
          <p className="text-[12px] text-muted">
            Oddiy ishlab chiqarilgan yemni bu yerga qo‘shmang. Uni Yem ishlab
            chiqarish bo‘limida yozing.
          </p>
          <FormError message={error} />
          <ModalActions
            onCancel={() => setOpen(false)}
            submitLabel="Zaxirani qo‘shish"
          />
        </form>
      </WarehouseModal>
    </div>
  );
}
