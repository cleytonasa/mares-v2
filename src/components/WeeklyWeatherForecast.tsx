import React, { useState } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Waves,
  Droplets,
  Calendar,
  Compass,
  Sunrise,
  Sunset,
  ChevronRight,
} from 'lucide-react';
import { DailyForecastDay, PortConfig } from '../types/maritime';

interface WeeklyWeatherForecastProps {
  forecast?: DailyForecastDay[];
  port: PortConfig;
  loading?: boolean;
}

export const WeeklyWeatherForecast: React.FC<WeeklyWeatherForecastProps> = ({
  forecast,
  port,
  loading = false,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [useKnots, setUseKnots] = useState<boolean>(false);

  if (!forecast || forecast.length === 0) {
    return null;
  }

  const selectedDay = forecast[selectedDayIndex] || forecast[0];

  // Helper to render weather icon
  const getWeatherIcon = (code: number, className: string = 'w-7 h-7') => {
    if (code === 0) {
      return <Sun className={`${className} text-amber-400`} />;
    }
    if (code === 1 || code === 2) {
      return <CloudSun className={`${className} text-amber-300`} />;
    }
    if (code === 3 || code === 45 || code === 48) {
      return <Cloud className={`${className} text-slate-400`} />;
    }
    if (code >= 51 && code <= 65) {
      return <CloudRain className={`${className} text-cyan-400`} />;
    }
    if (code >= 80 && code <= 82) {
      return <CloudRain className={`${className} text-blue-400`} />;
    }
    if (code >= 95) {
      return <CloudLightning className={`${className} text-purple-400`} />;
    }
    return <Sun className={`${className} text-amber-400`} />;
  };

  return (
    <div className="bg-slate-900/90 rounded-xl sm:rounded-2xl border border-slate-800 p-3 sm:p-5 shadow-xl text-slate-100 space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate flex items-center gap-1.5 font-sans">
              <span>Previsão do Tempo • 7 Dias</span>
              <span className="text-[10px] font-mono text-cyan-400 font-normal bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                {port.name}
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
              Condições meteorológicas e marítimas da semana
            </p>
          </div>
        </div>

        {/* Toggle Wind Unit */}
        <button
          onClick={() => setUseKnots(!useKnots)}
          className="shrink-0 text-[10px] sm:text-xs font-mono px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Alternar unidade de vento"
        >
          <span className="hidden xs:inline">Vento: </span>
          <span className="text-cyan-400 font-bold">{useKnots ? 'Nós (kts)' : 'km/h'}</span>
        </button>
      </div>

      {/* 7-Day Responsive Horizontal Carousel / Grid */}
      <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x -mx-1 px-1">
        {forecast.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const isToday = day.isToday;
          const windSpd = useKnots ? `${day.windSpeedMaxKnots} kts` : `${day.windSpeedMaxKmH} km/h`;

          return (
            <button
              key={day.date}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-shrink-0 w-[105px] sm:w-auto p-2 sm:p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between gap-1.5 snap-start relative ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-500/80 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-950/50'
                  : isToday
                  ? 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
              }`}
            >
              {/* Day Label */}
              <div className="w-full">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider block ${
                      isToday ? 'text-cyan-300' : 'text-slate-200'
                    }`}
                  >
                    {day.dayOfWeek}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                  {day.formattedDate}
                </span>
              </div>

              {/* Weather Icon */}
              <div className="my-0.5 transform hover:scale-110 transition duration-300">
                {getWeatherIcon(day.weatherCode, 'w-6 h-6 sm:w-7 sm:h-7')}
              </div>

              {/* Temperature Min / Max */}
              <div className="w-full">
                <div className="flex items-baseline justify-center gap-1 font-mono">
                  <span className="text-xs sm:text-sm font-black text-white">{day.tempMax}°</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">{day.tempMin}°</span>
                </div>

                {/* Thermal Gradient Bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1 flex">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 rounded-full"
                    style={{
                      marginLeft: `${Math.max(0, ((day.tempMin - 20) / 18) * 100)}%`,
                      width: `${Math.max(20, ((day.tempMax - day.tempMin) / 18) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Wind & Swell Indicators */}
              <div className="w-full pt-1 border-t border-slate-800/80 flex flex-col gap-0.5 text-[10px] font-mono">
                <div className="flex items-center justify-center gap-1 text-slate-300 truncate" title={`Vento: ${windSpd}`}>
                  <Wind className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{windSpd}</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-slate-400" title={`Ondulação: ${day.waveHeightMeters}m`}>
                  <Waves className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span>{day.waveHeightMeters.toFixed(1)}m</span>
                </div>
              </div>

              {/* Rain Probability pill if > 15% */}
              {day.precipitationProb >= 15 && (
                <div className="absolute -top-1.5 -right-1 px-1 py-0.2 bg-blue-600/90 text-[8px] font-mono font-bold text-white rounded-full flex items-center gap-0.5 shadow-sm">
                  <Droplets className="w-2 h-2" />
                  {day.precipitationProb}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Box */}
      {selectedDay && (
        <div className="p-2.5 sm:p-3 bg-slate-950/70 rounded-lg sm:rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
              {getWeatherIcon(selectedDay.weatherCode, 'w-6 h-6')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-sans">
                <span className="font-bold text-white text-xs sm:text-sm">
                  {selectedDay.dayOfWeek === 'Hoje' ? 'Hoje' : `${selectedDay.dayOfWeek}-feira`}, {selectedDay.formattedDate}
                </span>
                <span className="text-[10px] text-slate-400">•</span>
                <span className="text-[11px] text-cyan-300 font-medium truncate">
                  {selectedDay.weatherDescription}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Vento predominante {selectedDay.windDirectionLabel} ({selectedDay.windDirectionDominant}°) • Rajadas de até{' '}
                <span className="text-amber-300 font-bold">
                  {useKnots ? `${selectedDay.windGustsMaxKnots} kts` : `${selectedDay.windGustsMaxKmH} km/h`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-1.5 sm:pt-0">
            {/* Sun times */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1" title="Nascer do Sol">
                <Sunrise className="w-3 h-3 text-amber-400" />
                {selectedDay.sunrise}
              </span>
              <span className="flex items-center gap-1" title="Pôr do Sol">
                <Sunset className="w-3 h-3 text-orange-400" />
                {selectedDay.sunset}
              </span>
            </div>

            {/* Marine info */}
            <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <Waves className="w-3 h-3 text-cyan-400" />
              <span>Ondas: <strong className="text-white">{selectedDay.waveHeightMeters.toFixed(1)}m</strong></span>
              <span className="text-slate-500">•</span>
              <span>Chuva: <strong className="text-white">{selectedDay.precipitationProb}%</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
