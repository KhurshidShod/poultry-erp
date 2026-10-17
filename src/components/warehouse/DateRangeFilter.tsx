
import {
  CalendarDays,
} from "lucide-react";

export type DatePreset =
  | "today"
  | "3days"
  | "7days"
  | "10days"
  | "month"
  | "custom";

export interface DateRange {
  start: string;
  end: string;
}

interface Props {
  preset: DatePreset;
  range: DateRange;
  onChange: (
    preset: DatePreset,
    range: DateRange
  ) => void;
}

export function localDate(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function presetRange(
  preset: DatePreset,
  today: Date = new Date()
): DateRange {
  const end = localDate(today);
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (preset === "month") {
    startDate.setDate(1);
  } else {
    const days =
      preset === "3days" ? 3 :
      preset === "7days" ? 7 :
      preset === "10days" ? 10 : 1;

    startDate.setDate(startDate.getDate() - days + 1);
  }

  return {
    start: localDate(startDate),
    end,
  };
}

export function formatDate(date: string) {
  if (!date) return "—";

  const [year, month, day] = date.slice(0, 10).split("-");

  return `${day}.${month}.${year}`;
}

export function formatDateTime(date: string) {
  if (!date) return "—";

  const time = date.includes("T")
    ? date.slice(11, 16)
    : "";

  return `${formatDate(date)}${time ? ` ${time}` : ""}`;
}

const presets: {
  value: DatePreset;
  label: string;
}[] = [
  { value: "today", label: "Bugun" },
  { value: "3days", label: "3 kun" },
  { value: "7days", label: "7 kun" },
  { value: "10days", label: "10 kun" },
  { value: "month", label: "Shu oy" },
  { value: "custom", label: "Sana tanlash" },
];

export default function DateRangeFilter({
  preset,
  range,
  onChange,
}: Props) {
  const valid =
    Boolean(range.start && range.end) &&
    range.start <= range.end;

  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays
            size={18}
            className="text-muted"
          />

          <span className="text-[13px] font-semibold">
            Hisobot davri
          </span>
        </div>

        <span className="text-[12px] text-muted">
          {formatDate(range.start)} — {formatDate(range.end)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((item) => {
          const active = preset === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (item.value === "custom") {
                  onChange("custom", range);
                } else {
                  onChange(
                    item.value,
                    presetRange(item.value)
                  );
                }
              }}
              className={`
                inline-flex h-9 items-center
                rounded-lg border px-3.5
                text-[12px] font-medium
                transition-colors
                ${
                  active
                    ? "border-accent bg-accent !text-white"
                    : "border-border-custom bg-card text-text-main hover:bg-[var(--hover-bg)]"
                }
              `}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {preset === "custom" && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1">
            <span className="form-label">
              Boshlanish sanasi
            </span>

            <input
              type="date"
              value={range.start}
              onChange={(event) =>
                onChange("custom", {
                  ...range,
                  start: event.target.value,
                })
              }
              className="form-input"
            />
          </label>

          <label className="min-w-[160px] flex-1">
            <span className="form-label">
              Tugash sanasi
            </span>

            <input
              type="date"
              value={range.end}
              onChange={(event) =>
                onChange("custom", {
                  ...range,
                  end: event.target.value,
                })
              }
              className="form-input"
            />
          </label>
        </div>
      )}

      {!valid && (
        <p className="mt-3 text-[12px] text-negative">
          Sana oralig'ini to'g'ri kiriting.
        </p>
      )}
    </section>
  );
}
