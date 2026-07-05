import { addDays, addMonths, addWeeks, getDay } from "date-fns";
import type { RecurrenceRule } from "@/generated/prisma/client";

export function computeNextOccurrence(from: Date, rule: RecurrenceRule): Date {
  switch (rule) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addWeeks(from, 1);
    case "monthly":
      return addMonths(from, 1);
    case "weekdays": {
      let next = addDays(from, 1);
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      return next;
    }
    default:
      return from;
  }
}
