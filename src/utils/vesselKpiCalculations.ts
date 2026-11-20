import { SaltVesselRecord } from '../data/saltShipmentsData';

export interface EnrichedVesselKpi {
  record: SaltVesselRecord;
  etaDate: Date | null;
  etbDate: Date | null;
  etdDate: Date | null;
  waitingHours: number | null; // ETA -> ETB
  operationHours: number | null; // ETB -> ETD
  operationDays: number | null;
  totalPortHours: number | null; // ETA -> ETD
  productivityTph: number | null; // Tons per hour (on berth)
  productivityTpd: number | null; // Tons per day (on berth)
  dwtUtilizationPct: number | null; // totalVolumeTons / dwt * 100
  hasDateAnomaly: boolean;
  anomalyReason?: string;
}

export interface VesselFleetAggregate {
  vesselKey: string;
  vesselName: string;
  tripCount: number;
  concludedTrips: number;
  operatingTrips: number;
  plannedTrips: number;
  totalVolumeTons: number;
  concludedVolumeTons: number;
  totalOperationHours: number;
  validTimedTrips: number;
  avgOperationHours: number | null;
  avgWaitingHours: number | null;
  avgProductivityTph: number | null;
  avgProductivityTpd: number | null;
  bestProductivityTph: number | null;
  longestOperationHours: number | null;
  maxDwt: number;
  maxLoa: number;
  avgDwtUtilizationPct: number | null;
  shippers: string[];
  trafficTypes: ('EXP' | 'CBT')[];
  months: number[];
  calls: EnrichedVesselKpi[];
}

export interface MonthlyKpiSummary {
  month: number;
  monthName: string;
  shortMonth: string;
  concludedCount: number;
  validTimedCount: number;
  totalConcludedTons: number;
  totalOperationHours: number;
  avgProductivityTph: number;
  avgProductivityTpd: number;
  avgOperationHours: number;
  avgWaitingHours: number;
}

const SHORT_MONTHS: Record<number, string> = {
  1: 'Jan',
  2: 'Fev',
  3: 'Mar',
  4: 'Abr',
  5: 'Mai',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Set',
  10: 'Out',
  11: 'Nov',
  12: 'Dez',
};

const FULL_MONTHS: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

// Maximum realistic single-call berth operation duration (30 days = 720h)
// Anything beyond this indicates a source PDF date typo (e.g., wrong month digit).
const MAX_VALID_OPERATION_HOURS = 720;

/**
 * Parses a Brazilian date-time string "DD/MM/YYYY HH:mm" into a Date object,
 * handling December-to-January year rollover when the PDF normalizer sets year=2026 on Dec dates.
 */
export function parseMaritimeDateTime(
  dateStr: string | undefined,
  recordMonth: number
): Date | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  let year = parseInt(match[3], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[1], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);

  // Fix Dec (year-1) -> Jan (year) crossover (e.g. STAR STOCKHOLM berthed 27/12/2025, departed 04/01/2026)
  if (recordMonth === 1 && month === 12) {
    year -= 1;
  }

  const parsed = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Enriches every Line-Up record with calculated waiting time, operation duration,
 * productivity (t/h and t/day), and DWT utilization.
 */
