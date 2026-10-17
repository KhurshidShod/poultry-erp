import { useEffect, useState, type ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';
import { Plus, X } from 'lucide-react';

import DateRangeFilter, {
  presetRange,
  type DatePreset,
  type DateRange,
} from './DateRangeFilter';

export function useWarehouseDateFilter() {
  const [preset, setPreset] = useState<DatePreset>('7days');

  const [range, setRange] = useState<DateRange>(() => presetRange('7days'));

  const valid = Boolean(range.start && range.end) && range.start <= range.end;

  function inRange(date: string) {
    return (
      valid &&
      date.slice(0, 10) >= range.start &&
      date.slice(0, 10) <= range.end
    );
  }

  return {
    preset,
    range,
    valid,
    inRange,
    setDateFilter: (nextPreset: DatePreset, nextRange: DateRange) => {
      setPreset(nextPreset);
      setRange(nextRange);
    },
  };
}

export function PageDateFilter({
  filter,
}: {
  filter: ReturnType<typeof useWarehouseDateFilter>;
}) {
  return (
    <DateRangeFilter
      preset={filter.preset}
      range={filter.range}
      onChange={filter.setDateFilter}
    />
  );
}

export function WarehousePageHeader({
  title,
  description,
  icon: Icon,
  buttonLabel,
  onAdd,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-accent">
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-description mt-0.5">{description}</p>
          <p className="mt-1 text-[11px] text-muted">
            Demo rejimi · Brauzerda saqlanadi
          </p>
        </div>
      </div>

      <button type="button" onClick={onAdd} className="primary-button">
        <Plus size={17} />
        {buttonLabel}
      </button>
    </div>
  );
}

export function WarehouseMetric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'accent',
}: {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  tone?: 'accent' | 'green' | 'amber' | 'blue';
}) {
  const toneClasses = {
    accent: 'bg-[var(--accent-soft)] text-accent',
    green: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <div className="surface-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] text-muted">{label}</p>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-4 break-words text-[25px] font-semibold tracking-tight text-text-main">
        {value}
      </p>

      {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

export function WarehouseModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        aria-label="Modalni yopish"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[90vh] w-full max-w-[630px] flex-col overflow-hidden rounded-2xl border border-border-custom bg-card text-text-main shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-custom p-5 sm:px-6">
          <div>
            <h2 className="text-[18px] font-semibold">{title}</h2>

            {description && (
              <p className="mt-1 text-[12px] text-muted">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-button shrink-0"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export function EmptyTable({
  message = "Ma'lumot topilmadi",
}: {
  message?: string;
}) {
  return (
    <div className="px-5 py-14 text-center text-[13px] text-muted">
      {message}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-500"
    >
      {message}
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel = 'Saqlash',
}: {
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border-custom pt-5">
      <button type="button" onClick={onCancel} className="secondary-button">
        Bekor qilish
      </button>

      <button type="submit" className="accent-button">
        {submitLabel}
      </button>
    </div>
  );
}

export function TableSection({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom p-5">
        <div>
          <h2 className="section-title">
            {title}
          </h2>

          {description && (
            <p className="section-description mt-1">
              {description}
            </p>
          )}
        </div>

        {right && <div>{right}</div>}
      </div>

      {children}
    </section>
  );
}
