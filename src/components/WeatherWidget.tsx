import React, { useState } from 'react';
import { Wind, Waves, Gauge, RefreshCw, Compass, Eye } from 'lucide-react';
import { WeatherData, PortConfig } from '../types/maritime';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  port: PortConfig;
  onRefresh: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  port,
  onRefresh,
}) => {
  const [useKnots, setUseKnots] = useState(true);

  if (!weather) {
    return (
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl text-slate-100 flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Carregando dados meteorológicos marítimos...</span>
        </div>
      </div>
    );
  }

  // Wind speed conversion
  const windValue = useKnots ? `${weather.windSpeedKnots} kts` : `${weather.windSpeedKmH} km/h`;
  const gustValue = useKnots ? `${weather.windGustKnots} kts` : `${Math.round(weather.windGustKnots * 1.852)} km/h`;

  // Determine wind condition severity
  const gustKmH = Math.round(weather.windGustKnots * 1.852);
  const isGustCritical = gustKmH >= 60;
  const isHighWind = weather.windSpeedKnots >= 20 || isGustCritical;
  const isHighWave = weather.waveHeightMeters >= 1.6;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl text-slate-100 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Meteorologia Marítima Local
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {port.coordinates.dmsLat} {port.coordinates.dmsLng}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Atualizado às {weather.lastUpdated} BRT • Open-Meteo Marine API
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit Toggle */}
          <button
            onClick={() => setUseKnots(!useKnots)}
            className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Unidade: <span className="text-cyan-400 font-bold">{useKnots ? 'Nós (kts)' : 'km/h'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 disabled:opacity-50"
            title="Atualizar dados agora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Meteorological Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Wind Card with Compass Rose */}
        <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
          isGustCritical
            ? 'bg-rose-950/50 border-rose-500/80 ring-1 ring-rose-500/50 animate-pulse'
            : isHighWind
            ? 'bg-amber-950/30 border-amber-600/50'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1.5">
              <Wind className={`w-3.5 h-3.5 ${isGustCritical ? 'text-rose-400' : 'text-cyan-400'}`} />
              Vento & Direção
              {isGustCritical && (
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white font-bold rounded">
                  ALERTA &gt;60km/h
                </span>
              )}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl font-black font-mono ${isGustCritical ? 'text-rose-200' : 'text-white'}`}>{windValue}</span>
            </div>
            <span className={`text-xs font-mono font-bold block mt-0.5 ${isGustCritical ? 'text-rose-300' : 'text-cyan-300'}`}>
              {weather.windDirectionLabel} ({weather.windDirection}°) • Rajadas {gustValue}
            </span>
          </div>

          {/* Mini Compass Rose */}
          <div className="relative w-12 h-12 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
            <span className="absolute top-0 text-[8px] font-mono text-slate-500 font-bold">N</span>
            <span className="absolute right-1 text-[8px] font-mono text-slate-500 font-bold">E</span>
            <span className="absolute bottom-0 text-[8px] font-mono text-slate-500 font-bold">S</span>
            <span className="absolute left-1 text-[8px] font-mono text-slate-500 font-bold">W</span>
            {/* Arrow pointer */}
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-700"
              style={{ transform: `rotate(${weather.windDirection}deg)` }}
            >
              <div className="w-1 h-5 bg-cyan-400 rounded-full origin-bottom transform -translate-y-1 shadow-sm" />
            </div>
          </div>
        </div>

        {/* 2. Wave & Swell Card */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${isHighWave ? 'bg-amber-950/30 border-amber-600/50' : 'bg-slate-950/60 border-slate-800'}`}>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              Ondulação (Swell)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">{weather.waveHeightMeters.toFixed(1)} m</span>
            </div>
            <span className="text-xs text-slate-300 font-mono block mt-0.5">
              Período: <span className="font-bold text-cyan-300">{weather.wavePeriodSeconds}s</span> • Dir: {weather.waveDirection}°
            </span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-300 font-mono text-xs font-bold shrink-0">
            {weather.waveHeightMeters <= 1.0 ? 'CALMO' : weather.waveHeightMeters <= 1.8 ? 'MOD' : 'AGIT'}
          </div>
        </div>

        {/* 3. Atmospheric Pressure & Temp */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Pressão & Temperatura
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-white">{weather.pressure}</span>
            <span className="text-xs text-slate-400 font-mono">hPa</span>
          </div>
          <span className="text-xs text-slate-300 font-mono block mt-0.5">
            Temp: <span className="font-bold text-white">{weather.temperature}°C</span> (Sensação {weather.apparentTemperature}°C)
          </span>
        </div>

        {/* 4. Visibility, Humidity & Rain */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            Visibilidade & Umidade
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-white">{weather.visibilityKm}</span>
            <span className="text-xs text-slate-400 font-mono">km (Boa)</span>
          </div>
          <span className="text-xs text-slate-300 font-mono block mt-0.5">
            Umidade: <span className="font-bold text-white">{weather.humidity}%</span> • Chuva: {weather.precipitationProb}%
          </span>
        </div>
      </div>
    </div>
  );
};
