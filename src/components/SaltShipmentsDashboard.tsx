import React, { useState, useMemo } from 'react';
import {
  Anchor,
  ArrowDownUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Factory,
  FileSpreadsheet,
  FileText,
  Globe2,
  Navigation,
  PieChart,
  Search,
  Ship,
  TrendingUp,
  Waves,
  Sparkles,
  Share2,
} from 'lucide-react';
import {
  SALT_SHIPMENTS_2026,
  MONTHLY_SALT_SUMMARIES,
  OVERALL_TOTALS,
  LINEUP_LAST_UPDATED,
  SaltVesselRecord,
  getActiveAndNextVessel,
} from '../data/saltShipmentsData';

interface SaltShipmentsDashboardProps {
  onSelectVesselOnMap?: (vesselName: string) => void;
}

export const SaltShipmentsDashboard: React.FC<SaltShipmentsDashboardProps> = () => {
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [selectedShipper, setSelectedShipper] = useState<'ALL' | 'SALINOR' | 'SDB'>('ALL');
  const [selectedTraffic, setSelectedTraffic] = useState<'ALL' | 'EXP' | 'CBT'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Concluído' | 'Em operação' | 'Confirmado' | 'Previsto'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'etb' | 'totalVolumeTons' | 'loaMeters' | 'vesselName'>('etb');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [timelineMonth, setTimelineMonth] = useState<number>(10); // Default to October 2026 (current active line-up month with vessel in operation)

  // Active Operating Vessel & Next Vessel in Line-up (determined right after the last concluded vessel)
  const { operatingVessel: activeOperatingVessel, nextPlannedVessel } = useMemo(
    () => getActiveAndNextVessel(SALT_SHIPMENTS_2026),
    []
  );

  // Timeline month details & vessels separated by Operating, Scheduled (Confirmed/Planned), and Concluded
  const timelineMonthInfo = useMemo(() => {
    return MONTHLY_SALT_SUMMARIES.find((m) => m.month === timelineMonth) || MONTHLY_SALT_SUMMARIES[MONTHLY_SALT_SUMMARIES.length - 1];
  }, [timelineMonth]);

  const timelineVessels = useMemo(() => {
    const list = SALT_SHIPMENTS_2026.filter((v) => v.month === timelineMonth);
    const operating = list.filter((v) => v.status === 'Em operação');
    const confirmed = list.filter((v) => v.status === 'Confirmado');
    const planned = list.filter((v) => v.status === 'Previsto');
    const concluded = list.filter((v) => v.status === 'Concluído');
    return {
      operating,
      confirmed,
      planned,
      scheduled: [...confirmed, ...planned],
      concluded,
      all: [...operating, ...confirmed, ...planned, ...concluded],
      totalCount: list.length,
    };
  }, [timelineMonth]);

  // Filtered vessels calculation
  const filteredVessels = useMemo(() => {
    return SALT_SHIPMENTS_2026.filter((v) => {
      if (selectedMonth !== 'ALL' && v.month !== selectedMonth) return false;
      if (selectedShipper !== 'ALL' && v.shipper !== selectedShipper) return false;
      if (selectedTraffic !== 'ALL' && v.trafficType !== selectedTraffic) return false;
      if (selectedStatus !== 'ALL' && v.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.vesselName.toLowerCase().includes(q);
        const matchesCode = v.visitCode.toLowerCase().includes(q);
        const matchesShipper = v.shipper.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesShipper) return false;
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'vesselName') {
        comparison = a.vesselName.localeCompare(b.vesselName);
      } else if (sortField === 'totalVolumeTons') {
        comparison = a.totalVolumeTons - b.totalVolumeTons;
      } else if (sortField === 'loaMeters') {
        comparison = a.loaMeters - b.loaMeters;
      } else {
        // Sort by month and ID order
        comparison = a.month === b.month ? a.visitCode.localeCompare(b.visitCode) : a.month - b.month;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [selectedMonth, selectedShipper, selectedTraffic, selectedStatus, searchQuery, sortField, sortAsc]);

  // Concluded, Operating, and Planned vessels partition
  const concludedFilteredVessels = useMemo(() => {
    return filteredVessels.filter((v) => v.status === 'Concluído');
  }, [filteredVessels]);

  const operatingFilteredVessels = useMemo(() => {
    return filteredVessels.filter((v) => v.status === 'Em operação');
  }, [filteredVessels]);

  const plannedFilteredVessels = useMemo(() => {
    return filteredVessels.filter((v) => v.status === 'Previsto');
  }, [filteredVessels]);

  // Aggregated totals of filtered selection
  const filteredTotals = useMemo(() => {
    const targetList = filteredVessels;

    // Total programado (todos do filtro)
    const totalVolume = targetList.reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const scTotal = targetList.reduce((acc, v) => acc + v.scVolumeTons, 0);
    const sqTotal = targetList.reduce((acc, v) => acc + v.sqVolumeTons, 0);
    const salinorVolume = targetList.filter((v) => v.shipper === 'SALINOR').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const sdbVolume = targetList.filter((v) => v.shipper === 'SDB').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const expVolume = targetList.filter((v) => v.trafficType === 'EXP').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const cbtVolume = targetList.filter((v) => v.trafficType === 'CBT').reduce((acc, v) => acc + v.totalVolumeTons, 0);

    // Total Embarcado (SOMENTE Navios Concluídos)
    const concludedList = targetList.filter((v) => v.status === 'Concluído');
    const concludedVolume = concludedList.reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const concludedScTotal = concludedList.reduce((acc, v) => acc + v.scVolumeTons, 0);
    const concludedSqTotal = concludedList.reduce((acc, v) => acc + v.sqVolumeTons, 0);
    const concludedSalinor = concludedList.filter((v) => v.shipper === 'SALINOR').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const concludedSdb = concludedList.filter((v) => v.shipper === 'SDB').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const concludedExp = concludedList.filter((v) => v.trafficType === 'EXP').reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const concludedCbt = concludedList.filter((v) => v.trafficType === 'CBT').reduce((acc, v) => acc + v.totalVolumeTons, 0);

    // Navios Em Operação e Previstos
    const operatingList = targetList.filter((v) => v.status === 'Em operação');
    const operatingVolume = operatingList.reduce((acc, v) => acc + v.totalVolumeTons, 0);
    const plannedList = targetList.filter((v) => v.status === 'Previsto');
    const plannedVolume = plannedList.reduce((acc, v) => acc + v.totalVolumeTons, 0);

    return {
      totalVolume,
      scTotal,
      sqTotal,
      vesselCount: targetList.length,
      salinorVolume,
      sdbVolume,
      expVolume,
      cbtVolume,
      concludedVolume,
      concludedScTotal,
      concludedSqTotal,
      concludedSalinor,
      concludedSdb,
      concludedExp,
      concludedCbt,
      concludedCount: concludedList.length,
      operatingVolume,
      operatingCount: operatingList.length,
      plannedVolume,
      plannedCount: plannedList.length,
    };
  }, [filteredVessels]);

  // Copy formatted WhatsApp report
  const handleCopyWhatsAppReport = () => {
    const monthLabel = selectedMonth === 'ALL' ? 'Janeiro a Setembro / 2026' : MONTHLY_SALT_SUMMARIES.find((m) => m.month === selectedMonth)?.monthName + ' / 2026';
    
    let text = `⚓ *INTERSAL - RELATÓRIO DE EMBARQUE DE SAL (TERMISA)*\n`;
    text += `📅 *Período:* ${monthLabel}\n`;
    text += `🕒 *Atualizado em:* ${LINEUP_LAST_UPDATED}\n\n`;
    text += `✅ *TOTAL EMBARCADO (SOMENTE NAVIOS CONCLUÍDOS):* ${filteredTotals.concludedVolume.toLocaleString('pt-BR')} t\n`;
    text += `🚢 *Navios Concluídos:* ${filteredTotals.concludedCount} navios\n`;
    text += `  • Sal Comum (SC): ${filteredTotals.concludedScTotal.toLocaleString('pt-BR')} t (${((filteredTotals.concludedScTotal / (filteredTotals.concludedVolume || 1)) * 100).toFixed(1)}%)\n`;
    text += `  • Sal Químico (SQ): ${filteredTotals.concludedSqTotal.toLocaleString('pt-BR')} t (${((filteredTotals.concludedSqTotal / (filteredTotals.concludedVolume || 1)) * 100).toFixed(1)}%)\n\n`;
    text += `🏢 *Por Salineira:*\n`;
    text += `  • SALINOR: ${filteredTotals.concludedSalinor.toLocaleString('pt-BR')} t (${((filteredTotals.concludedSalinor / (filteredTotals.concludedVolume || 1)) * 100).toFixed(1)}%)\n`;
    text += `  • SDB: ${filteredTotals.concludedSdb.toLocaleString('pt-BR')} t (${((filteredTotals.concludedSdb / (filteredTotals.concludedVolume || 1)) * 100).toFixed(1)}%)\n\n`;
    text += `🌐 *Por Tráfego:*\n`;
    text += `  • Exportação (EXP): ${filteredTotals.concludedExp.toLocaleString('pt-BR')} t\n`;
    text += `  • Cabotagem (CBT): ${filteredTotals.concludedCbt.toLocaleString('pt-BR')} t\n\n`;
    text += `📋 *Line-up de Navios Concluídos:*\n`;

    filteredVessels.forEach((v, idx) => {
      const typeBreakdown = v.scVolumeTons > 0 && v.sqVolumeTons > 0
        ? ` [SC: ${v.scVolumeTons.toLocaleString('pt-BR')} | SQ: ${v.sqVolumeTons.toLocaleString('pt-BR')}]`
        : v.sqVolumeTons > 0
        ? ` [SQ: ${v.sqVolumeTons.toLocaleString('pt-BR')}]`
        : ` [SC: ${v.scVolumeTons.toLocaleString('pt-BR')}]`;
      text += `${idx + 1}. *${v.vesselName}* (${v.visitCode} • ${v.dwt.toLocaleString('pt-BR')} DWT • ${v.shipper} - ${v.trafficType}) | ${v.totalVolumeTons.toLocaleString('pt-BR')} t${typeBreakdown} • ETB: ${v.etb.split(' ')[0]} • Status: [${v.status}]\n`;
    });

    text += `\n_Fonte: Sistema de Monitoramento INTERSAL / DHN 2026_`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const maxMonthlyVolume = Math.max(...MONTHLY_SALT_SUMMARIES.map((m) => m.concludedTotalVolume || 1));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner & Title with Planned Vessels */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/80 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner shrink-0">
              <Ship className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  INTERSAL
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  Jan a Out / 2026
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-cyan-400" />
                  Atualizado: {LINEUP_LAST_UPDATED}
                </span>
                <a
                  href="/programacao-navios.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded-full bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 text-[10px] font-semibold flex items-center gap-1 transition-all hover:scale-105"
                  title="Abrir PDF Oficial emitido pela Intersal"
                >
                  <FileText className="w-2.5 h-2.5 text-blue-400" />
                  PDF Oficial Intersal
                </a>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                Painel de Embarque (Line-Up)
              </h1>
            </div>
          </div>

          {/* Real-Time Port Status Badge (Em Operação / Previsto) */}
          <div className="flex items-center gap-2">
            {activeOperatingVessel ? (
              <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-amber-500/70 text-amber-300 shadow-lg flex items-center gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute opacity-75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 relative" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">
                      EM OPERAÇÃO NO TERMINAL
                    </span>
                  </div>
                  <div className="text-xs font-black text-white font-mono flex items-center gap-1.5 mt-0.5">
                    <Ship className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeOperatingVessel.vesselName}</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-cyan-300">
                      {activeOperatingVessel.totalVolumeTons.toLocaleString('pt-BR')} t{' '}
                      {activeOperatingVessel.scVolumeTons > 0 && activeOperatingVessel.sqVolumeTons > 0
                        ? 'SC/SQ'
                        : activeOperatingVessel.scVolumeTons > 0
                        ? 'SC'
                        : 'SQ'}
                    </span>
                  </div>
                </div>
              </div>
            ) : nextPlannedVessel ? (
              <div className={`px-3.5 py-2 rounded-xl bg-slate-950/90 border shadow-lg flex items-center gap-3 ${
                nextPlannedVessel.status === 'Confirmado'
                  ? 'border-indigo-500/70 text-indigo-300'
                  : 'border-cyan-500/60 text-cyan-300'
              }`}>
                <div className="relative flex items-center justify-center shrink-0">
                  <Clock className={`w-3.5 h-3.5 ${nextPlannedVessel.status === 'Confirmado' ? 'text-indigo-400' : 'text-cyan-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      nextPlannedVessel.status === 'Confirmado'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    }`}>
                      {nextPlannedVessel.status === 'Confirmado' ? 'PRÓXIMO CONFIRMADO' : 'PRÓXIMO PREVISTO'}
                    </span>
                  </div>
                  <div className="text-xs font-black text-white font-mono flex items-center gap-1.5 mt-0.5">
                    <Ship className={`w-3.5 h-3.5 ${nextPlannedVessel.status === 'Confirmado' ? 'text-indigo-400' : 'text-cyan-400'}`} />
                    <span>{nextPlannedVessel.vesselName}</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-amber-300 font-semibold">
                      {nextPlannedVessel.etb ? `ETB ${nextPlannedVessel.etb.split(' ')[0]}` : `ETA ${nextPlannedVessel.eta.split(' ')[0]}`}
                    </span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-white">
                      {nextPlannedVessel.totalVolumeTons.toLocaleString('pt-BR')} t
                    </span>
                    <span className="text-slate-400 font-normal hidden sm:inline">•</span>
                    <span className="text-slate-300 font-normal hidden sm:inline">{nextPlannedVessel.shipper}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm flex items-center gap-2">
                <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Berço Disponível
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Embedded Chronological Schedule & Vessels Box (Operating, Planned & Concluded) with Month Navigation */}
        <div className="relative z-10 mt-4 pt-4 border-t border-slate-800/80 space-y-3">
          {/* Navigation Bar: Mês Anterior, Current Month, Próximo Mês */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Cronograma de Embarques por Mês
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {timelineVessels.totalCount} navios no mês
              </span>
            </div>

            {/* Month Switcher Controls */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setTimelineMonth((prev) => Math.max(1, prev - 1))}
                disabled={timelineMonth === 1}
                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white hover:bg-slate-800"
                title="Ver mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Mês Anterior</span>
              </button>

              <div className="px-3 py-1 bg-cyan-950/70 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs font-bold flex items-center gap-1.5">
                <span>{timelineMonthInfo.monthName} / 2026</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-900/60 text-cyan-200 font-mono">
                  {timelineMonthInfo.vesselCount} navios
                </span>
              </div>

              <button
                type="button"
                onClick={() => setTimelineMonth((prev) => Math.min(MONTHLY_SALT_SUMMARIES.length, prev + 1))}
                disabled={timelineMonth === MONTHLY_SALT_SUMMARIES.length}
                className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white hover:bg-slate-800"
                title="Ver próximo mês"
              >
                <span className="text-[11px] hidden sm:inline">Próximo Mês</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Quick Jump Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {MONTHLY_SALT_SUMMARIES.map((m) => {
              const isActive = timelineMonth === m.month;
              return (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => setTimelineMonth(m.month)}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span>{m.shortMonth}</span>
                  <span className={`text-[9px] font-mono ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    ({m.vesselCount})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Group 1: Operating Vessels (Em operação) */}
          {timelineVessels.operating.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Navios Em Operação no Porto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {timelineVessels.operating.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 sm:p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/60 hover:border-amber-400 transition shadow-md flex flex-col justify-between group overflow-hidden"
                  >
                    {/* Top Vessel Info Header: Row 1 = Name + Status on Left, Volume Badge on Right */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-300 transition flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{v.vesselName}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/60 text-[9px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                            Em operação
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/50 text-xs sm:text-sm font-extrabold text-amber-200 font-mono tracking-tight shadow-sm whitespace-nowrap">
                            {v.totalVolumeTons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      </div>

                      {/* Subtitle / Metadata Row (Row 2, full width) */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] font-mono">
                        <span className="text-cyan-400 font-semibold">{v.visitCode}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-200 font-semibold">{v.shipper}</span>
                        <span className="text-slate-400">({v.trafficType})</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-300 font-medium">
                          {v.sqVolumeTons > 0 && v.scVolumeTons > 0
                            ? `SC: ${v.scVolumeTons.toLocaleString('pt-BR')} t | SQ: ${v.sqVolumeTons.toLocaleString('pt-BR')} t`
                            : v.sqVolumeTons > 0
                            ? 'Sal Químico (SQ)'
                            : 'Sal Comum (SC)'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          {v.loaMeters > 0 ? `${v.loaMeters.toFixed(1)}m LOA` : 'LOA a definir'} • {v.dwt > 0 ? `${v.dwt.toLocaleString('pt-BR')} DWT` : 'DWT a definir'}
                        </span>
                      </div>
                    </div>

                    {/* 3 Chronological Time Blocks: ETA -> ETB -> ETD */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono">
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETA</span>
                        <span className="text-slate-200 font-bold">{v.eta.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.eta.split(' ')[1]}</span>
                      </div>

                      <div className="p-1.5 rounded-lg border bg-amber-950/40 border-amber-500/50 text-amber-300">
                        <span className="text-[9px] block uppercase font-sans font-bold text-amber-400">
                          ETB Atracação
                        </span>
                        <span className="font-bold text-white">{v.etb.split(' ')[0]}</span>
                        <span className="text-[9px] block text-amber-400">{v.etb.split(' ')[1]}</span>
                      </div>

                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETD Previsto</span>
                        <span className="text-slate-200 font-bold">{v.etd.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.etd.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Scheduled Vessels (Confirmados & Previstos) */}
          {timelineVessels.scheduled.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Navios Programados & Previstos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {timelineVessels.scheduled.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 sm:p-3.5 rounded-xl bg-slate-950/85 border transition shadow-md flex flex-col justify-between group overflow-hidden ${
                      v.status === 'Confirmado'
                        ? 'border-indigo-500/50 hover:border-indigo-400'
                        : 'border-sky-500/40 hover:border-sky-500/80'
                    }`}
                  >
                    {/* Top Vessel Info Header: Row 1 = Name + Status on Left, Volume Badge on Right */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className={`font-bold text-white text-xs sm:text-sm transition flex items-center gap-1.5 ${
                            v.status === 'Confirmado' ? 'group-hover:text-indigo-300' : 'group-hover:text-cyan-300'
                          }`}>
                            <Ship className={`w-3.5 h-3.5 shrink-0 ${v.status === 'Confirmado' ? 'text-indigo-400' : 'text-sky-400'}`} />
                            <span className="truncate">{v.vesselName}</span>
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 shrink-0 ${
                            v.status === 'Confirmado'
                              ? 'bg-indigo-950/90 border-indigo-500/60 text-indigo-300'
                              : 'bg-sky-950/90 border-sky-500/50 text-sky-300'
                          }`}>
                            <Clock className="w-2.5 h-2.5" />
                            {v.status}
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs sm:text-sm font-extrabold font-mono tracking-tight shadow-sm whitespace-nowrap ${
                            v.status === 'Confirmado'
                              ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                              : 'bg-sky-950/60 border-sky-500/50 text-sky-200'
                          }`}>
                            {v.totalVolumeTons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      </div>

                      {/* Subtitle / Metadata Row (Row 2, full width) */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] font-mono">
                        <span className="text-cyan-400 font-semibold">{v.visitCode}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-200 font-semibold">{v.shipper}</span>
                        <span className="text-slate-400">({v.trafficType})</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-300 font-medium">
                          {v.sqVolumeTons > 0 && v.scVolumeTons > 0
                            ? `SC: ${v.scVolumeTons.toLocaleString('pt-BR')} t | SQ: ${v.sqVolumeTons.toLocaleString('pt-BR')} t`
                            : v.sqVolumeTons > 0
                            ? 'Sal Químico (SQ)'
                            : 'Sal Comum (SC)'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          {v.loaMeters > 0 ? `${v.loaMeters.toFixed(1)}m LOA` : 'LOA a definir'} • {v.dwt > 0 ? `${v.dwt.toLocaleString('pt-BR')} DWT` : 'DWT a definir'}
                        </span>
                      </div>
                    </div>

                    {/* 3 Chronological Time Blocks: ETA -> ETB -> ETD */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono">
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETA</span>
                        <span className="text-slate-200 font-bold">{v.eta.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.eta.split(' ')[1]}</span>
                      </div>

                      <div className={`p-1.5 rounded-lg border ${
                        v.status === 'Confirmado'
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                          : 'bg-sky-950/30 border-sky-900/50 text-sky-300'
                      }`}>
                        <span className={`text-[9px] block uppercase font-sans font-bold ${
                          v.status === 'Confirmado' ? 'text-indigo-400' : 'text-sky-400'
                        }`}>
                          {v.status === 'Confirmado' ? 'ETB Confirmado' : 'ETB Previsto'}
                        </span>
                        <span className="font-bold text-white">{v.etb.split(' ')[0]}</span>
                        <span className={`text-[9px] block ${v.status === 'Confirmado' ? 'text-indigo-400' : 'text-sky-400'}`}>
                          {v.etb.split(' ')[1]}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETD Previsto</span>
                        <span className="text-slate-200 font-bold">{v.etd.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.etd.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Concluded Vessels (Concluídos) */}
          {timelineVessels.concluded.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Navios Concluídos & Operados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {timelineVessels.concluded.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 sm:p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/50 transition shadow-md flex flex-col justify-between group overflow-hidden"
                  >
                    {/* Top Vessel Info Header: Row 1 = Name + Status on Left, Volume Badge on Right */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-300 transition flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{v.vesselName}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Concluído
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/50 text-xs sm:text-sm font-extrabold text-emerald-200 font-mono tracking-tight shadow-sm whitespace-nowrap">
                            {v.totalVolumeTons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      </div>

                      {/* Subtitle / Metadata Row (Row 2, full width) */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] font-mono">
                        <span className="text-cyan-400 font-semibold">{v.visitCode}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-200 font-semibold">{v.shipper}</span>
                        <span className="text-slate-400">({v.trafficType})</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-300 font-medium">
                          {v.sqVolumeTons > 0 && v.scVolumeTons > 0
                            ? `SC: ${v.scVolumeTons.toLocaleString('pt-BR')} t | SQ: ${v.sqVolumeTons.toLocaleString('pt-BR')} t`
                            : v.sqVolumeTons > 0
                            ? 'Sal Químico (SQ)'
                            : 'Sal Comum (SC)'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          {v.loaMeters > 0 ? `${v.loaMeters.toFixed(1)}m LOA` : 'LOA a definir'} • {v.dwt > 0 ? `${v.dwt.toLocaleString('pt-BR')} DWT` : 'DWT a definir'}
                        </span>
                      </div>
                    </div>

                    {/* 3 Chronological Time Blocks: ETA -> ETB -> ETD */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] font-mono">
                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETA</span>
                        <span className="text-slate-200 font-bold">{v.eta.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.eta.split(' ')[1]}</span>
                      </div>

                      <div className="p-1.5 rounded-lg border bg-cyan-950/30 border-cyan-900/50 text-cyan-300">
                        <span className="text-[9px] block uppercase font-sans font-bold text-cyan-400">
                          ETB Atracação
                        </span>
                        <span className="font-bold text-white">{v.etb.split(' ')[0]}</span>
                        <span className="text-[9px] block text-cyan-400">{v.etb.split(' ')[1]}</span>
                      </div>

                      <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase font-sans font-medium">ETD Saída</span>
                        <span className="text-slate-200 font-bold">{v.etd.split(' ')[0]}</span>
                        <span className="text-slate-400 text-[9px] block">{v.etd.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Main Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Volume Concluded or Planned */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {selectedStatus === 'Previsto'
                ? 'Volume Previsto'
                : selectedStatus === 'Em operação'
                ? 'Volume em Operação'
                : filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                ? 'Volume Programado'
                : 'Total Embarcado (Concluídos)'}
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span>
                {selectedStatus === 'Previsto'
                  ? filteredTotals.plannedVolume.toLocaleString('pt-BR')
                  : selectedStatus === 'Em operação'
                  ? filteredTotals.operatingVolume.toLocaleString('pt-BR')
                  : filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? filteredTotals.plannedVolume.toLocaleString('pt-BR')
                  : filteredTotals.concludedVolume.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-cyan-400">t</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium">
                {selectedStatus === 'Previsto'
                  ? `${filteredTotals.plannedCount} navio(s) previsto(s)`
                  : selectedStatus === 'Em operação'
                  ? `${filteredTotals.operatingCount} navio(s) em operação`
                  : filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? `${filteredTotals.plannedCount} navios programados`
                  : `${filteredTotals.concludedCount} navios concluídos`}
              </span>
              <span>•</span>
              <span>
                {filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? `Média: ${(filteredTotals.plannedVolume / (filteredTotals.plannedCount || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t/navio`
                  : `Média: ${(filteredTotals.concludedVolume / (selectedMonth === 'ALL' ? (MONTHLY_SALT_SUMMARIES.filter(m => m.concludedCount > 0).length || 1) : 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t/mês`}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (((filteredTotals.concludedVolume || filteredTotals.plannedVolume) / (OVERALL_TOTALS.totalProgrammedTons || 1)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Sal Comum (SC) vs Sal Químico (SQ) */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-sky-400 uppercase tracking-wide">
              Mix de Sal (SC vs SQ)
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sal Comum (SC)</span>
              <div className="text-sm sm:text-lg font-bold text-white leading-tight">
                {selectedStatus === 'Previsto'
                  ? (filteredTotals.scTotal - filteredTotals.concludedScTotal).toLocaleString('pt-BR')
                  : filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? filteredTotals.scTotal.toLocaleString('pt-BR')
                  : filteredTotals.concludedScTotal.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-cyan-400 font-medium">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? ((filteredTotals.scTotal / (filteredTotals.totalVolume || 1)) * 100)
                  : ((filteredTotals.concludedScTotal / (filteredTotals.concludedVolume || 1)) * 100)).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sal Químico (SQ)</span>
              <div className="text-sm sm:text-lg font-bold text-white leading-tight">
                {selectedStatus === 'Previsto'
                  ? (filteredTotals.sqTotal - filteredTotals.concludedSqTotal).toLocaleString('pt-BR')
                  : filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? filteredTotals.sqTotal.toLocaleString('pt-BR')
                  : filteredTotals.concludedSqTotal.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? ((filteredTotals.sqTotal / (filteredTotals.totalVolume || 1)) * 100)
                  : ((filteredTotals.concludedSqTotal / (filteredTotals.concludedVolume || 1)) * 100)).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 flex overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all"
              style={{
                width: `${(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? ((filteredTotals.scTotal / (filteredTotals.totalVolume || 1)) * 100)
                  : ((filteredTotals.concludedScTotal / (filteredTotals.concludedVolume || 1)) * 100))}%`,
              }}
              title="Sal Comum"
            />
            <div
              className="bg-emerald-400 h-full transition-all"
              style={{
                width: `${(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? ((filteredTotals.sqTotal / (filteredTotals.totalVolume || 1)) * 100)
                  : ((filteredTotals.concludedSqTotal / (filteredTotals.concludedVolume || 1)) * 100))}%`,
              }}
              title="Sal Químico"
            />
          </div>
        </div>

        {/* Metric 3: Frota / Navios */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-indigo-400 uppercase tracking-wide">
              {selectedStatus === 'Previsto'
                ? 'Navios Previstos'
                : filteredTotals.concludedCount === 0 && filteredTotals.plannedCount > 0
                ? 'Navios Programados'
                : 'Navios Concluídos'}
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {filteredTotals.concludedCount === 0 && filteredTotals.plannedCount > 0
                ? filteredTotals.plannedCount
                : filteredTotals.concludedCount}{' '}
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                {filteredTotals.concludedCount === 0 && filteredTotals.plannedCount > 0 ? 'previstos' : 'concluídos'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>
                Média por navio:{' '}
                {((filteredTotals.concludedVolume || filteredTotals.plannedVolume) /
                  (filteredTotals.concludedCount || filteredTotals.plannedCount || 1)
                ).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}{' '}
                t
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 flex-wrap">
            {filteredTotals.concludedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> {filteredTotals.concludedCount} Concluídos
              </span>
            )}
            {filteredTotals.operatingCount > 0 && (
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <Ship className="w-3 h-3" /> {filteredTotals.operatingCount} Em operação
              </span>
            )}
            {filteredTotals.plannedCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Clock className="w-3 h-3" /> {filteredTotals.plannedCount} Previsto
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Salinas */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-400 uppercase tracking-wide">
              Salinas (Embarque)
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">SALINOR</span>
              <span className="font-bold text-white text-sm">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? filteredTotals.salinorVolume / 1000
                  : filteredTotals.concludedSalinor / 1000
                ).toFixed(1)}k
              </span>
              <span className="text-[10px] text-cyan-400 block">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? (filteredTotals.salinorVolume / (filteredTotals.totalVolume || 1)) * 100
                  : (filteredTotals.concludedSalinor / (filteredTotals.concludedVolume || 1)) * 100
                ).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">SDB (Diamante)</span>
              <span className="font-bold text-white text-sm">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? filteredTotals.sdbVolume / 1000
                  : filteredTotals.concludedSdb / 1000
                ).toFixed(1)}k
              </span>
              <span className="text-[10px] text-amber-400 block">
                {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                  ? (filteredTotals.sdbVolume / (filteredTotals.totalVolume || 1)) * 100
                  : (filteredTotals.concludedSdb / (filteredTotals.concludedVolume || 1)) * 100
                ).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
            <span>
              EXP:{' '}
              {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                ? (filteredTotals.expVolume / (filteredTotals.totalVolume || 1)) * 100
                : (filteredTotals.concludedExp / (filteredTotals.concludedVolume || 1)) * 100
              ).toFixed(0)}%
            </span>
            <span>•</span>
            <span>
              CBT:{' '}
              {(filteredTotals.concludedVolume === 0 && filteredTotals.plannedVolume > 0
                ? (filteredTotals.cbtVolume / (filteredTotals.totalVolume || 1)) * 100
                : (filteredTotals.concludedCbt / (filteredTotals.concludedVolume || 1)) * 100
              ).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section (Monthly Bar Chart / Line Evolution + Shipper & Traffic Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart: Monthly Volume Distribution (Stacked SC vs SQ / Line Evolution) */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  {chartType === 'bar' ? (
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                  )}
                  Movimentação Mensal
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {chartType === 'bar'
                  ? 'Clique nas barras dos meses para filtrar o line-up de navios'
                  : 'Evolução e tendência do volume embarcado e projetado durante o ano (Jan a Out/2026)'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Type Switcher Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Exibir gráfico de colunas empilhadas (SC vs SQ)"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Barras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    chartType === 'line'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Exibir evolução em linha durante o ano"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Linha</span>
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2.5 text-xs pl-1 border-l border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-slate-300 text-[11px]">Sal Comum (SC)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-slate-300 text-[11px]">Sal Químico (SQ)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Content Area */}
          {chartType === 'bar' ? (
            /* Visual Interactive Stacked Bars */
            <div className="space-y-3 pt-2">
              <div
                className="gap-1 sm:gap-2.5 h-48 sm:h-56 items-end"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${MONTHLY_SALT_SUMMARIES.length}, minmax(0, 1fr))`,
                }}
              >
                {MONTHLY_SALT_SUMMARIES.map((m) => {
                  const total = m.concludedTotalVolume;
                  const isConcluded = total > 0;
                  const heightPct = isConcluded ? Math.round((total / maxMonthlyVolume) * 100) : 0;
                  const scPct = isConcluded ? (m.concludedScTotal / total) * 100 : 0;
                  const sqPct = isConcluded ? (m.concludedSqTotal / total) * 100 : 0;
                  const isSelected = selectedMonth === m.month;
                  const isRecord = isConcluded && m.month === 5; // Maio recorde 214k
                  const isSqRecord = isConcluded && m.month === 7; // Julho recorde SQ 112k

                  return (
                    <div
                      key={m.month}
                      onClick={() => setSelectedMonth(selectedMonth === m.month ? 'ALL' : m.month)}
                      onMouseEnter={() => setHoveredMonth(m.month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="flex flex-col items-center h-full justify-end group cursor-pointer"
                    >
                      {/* Value Badge on top */}
                      <div
                        className={`text-[8.5px] sm:text-[10px] md:text-[11px] font-bold mb-1 transition text-center whitespace-nowrap font-mono tracking-tighter sm:tracking-normal ${
                          isConcluded ? 'text-slate-200 group-hover:text-cyan-300' : 'text-slate-500'
                        }`}
                        title={isConcluded ? `${m.monthName}/2026: ${total.toLocaleString('pt-BR')} t` : undefined}
                      >
                        {isConcluded ? total.toLocaleString('pt-BR') : '-'}
                      </div>

                      {/* Stacked Bar Container */}
                      <div
                        className={`w-full max-w-[48px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 relative border ${
                          isSelected
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                            : !isConcluded
                            ? 'border-dashed border-slate-700/60 bg-slate-950/30'
                            : 'border-transparent group-hover:border-slate-600'
                        }`}
                        style={{ height: isConcluded ? `${heightPct}%` : '4px' }}
                      >
                        {/* Highlight badges for special months */}
                        {isRecord && (
                          <div className="absolute top-0 inset-x-0 bg-amber-500 text-slate-950 text-[8px] font-extrabold text-center py-0.5 uppercase tracking-tighter">
                            Recorde
                          </div>
                        )}
                        {isSqRecord && (
                          <div className="absolute top-0 inset-x-0 bg-emerald-500 text-slate-950 text-[8px] font-extrabold text-center py-0.5 uppercase tracking-tighter">
                            Top SQ
                          </div>
                        )}

                        {/* SQ Portion (Top) */}
                        {sqPct > 0 && (
                          <div
                            className="w-full bg-emerald-400 group-hover:bg-emerald-300 transition-colors relative"
                            style={{ height: `${sqPct}%` }}
                            title={`Sal Químico: ${m.concludedSqTotal.toLocaleString('pt-BR')} t`}
                          />
                        )}

                        {/* SC Portion (Bottom) */}
                        {scPct > 0 && (
                          <div
                            className="w-full bg-cyan-600 group-hover:bg-cyan-500 transition-colors"
                            style={{ height: `${scPct}%` }}
                            title={`Sal Comum: ${m.concludedScTotal.toLocaleString('pt-BR')} t`}
                          />
                        )}
                      </div>

                      {/* Month Label */}
                      <div className="mt-2 text-center">
                        <span
                          className={`text-[10px] sm:text-xs font-bold transition px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950'
                              : 'text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                          }`}
                        >
                          {m.shortMonth}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5 hidden sm:block font-mono">
                          {isConcluded ? `${m.concludedCount} ${m.concludedCount === 1 ? 'navio' : 'navios'}` : '0 finalizados'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Line / Trend Evolution Chart across the year */
            <div className="h-48 sm:h-56 w-full flex flex-col justify-between pt-1">
              <div className="relative w-full h-full">
                <svg
                  viewBox="0 0 700 180"
                  className="w-full h-full overflow-visible select-none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Area Gradients */}
                    <linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="sqAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0, 50000, 100000, 150000, 200000, 250000].map((val) => {
                    const y = 150 - (val / 250000) * 125;
                    return (
                      <g key={val}>
                        <line
                          x1="45"
                          y1={y}
                          x2="685"
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x="40"
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val === 0 ? '0' : `${val / 1000}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Calculate SVG Coordinates for the months */}
                  {(() => {
                    const totalMonths = MONTHLY_SALT_SUMMARIES.length;
                    const coords = MONTHLY_SALT_SUMMARIES.map((m, idx) => {
                      const x = 55 + (idx / Math.max(1, totalMonths - 1)) * 620;
                      const hasConcluded = m.concludedTotalVolume > 0;
                      const yTotal = hasConcluded ? 150 - (m.concludedTotalVolume / 250000) * 125 : 150;
                      const ySc = hasConcluded ? 150 - (m.concludedScTotal / 250000) * 125 : 150;
                      const ySq = hasConcluded ? 150 - (m.concludedSqTotal / 250000) * 125 : 150;
                      return { x, yTotal, ySc, ySq, hasConcluded, ...m };
                    });

                    // Only connect lines for months with completed shipments (Jan a Ago)
                    const activeCoords = coords.filter((c) => c.hasConcluded);
                    const totalLinePath = activeCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.yTotal}`).join(' ');
                    const totalAreaPath =
                      activeCoords.length > 0
                        ? `${totalLinePath} L ${activeCoords[activeCoords.length - 1].x} 150 L ${activeCoords[0].x} 150 Z`
                        : '';

                    const sqLinePath = activeCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.ySq}`).join(' ');
                    const sqAreaPath =
                      activeCoords.length > 0
                        ? `${sqLinePath} L ${activeCoords[activeCoords.length - 1].x} 150 L ${activeCoords[0].x} 150 Z`
                        : '';

                    return (
                      <>
                        {/* Area Fills */}
                        {totalAreaPath && <path d={totalAreaPath} fill="url(#totalAreaGrad)" />}
                        {sqAreaPath && <path d={sqAreaPath} fill="url(#sqAreaGrad)" />}

                        {/* Lines */}
                        {totalLinePath && (
                          <path
                            d={totalLinePath}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        {sqLinePath && (
                          <path
                            d={sqLinePath}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Interactive Month Columns & Circles */}
                        {coords.map((c) => {
                          const isSelected = selectedMonth === c.month;
                          const isHovered = hoveredMonth === c.month;

                          return (
                            <g
                              key={c.month}
                              className="cursor-pointer group"
                              onClick={() => setSelectedMonth(selectedMonth === c.month ? 'ALL' : c.month)}
                              onMouseEnter={() => setHoveredMonth(c.month)}
                              onMouseLeave={() => setHoveredMonth(null)}
                            >
                              {/* Invisible hit column */}
                              <rect
                                x={c.x - 30}
                                y="10"
                                width="60"
                                height="155"
                                fill="transparent"
                              />

                              {/* Vertical selection guideline */}
                              {(isSelected || isHovered) && (
                                <line
                                  x1={c.x}
                                  y1="15"
                                  x2={c.x}
                                  y2="150"
                                  stroke={isSelected ? '#06b6d4' : '#475569'}
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />
                              )}

                              {/* SQ Point */}
                              {c.hasConcluded && c.concludedSqTotal > 0 && (
                                <circle
                                  cx={c.x}
                                  cy={c.ySq}
                                  r={isSelected || isHovered ? 4.5 : 3}
                                  fill="#10b981"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                />
                              )}

                              {/* Total Volume Point */}
                              {c.hasConcluded ? (
                                <circle
                                  cx={c.x}
                                  cy={c.yTotal}
                                  r={isSelected ? 6 : isHovered ? 5.5 : 4}
                                  fill={isSelected ? '#22d3ee' : '#06b6d4'}
                                  stroke="#0f172a"
                                  strokeWidth="2.5"
                                  className="transition-all"
                                />
                              ) : (
                                <circle
                                  cx={c.x}
                                  cy={150}
                                  r={isSelected ? 4 : 2.5}
                                  fill="none"
                                  stroke="#475569"
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />
                              )}

                              {/* Month label along bottom */}
                              <text
                                x={c.x}
                                y="168"
                                textAnchor="middle"
                                fill={isSelected ? '#22d3ee' : isHovered ? '#ffffff' : '#94a3b8'}
                                fontSize="10"
                                fontWeight={isSelected ? 'bold' : 'normal'}
                              >
                                {c.shortMonth}
                              </text>

                              {/* Tons Label above point */}
                              <text
                                x={c.x}
                                y={c.hasConcluded ? c.yTotal - 8 : 142}
                                textAnchor="middle"
                                fill={c.hasConcluded ? (isSelected ? '#38bdf8' : '#e2e8f0') : '#64748b'}
                                fontSize="8"
                                fontWeight={c.hasConcluded ? 'bold' : 'normal'}
                                fontFamily="monospace"
                              >
                                {c.hasConcluded ? c.concludedTotalVolume.toLocaleString('pt-BR') : '-'}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Interactive footer note */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pico de movimentação anual: <strong className="text-white">Maio/2026 (214.650 t)</strong> • Total acumulado embarcado: <strong className="text-cyan-400">{OVERALL_TOTALS.totalTons.toLocaleString('pt-BR')} t</strong> ({OVERALL_TOTALS.concludedVessels} navios)
            </span>
            {selectedMonth !== 'ALL' && (
              <button
                onClick={() => setSelectedMonth('ALL')}
                className="text-cyan-400 hover:underline text-[11px] font-semibold cursor-pointer"
              >
                Limpar filtro de mês ✕
              </button>
            )}
          </div>
        </div>

        {/* Side Charts: Market Share by Salinas & Tráfego */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Salinas
            </h3>
            <div className="mt-4 space-y-3">
              {/* SALINOR Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-cyan-300">SALINOR</span>
                  <span className="text-white">
                    {filteredTotals.salinorVolume.toLocaleString('pt-BR')} ({((filteredTotals.salinorVolume / (filteredTotals.totalVolume || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(filteredTotals.salinorVolume / (filteredTotals.totalVolume || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* SDB Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-amber-400">SDB (Diamante Branco)</span>
                  <span className="text-white">
                    {filteredTotals.sdbVolume.toLocaleString('pt-BR')} ({((filteredTotals.sdbVolume / (filteredTotals.totalVolume || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(filteredTotals.sdbVolume / (filteredTotals.totalVolume || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modalidade de Tráfego: EXP vs CBT */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
              Tráfego (Exportação vs Cabotagem)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => setSelectedTraffic(selectedTraffic === 'EXP' ? 'ALL' : 'EXP')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedTraffic === 'EXP'
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                  <span>Exportação</span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-900/60 text-[10px]">EXP</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {filteredTotals.expVolume.toLocaleString('pt-BR')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {((filteredTotals.expVolume / (filteredTotals.totalVolume || 1)) * 100).toFixed(1)}% do volume
                </span>
              </div>

              <div
                onClick={() => setSelectedTraffic(selectedTraffic === 'CBT' ? 'ALL' : 'CBT')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedTraffic === 'CBT'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                  <span>Cabotagem</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 text-[10px]">CBT</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {filteredTotals.cbtVolume.toLocaleString('pt-BR')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {((filteredTotals.cbtVolume / (filteredTotals.totalVolume || 1)) * 100).toFixed(1)}% do volume
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Month Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Mês:
            </span>
            <button
              onClick={() => setSelectedMonth('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedMonth === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todos ({MONTHLY_SALT_SUMMARIES.length} meses)
            </button>
            {MONTHLY_SALT_SUMMARIES.map((m) => (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedMonth === m.month
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {m.shortMonth}
              </button>
            ))}
          </div>

          {/* Search Input & Secondary Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Status: Todos ({SALT_SHIPMENTS_2026.length})</option>
              <option value="Concluído">Status: Concluídos ({SALT_SHIPMENTS_2026.filter(v => v.status === 'Concluído').length})</option>
              <option value="Em operação">Status: Em operação ({SALT_SHIPMENTS_2026.filter(v => v.status === 'Em operação').length})</option>
              <option value="Confirmado">Status: Confirmados ({SALT_SHIPMENTS_2026.filter(v => v.status === 'Confirmado').length})</option>
              <option value="Previsto">Status: Previstos ({SALT_SHIPMENTS_2026.filter(v => v.status === 'Previsto').length})</option>
            </select>

            {/* Shipper Filter */}
            <select
              value={selectedShipper}
              onChange={(e) => setSelectedShipper(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Todas as Salineiras</option>
              <option value="SALINOR">SALINOR (87%)</option>
              <option value="SDB">SDB (Diamante Branco)</option>
            </select>

            {/* Traffic Filter */}
            <select
              value={selectedTraffic}
              onChange={(e) => setSelectedTraffic(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Todos os Tráfegos</option>
              <option value="EXP">Exportação (EXP)</option>
              <option value="CBT">Cabotagem (CBT)</option>
            </select>

            {/* Search Input */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar navio / visita..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Table / Line-Up */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              Line-Up Detalhado de Embarques
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {filteredVessels.length} {filteredVessels.length === 1 ? 'navio' : 'navios'}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Clique nas colunas para ordenar</span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 sm:px-4 font-bold">Mês / Visita</th>
                <th
                  onClick={() => {
                    if (sortField === 'vesselName') setSortAsc(!sortAsc);
                    else {
                      setSortField('vesselName');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-3 sm:px-4 font-bold cursor-pointer hover:text-cyan-400 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Navio</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'loaMeters') setSortAsc(!sortAsc);
                    else {
                      setSortField('loaMeters');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 font-bold text-right cursor-pointer hover:text-cyan-400 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>LOA / DWT</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'etb') setSortAsc(!sortAsc);
                    else {
                      setSortField('etb');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-cyan-400 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Datas (ETA / ETB / ETD)</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center">Status</th>
                <th className="py-3 px-3 font-bold text-right">Sal Comum (SC)</th>
                <th className="py-3 px-3 font-bold text-right">Sal Químico (SQ)</th>
                <th
                  onClick={() => {
                    if (sortField === 'totalVolumeTons') setSortAsc(!sortAsc);
                    else {
                      setSortField('totalVolumeTons');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 sm:px-4 font-bold text-right cursor-pointer hover:text-cyan-400 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total (Tons)</span>
                    <ArrowDownUp className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-bold text-center">Tráfego</th>
                <th className="py-3 px-3 sm:px-4 font-bold text-center">Salineira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredVessels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Nenhum navio encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredVessels.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Month / Visit */}
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-bold text-white text-xs">{v.monthName}</div>
                      <div className="text-[10px] text-cyan-400 font-mono font-medium">{v.visitCode}</div>
                    </td>

                    {/* Vessel Name */}
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span>{v.vesselName}</span>
                      </div>
                    </td>

                    {/* LOA & DWT */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-200">
                        {v.loaMeters > 0 ? `${v.loaMeters.toFixed(2)} m` : '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {v.dwt > 0 ? `${v.dwt.toLocaleString('pt-BR')} DWT` : 'A definir'}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-3 text-[11px] whitespace-nowrap">
                      <div className="text-slate-300 font-mono">
                        <span className="text-[9px] text-slate-500 font-sans uppercase">ETB: </span>
                        {v.etb}
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        <span className="text-[9px] text-slate-500 font-sans uppercase">ETD: </span>
                        {v.etd}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'Concluído'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                            : v.status === 'Em operação'
                            ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50'
                            : v.status === 'Confirmado'
                            ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-500/50'
                            : 'bg-sky-950/80 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {v.status === 'Concluído' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : v.status === 'Em operação' ? (
                          <Ship className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                        ) : v.status === 'Confirmado' ? (
                          <Clock className="w-2.5 h-2.5 text-indigo-400" />
                        ) : (
                          <Clock className="w-2.5 h-2.5" />
                        )}
                        {v.status}
                      </span>
                    </td>

                    {/* SC Volume */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-300 whitespace-nowrap">
                      {v.scVolumeTons > 0 ? v.scVolumeTons.toLocaleString('pt-BR') : '-'}
                    </td>

                    {/* SQ Volume */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-emerald-400 whitespace-nowrap">
                      {v.sqVolumeTons > 0 ? v.sqVolumeTons.toLocaleString('pt-BR') : '-'}
                    </td>

                    {/* Total Volume */}
                    <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-white text-xs whitespace-nowrap">
                      {v.totalVolumeTons.toLocaleString('pt-BR')}
                    </td>

                    {/* Traffic Badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          v.trafficType === 'EXP'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}
                      >
                        {v.trafficType}
                      </span>
                    </td>

                    {/* Shipper */}
                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          v.shipper === 'SALINOR'
                            ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                            : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                        }`}
                      >
                        {v.shipper}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot>
              {/* Row 1: Somente Concluídos (Total Embarcado) */}
              <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold text-xs">
                <td colSpan={5} className="py-3 px-3 sm:px-4 text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>TOTAL EMBARCADO ({filteredTotals.concludedCount} navios concluídos)</span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-cyan-300">
                  {filteredTotals.concludedScTotal.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-300">
                  {filteredTotals.concludedSqTotal.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right font-mono text-white text-sm font-black">
                  {filteredTotals.concludedVolume.toLocaleString('pt-BR')} t
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-slate-400 text-[11px] font-mono">
                  SALINOR: {filteredTotals.concludedSalinor.toLocaleString('pt-BR')} t | SDB: {filteredTotals.concludedSdb.toLocaleString('pt-BR')} t
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