export function buildEnrichedVesselKpis(records: SaltVesselRecord[]): EnrichedVesselKpi[] {
  return records.map((record) => {
    const etaDate = parseMaritimeDateTime(record.eta, record.month);
    const etbDate = parseMaritimeDateTime(record.etb, record.month);
    const etdDate = parseMaritimeDateTime(record.etd, record.month);

    let waitingHours: number | null = null;
    if (etaDate && etbDate) {
      const diff = (etbDate.getTime() - etaDate.getTime()) / 3600000;
      if (diff >= 0 && diff <= MAX_VALID_OPERATION_HOURS) {
        waitingHours = diff;
      }
    }

    let operationHours: number | null = null;
    let hasDateAnomaly = false;
    let anomalyReason: string | undefined;

    if (etbDate && etdDate) {
      const diff = (etdDate.getTime() - etbDate.getTime()) / 3600000;
      if (diff <= 0) {
        hasDateAnomaly = true;
        anomalyReason = `ETD (${record.etd}) anterior ao ETB (${record.etb}) no PDF`;
      } else if (diff > MAX_VALID_OPERATION_HOURS) {
        hasDateAnomaly = true;
        anomalyReason = `ETD divergente no PDF (${record.etb} → ${record.etd})`;
      } else {
        operationHours = diff;
      }
    }

    const operationDays = operationHours !== null ? operationHours / 24 : null;

    let totalPortHours: number | null = null;
    if (!hasDateAnomaly && etaDate && etdDate) {
      const diff = (etdDate.getTime() - etaDate.getTime()) / 3600000;
      if (diff > 0 && diff <= MAX_VALID_OPERATION_HOURS * 1.5) {
        totalPortHours = diff;
      }
    }

    const productivityTph =
      operationHours !== null && operationHours > 0 && record.totalVolumeTons > 0
        ? record.totalVolumeTons / operationHours
        : null;
    const productivityTpd = productivityTph !== null ? productivityTph * 24 : null;

    const dwtUtilizationPct =
      record.dwt > 0 && record.totalVolumeTons > 0
        ? (record.totalVolumeTons / record.dwt) * 100
        : null;

    return {
      record,
      etaDate,
      etbDate,
      etdDate,
      waitingHours,
      operationHours,
      operationDays,
      totalPortHours,
      productivityTph,
      productivityTpd,
      dwtUtilizationPct,
      hasDateAnomaly,
      anomalyReason,
    };
  });
}

/**
 * Aggregates KPIs per unique named vessel (excluding TBN placeholders).
 */
export function buildFleetAggregates(enriched: EnrichedVesselKpi[]): VesselFleetAggregate[] {
  const map = new Map<string, EnrichedVesselKpi[]>();

  for (const item of enriched) {
    const cleanName = item.record.vesselName.trim().toUpperCase();
    if (!cleanName || cleanName === 'TBN') continue;
    const existing = map.get(cleanName);
    if (existing) {
      existing.push(item);
    } else {
      map.set(cleanName, [item]);
    }
  }

  const aggregates: VesselFleetAggregate[] = [];

  for (const [vesselKey, calls] of map.entries()) {
    const concludedCalls = calls.filter((c) => c.record.status === 'Concluído');
    const operatingCalls = calls.filter((c) => c.record.status === 'Em operação');
    const plannedCalls = calls.filter(
      (c) => c.record.status === 'Previsto' || c.record.status === 'Confirmado'
    );

    const validTimedConcluded = concludedCalls.filter(
      (c) => !c.hasDateAnomaly && c.operationHours !== null && c.operationHours > 0
    );

    const totalVolumeTons = calls.reduce((sum, c) => sum + c.record.totalVolumeTons, 0);
    const concludedVolumeTons = concludedCalls.reduce(
      (sum, c) => sum + c.record.totalVolumeTons,
      0
    );

    const totalOperationHours = validTimedConcluded.reduce(
      (sum, c) => sum + (c.operationHours || 0),
      0
    );
    const timedConcludedVolume = validTimedConcluded.reduce(
      (sum, c) => sum + c.record.totalVolumeTons,
      0
    );

    const avgOperationHours =
      validTimedConcluded.length > 0 ? totalOperationHours / validTimedConcluded.length : null;

    // Weighted average productivity across all valid concluded calls of this vessel
    const avgProductivityTph =
      totalOperationHours > 0 ? timedConcludedVolume / totalOperationHours : null;
    const avgProductivityTpd = avgProductivityTph !== null ? avgProductivityTph * 24 : null;

    const bestProductivityTph =
      validTimedConcluded.length > 0
        ? Math.max(...validTimedConcluded.map((c) => c.productivityTph || 0))
        : null;

    const longestOperationHours =
      validTimedConcluded.length > 0
        ? Math.max(...validTimedConcluded.map((c) => c.operationHours || 0))
        : null;

    const waitingCalls = concludedCalls.filter((c) => c.waitingHours !== null);
    const avgWaitingHours =
      waitingCalls.length > 0
        ? waitingCalls.reduce((sum, c) => sum + (c.waitingHours || 0), 0) / waitingCalls.length
        : null;

    const maxDwt = Math.max(...calls.map((c) => c.record.dwt || 0));
    const maxLoa = Math.max(...calls.map((c) => c.record.loaMeters || 0));

    const utilCalls = concludedCalls.filter((c) => c.dwtUtilizationPct !== null);
    const avgDwtUtilizationPct =
      utilCalls.length > 0
        ? utilCalls.reduce((sum, c) => sum + (c.dwtUtilizationPct || 0), 0) / utilCalls.length
        : null;

    const shippers = [...new Set(calls.map((c) => c.record.shipper))];
    const trafficTypes = [...new Set(calls.map((c) => c.record.trafficType))];
    const months = [...new Set(calls.map((c) => c.record.month))].sort((a, b) => a - b);

    aggregates.push({
      vesselKey,
      vesselName: calls[0].record.vesselName.trim(),
      tripCount: calls.length,
      concludedTrips: concludedCalls.length,
      operatingTrips: operatingCalls.length,
      plannedTrips: plannedCalls.length,
      totalVolumeTons,
      concludedVolumeTons,
      totalOperationHours,
      validTimedTrips: validTimedConcluded.length,
      avgOperationHours,
      avgWaitingHours,
      avgProductivityTph,
      avgProductivityTpd,
      bestProductivityTph,
      longestOperationHours,
      maxDwt,
      maxLoa,
      avgDwtUtilizationPct,
      shippers,
      trafficTypes,
      months,
      calls,
    });
  }

  return aggregates;
}

