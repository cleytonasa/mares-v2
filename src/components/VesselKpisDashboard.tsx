import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Clock,
  Download,
  Repeat,
  Scale,
  Search,
  Ship,
  X,
} from 'lucide-react';
import {
  LINEUP_LAST_UPDATED,
  MONTHLY_SALT_SUMMARIES,
  SALT_SHIPMENTS_2026,
} from '../data/saltShipmentsData';
import {
  EnrichedVesselKpi,
  VesselFleetAggregate,
  buildEnrichedVesselKpis,
  buildFleetAggregates,
  buildMonthlyKpiSummaries,
  formatDaysHours,
  formatDecimalBR,
  formatIntegerBR,
} from '../utils/vesselKpiCalculations';

type RankingMetric = 'duration' | 'trips' | 'dwt';
type MonthlyChartMetric = 'operationHours' | 'waitingHours';
type TableViewMode = 'calls' | 'fleet';
type CallSortField =
  | 'operationHours'
  | 'waitingHours'
  | 'totalVolumeTons'
  | 'dwt'
  | 'month';
type FleetSortField =
  | 'tripCount'
  | 'totalVolumeTons'
  | 'totalOperationHours'
  | 'maxDwt';

export const VesselKpisDashboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [selectedShipper, setSelectedShipper] = useState<'ALL' | 'SALINOR' | 'SDB'>('ALL');
  const [selectedTraffic, setSelectedTraffic] = useState<'ALL' | 'EXP' | 'CBT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [rankingTab, setRankingTab] = useState<RankingMetric>('duration');
  const [chartMetric, setChartMetric] = useState<MonthlyChartMetric>('operationHours');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const [tableView, setTableView] = useState<TableViewMode>('calls');
  const [callSortField, setCallSortField] = useState<CallSortField>('operationHours');
  const [callSortAsc, setCallSortAsc] = useState<boolean>(false);
  const [fleetSortField, setFleetSortField] = useState<FleetSortField>('tripCount');
  const [fleetSortAsc, setFleetSortAsc] = useState<boolean>(false);

  // Full dataset enriched once
  const allEnriched = useMemo(() => buildEnrichedVesselKpis(SALT_SHIPMENTS_2026), []);

  // Filtered by shipper + traffic (for monthly chart so clicking a month doesn't collapse the chart)
  const scopeEnriched = useMemo(() => {
    return allEnriched.filter((item) => {
      if (selectedShipper !== 'ALL' && item.record.shipper !== selectedShipper) return false;
      if (selectedTraffic !== 'ALL' && item.record.trafficType !== selectedTraffic) return false;
      return true;
    });
  }, [allEnriched, selectedShipper, selectedTraffic]);

  // Filtered by month as well
  const filteredEnriched = useMemo(() => {
    return scopeEnriched.filter((item) => {
      if (selectedMonth !== 'ALL' && item.record.month !== selectedMonth) return false;
      return true;
    });
  }, [scopeEnriched, selectedMonth]);

  // Concluded calls within filter
  const concludedCalls = useMemo(
    () => filteredEnriched.filter((c) => c.record.status === 'Concluído'),
    [filteredEnriched]
  );

  // Valid timed concluded calls (excludes source PDF date anomalies)
  const validTimedCalls = useMemo(
    () => concludedCalls.filter((c) => !c.hasDateAnomaly && c.operationHours !== null && c.operationHours > 0),
    [concludedCalls]
  );

  // Anomalous calls (kept visible in table with note, excluded from averages/rankings)
  const anomalousCalls = useMemo(
    () => concludedCalls.filter((c) => c.hasDateAnomaly),
    [concludedCalls]
  );

  // Fleet aggregates (per unique named vessel)
  const fleetAggregates = useMemo(
    () => buildFleetAggregates(filteredEnriched),
    [filteredEnriched]
  );

  // Monthly operational time chart series
  const monthlySeries = useMemo(
    () => buildMonthlyKpiSummaries(scopeEnriched),
    [scopeEnriched]
  );

  // Core Executive Records & Benchmarks
  const summaryStats = useMemo(() => {
    const longestOperationCall =
      validTimedCalls.length > 0
        ? [...validTimedCalls].sort((a, b) => (b.operationHours || 0) - (a.operationHours || 0))[0]
        : null;

    const mostTripsVessel =
      fleetAggregates.length > 0
        ? [...fleetAggregates].sort(
            (a, b) => b.tripCount - a.tripCount || b.totalVolumeTons - a.totalVolumeTons
          )[0]
        : null;

    const namedWithDwt = filteredEnriched.filter(
      (c) => c.record.dwt > 0 && c.record.vesselName.trim().toUpperCase() !== 'TBN'
    );
    const largestDwtCall =
      namedWithDwt.length > 0
        ? [...namedWithDwt].sort((a, b) => b.record.dwt - a.record.dwt || b.record.loaMeters - a.record.loaMeters)[0]
        : null;

    const totalOperationHours = validTimedCalls.reduce((sum, c) => sum + (c.operationHours || 0), 0);
    const avgOperationHours =
      validTimedCalls.length > 0 ? totalOperationHours / validTimedCalls.length : 0;

    const waitingValid = concludedCalls.filter((c) => c.waitingHours !== null);
    const avgWaitingHours =
      waitingValid.length > 0
        ? waitingValid.reduce((sum, c) => sum + (c.waitingHours || 0), 0) / waitingValid.length
        : 0;

    const dwtUtilValid = concludedCalls.filter((c) => c.dwtUtilizationPct !== null);
    const avgDwtUtilizationPct =
      dwtUtilValid.length > 0
        ? dwtUtilValid.reduce((sum, c) => sum + (c.dwtUtilizationPct || 0), 0) / dwtUtilValid.length
        : 0;

    const loaValid = concludedCalls.filter((c) => c.record.loaMeters > 0);
    const avgLoaMeters =
      loaValid.length > 0
        ? loaValid.reduce((sum, c) => sum + c.record.loaMeters, 0) / loaValid.length
        : 0;

    return {
      longestOperationCall,
      mostTripsVessel,
      largestDwtCall,
      avgOperationHours,
      avgWaitingHours,
      avgDwtUtilizationPct,
      avgLoaMeters,
      totalOperationHours,
      uniqueVesselCount: fleetAggregates.length,
    };
  }, [validTimedCalls, concludedCalls, fleetAggregates, filteredEnriched]);

  // Ranked lists for the Comparative Rankings panel
  const rankedItems = useMemo(() => {
    if (rankingTab === 'duration') {
      const sorted = [...validTimedCalls]
        .sort((a, b) => (b.operationHours || 0) - (a.operationHours || 0))
        .slice(0, 8);
      const maxVal = sorted[0]?.operationHours || 1;
      return sorted.map((item) => ({
        key: item.record.id,
        name: item.record.vesselName,
        meta: `${item.record.monthName} · ${formatIntegerBR(item.record.totalVolumeTons)} t · ${item.record.shipper}`,
        primary: `${formatDecimalBR(item.operationHours, 1)} h`,
        secondary: formatDaysHours(item.operationHours),
        pct: Math.min(100, ((item.operationHours || 0) / maxVal) * 100),
      }));
    }

    if (rankingTab === 'trips') {
      const sorted = [...fleetAggregates]
        .sort((a, b) => b.tripCount - a.tripCount || b.totalVolumeTons - a.totalVolumeTons)
        .slice(0, 8);
      const maxVal = sorted[0]?.tripCount || 1;
      return sorted.map((item) => ({
        key: item.vesselKey,
        name: item.vesselName,
        meta: `${formatIntegerBR(item.totalVolumeTons)} t · ${formatDaysHours(item.totalOperationHours)} em operação`,
        primary: `${item.tripCount} ${item.tripCount === 1 ? 'viagem' : 'viagens'}`,
        secondary: item.avgOperationHours
          ? `Média ${formatDecimalBR(item.avgOperationHours, 1)} h`
          : 'Em andamento',
        pct: Math.min(100, (item.tripCount / maxVal) * 100),
      }));
    }

    // DWT ranking (unique named vessels)
    const sorted = [...fleetAggregates]
      .filter((v) => v.maxDwt > 0)
      .sort((a, b) => b.maxDwt - a.maxDwt || b.maxLoa - a.maxLoa)
      .slice(0, 8);
    const maxVal = sorted[0]?.maxDwt || 1;
    return sorted.map((item) => ({
      key: item.vesselKey,
      name: item.vesselName,
      meta: `LOA ${formatDecimalBR(item.maxLoa, 2)} m · ${item.tripCount} ${item.tripCount === 1 ? 'escala' : 'escalas'}`,
      primary: `${formatIntegerBR(item.maxDwt)} DWT`,
      secondary: item.avgDwtUtilizationPct ? `${formatDecimalBR(item.avgDwtUtilizationPct, 1)}% carga` : '—',
      pct: Math.min(100, (item.maxDwt / maxVal) * 100),
    }));
  }, [rankingTab, validTimedCalls, fleetAggregates]);

  // Search + Sort for Calls Table
  const sortedCallsTable = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = concludedCalls.filter((item) => {
      if (!q) return true;
      return (
        item.record.vesselName.toLowerCase().includes(q) ||
        item.record.visitCode.toLowerCase().includes(q) ||
        item.record.shipper.toLowerCase().includes(q) ||
        item.record.monthName.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const getVal = (item: EnrichedVesselKpi): number => {
        switch (callSortField) {
          case 'operationHours':
            return item.operationHours ?? -1;
          case 'waitingHours':
            return item.waitingHours ?? -1;
          case 'totalVolumeTons':
            return item.record.totalVolumeTons;
          case 'dwt':
            return item.record.dwt;
          case 'month':
            return item.record.month * 1000 + parseInt(item.record.visitCode.slice(-3) || '0', 10);
        }
      };
      const diff = getVal(a) - getVal(b);
      return callSortAsc ? diff : -diff;
    });
  }, [concludedCalls, searchQuery, callSortField, callSortAsc]);

  // Search + Sort for Fleet Consolidated Table
  const sortedFleetTable = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = fleetAggregates.filter((item) => {
      if (!q) return true;
      return (
        item.vesselName.toLowerCase().includes(q) ||
        item.shippers.some((s) => s.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      const getVal = (item: VesselFleetAggregate): number => {
        switch (fleetSortField) {
          case 'tripCount':
            return item.tripCount;
          case 'totalVolumeTons':
            return item.totalVolumeTons;
          case 'totalOperationHours':
            return item.totalOperationHours;
          case 'maxDwt':
            return item.maxDwt;
        }
      };
      const diff = getVal(a) - getVal(b);
      return fleetSortAsc ? diff : -diff;
    });
  }, [fleetAggregates, searchQuery, fleetSortField, fleetSortAsc]);

  const handleCallSort = (field: CallSortField) => {
    if (callSortField === field) {
      setCallSortAsc((prev) => !prev);
    } else {
      setCallSortField(field);
      setCallSortAsc(false);
    }
  };

  const handleFleetSort = (field: FleetSortField) => {
    if (fleetSortField === field) {
      setFleetSortAsc((prev) => !prev);
    } else {
      setFleetSortField(field);
      setFleetSortAsc(false);
    }
  };

  // Monthly chart scaling
  const monthlyChartMetrics = useMemo(() => {
    const values = monthlySeries.map((m) =>
      chartMetric === 'operationHours' ? m.avgOperationHours : m.avgWaitingHours
    );
    const maxVal = Math.max(...values, 1);
    const avgVal =
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    return { maxVal, avgVal };
  }, [monthlySeries, chartMetric]);

  const activeHoveredMonthData = useMemo(() => {
    const targetMonth = hoveredMonth ?? (selectedMonth !== 'ALL' ? selectedMonth : null);
    if (!targetMonth) return null;
    return monthlySeries.find((m) => m.month === targetMonth) || null;
  }, [hoveredMonth, selectedMonth, monthlySeries]);

  const hasActiveFilters =
    selectedMonth !== 'ALL' ||
    selectedShipper !== 'ALL' ||
    selectedTraffic !== 'ALL' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedMonth('ALL');
    setSelectedShipper('ALL');
    setSelectedTraffic('ALL');
    setSearchQuery('');
  };

  const handleExportCsv = () => {
    const headers = [
      'Codigo',
      'Navio',
      'Mes',
      'Embarcador',
      'Navegacao',
      'DWT',
      'LOA_m',
      'Volume_t',
      'ETA',
      'ETB',
      'ETD',
      'Espera_h',
      'Operacao_h',
      'Operacao_dias',
      'Aproveitamento_DWT_pct',
      'Observacao',
    ];
    const rows = sortedCallsTable.map((item) => [
      item.record.visitCode,
      `"${item.record.vesselName}"`,
      item.record.monthName,
      item.record.shipper,
      item.record.trafficType,
      item.record.dwt,
      item.record.loaMeters,
      item.record.totalVolumeTons,
      item.record.eta,
      item.record.etb,
      item.record.etd,
      item.waitingHours !== null ? item.waitingHours.toFixed(2) : '',
      item.operationHours !== null ? item.operationHours.toFixed(2) : '',
      item.operationDays !== null ? item.operationDays.toFixed(2) : '',
      item.dwtUtilizationPct !== null ? item.dwtUtilizationPct.toFixed(1) : '',
      item.hasDateAnomaly ? `"${item.anomalyReason || 'Data divergente no PDF'}"` : '',
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kpis-navios-intersal-2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-slate-100">
      {/* Header & Filter Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
              KPIs Operacionais de Navios
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Line-Up Oficial INTERSAL</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Atualizado em {LINEUP_LAST_UPDATED}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {validTimedCalls.length} escalas concluídas analisadas
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <select
              aria-label="Filtrar por mês"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os meses (2026)</option>
              {MONTHLY_SALT_SUMMARIES.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.monthName}
                </option>
              ))}
            </select>

            {/* Shipper Segmented Control */}
            <div className="inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              {(['ALL', 'SALINOR', 'SDB'] as const).map((shipper) => (
                <button
                  key={shipper}
                  type="button"
                  onClick={() => setSelectedShipper(shipper)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedShipper === shipper
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {shipper === 'ALL' ? 'Todos' : shipper}
                </button>
              ))}
            </div>

            {/* Traffic Segmented Control */}
            <div className="inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              {(['ALL', 'EXP', 'CBT'] as const).map((traffic) => (
                <button
                  key={traffic}
                  type="button"
                  onClick={() => setSelectedTraffic(traffic)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedTraffic === traffic
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {traffic === 'ALL' ? 'EXP + CBT' : traffic}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Benchmark Summary Strip (hairline separated, zero nested cards) */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-slate-400">Tempo médio de operação</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {formatDecimalBR(summaryStats.avgOperationHours, 1)}{' '}
              <span className="text-xs font-medium text-slate-400">h</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {formatDaysHours(summaryStats.avgOperationHours)} por navio (ETB → ETD)
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Espera média em fundeio</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {formatDecimalBR(summaryStats.avgWaitingHours, 1)}{' '}
              <span className="text-xs font-medium text-slate-400">h</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {formatDaysHours(summaryStats.avgWaitingHours)} entre ETA e ETB
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Aproveitamento médio do porte</p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
              {formatDecimalBR(summaryStats.avgDwtUtilizationPct, 1)}%
            </p>
            <p className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {summaryStats.uniqueVesselCount} navios distintos · LOA médio{' '}
              {formatDecimalBR(summaryStats.avgLoaMeters, 1)} m
            </p>
          </div>
        </div>
      </section>

      {/* 3 Primary Record Cards (Longest operation time, most trips, highest DWT) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* 1. Longest Operation Time (Hours & Days) */}
        <article className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
              <span>Mais horas e dias em operação</span>
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
            {summaryStats.longestOperationCall ? (
              <>
                <h3 className="mt-2 text-base sm:text-lg font-bold text-white truncate">
                  {summaryStats.longestOperationCall.record.vesselName}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums">
                    {formatDecimalBR(summaryStats.longestOperationCall.operationHours, 1)}
                  </span>
                  <span className="text-xs font-medium text-slate-300">horas</span>
                </div>
                <p className="mt-1 text-xs text-slate-300 font-mono tabular-nums">
                  {formatDaysHours(summaryStats.longestOperationCall.operationHours)} (
                  {formatDecimalBR(summaryStats.longestOperationCall.operationDays, 2)} dias)
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Sem dados concluídos no filtro.</p>
            )}
          </div>
          {summaryStats.longestOperationCall && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-mono tabular-nums">
                {formatIntegerBR(summaryStats.longestOperationCall.record.totalVolumeTons)} t
              </span>
              <span aria-hidden="true">·</span>
              <span>{summaryStats.longestOperationCall.record.shipper}</span>
              <span aria-hidden="true">·</span>
              <span>{summaryStats.longestOperationCall.record.monthName}</span>
            </div>
          )}
        </article>

        {/* 3. Most Trips */}
        <article className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
              <span>Navio com mais viagens</span>
              <Repeat className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            {summaryStats.mostTripsVessel ? (
              <>
                <h3 className="mt-2 text-base sm:text-lg font-bold text-white truncate">
                  {summaryStats.mostTripsVessel.vesselName}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-cyan-400 font-mono tabular-nums">
                    {summaryStats.mostTripsVessel.tripCount}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {summaryStats.mostTripsVessel.tripCount === 1 ? 'viagem' : 'viagens'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 font-mono tabular-nums">
                  {formatIntegerBR(summaryStats.mostTripsVessel.totalVolumeTons)} t acumuladas
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Sem navios nomeados no filtro.</p>
            )}
          </div>
          {summaryStats.mostTripsVessel && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span>{summaryStats.mostTripsVessel.concludedTrips} concluídas</span>
              {summaryStats.mostTripsVessel.operatingTrips > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">
                    {summaryStats.mostTripsVessel.operatingTrips} em operação
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatDaysHours(summaryStats.mostTripsVessel.totalOperationHours)} em operação
              </span>
            </div>
          )}
        </article>

        {/* 4. Largest DWT */}
        <article className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
              <span>Maior porte bruto (DWT)</span>
              <Scale className="w-4 h-4 text-sky-400 shrink-0" />
            </div>
            {summaryStats.largestDwtCall ? (
              <>
                <h3 className="mt-2 text-base sm:text-lg font-bold text-white truncate">
                  {summaryStats.largestDwtCall.record.vesselName}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-sky-400 font-mono tabular-nums">
                    {formatIntegerBR(summaryStats.largestDwtCall.record.dwt)}
                  </span>
                  <span className="text-xs font-medium text-slate-300">DWT</span>
                </div>
                <p className="mt-1 text-xs text-slate-300 font-mono tabular-nums">
                  LOA {formatDecimalBR(summaryStats.largestDwtCall.record.loaMeters, 2)} m
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Sem DWT informado no filtro.</p>
            )}
          </div>
          {summaryStats.largestDwtCall && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-mono tabular-nums">
                Carga {formatIntegerBR(summaryStats.largestDwtCall.record.totalVolumeTons)} t
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatDecimalBR(summaryStats.largestDwtCall.dwtUtilizationPct, 1)}% do DWT
              </span>
              <span aria-hidden="true">·</span>
              <span>{summaryStats.largestDwtCall.record.trafficType}</span>
            </div>
          )}
        </article>
      </section>

      {/* Main Analytics Split: Monthly Trend Chart + Interactive Rankings */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Monthly Performance Bar Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Desempenho Mensal</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clique em uma barra para filtrar o mês nos indicadores e na tabela
                </p>
              </div>
              <div className="inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setChartMetric('operationHours')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartMetric === 'operationHours'
                      ? 'bg-slate-800 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Operação (h)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('waitingHours')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartMetric === 'waitingHours'
                      ? 'bg-slate-800 text-sky-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Espera (h)
                </button>
              </div>
            </div>

            {/* Active Month Readout */}
            <div className="mt-3 min-h-[24px] text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {activeHoveredMonthData ? (
                <>
                  <span className="font-semibold text-white">
                    {activeHoveredMonthData.monthName}/2026
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono tabular-nums text-amber-300">
                    {formatDecimalBR(activeHoveredMonthData.avgOperationHours, 1)} h operação
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {formatDecimalBR(activeHoveredMonthData.avgWaitingHours, 1)} h espera
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    {activeHoveredMonthData.concludedCount} navios
                  </span>
                </>
              ) : (
                <span className="text-slate-400">
                  Média do período selecionado:{' '}
                  <strong className="text-slate-200 font-mono tabular-nums">
                    {formatDecimalBR(monthlyChartMetrics.avgVal, 1)} h
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Bar Chart Canvas */}
          {monthlySeries.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Nenhuma escala concluída para os filtros selecionados.
            </div>
          ) : (
            <div className="mt-5 relative">
              {/* Average Reference Line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-slate-600/80 pointer-events-none z-10"
                style={{
                  bottom: `${Math.max(
                    12,
                    Math.min(
                      88,
                      (monthlyChartMetrics.avgVal / monthlyChartMetrics.maxVal) * 76 + 14
                    )
                  )}%`,
                }}
              >
                <span className="absolute right-0 -top-4 text-[10px] font-mono tabular-nums text-slate-400 bg-slate-900/90 px-1">
                  Média {formatDecimalBR(monthlyChartMetrics.avgVal, 0)} h
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2 items-end h-56 pt-6 pb-2">
                {monthlySeries.map((item) => {
                  const val =
                    chartMetric === 'operationHours'
                      ? item.avgOperationHours
                      : item.avgWaitingHours;
                  const heightPct = Math.max(8, (val / monthlyChartMetrics.maxVal) * 100);
                  const isSelected = selectedMonth === item.month;
                  const barColor =
                    chartMetric === 'operationHours'
                      ? isSelected
                        ? 'bg-amber-400'
                        : 'bg-amber-500/80 hover:bg-amber-400'
                      : isSelected
                      ? 'bg-sky-400'
                      : 'bg-sky-500/80 hover:bg-sky-400';

                  return (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() =>
                        setSelectedMonth(selectedMonth === item.month ? 'ALL' : item.month)
                      }
                      onMouseEnter={() => setHoveredMonth(item.month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="h-full flex flex-col items-center justify-end gap-1.5 group focus:outline-none"
                      title={`${item.monthName}: ${formatDecimalBR(val, 1)} h`}
                    >
                      <span className="text-[10px] font-mono tabular-nums text-slate-300 group-hover:text-white transition-colors">
                        {formatDecimalBR(val, 0)}
                      </span>
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          className={`w-full max-w-[30px] rounded-t-md transition-colors ${barColor} ${
                            selectedMonth !== 'ALL' && !isSelected ? 'opacity-40' : ''
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {item.shortMonth}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Comparative Rankings */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white">Rankings de Navios</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">Top 8</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'duration', label: 'Mais Tempo' },
                { id: 'trips', label: 'Viagens' },
                { id: 'dwt', label: 'Maior DWT' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRankingTab(tab.id)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                  rankingTab === tab.id
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {rankedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Nenhum navio encontrado para os filtros aplicados.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800/80 flex-1">
              {rankedItems.map((item, idx) => (
                <li key={item.key} className="py-2.5 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => setSearchQuery(item.name)}
                    className="w-full text-left group focus:outline-none"
                    title="Clique para filtrar este navio na tabela abaixo"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-baseline gap-2">
                        <span className="text-xs font-mono tabular-nums text-slate-500 w-5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-300 truncate transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-white font-mono tabular-nums">
                          {item.primary}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 pl-7 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate">{item.meta}</span>
                      <span className="font-mono tabular-nums text-slate-300 shrink-0">
                        {item.secondary}
                      </span>
                    </div>

                    <div className="mt-1.5 pl-7">
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rankingTab === 'duration'
                              ? 'bg-amber-500'
                              : rankingTab === 'trips'
                              ? 'bg-cyan-500'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.max(4, item.pct)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Detailed Analytical Table: Per Call OR Consolidated By Vessel */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Detalhamento Operacional</span>
            </h3>

            <div className="inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setTableView('calls')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tableView === 'calls'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Escala ({sortedCallsTable.length})
              </button>
              <button
                type="button"
                onClick={() => setTableView('fleet')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tableView === 'fleet'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Consolidado por Navio ({sortedFleetTable.length})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar navio, código ou embarcador..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {tableView === 'calls' ? (
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                  <th className="py-3 px-4 font-semibold">Navio / Escala</th>
                  <th className="py-3 px-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleCallSort('month')}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      <span>Mês</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleCallSort('dwt')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>DWT / LOA</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleCallSort('totalVolumeTons')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Volume (t)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleCallSort('waitingHours')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Espera</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleCallSort('operationHours')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Operação</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {sortedCallsTable.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Nenhuma escala concluída encontrada para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  sortedCallsTable.map((item) => (
                    <tr
                      key={item.record.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.record.vesselName}</div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          {item.record.visitCode} · {item.record.shipper} · {item.record.trafficType}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <div>{item.record.monthName}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {item.record.etb.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="text-slate-200">{formatIntegerBR(item.record.dwt)}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatDecimalBR(item.record.loaMeters, 1)} m
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-white">
                          {formatIntegerBR(item.record.totalVolumeTons)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDecimalBR(item.dwtUtilizationPct, 1)}% DWT
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="text-slate-200">
                          {item.waitingHours !== null
                            ? `${formatDecimalBR(item.waitingHours, 1)} h`
                            : '—'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDaysHours(item.waitingHours)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {item.hasDateAnomaly ? (
                          <span
                            className="text-amber-400"
                            title={item.anomalyReason}
                          >
                            Data PDF divergente
                          </span>
                        ) : (
                          <>
                            <div className="text-slate-100 font-medium">
                              {formatDecimalBR(item.operationHours, 1)} h
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatDaysHours(item.operationHours)}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                  <th className="py-3 px-4 font-semibold">Navio</th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleFleetSort('tripCount')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Viagens</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleFleetSort('maxDwt')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>DWT / LOA</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleFleetSort('totalVolumeTons')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Volume Total (t)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleFleetSort('totalOperationHours')}
                      className="inline-flex items-center gap-1 hover:text-white ml-auto"
                    >
                      <span>Tempo Total em Operação</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {sortedFleetTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Nenhum navio encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  sortedFleetTable.map((vessel) => (
                    <tr
                      key={vessel.vesselKey}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <Ship className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{vessel.vesselName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 pl-5">
                          {vessel.shippers.join(' / ')} · {vessel.trafficTypes.join(' / ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-bold text-cyan-300">{vessel.tripCount}</div>
                        <div className="text-[11px] text-slate-400">
                          {vessel.concludedTrips} concl.
                          {vessel.operatingTrips > 0 ? ` · ${vessel.operatingTrips} op.` : ''}
                          {vessel.plannedTrips > 0 ? ` · ${vessel.plannedTrips} prev.` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="text-slate-200">{formatIntegerBR(vessel.maxDwt)}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatDecimalBR(vessel.maxLoa, 1)} m
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-white">
                          {formatIntegerBR(vessel.totalVolumeTons)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {vessel.avgDwtUtilizationPct
                            ? `${formatDecimalBR(vessel.avgDwtUtilizationPct, 1)}% DWT`
                            : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {vessel.validTimedTrips > 0 ? (
                          <>
                            <div className="text-slate-100 font-medium">
                              {formatDecimalBR(vessel.totalOperationHours, 1)} h
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatDaysHours(vessel.totalOperationHours)} · média{' '}
                              {formatDecimalBR(vessel.avgOperationHours, 1)} h
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Source Data Integrity Note (transparently flags PDF date typos excluded from averages) */}
        {anomalousCalls.length > 0 && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Nota de integridade: {anomalousCalls.length}{' '}
              {anomalousCalls.length === 1 ? 'escala' : 'escalas'} (
              {anomalousCalls.map((c) => `${c.record.vesselName} · ${c.record.visitCode}`).join(', ')}
              ) possui data de ETD divergente no PDF oficial da Intersal e foi desconsiderada
              automaticamente das médias de tempo para manter a precisão dos KPIs.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
