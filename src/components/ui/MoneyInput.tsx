
import {
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
} from "react";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string | number;
  onChange: (value: string) => void;
  allowDecimals?: boolean;
};

export function formatMoneyInput(
  value: string | number,
  allowDecimals = false
): string {
  const raw = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");

  if (!raw) return "";

  let cleaned = raw;

  if (!allowDecimals) {
    cleaned = cleaned.replace(/\./g, "");
  } else {
    const dotIndex = cleaned.indexOf(".");

    if (dotIndex !== -1) {
      cleaned =
        cleaned.slice(0, dotIndex + 1) +
        cleaned.slice(dotIndex + 1).replace(/\./g, "");
    }
  }

  const [whole, decimal] = cleaned.split(".");

  // 1000 o'z holicha qoladi.
  // 10000 dan boshlab vergul qo'shiladi.
  const formattedWhole =
    whole.length <= 4
      ? whole
      : whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (allowDecimals && cleaned.includes(".")) {
    return `${formattedWhole}.${decimal ?? ""}`;
  }

  return formattedWhole;
}

export function parseMoneyInput(
  value: string | number
): number {
  const cleaned = String(value ?? "").replace(/,/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MoneyInput({
  value,
  onChange,
  allowDecimals = false,
  className = "form-input",
  inputMode = "decimal",
  ...props
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const formattedValue = formatMoneyInput(
    value,
    allowDecimals
  );

  useLayoutEffect(() => {
    if (cursorRef.current === null) return;

    const input = inputRef.current;

    if (input && document.activeElement === input) {
      input.setSelectionRange(
        cursorRef.current,
        cursorRef.current
      );
    }

    cursorRef.current = null;
  }, [formattedValue]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = event.target;
    const cursor = input.selectionStart ?? input.value.length;

    const rawBeforeCursor = input.value.slice(0, cursor);
    const digitsBeforeCursor = rawBeforeCursor.replace(
      /[^\d]/g,
      ""
    ).length;

    const formatted = formatMoneyInput(
      input.value,
      allowDecimals
    );

    let nextCursor = formatted.length;

    if (digitsBeforeCursor === 0) {
      nextCursor = 0;
    } else {
      let seenDigits = 0;

      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          seenDigits++;
        }

        if (seenDigits === digitsBeforeCursor) {
          nextCursor = i + 1;
          break;
        }
      }
    }

    cursorRef.current = nextCursor;

    // React state uchun vergulsiz qiymat qaytaramiz.
    onChange(formatted.replace(/,/g, ""));
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      className={className}
      value={formattedValue}
      onChange={handleChange}
    />
  );
}
