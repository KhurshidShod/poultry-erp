
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  trend = "neutral",
  description,
}: StatCardProps) {
  const trendClass =
    trend === "up"
      ? "text-positive"
      : trend === "down"
        ? "text-negative"
        : "text-muted";

  return (
    <article className="surface-card surface-card-hover flex min-h-[154px] min-w-0 flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[13px] font-medium text-muted">
          {title}
        </p>

        <div
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-[11px]
            border border-border-custom
            bg-[var(--hover-bg)]
            text-text-main
          "
        >
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>

      <div className="mt-5">
        <h3
          className="
            break-words text-[25px]
            font-semibold leading-tight
            tracking-[-0.7px]
            text-text-main
            sm:text-[27px]
          "
        >
          {value}
        </h3>

        {(change || description) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {change && (
              <span
                className={`
                  inline-flex items-center gap-1
                  text-[11px] font-medium
                  ${trendClass}
                `}
              >
                {trend === "up" && (
                  <ArrowUpRight size={14} />
                )}

                {trend === "down" && (
                  <ArrowDownRight size={14} />
                )}

                {change}
              </span>
            )}

            {description && (
              <span className="text-[11px] text-muted">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
