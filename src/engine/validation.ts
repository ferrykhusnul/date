import type { DateInput, DatePlan, PlanIssue, Venue } from '../types';
import { formatDuration, formatIDR, timeToMinutes, todayISO } from '../lib/format';
import { budgetIssues, computeBudget } from './budget';
import { MIN_SLOT_MINUTES } from './activities';

export const MIN_BUDGET = 50_000;
export const MIN_DURATION_MINUTES = 60;
export const MAX_DURATION_MINUTES = 12 * 60;

export type InputErrors = Partial<Record<keyof DateInput, string>>;

/** Validates the Create Date form. `today` is injectable for tests. */
export function validateDateInput(v: DateInput, today: string = todayISO()): InputErrors {
  const e: InputErrors = {};
  if (!v.city.trim()) e.city = 'Kota wajib diisi.';
  if (!v.date) e.date = 'Tanggal wajib diisi.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) e.date = 'Format tanggal tidak valid.';
  else if (v.date < today) e.date = 'Tanggal tidak boleh di masa lalu.';
  if (!/^\d{2}:\d{2}$/.test(v.startTime)) e.startTime = 'Jam mulai wajib diisi.';
  const minutes = v.durationHours * 60;
  if (!(minutes >= MIN_DURATION_MINUTES))
    e.durationHours = `Durasi minimal ${formatDuration(MIN_DURATION_MINUTES)}.`;
  else if (minutes > MAX_DURATION_MINUTES) e.durationHours = `Durasi maksimal ${formatDuration(MAX_DURATION_MINUTES)}.`;
  if (!(v.budget >= MIN_BUDGET)) e.budget = `Anggaran minimal ${formatIDR(MIN_BUDGET)}.`;
  if (v.activities.length === 0) e.activities = 'Pilih minimal satu aktivitas.';
  if ((v.startLocation ?? '').length > 160) e.startLocation = 'Maksimal 160 karakter.';
  if ((v.endLocation ?? '').length > 160) e.endLocation = 'Maksimal 160 karakter.';
  return e;
}

/** Fields a venue needs for meaningful scoring; missing ones lower its score. */
export function venueGaps(v: Venue): string[] {
  const gaps: string[] = [];
  if (!v.activities.length) gaps.push('aktivitas');
  if (!v.vibes.length) gaps.push('vibe');
  if (!(v.visitDurationMinutes > 0)) gaps.push('lama kunjungan');
  if (v.priceUnknown) gaps.push('harga');
  return gaps;
}

/** Checks a (possibly edited) plan. Recomputed on every change. */
export function validatePlan(plan: DatePlan, getVenue: (id: string) => Venue | undefined): PlanIssue[] {
  const issues: PlanIssue[] = [];
  if (plan.items.length === 0) {
    issues.push({ code: 'EMPTY_ITINERARY', severity: 'error', message: 'Itinerary kosong. Tambahkan aktivitas atau susun ulang rencana.' });
    return issues;
  }

  issues.push(...budgetIssues(computeBudget(plan)));

  const requested = plan.input.durationHours * 60;
  const used = usedMinutes(plan);
  if (used > requested) {
    issues.push({
      code: 'OVER_DURATION',
      severity: 'warning',
      message: `Itinerary ${formatDuration(used - requested)} lebih lama dari durasi yang direncanakan (${formatDuration(requested)}).`,
    });
  } else if (requested - used >= 45) {
    issues.push({
      code: 'UNUSED_TIME',
      severity: 'info',
      message: `Masih ada sekitar ${formatDuration(requested - used)} waktu luang di akhir rencana.`,
    });
  }

  const start = timeToMinutes(plan.input.startTime);
  if (start + used > 24 * 60) {
    issues.push({ code: 'PAST_MIDNIGHT', severity: 'warning', message: 'Rencana berlangsung melewati tengah malam.' });
  }

  for (const item of plan.items) {
    if (item.kind !== 'venue' || !item.venueId) continue;
    const venue = getVenue(item.venueId);
    if (!venue) {
      issues.push({ code: 'MISSING_VENUE', severity: 'warning', message: `"${item.title}" sudah tidak ada di dataset venue.` });
    } else if (venue.status === 'inactive') {
      issues.push({ code: 'INACTIVE_VENUE', severity: 'warning', message: `"${venue.name}" sekarang berstatus nonaktif.` });
    }
  }
  return issues;
}

/** Minutes from the first start to the last end, including transit. */
export function usedMinutes(plan: Pick<DatePlan, 'items' | 'transport'>): number {
  const activity = plan.items.reduce((s, i) => s + i.durationMinutes, 0);
  return activity + plan.transport.legs.reduce((s, l) => s + l.bufferMinutes, 0);
}

export { MIN_SLOT_MINUTES };
