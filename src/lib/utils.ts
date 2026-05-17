import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns today's date as a YYYY-MM-DD string in the LOCAL timezone.
 *
 * ⚠️  Never use `new Date().toISOString().split("T")[0]` for plan dates —
 * toISOString() is always UTC, which means after midnight local time the
 * date will be one day behind UTC, causing plans to silently disappear.
 *
 * Optionally accepts a Date to convert (defaults to now).
 */
export function localDateStr(d: Date = new Date()): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
