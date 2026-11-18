type TaskValue = Record<string, unknown>;

function recurrenceDate(value: unknown): Date | null {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? date : null;
}

export function nextTaskOccurrence(source: TaskValue, latest: TaskValue): { due: string; startDate: string } | null {
  if (source.recurrenceStoppedAt || source.recurrenceStopDate || source.gpmbWorkflowId
    || !["Ho\u00e0n th\u00e0nh", "Hoan thanh"].includes(String(latest.status))
    || latest.completionReviewStatus !== "pending") return null;
  const frequency = String(source.recurrence || source.periodicity || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const dayStep = ["daily", "hang ngay"].includes(frequency) ? 1 : ["weekly", "hang tuan"].includes(frequency) ? 7 : 0;
  const monthStep = ["monthly", "hang thang"].includes(frequency) ? 1 : ["quarterly", "hang quy"].includes(frequency) ? 3 : 0;
  if (!dayStep && !monthStep) return null;
  const move = (value: unknown, anchor: number) => {
    const date = recurrenceDate(value);
    if (!date) return "";
    if (dayStep) date.setUTCDate(date.getUTCDate() + dayStep);
    else {
      const month = date.getUTCMonth() + monthStep;
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(month);
      date.setUTCDate(Math.min(Math.max(1, anchor || 1), lastDay));
    }
    return date.toISOString().slice(0, 10);
  };
  const currentDue = String(latest.due || latest.startDate || "");
  const anchor = Number(source.recurrenceAnchorDay) || Number(String(source.due || "").slice(8, 10));
  const due = move(currentDue, anchor);
  const startDate = latest.startDate
    ? move(latest.startDate, Number(String(source.startDate || latest.startDate).slice(8, 10))) : due;
  return due && startDate && due > currentDue ? { due, startDate } : null;
}
