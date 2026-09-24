import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Waves, Clock, Compass, Wind, Sparkles, Ship, Calendar, Anchor } from 'lucide-react';
import { CurrentTideState } from '../utils/tideCalculations';
import { PortConfig, WeatherData } from '../types/maritime';
import { SALT_SHIPMENTS_2026 } from '../data/saltShipmentsData';

interface CurrentTideCardProps {
  tideState: CurrentTideState;
  port: PortConfig;
  currentTime: Date;
  weather?: WeatherData | null;
  onSimulateTime?: (date: Date) => void;
  isSimulated?: boolean;
  onResetSimulation?: () => void;
}

export const CurrentTideCard: React.FC<CurrentTideCardProps> = ({
  tideState,
  port,
  currentTime,
  weather,
  isSimulated,
  onResetSimulation,
}) => {
  const {
    currentHeight,
    rateOfChangeCmPerHour,
    trend,
    trendDescription,
    previousEvent,
    nextEvent,
    nextHighEvent,
    percentCycle,
    amplitude,
    coefficientType,
    minutesToNextEvent,
    minutesToNextHighEvent,
    currentWaterDepth,
  } = tideState;

  // Active Operating Vessel in Terminal (e.g. CLIPPER BARI STAR)
  const operatingVessel = SALT_SHIPMENTS_2026.find((v) => v.status === 'Em operação');
  // Next Planned Vessel in Line-up (e.g. GANNET BULKER)
  const nextPlannedVessel = !operatingVessel ? SALT_SHIPMENTS_2026.find((v) => v.status === 'Previsto') : undefined;

  // Wind speed unit toggle ('knots' or 'kmh')
  const [windUnit, setWindUnit] = useState<'knots' | 'kmh'>(() => {
    try {
      return (localStorage.getItem('preferred_wind_unit') as 'knots' | 'kmh') || 'knots';
    } catch {
      return 'knots';
    }
  });

  const handleToggleWindUnit = (unit: 'knots' | 'kmh') => {
    setWindUnit(unit);
    try {
      localStorage.setItem('preferred_wind_unit', unit);
    } catch {}
  };

  const highEventToDisplay = nextHighEvent || (nextEvent.type === 'high' ? nextEvent : previousEvent);
  const hoursToNextHigh = Math.floor(minutesToNextHighEvent / 60);
  const minsToNextHigh = minutesToNextHighEvent % 60;

  // Calculate percentage of water level inside gauge (0m to 4.0m range)
  const maxScale = 4.0;
  const heightPercent = Math.min(100, Math.max(5, (currentHeight / maxScale) * 100));

  const getTrendIcon = () => {
    if (trend === 'ENCHENDO') {
      return <ArrowUpRight className="w-5 h-5 text-emerald-400 animate-bounce" />;
    } else if (trend === 'VAZANDO') {
      return <ArrowDownRight className="w-5 h-5 text-amber-400 animate-bounce" />;
    }
    return <Minus className="w-5 h-5 text-cyan-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'ENCHENDO') return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    if (trend === 'VAZANDO') return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
    return 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30';
  };

  // Fallback / real weather values
  const windKnots = weather ? weather.windSpeedKnots : 12;
  const windKmH = Math.round(windKnots * 1.852);
  const windDirLabel = weather ? weather.windDirectionLabel : 'ESE';
  const windDirDeg = weather ? weather.windDirection : 110;
  const windGustsKnots = weather ? weather.windGustKnots : 16;
  const windGustsKmH = Math.round(windGustsKnots * 1.852);
  const waveHeight = weather ? weather.waveHeightMeters : 0.8;

  // Formatted speed according to current unit
  const displayWindSpeed = windUnit === 'knots' ? `${windKnots} nós` : `${windKmH} km/h`;
  const displayWindGust = windUnit === 'knots' ? `${windGustsKnots} kts` : `${windGustsKmH} km/h`;

  // Wind gust alert threshold: 60 km/h (~32.4 knots)
  const isGustAlert = windGustsKmH >= 60;
  const isGustWarning = windGustsKmH >= 45 && !isGustAlert;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl relative overflow-hidden text-slate-100">
      {/* Background ocean ambient glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5 font-mono">
            <Waves className="w-4 h-4" />
            Nível da Maré em Tempo Real
          </h2>
          {isSimulated && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              MODO SIMULAÇÃO
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {operatingVessel ? (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/50 text-amber-300 shadow-md flex items-center gap-2.5">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute opacity-75" />
                <span className="w-2 h-2 rounded-full bg-amber-400 relative" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Ship className="w-2.5 h-2.5 text-amber-400" />
                    <span>Navio em Operação</span>
                  </span>
                  <span className="text-xs font-black text-white font-mono">
                    {operatingVessel.vesselName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="font-semibold">
                    {operatingVessel.totalVolumeTons.toLocaleString('pt-BR')} t{' '}
                    {operatingVessel.scVolumeTons > 0 && operatingVessel.sqVolumeTons > 0
                      ? 'SC/SQ'
                      : operatingVessel.scVolumeTons > 0
                      ? 'SC'
                      : 'SQ'}
                  </span>
                  <span className="text-slate-600 hidden md:inline">•</span>
                  <span className="text-slate-300 hidden md:inline">{operatingVessel.shipper}</span>
                </div>
              </div>
            </div>
          ) : nextPlannedVessel ? (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 text-cyan-300 shadow-md flex items-center gap-2.5">
              <div className="relative flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Próximo Previsto</span>
                  </span>
                  <span className="text-xs font-black text-white font-mono">
                    {nextPlannedVessel.vesselName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-amber-300 font-semibold">ETA {nextPlannedVessel.eta.split(' ')[0]}</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="font-semibold">
                    {nextPlannedVessel.totalVolumeTons.toLocaleString('pt-BR')} t{' '}
                    {nextPlannedVessel.scVolumeTons > 0 && nextPlannedVessel.sqVolumeTons > 0
                      ? 'SC/SQ'
                      : nextPlannedVessel.scVolumeTons > 0
                      ? 'SC'
                      : 'SQ'}
                  </span>
                  <span className="text-slate-600 hidden md:inline">•</span>
                  <span className="text-slate-300 hidden md:inline">{nextPlannedVessel.shipper}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm flex items-center gap-2">
              <Anchor className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <span className="font-bold text-emerald-400 uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  Berço Disponível
                </span>
                <span className="hidden sm:inline text-slate-400">Terminal Livre</span>
              </div>
            </div>
          )}

          {isSimulated && onResetSimulation && (
            <button
              onClick={onResetSimulation}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
            >
              Voltar ao Tempo Real
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center relative z-10">
        {/* Left: Height Number, Depth & Instantaneous Wind */}
        <div className="lg:col-span-5 flex items-center gap-5">
          {/* Vertical Level Tube Visualizer */}
          <div className="relative w-12 h-48 bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden flex flex-col justify-end p-1 shadow-inner shrink-0">
            {/* Scale markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 text-[8px] font-mono text-slate-600 pointer-events-none select-none">
              <span className="text-right">4.0m</span>
              <span className="text-right">3.0m</span>
              <span className="text-right">2.0m</span>
              <span className="text-right">1.0m</span>
              <span className="text-right">0.0m</span>
            </div>

            {/* Mean sea level line marker */}
            <div
              className="absolute w-full left-0 border-t border-dashed border-cyan-400/50 z-20"
              style={{ bottom: `${(port.meanLevel / maxScale) * 100}%` }}
              title={`Nível Médio: ${port.meanLevel}m`}
            />

            {/* Animated Water Column */}
            <div
              className="w-full bg-gradient-to-t from-blue-700 via-cyan-600 to-cyan-400 rounded-xl transition-all duration-700 ease-out relative overflow-hidden shadow-lg shadow-cyan-500/30"
              style={{ height: `${heightPercent}%` }}
            >
              {/* Wave surface shimmer */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/40 animate-pulse" />
            </div>
          </div>

          {/* Large Height Display + Integrated Wind */}
          <div className="flex-1 space-y-2">
            <div>
              <span className="text-xs uppercase font-medium text-slate-400 block tracking-wider">
                Altura Instantânea
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white">
                  {currentHeight.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-cyan-400 font-mono">metros</span>
              </div>
            </div>

            {/* Depth over shallowest bar bank */}
            <div className="text-xs font-mono text-slate-300 flex items-center justify-between gap-1.5 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Lâmina na Barra:</span>
              <span className="text-cyan-300 font-bold">{currentWaterDepth.toFixed(2)} m</span>
            </div>

            {/* Integrated Wind Speed & Direction pill with click-to-toggle and Red Alert for Gust >= 60km/h */}
            <button
              onClick={() => handleToggleWindUnit(windUnit === 'knots' ? 'kmh' : 'knots')}
              className={`w-full text-xs font-mono px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 shadow-sm transition text-left cursor-pointer border ${
                isGustAlert
                  ? 'bg-rose-950/80 hover:bg-rose-900/80 border-rose-500 text-rose-100 animate-pulse ring-2 ring-rose-500/50'
                  : isGustWarning
                  ? 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-500/70 text-amber-100'
                  : 'bg-emerald-950/40 hover:bg-emerald-950/60 border-emerald-600/40 hover:border-emerald-500 text-emerald-200'
              }`}
              title="Clique para alternar entre Nós (knots) e km/h"
            >
              <div className="flex items-center gap-1.5">
                <Wind className={`w-4 h-4 shrink-0 ${isGustAlert ? 'text-rose-400 animate-spin' : isGustWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className={isGustAlert ? 'text-rose-200' : 'text-slate-300'}>Vento:</span>
                <span className={`font-bold ${isGustAlert ? 'text-rose-200' : isGustWarning ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {displayWindSpeed} {windDirLabel}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                isGustAlert
                  ? 'bg-rose-600 text-white border-rose-400 uppercase tracking-wider'
                  : isGustWarning
                  ? 'bg-amber-900/80 text-amber-200 border-amber-600/60'
                  : 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
              }`}>
                {isGustAlert && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />}
                Rajada {displayWindGust}
              </span>
            </button>

            {/* Trend Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <div>
                <span className="block font-bold">{trendDescription}</span>
                <span className="text-[10px] font-mono text-slate-300">
                  {rateOfChangeCmPerHour > 0 ? `+${rateOfChangeCmPerHour}` : rateOfChangeCmPerHour} cm/hora
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Cycle Progress & Extremum Points */}
        <div className="lg:col-span-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Ciclo Semidiurno
            </span>
            <span className="font-bold text-cyan-300">{percentCycle}% concluído</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full my-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentCycle}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Previous Event */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">
                {previousEvent.type === 'high' ? 'Última Preamar' : 'Última Baixa-mar'}
              </span>
              <span className="text-sm font-bold text-slate-200">{previousEvent.timeStr}</span>
              <span className="block text-[11px] text-cyan-400 font-semibold">{previousEvent.height.toFixed(2)} m</span>
            </div>

            {/* Next High Tide Event (Sempre Próxima Preamar) */}
            <div className="bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/50">
              <span className="text-[10px] uppercase text-cyan-300 font-semibold block">
                Próxima Preamar
              </span>
              <span className="text-sm font-bold text-white">{highEventToDisplay.timeStr}</span>
              <span className="block text-[11px] text-emerald-400 font-bold">{highEventToDisplay.height.toFixed(2)} m</span>
            </div>
          </div>

          {/* Countdown pill */}
          <div className="mt-3 text-center text-xs font-mono py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
            Faltam <span className="text-cyan-400 font-bold">{hoursToNextHigh}h {minsToNextHigh}m</span> para a Preamar
          </div>
        </div>

        {/* Right: Amplitude, Regime & Marine Conditions */}
        <div className="lg:col-span-3 space-y-2.5">
          {/* Marine Conditions with Unit Switcher */}
          <div className={`p-3 rounded-xl border transition ${
            isGustAlert
              ? 'bg-rose-950/40 border-rose-600/70 ring-1 ring-rose-500/50'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[10px] uppercase text-slate-400 tracking-wider font-semibold flex items-center gap-1.5">
                <Wind className={`w-3.5 h-3.5 ${isGustAlert ? 'text-rose-400' : 'text-cyan-400'}`} />
                Vento & Mar
                {isGustAlert && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white font-bold rounded animate-pulse">
                    ALERTA RAJADA
                  </span>
                )}
              </span>

              {/* Unit Toggle Buttons */}
              <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-700/80 text-[10px] font-mono">
                <button
                  onClick={() => handleToggleWindUnit('knots')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    windUnit === 'knots'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Exibir em Nós (Knots)"
                >
                  nós
                </button>
                <button
                  onClick={() => handleToggleWindUnit('kmh')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    windUnit === 'kmh'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Exibir em km/h"
                >
                  km/h
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1 mt-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Velocidade:</span>
                <span className="font-bold text-emerald-300">
                  {windUnit === 'knots' ? `${windKnots} nós (${windKmH} km/h)` : `${windKmH} km/h (${windKnots} kts)`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Direção:</span>
                <span className="font-bold text-white">{windDirLabel} ({windDirDeg}°)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ondas (Vaga):</span>
                <span className="font-bold text-cyan-300">{waveHeight.toFixed(1)} m</span>
              </div>
            </div>
          </div>

          {/* Regime */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider font-semibold">
              Regime de Maré
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                MARÉ DE {coefficientType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Amplitude: <span className="text-slate-200 font-mono font-bold">{amplitude.toFixed(2)} m</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