/**
 * Computes monthly productivity and berth-time averages from concluded calls.
 */
export function buildMonthlyKpiSummaries(enriched: EnrichedVesselKpi[]): MonthlyKpiSummary[] {
  const uniqueMonths = [...new Set(enriched.map((e) => e.record.month))].sort((a, b) => a - b);

  return uniqueMonths
    .map((month) => {
      const monthConcluded = enriched.filter(
        (e) => e.record.month === month && e.record.status === 'Concluído'
      );
      if (monthConcluded.length === 0) return null;

      const validTimed = monthConcluded.filter(
        (e) => !e.hasDateAnomaly && e.operationHours !== null && e.operationHours > 0
      );
      const totalConcludedTons = monthConcluded.reduce(
        (sum, e) => sum + e.record.totalVolumeTons,
        0
      );
      const timedTons = validTimed.reduce((sum, e) => sum + e.record.totalVolumeTons, 0);
      const totalOperationHours = validTimed.reduce((sum, e) => sum + (e.operationHours || 0), 0);

      const avgProductivityTph = totalOperationHours > 0 ? timedTons / totalOperationHours : 0;
      const avgProductivityTpd = avgProductivityTph * 24;
      const avgOperationHours =
        validTimed.length > 0 ? totalOperationHours / validTimed.length : 0;

      const waitingValid = monthConcluded.filter((e) => e.waitingHours !== null);
      const avgWaitingHours =
        waitingValid.length > 0
          ? waitingValid.reduce((sum, e) => sum + (e.waitingHours || 0), 0) / waitingValid.length
          : 0;

      return {
        month,
        monthName: FULL_MONTHS[month] || `Mês ${month}`,
        shortMonth: SHORT_MONTHS[month] || `M${month}`,
        concludedCount: monthConcluded.length,
        validTimedCount: validTimed.length,
        totalConcludedTons,
        totalOperationHours,
        avgProductivityTph,
        avgProductivityTpd,
        avgOperationHours,
        avgWaitingHours,
      };
    })
    .filter((item): item is MonthlyKpiSummary => item !== null);
}

/**
 * Formats hours into compact "Xd Yh" notation (e.g., 284.2 -> "11d 20h").
 */
export function formatDaysHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours) || hours < 0) {
    return '—';
  }
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const remMins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${String(remHours).padStart(2, '0')}h`;
  }
  if (remHours > 0) {
    return `${remHours}h ${String(remMins).padStart(2, '0')}m`;
  }
  return `${remMins}m`;
}

export function formatDecimalBR(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatIntegerBR(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('pt-BR');
}
