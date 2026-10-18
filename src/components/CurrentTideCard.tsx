import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Waves, Clock, Compass, Wind, Sparkles, Ship, Calendar, Anchor } from 'lucide-react';
import { CurrentTideState } from '../utils/tideCalculations';
import { PortConfig, WeatherData } from '../types/maritime';
import { SALT_SHIPMENTS_2026, getActiveAndNextVessel } from '../data/saltShipmentsData';
import { translations, Language } from '../utils/i18n';

interface CurrentTideCardProps {
  tideState: CurrentTideState;
  port: PortConfig;
  currentTime: Date;
  weather?: WeatherData | null;
  onSimulateTime?: (date: Date) => void;
  isSimulated?: boolean;
  onResetSimulation?: () => void;
  language?: Language;
}

export const CurrentTideCard: React.FC<CurrentTideCardProps> = ({
  tideState,
  port,
  currentTime,
  weather,
  isSimulated,
  onResetSimulation,
  language = 'pt',
}) => {
  const t = translations[language];
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

  // Active Operating Vessel & Next Vessel in Line-up
  const { operatingVessel, nextPlannedVessel } = getActiveAndNextVessel(SALT_SHIPMENTS_2026);

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

  const isGustAlert = windGustsKmH >= 60;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Background glow accent */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info & Simulation Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-inner">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">{t.currentWaterLevel}</h2>
              {isSimulated && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {language === 'en' ? 'Simulated' : 'Simulação'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {port.name} • {currentTime.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Action button if simulated */}
        {isSimulated && onResetSimulation && (
          <button
            onClick={onResetSimulation}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition shadow-lg flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Clock className="w-3.5 h-3.5" />
            {t.resetSimulation}
          </button>
        )}
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5">
        {/* Left: Tide Height Gauge & Trend */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                {t.currentWaterLevel}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-300">
                  {currentHeight.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-slate-400">m</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {t.currentDepth}: <span className="text-emerald-400 font-bold">{currentWaterDepth.toFixed(2)} m</span>
              </p>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-6 h-28 bg-slate-900 rounded-full border border-slate-800 relative overflow-hidden flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-gradient-to-t from-cyan-600 to-emerald-400 rounded-full transition-all duration-700 shadow-lg"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            {/* Trend Badge */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <div>
                <span className="block font-bold">
                  {trend === 'ENCHENDO' ? t.rising : trend === 'VAZANDO' ? t.falling : t.slack}
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  {rateOfChangeCmPerHour > 0 ? `+${rateOfChangeCmPerHour}` : rateOfChangeCmPerHour} cm/h
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
              {language === 'en' ? 'Semidiurnal Cycle' : 'Ciclo Semidiurno'}
            </span>
            <span className="font-bold text-cyan-300">{percentCycle}% {language === 'en' ? 'completed' : 'concluído'}</span>
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
                {previousEvent.type === 'high' ? (language === 'en' ? 'Last High Tide' : 'Última Preamar') : (language === 'en' ? 'Last Low Tide' : 'Última Baixa-mar')}
              </span>
              <span className="text-sm font-bold text-slate-200">{previousEvent.timeStr}</span>
              <span className="block text-[11px] text-cyan-400 font-semibold">{previousEvent.height.toFixed(2)} m</span>
            </div>

            {/* Next High Tide Event */}
            <div className="bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/50">
              <span className="text-[10px] uppercase text-cyan-300 font-semibold block">
                {t.nextHighTide}
              </span>
              <span className="text-sm font-bold text-white">{highEventToDisplay.timeStr}</span>
              <span className="block text-[11px] text-emerald-400 font-bold">{highEventToDisplay.height.toFixed(2)} m</span>
            </div>
          </div>

          {/* Countdown pill */}
          <div className="mt-3 text-center text-xs font-mono py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
            {language === 'en' ? 'Next High Tide in' : 'Faltam'} <span className="text-cyan-400 font-bold">{hoursToNextHigh}h {minsToNextHigh}m</span>
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
                {language === 'en' ? 'Wind & Sea' : 'Vento & Mar'}
                {isGustAlert && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white font-bold rounded animate-pulse">
                    GUST ALERT
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
                  title="Knots"
                >
                  kts
                </button>
                <button
                  onClick={() => handleToggleWindUnit('kmh')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    windUnit === 'kmh'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="km/h"
                >
                  km/h
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1 mt-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{language === 'en' ? 'Speed:' : 'Velocidade:'}</span>
                <span className="font-bold text-emerald-300">
                  {windUnit === 'knots' ? `${windKnots} kts (${windKmH} km/h)` : `${windKmH} km/h (${windKnots} kts)`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{language === 'en' ? 'Direction:' : 'Direção:'}</span>
                <span className="font-bold text-white">{windDirLabel} ({windDirDeg}°)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{language === 'en' ? 'Waves:' : 'Ondas (Vaga):'}</span>
                <span className="font-bold text-cyan-300">{waveHeight.toFixed(1)} m</span>
              </div>
            </div>
          </div>

          {/* Regime */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block tracking-wider font-semibold">
              {t.tidalCoefficient}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {coefficientType}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t.amplitude}: <span className="text-slate-200 font-mono font-bold">{amplitude.toFixed(2)} m</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
